// cookie_collector_full.js
// Tam, eksiksiz cookie toplayıcı - Playwright + Express + CDP fallback
// Node.js >= 18 recommended

const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// ---------------- CONFIG ----------------
const CONFIG = {
  PORT: process.env.PORT || 3000,
  COOKIE_FILE: path.join(__dirname, 'last_cookies.json'),
  AUTO_COLLECT_ENABLED: false, // otomatik çalıştırmak istersen true yap
  AUTO_COLLECT_INTERVAL: 10 * 60 * 1000,
  FINGERPRINT_COUNT: 6,
  MAX_HBUS_ATTEMPTS: 6,
  PAGE_LOAD_TIMEOUT: 30000,
  INITIAL_COLLECTION_DELAY: 3000,
  WAIT_BETWEEN_FINGERPRINTS: 1000,
  HEADLESS: true,
  TARGET_DOMAINS: [
    'https://www.hepsiburada.com',
    'https://giris.hepsiburada.com',
    'https://checkout.hepsiburada.com',
    'https://oauth.hepsiburada.com',
    'https://api.hepsiburada.com',
    'https://images.hepsiburada.net',
    'https://www.hepsiburada.net',
    'https://cart.hepsiburada.com',
    'https://click.hepsiburada.com',
    'https://assets.hepsiburada.net'
  ]
};

// ---------------- STATE ----------------
let lastCookies = []; // array of cookie sets
let lastCollectionTime = null;
let activeBrowser = null;
let isShuttingDown = false;
let collectionStats = { total_runs: 0, successful_runs: 0 };

// ---------------- HELPERS ----------------
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport() {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
  ];
  return viewports[Math.floor(Math.random() * viewports.length)];
}

function uniqueCookieKey(c) {
  // CDP cookie domain may be like '.hepsiburada.com' or 'www.hepsiburada.com'
  return `${c.name}|${c.domain || c.domainName || ''}|${c.path || '/'}`;
}

function normalizeCookie(c) {
  // Normalize various cookie shapes
  return {
    name: c.name,
    value: c.value,
    domain: c.domain || c.domainName || '',
    path: c.path || '/',
    expires: c.expires || c.expirationDate || null,
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
    sameSite: c.sameSite || 'Lax'
  };
}

// ---------------- PERSISTENCE ----------------
async function saveCookiesToFile(sets) {
  try {
    const payload = {
      generated_at: new Date().toISOString(),
      sets: sets
    };
    await fs.writeFile(CONFIG.COOKIE_FILE, JSON.stringify(payload, null, 2), 'utf8');
    console.log('💾 Cookies saved to', CONFIG.COOKIE_FILE);
    return true;
  } catch (e) {
    console.error('❌ Save error:', e.message);
    return false;
  }
}

async function loadCookiesFromFile() {
  try {
    const txt = await fs.readFile(CONFIG.COOKIE_FILE, 'utf8');
    const parsed = JSON.parse(txt);
    if (parsed && Array.isArray(parsed.sets)) {
      console.log('📥 Loaded cookie sets from file:', parsed.sets.length);
      return parsed.sets;
    }
    return [];
  } catch (e) {
    console.log('ℹ️ No cookie file or load failed:', e.message);
    return [];
  }
}

// ---------------- CDP FALLBACK ----------------
async function getAllCookiesViaCDP(context, page) {
  try {
    const client = await context.newCDPSession(page);
    const resp = await client.send('Network.getAllCookies');
    if (resp && Array.isArray(resp.cookies)) {
      return resp.cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        expires: c.expires || null,
        httpOnly: !!c.httpOnly,
        secure: !!c.secure,
        sameSite: c.sameSite || 'Lax'
      }));
    }
    return [];
  } catch (e) {
    console.log('⚠️ CDP.getAllCookies hata:', e.message);
    return [];
  }
}

