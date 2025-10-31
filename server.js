// server.js
const express = require('express');
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

let lastCookies = [];
let lastCollectionTime = null;

// ====== Playwright browser cache ayarları ======
const BROWSERS_PATH = '/tmp/playwright-browsers'; // Playwright tarayıcılarını buraya kuracağız
const INSTALLED_MARKER = path.join(BROWSERS_PATH, '.installed_marker');

// Bu fonksiyon, eğer tarayıcılar yoksa onları /tmp içine kurar.
// (PLAYWRIGHT_BROWSERS_PATH environment variable ile npx playwright install çalıştırıyoruz)
function ensureChromiumInstalled() {
  try {
    if (fs.existsSync(INSTALLED_MARKER)) {
      console.log('✅ Playwright Chromium zaten kurulu (marker mevcut).');
      return;
    }

    console.log('🧩 Playwright Chromium bulunamadı. /tmp içine kuruluyor — bir süre alabilir...');
    // Çalışma zamanı ortam değişkenini kullanarak npx playwright install chromium çalıştır
    // (BROWSERS_PATH içinde kurulum yapılacak)
    execSync(`PLAYWRIGHT_BROWSERS_PATH=${BROWSERS_PATH} npx playwright install chromium`, {
      stdio: 'inherit',
      env: Object.assign({}, process.env, { PLAYWRIGHT_BROWSERS_PATH: BROWSERS_PATH })
    });

    // Marker dosyası oluştur
    try {
      fs.mkdirSync(BROWSERS_PATH, { recursive: true });
      fs.writeFileSync(INSTALLED_MARKER, `installed-at: ${new Date().toISOString()}`);
    } catch (err) {
      // ignore minor errors
    }

    console.log('✅ Playwright Chromium kuruldu ve /tmp içinde cachelendi.');
  } catch (err) {
    console.error('❌ Playwright Chromium kurulurken hata:', err);
    // Hata durumunda sürece devam etmeyi deneyeceğiz; caller bu hatayı loglasın.
  }
}

// Hemen (başlangıçta) kontrol et — ama síncronize çalıştırıyoruz ki start sırasında kurulsun
ensureChromiumInstalled();

// Playwright'in hangi tarayıcı dizinini kullanacağını Node sürecine bildiriyoruz.
// Bu sayede chromium.launch() kurulu tarayıcıyı /tmp'den bulur.
process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSERS_PATH;

// ====== Fingerprint / Viewport yardımcıları ======
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport() {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 }
  ];
  return viewports[Math.floor(Math.random() * viewports.length)];
}