// ---------------- COOKIE GATHERING - MIN CHANGE FLOW ----------------
async function collectCookiesFastThenFallback(context, page, domains = CONFIG.TARGET_DOMAINS) {
  // 1) Fast: context.cookies(domains)
  try {
    const fast = await context.cookies(domains);
    // Normalize and unique
    const map = new Map();
    fast.forEach(c => {
      const n = normalizeCookie(c);
      map.set(uniqueCookieKey(n), n);
    });

    // 2) Add document.cookie (non-HttpOnly JS-set cookies)
    try {
      const doc = await page.evaluate(() => document.cookie).catch(() => '');
      if (doc && typeof doc === 'string' && doc.length > 0) {
        const parts = doc.split(';').map(s => s.trim()).filter(Boolean);
        parts.forEach(p => {
          const idx = p.indexOf('=');
          if (idx > 0) {
            const name = p.substring(0, idx);
            const value = p.substring(idx + 1);
            // assume page domain
            const n = {
              name,
              value,
              domain: new URL(page.url()).hostname,
              path: '/'
            };
            map.set(uniqueCookieKey(n), normalizeCookie(n));
          }
        });
      }
    } catch (e) {
      // ignore
    }

    const merged = Array.from(map.values());

    // Quick HBUS check
    const hasSession = merged.some(c => c.name === 'hbus_sessionId');
    const hasAnon = merged.some(c => c.name === 'hbus_anonymousId');

    if (hasSession && hasAnon) {
      return { cookies: merged, method: 'CONTEXT+DOCUMENT' };
    }

    // 3) Fallback: CDP (only if still missing)
    const cdpCookies = await getAllCookiesViaCDP(context, page);
    cdpCookies.forEach(c => map.set(uniqueCookieKey(c), normalizeCookie(c)));
    return { cookies: Array.from(map.values()), method: 'CONTEXT+DOCUMENT+CDP' };

  } catch (e) {
    console.log('⚠️ collectCookiesFastThenFallback hata:', e.message);
    return { cookies: [], method: 'ERROR' };
  }
}

// ---------------- Multi-domain collector (tries each domain individually too) ----------------
async function getAllCookiesFromDomainsVisiting(context, page, domains = CONFIG.TARGET_DOMAINS) {
  const map = new Map();
  for (const domain of domains) {
    try {
      // visit domain root to allow JS-set or 3rd-party set
      await page.goto(domain, { waitUntil: 'networkidle', timeout: CONFIG.PAGE_LOAD_TIMEOUT }).catch(() => {});
      // small wait
      await page.waitForTimeout(800);

      // merge context.cookies for that domain
      const domainCookies = await context.cookies(domain).catch(() => []);
      domainCookies.forEach(c => map.set(uniqueCookieKey(c), normalizeCookie(c)));

      // merge document.cookie for that page
      try {
        const doc = await page.evaluate(() => document.cookie).catch(() => '');
        if (doc && typeof doc === 'string' && doc.length > 0) {
          const parts = doc.split(';').map(s => s.trim()).filter(Boolean);
          parts.forEach(p => {
            const idx = p.indexOf('=');
            if (idx > 0) {
              const name = p.substring(0, idx);
              const value = p.substring(idx + 1);
              const n = { name, value, domain: new URL(page.url()).hostname, path: '/' };
              map.set(uniqueCookieKey(n), normalizeCookie(n));
            }
          });
        }
      } catch (e) {}
    } catch (e) {
      // ignore per-domain visit errors
    }
  }

  return Array.from(map.values());
}

// ---------------- CHECK HELP ----------------
function checkRequiredHbusCookies(cookies) {
  const hasSession = cookies.some(c => c.name === 'hbus_sessionId');
  const hasAnon = cookies.some(c => c.name === 'hbus_anonymousId');
  return { success: hasSession && hasAnon, hasSession, hasAnon };
}

// ---------------- MAIN COLLECTION FLOW ----------------
async function runCollectionOnce() {
  if (isShuttingDown) return { error: 'shutting_down' };
  collectionStats.total_runs++;

  let browser;
  const collectedSets = [];

  try {
    browser = await chromium.launch({
      headless: CONFIG.HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    activeBrowser = browser;

    for (let i = 1; i <= CONFIG.FINGERPRINT_COUNT; i++) {
      if (isShuttingDown) break;

      console.log(`\n🔄 Fingerprint ${i}/${CONFIG.FINGERPRINT_COUNT} başlıyor`);
      const viewport = getRandomViewport();
      const userAgent = getRandomUserAgent();

      const context = await browser.newContext({
        viewport,
        userAgent,
        extraHTTPHeaders: {
          'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8'
        }
      });

      const page = await context.newPage();
      // ensure starting clean
      await context.clearCookies().catch(() => {});

      try {
        await page.goto('https://www.hepsiburada.com/siparislerim', {
          waitUntil: 'networkidle',
          timeout: CONFIG.PAGE_LOAD_TIMEOUT
        }).catch(() => { /* ignore goto errors - we'll still try to collect */ });

        // attempts loop
        let attempts = 0;
        let finalCookies = [];
        let usedMethod = 'NONE';
        let hbusOk = false;

        while (attempts < CONFIG.MAX_HBUS_ATTEMPTS && !hbusOk) {
          attempts++;
          // fast collect with fallback
          const r = await collectCookiesFastThenFallback(context, page);
          finalCookies = r.cookies || [];
          usedMethod = r.method || usedMethod;

          const hbusStatus = checkRequiredHbusCookies(finalCookies);
          hbusOk = hbusStatus.success;

          console.log(`   ➤ Attempt ${attempts}: cookies=${finalCookies.length}, hbus_ok=${hbusOk}, method=${usedMethod}`);

          if (hbusOk) break;
          // else wait a bit to allow JS/network to set cookies
          const waitMs = 1500 + Math.floor(Math.random() * 2000);
          await page.waitForTimeout(waitMs);
        }

        // If still not OK after attempts, do exhaustive visit-based collect then CDP last-resort
        if (!checkRequiredHbusCookies(finalCookies).success) {
          // try visiting multiple domains to trigger domain-specific cookies
          const visitedCookies = await getAllCookiesFromDomainsVisiting(context, page);
          visitedCookies.forEach(c => {
            finalCookies.push(c);
          });
          // de-duplicate
          const unique = new Map();
          finalCookies.forEach(c => unique.set(uniqueCookieKey(c), normalizeCookie(c)));
          finalCookies = Array.from(unique.values());

          // final CDP dump if still missing
          const cdpDump = await getAllCookiesViaCDP(context, page);
          cdpDump.forEach(c => unique.set(uniqueCookieKey(c), normalizeCookie(c)));
          finalCookies = Array.from(unique.values());
        }

        // Normalize/unique one last time
        const finalMap = new Map();
        finalCookies.forEach(c => finalMap.set(uniqueCookieKey(c), normalizeCookie(c)));
        finalCookies = Array.from(finalMap.values());

        const hbusCheck = checkRequiredHbusCookies(finalCookies);

        const setObj = {
          set_id: i,
          success: hbusCheck.success,
          method: usedMethod,
          attempts: CONFIG.MAX_HBUS_ATTEMPTS,
          cookies: finalCookies,
          stats: {
            total_cookies: finalCookies.length,
            hbus_cookies: finalCookies.filter(c => c.name.includes('hbus_')).length,
            has_required_hbus: hbusCheck.success
          },
          collection_time: new Date().toISOString()
        };

        collectedSets.push(setObj);
        console.log(`   ✅ Fingerprint ${i} tamam. cookies=${setObj.stats.total_cookies}, hbus=${setObj.stats.hbus_cookies}`);

      } catch (e) {
        console.log(`   ❌ Fingerprint ${i} hata:`, e.message);
      } finally {
        // cleanup per fingerprint
        try { await page.close().catch(() => {}); } catch {}
        try { await context.close().catch(() => {}); } catch {}
      }

      // wait between fingerprints
      if (i < CONFIG.FINGERPRINT_COUNT && !isShuttingDown) {
        const waitMs = CONFIG.WAIT_BETWEEN_FINGERPRINTS + Math.floor(Math.random() * 1500);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    // finalize
    await browser.close().catch(() => {});
    activeBrowser = null;

    // persist: replace lastCookies with collectedSets (we keep all sets - successful or not)
    lastCookies = collectedSets;
    lastCollectionTime = new Date().toISOString();
    if (collectedSets.some(s => s.stats.has_required_hbus)) collectionStats.successful_runs++;
    collectionStats.total_runs++;

    await saveCookiesToFile(collectedSets).catch(() => {});
    return {
      overall_success: collectedSets.some(s => s.stats.has_required_hbus),
      total_attempts: collectedSets.length,
      successful_attempts: collectedSets.filter(s => s.stats.has_required_hbus).length,
      cookie_sets: collectedSets,
      timestamp: new Date().toISOString()
    };

  } catch (e) {
    console.error('❌ runCollectionOnce error:', e.message);
    if (browser) await browser.close().catch(() => {});
    activeBrowser = null;
    return { error: e.message };
  }
}

// ---------------- EXPRESS ENDPOINTS ----------------
app.get('/', (req, res) => {
  res.json({
    service: 'Full Cookie Collector',
    config: {
      fingerprint_count: CONFIG.FINGERPRINT_COUNT,
      headless: CONFIG.HEADLESS,
      target_domains: CONFIG.TARGET_DOMAINS.length
    },
    last_collection: lastCollectionTime,
    saved_sets: lastCookies.length
  });
});

app.get('/collect', async (req, res) => {
  if (isShuttingDown) return res.status(503).json({ error: 'shutting_down' });
  console.log('🔔 Manual /collect called');
  const result = await runCollectionOnce();
  res.json(result);
});

app.get('/last-cookies', async (req, res) => {
  try {
    if (!lastCookies || lastCookies.length === 0) {
      // try to load from disk
      const loaded = await loadCookiesFromFile();
      if (loaded && loaded.length) {
        lastCookies = loaded;
        lastCollectionTime = new Date().toISOString();
      }
    }
    if (!lastCookies || lastCookies.length === 0) return res.json({ error: 'no_cookie_sets' });
    // Return all sets as-is
    res.json({ last_updated: lastCollectionTime, sets: lastCookies });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req, res) => {
  res.type('text/plain').send(`
Full Cookie Collector
---------------------
Last collection: ${lastCollectionTime || 'never'}
Saved sets: ${lastCookies.length}
Active browser: ${activeBrowser ? 'yes' : 'no'}
Collection stats: ${JSON.stringify(collectionStats)}
  `.trim());
});

app.get('/stats', (req, res) => {
  res.json({ stats: collectionStats, last_collection: lastCollectionTime, saved_sets: lastCookies.length });
});

// ---------------- SIGNAL HANDLERS ----------------
process.on('SIGTERM', async () => {
  console.log('SIGTERM received - shutting down gracefully');
  isShuttingDown = true;
  if (activeBrowser) {
    try { await activeBrowser.close(); } catch {}
  }
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('SIGINT received - shutting down gracefully');
  isShuttingDown = true;
  if (activeBrowser) {
    try { await activeBrowser.close(); } catch {}
  }
  process.exit(0);
});

// ---------------- LOAD ON START ----------------
(async () => {
  lastCookies = await loadCookiesFromFile();
  if (!Array.isArray(lastCookies)) lastCookies = [];
})();

// ---------------- AUTO COLLECT (OPTIONAL) ----------------
if (CONFIG.AUTO_COLLECT_ENABLED) {
  setInterval(async () => {
    if (!isShuttingDown) {
      console.log('AUTO COLLECT triggered');
      await runCollectionOnce();
    }
  }, CONFIG.AUTO_COLLECT_INTERVAL);

  // initial delayed run
  setTimeout(() => { if (!isShuttingDown) runCollectionOnce(); }, CONFIG.INITIAL_COLLECTION_DELAY);
}

// ---------------- START SERVER ----------------
app.listen(CONFIG.PORT, () => {
  console.log(`✅ Cookie collector listening on http://localhost:${CONFIG.PORT}`);
  console.log(`Endpoints: /collect /last-cookies /health /stats`);
});