// ====== Playwright cookie toplama fonksiyonu ======
async function getCookiesWithPlaywright() {
  let browser;
  try {
    // Her çağrıda kontrol et (container boyunca kuruluysa marker var, ama yine de double-check)
    if (!fs.existsSync(INSTALLED_MARKER)) {
      console.log('⚠️ Kurulum marker bulunamadı — kurulum deneniyor tekrar...');
      ensureChromiumInstalled();
    }

    console.log('🚀 Playwright (Chromium) başlatılıyor...');
    const userAgent = getRandomUserAgent();
    const viewport = getRandomViewport();

    console.log(`🎯 UA: ${userAgent.substring(0, 60)}...`);
    console.log(`📏 Viewport: ${viewport.width}x${viewport.height}`);

    // Chromium'u başlat (Playwright kendi kurulum dizininden alacak çünkü PLAYWRIGHT_BROWSERS_PATH ayarlı)
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=site-per-process',
        `--window-size=${viewport.width},${viewport.height}`
      ]
    });

    const context = await browser.newContext({
      userAgent,
      viewport,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    console.log('🧹 Context cookie temizleniyor...');
    await context.clearCookies();
    console.log('✅ Cookie temizlendi');

    console.log('🌐 Hepsiburada giriş sayfasına gidiliyor...');
    await page.goto('https://giris.hepsiburada.com/', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('⏳ JS çalışması ve cookie oluşumu için bekleniyor (12s)...');
    await page.waitForTimeout(12000);

    console.log('🔄 Sayfa yenileniyor...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    console.log('🍪 Cookie alınıyor...');
    const cookies = await context.cookies();

    const hbusCookies = cookies.filter(c =>
      c.name.includes('hb-') || c.name.includes('AKA_') || c.name.includes('hepsiburada') || c.name.includes('hbus_')
    );

    console.log(`📊 Toplam cookie: ${cookies.length} | HBUS: ${hbusCookies.length}`);
    cookies.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} | ${c.domain} | ${c.value.slice(0, 30)}${c.value.length > 30 ? '...' : ''}`);
    });

    lastCookies = cookies;
    lastCollectionTime = new Date();

    return {
      success: true,
      all_cookies: cookies,
      hbus_cookies: hbusCookies,
      cookies_count: cookies.length,
      hbus_cookies_count: hbusCookies.length,
      fingerprint: { user_agent: userAgent, viewport, collection_time: lastCollectionTime },
      method: 'PLAYWRIGHT_CACHED',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('❌ PLAYWRIGHT HATA:', err.message || err);
    return { success: false, error: (err.message || String(err)), timestamp: new Date().toISOString() };
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔚 Browser kapatıldı');
    }
  }
}

// ====== Webhook gönderme ======
const axios = require('axios');
async function sendCookiesToWebhook(cookies, source) {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) return false;

    await axios.post(webhookUrl, {
      cookies,
      count: cookies.length,
      timestamp: new Date().toISOString(),
      source
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });

    console.log('📤 Cookie\'ler webhooka gönderildi');
    return true;
  } catch (err) {
    console.error('❌ Webhook gönderilemedi:', err.message || err);
    return false;
  }
}

// ====== Express routes ======
app.get('/', (req, res) => {
  if (!lastCookies.length) {
    return res.json({
      message: 'Henüz cookie toplanmadı. /collect endpointine gidin.',
      endpoints: { '/': "Son cookie'leri göster", '/collect': 'Yeni cookie topla', '/health': 'Durum' }
    });
  }

  res.json({
    last_collection: lastCollectionTime,
    cookies_count: lastCookies.length,
    cookies: lastCookies.map(c => ({
      name: c.name,
      domain: c.domain,
      value: c.value.slice(0, 50) + (c.value.length > 50 ? '...' : ''),
      httpOnly: c.httpOnly,
      secure: c.secure,
      session: c.session,
      size: c.value.length
    })),
    hbus_cookies: lastCookies.filter(c => c.name.includes('hb-') || c.name.includes('AKA_')).length
  });
});

app.get('/collect', async (req, res) => {
  console.log('\n=== YENİ COOKIE TOPLAMA ===', new Date().toLocaleTimeString('tr-TR'));
  const result = await getCookiesWithPlaywright();

  if (result.success && process.env.WEBHOOK_URL) {
    await sendCookiesToWebhook(result.all_cookies, 'PLAYWRIGHT_COLLECT');
  }

  res.json(result);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Hepsiburada Playwright Cookie Collector',
    last_collection: lastCollectionTime,
    cookies_count: lastCookies.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ====== Otomatik 20 dakika ======
setInterval(async () => {
  console.log('\n🕒 20 DAKİKA OTOMATİK ÇALIŞMA:', new Date().toLocaleTimeString('tr-TR'));
  const result = await getCookiesWithPlaywright();
  if (result.success && process.env.WEBHOOK_URL) {
    await sendCookiesToWebhook(result.all_cookies, 'PLAYWRIGHT_AUTO_20MIN');
  }
}, 20 * 60 * 1000);

// ====== Başlat ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Playwright cookie service çalışıyor — port:', PORT);
  // İlk toplama (opsiyonel)
  setTimeout(() => {
    console.log('🔄 İlk cookie toplama başlatılıyor...');
    getCookiesWithPlaywright();
  }, 3000);
});
