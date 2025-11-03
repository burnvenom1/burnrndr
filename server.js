// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - CHROME EKLENTİLERİ İLE UYUMLU COOKIE
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// ⚙️ AYARLAR - CHROME EKLENTİ UYUMLULUĞU İÇİN OPTİMİZE
const CONFIG = {
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 10 * 60 * 1000, // 10 DAKİKA
    FINGERPRINT_COUNT: 8, // 8 FARKLI FINGERPRINT (RAM için optimize)
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 2000, // 2-4 saniye arası
    MAX_HBUS_ATTEMPTS: 8, // Daha fazla deneme hakkı
    PAGE_LOAD_TIMEOUT: 40000, // 40 saniye
    
    // CHROME EKLENTİ AYARLARI
    CHROME_EXTENSIONS_COMPATIBLE: true,
    ENABLE_JAVASCRIPT: true,
    ENABLE_COOKIES: true,
    ENABLE_LOCAL_STORAGE: true,
    ENABLE_SESSION_STORAGE: true,
    
    // DİĞER AYARLAR
    INITIAL_COLLECTION_DELAY: 8000, // 8 saniye
    COOKIE_FILE: 'chrome_compatible_cookies.json'
};

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0
};

// 🎯 GERÇEK ZAMANLI MEMORY TAKİBİ
let currentMemory = { node: 0, total: 0, updated: '' };

// 🎯 BROWSER INSTANCE TRACKING
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 KALICI COOKIE DOSYASI İŞLEMLERİ - CHROME UYUMLU
async function saveCookiesToFile(cookies) {
    try {
        const data = {
            cookies: cookies,
            timestamp: new Date().toISOString(),
            source: 'chrome_extension_compatible',
            version: '2.0',
            stats: {
                total_sets: cookies.length,
                total_cookies: cookies.reduce((sum, set) => sum + set.stats.total_cookies, 0),
                total_hbus_cookies: cookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0),
                chrome_compatible: true
            }
        };
        
        const filePath = path.join(__dirname, CONFIG.COOKIE_FILE);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log('💾 Chrome uyumlu cookie\'ler dosyaya kaydedildi:', data.stats.total_sets + ' set');
        return true;
    } catch (error) {
        console.log('❌ Cookie kaydetme hatası:', error.message);
        return false;
    }
}

async function loadCookiesFromFile() {
    try {
        const filePath = path.join(__dirname, CONFIG.COOKIE_FILE);
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log('📥 Chrome uyumlu cookie\'ler dosyadan yüklendi:', parsed.stats.total_sets + ' set');
        return parsed.cookies;
    } catch (error) {
        console.log('❌ Cookie yükleme hatası:', error.message);
        return [];
    }
}

// 🎯 CHROME EKLENTİLERİ İÇİN ÖZEL COOKIE FORMATI
function formatCookiesForChrome(cookies) {
    return cookies.map(cookie => {
        // 🎯 CHROME EKLENTİLERİ İLE TAM UYUMLU FORMAT
        return {
            name: cookie.name || '',
            value: cookie.value || '',
            domain: cookie.domain || '.hepsiburada.com',
            path: cookie.path || '/',
            expires: cookie.expires || (Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000, // 1 yıl
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure !== undefined ? cookie.secure : true,
            sameSite: cookie.sameSite || 'Lax',
            session: cookie.session || false,
            storeId: cookie.storeId || '0',
            hostOnly: cookie.hostOnly || false
        };
    });
}

// 🎯 RENDER STABİLİTE - ERROR HANDLERS
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser emergency kapatıldı');
        }
    } catch (e) {
        console.log('❌ Emergency browser kapatma hatası:', e.message);
    }
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser unhandled rejection kapatıldı');
        }
    } catch (e) {
        console.log('❌ Unhandled rejection browser kapatma hatası:', e.message);
    }
});

process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM ALINDI - Graceful shutdown');
    isShuttingDown = true;
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser SIGTERM ile kapatıldı');
        }
        process.exit(0);
    } catch (error) {
        console.log('❌ SIGTERM shutdown hatası:', error.message);
        process.exit(1);
    }
});

// 🎯 GERÇEK MEMORY HESAPLAMA FONKSİYONU
function getRealMemoryUsage() {
    const nodeMemory = process.memoryUsage();
    const nodeMB = Math.round(nodeMemory.heapUsed / 1024 / 1024);
    
    const estimatedTotalMB = nodeMB + 100 + (lastCookies.length * 25);
    
    return {
        node_process: nodeMB + ' MB',
        estimated_total: estimatedTotalMB + ' MB',
        system_usage: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB / ' + 
                     Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        note: "estimated_total = Node.js + Browser (~100MB) + Context'ler (~25MB each)"
    };
}

// 🎯 GELİŞMİŞ USER AGENT ÜRETİMİ - CHROME TABANLI
function getRandomUserAgent() {
    const chromeVersions = [
        '120.0.0.0', '119.0.0.0', '118.0.0.0', '117.0.0.0', 
        '116.0.0.0', '115.0.0.0', '114.0.0.0', '113.0.0.0'
    ];
    
    const platforms = [
        {
            os: 'Windows NT 10.0; Win64; x64',
            platform: 'Windows',
            chromeVersion: chromeVersions[Math.floor(Math.random() * chromeVersions.length)]
        },
        {
            os: 'Windows NT 6.1; Win64; x64',
            platform: 'Windows',
            chromeVersion: chromeVersions[Math.floor(Math.random() * chromeVersions.length)]
        },
        {
            os: 'Macintosh; Intel Mac OS X 10_15_7',
            platform: 'MacOS',
            chromeVersion: chromeVersions[Math.floor(Math.random() * chromeVersions.length)]
        },
        {
            os: 'X11; Linux x86_64',
            platform: 'Linux',
            chromeVersion: chromeVersions[Math.floor(Math.random() * chromeVersions.length)]
        }
    ];
    
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    return `Mozilla/5.0 (${platform.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${platform.chromeVersion} Safari/537.36`;
}

// RASTGELE VIEWPORT ÜRET
function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 },
        { width: 1600, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// RASTGELE DİL AYARLARI
function getRandomLanguage() {
    const languages = [
        'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'tr-TR,tr;q=0.9,en;q=0.8',
        'en-US,en;q=0.9,tr;q=0.8',
        'tr,en;q=0.9,en-US;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
}

// 🎯 GELİŞMİŞ CHROME AYARLARI - EKLENTİ UYUMLU
function getChromeArgs() {
    return [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--no-zygote',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-back-forward-cache',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-translate',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-client-side-phishing-detection',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-prompt-on-repost',
        '--disable-cookie-encryption',
        '--max-old-space-size=512'
    ];
}

// HBUS KONTROL FONKSİYONU
function checkRequiredHbusCookies(cookies) {
    const requiredCookies = [
        'hbus_sessionId',
        'hbus_anonymousId',
        'hbus_sessionId.sig',
        'hbus_anonymousId.sig'
    ];
    
    const foundCookies = {};
    requiredCookies.forEach(cookieName => {
        foundCookies[cookieName] = cookies.find(cookie => cookie.name === cookieName);
    });
    
    const hasSessionId = !!foundCookies['hbus_sessionId'];
    const hasAnonymousId = !!foundCookies['hbus_anonymousId'];
    const hasSessionSig = !!foundCookies['hbus_sessionId.sig'];
    const hasAnonymousSig = !!foundCookies['hbus_anonymousId.sig'];
    
    const success = hasSessionId && hasAnonymousId && hasSessionSig && hasAnonymousSig;
    
    return {
        success: success,
        hasSessionId: hasSessionId,
        hasAnonymousId: hasAnonymousId,
        hasSessionSig: hasSessionSig,
        hasAnonymousSig: hasAnonymousSig,
        cookies: foundCookies
    };
}

// YENİ CONTEXT OLUŞTUR - CHROME EKLENTİ UYUMLU
async function createNewContext(browser) {
    const userAgent = getRandomUserAgent();
    const viewport = getRandomViewport();
    const language = getRandomLanguage();
    
    console.log('🆕 Chrome Uyumlu Fingerprint:');
    console.log(`   📱 User-Agent: ${userAgent.substring(0, 60)}...`);
    console.log(`   📏 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`   🌐 Dil: ${language}`);
    
    const context = await browser.newContext({
        viewport: viewport,
        userAgent: userAgent,
        acceptDownloads: false,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: CONFIG.ENABLE_JAVASCRIPT,
        bypassCSP: true,
        // 🎯 CHROME EKLENTİ UYUMLU AYARLAR
        extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': language,
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Sec-Ch-Ua': `"Google Chrome";v="${Math.floor(Math.random() * 10) + 115}", "Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}"`,
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': userAgent
        }
    });
    
    // 🎯 LOCAL STORAGE VE SESSION STORAGE İZİN VER
    await context.addInitScript(() => {
        // Local Storage erişimi
        if (window.localStorage) {
            Object.defineProperty(window, 'localStorage', {
                value: window.localStorage,
                writable: false
            });
        }
        
        // Session Storage erişimi
        if (window.sessionStorage) {
            Object.defineProperty(window, 'sessionStorage', {
                value: window.sessionStorage,
                writable: false
            });
        }
        
        // Cookie erişimi
        Object.defineProperty(document, 'cookie', {
            get: function() {
                return document.cookie;
            },
            set: function(cookie) {
                document.cookie = cookie;
            },
            configurable: false
        });
    });
    
    return context;
}

// 🎯 GELİŞMİŞ COOKIE BEKLEME SİSTEMİ - CHROME UYUMLU
async function waitForHbusCookies(page, context, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 HBUS kontrolü (${attempts}/${maxAttempts})...`);
        
        try {
            // 🎯 1. CONTEXT COOKIE'LERİNİ KONTROL ET
            const contextCookies = await context.cookies();
            const contextHbusCheck = checkRequiredHbusCookies(contextCookies);
            
            if (contextHbusCheck.success) {
                console.log('✅ CONTEXT: GEREKLİ HBUS COOKIE\'LERİ BULUNDU!');
                return {
                    success: true,
                    attempts: attempts,
                    cookies: contextCookies,
                    hbusCheck: contextHbusCheck,
                    method: 'CONTEXT_COOKIES'
                };
            }
            
            // 🎯 2. JAVASCRIPT İLE BROWSER COOKIE'LERİNİ KONTROL ET
            const browserCookies = await page.evaluate(() => {
                return document.cookie;
            });
            
            if (browserCookies && browserCookies.includes('hbus_')) {
                console.log('📊 JS Cookie Tespit Edildi:', browserCookies.length + ' karakter');
                
                // JavaScript cookie'lerini parse et
                const cookiesArray = [];
                browserCookies.split(';').forEach(cookie => {
                    const [name, value] = cookie.trim().split('=');
                    if (name && value && name.includes('hbus_')) {
                        cookiesArray.push({ 
                            name: name.trim(), 
                            value: value.trim(),
                            domain: '.hepsiburada.com',
                            path: '/'
                        });
                    }
                });
                
                if (cookiesArray.length > 0) {
                    console.log('📋 JS HBUS Cookie\'leri:', cookiesArray.length);
                    cookiesArray.forEach(cookie => {
                        console.log(`   - ${cookie.name}`);
                    });
                    
                    // Context'e cookie'leri ekle
                    for (const cookie of cookiesArray) {
                        await context.addCookies([cookie]);
                    }
                    
                    // Tekrar kontrol et
                    const updatedContextCookies = await context.cookies();
                    const updatedHbusCheck = checkRequiredHbusCookies(updatedContextCookies);
                    
                    if (updatedHbusCheck.success) {
                        console.log('✅ JS + CONTEXT: HBUS COOKIE\'LERİ TAMAM!');
                        return {
                            success: true,
                            attempts: attempts,
                            cookies: updatedContextCookies,
                            hbusCheck: updatedHbusCheck,
                            method: 'JAVASCRIPT_TO_CONTEXT'
                        };
                    }
                }
            }
            
            // 🎯 3. LOCAL STORAGE KONTROLÜ
            const localStorageData = await page.evaluate(() => {
                const data = {};
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.includes('hbus')) {
                            data[key] = localStorage.getItem(key);
                        }
                    }
                } catch (e) {}
                return data;
            });
            
            if (Object.keys(localStorageData).length > 0) {
                console.log('💾 LocalStorage HBUS Verileri:', Object.keys(localStorageData));
            }
            
        } catch (error) {
            console.log('⚠️ Cookie kontrol hatası:', error.message);
        }
        
        // 🎯 4-6 SANİYE BEKLEME
        const waitTime = 4000 + Math.random() * 2000;
        console.log(`⏳ ${Math.round(waitTime/1000)} saniye bekleniyor...`);
        await page.waitForTimeout(waitTime);
        
        // 🎯 SAYFAYI YENİLE - BAZEN GEREKLİ
        if (attempts % 3 === 0) {
            console.log('🔄 Sayfa yenileniyor...');
            try {
                await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
            } catch (e) {
                console.log('⚠️ Sayfa yenileme hatası:', e.message);
            }
        }
    }
    
    console.log('❌ MAKSİMUM DENEME SAYISINA ULAŞILDI');
    const finalContextCookies = await context.cookies();
    const finalHbusCheck = checkRequiredHbusCookies(finalContextCookies);
    
    return {
        success: false,
        attempts: attempts,
        cookies: finalContextCookies,
        hbusCheck: finalHbusCheck,
        method: 'FINAL_ATTEMPT'
    };
}

// 🎯 ANA COOKIE TOPLAMA FONKSİYONU - CHROME EKLENTİ UYUMLU
async function getCookies() {
    if (isShuttingDown) {
        console.log('❌ Shutdown modunda - yeni işlem başlatılmıyor');
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.FINGERPRINT_COUNT} CHROME UYUMLU FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        console.log('📊 Mevcut chrome uyumlu cookie setleri:', lastCookies.length + ' set');
        
        // 🎯 CHROME EKLENTİ UYUMLU BROWSER AYARLARI
        browser = await chromium.launch({
            headless: true,
            args: getChromeArgs()
        });

        activeBrowser = browser;

        console.log(`✅ Chrome browser başlatıldı - ${CONFIG.FINGERPRINT_COUNT} FARKLI FINGERPRINT DENEMESİ BAŞLIYOR...\n`);

        for (let i = 1; i <= CONFIG.FINGERPRINT_COUNT; i++) {
            if (isShuttingDown) break;
            
            console.log(`\n🔄 === CHROME FINGERPRINT ${i}/${CONFIG.FINGERPRINT_COUNT} ===`);
            
            let context;
            let page;
            
            try {
                // 1. CHROME UYUMLU CONTEXT OLUŞTUR
                context = await createNewContext(browser);
                page = await context.newPage();

                // 2. ÖNCE COOKIE'LERİ TEMİZLE
                console.log('🧹 Cookie\'ler temizleniyor...');
                await context.clearCookies();

                // 3. HEPSIBURADA ANA SAYFA İLE BAŞLA
                console.log('🌐 Hepsiburada ana sayfaya gidiliyor...');
                await page.goto('https://www.hepsiburada.com', {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.PAGE_LOAD_TIMEOUT
                });

                console.log('✅ Ana sayfa yüklendi, JS çalışıyor...');

                // 4. BİRAZ BEKLE VE SONRA SİPARİŞLER SAYFASINA GİT
                await page.waitForTimeout(3000);
                
                console.log('🛒 Siparişler sayfasına yönlendiriliyor...');
                await page.goto('https://www.hepsiburada.com/siparislerim', {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.PAGE_LOAD_TIMEOUT
                });

                console.log('✅ Siparişler sayfası yüklendi, HBUS cookie bekleniyor...');

                // 5. GELİŞMİŞ HBUS BEKLEME SİSTEMİ
                const hbusResult = await waitForHbusCookies(page, context, CONFIG.MAX_HBUS_ATTEMPTS);
                
                const result = {
                    fingerprint_id: i,
                    success: hbusResult.success,
                    attempts: hbusResult.attempts,
                    cookies_count: hbusResult.cookies ? hbusResult.cookies.length : 0,
                    hbus_cookies_count: hbusResult.cookies ? hbusResult.cookies.filter(c => c.name.includes('hbus_')).length : 0,
                    required_hbus_success: hbusResult.hbusCheck.success,
                    method: hbusResult.method,
                    timestamp: new Date().toISOString()
                };

                allResults.push(result);

                // 🎯 BAŞARILI İSE CHROME UYUMLU COOKIE'LERİ KAYDET
                if (hbusResult.success && hbusResult.cookies) {
                    const hbusCheck = checkRequiredHbusCookies(hbusResult.cookies);
                    if (hbusCheck.success) {
                        const successfulSet = {
                            set_id: i,
                            success: true,
                            cookies: formatCookiesForChrome(hbusResult.cookies), // 🎯 CHROME FORMATI
                            raw_cookies: hbusResult.cookies, // Orijinal cookie'ler
                            stats: {
                                total_cookies: hbusResult.cookies.length,
                                hbus_cookies: hbusResult.cookies.filter(c => c.name.includes('hbus_')).length,
                                has_required_hbus: true,
                                chrome_compatible: true
                            },
                            fingerprint: {
                                user_agent: await browser.userAgent(),
                                viewport: page.viewportSize(),
                                method: hbusResult.method
                            },
                            collection_time: new Date().toISOString()
                        };
                        
                        currentSuccessfulSets.push(successfulSet);
                        console.log(`✅ CHROME FINGERPRINT ${i}: BAŞARILI - ${hbusResult.cookies.length} cookie (${successfulSet.stats.hbus_cookies} HBUS)`);
                    }
                } else {
                    console.log(`❌ CHROME FINGERPRINT ${i}: BAŞARISIZ`);
                }

            } catch (error) {
                console.log(`❌ CHROME FINGERPRINT ${i} HATA:`, error.message);
                allResults.push({
                    fingerprint_id: i,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } finally {
                // 🧹 TEMİZLİK
                if (page) {
                    try {
                        await page.close();
                        console.log(`   ✅ Sayfa ${i} kapatıldı`);
                    } catch (e) {
                        console.log(`   ⚠️ Sayfa kapatma hatası: ${e.message}`);
                    }
                }
                
                if (context) {
                    try {
                        await context.close();
                        console.log(`   ✅ Context ${i} kapatıldı`);
                    } catch (e) {
                        console.log(`   ⚠️ Context kapatma hatası: ${e.message}`);
                    }
                }
            }

            // FINGERPRINT'LER ARASI BEKLEME
            if (i < CONFIG.FINGERPRINT_COUNT && !isShuttingDown) {
                const waitBetween = CONFIG.WAIT_BETWEEN_FINGERPRINTS + Math.random() * 2000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        // 🎯 BROWSER'I KAPAT
        await browser.close();
        activeBrowser = null;
        console.log('\n✅ Tüm chrome fingerprint denemeleri tamamlandı');

        // İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === CHROME FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (4 HBUS cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            
            console.log('🔄 Eski cookie setleri siliniyor, yeni chrome uyumlu setler kaydediliyor...');
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            // 🎯 DOSYAYA KALICI KAYDET
            await saveCookiesToFile(currentSuccessfulSets);
            
            console.log('\n📋 YENİ CHROME UYUMLU COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS) - ${set.fingerprint.method}`);
            });
        } else {
            console.log('❌ Hiç başarılı chrome cookie seti bulunamadı, eski cookie\'ler korunuyor');
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            chrome_compatible: true,
            previous_cookies_preserved: successfulCount === 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ CHROME FINGERPRINT HATA:', error.message);
        if (browser) {
            await browser.close();
            activeBrowser = null;
        }
        
        return {
            overall_success: false,
            error: error.message,
            chrome_compatible: false,
            timestamp: new Date().toISOString()
        };
    }
}

// 🎯 CHROME EKLENTİLERİ İLE TAM UYUMLU ENDPOINT
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz chrome uyumlu cookie toplanmadı',
            chrome_compatible: false
        });
    }

    // 🎯 SADECE BAŞARILI VE CHROME UYUMLU SET'LER
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus && set.stats.chrome_compatible);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Chrome uyumlu cookie seti bulunamadı',
            chrome_compatible: false
        });
    }

    // 🎯 CHROME EKLENTİLERİ İLE TAM UYUMLU JSON
    const result = {
        chrome_extension_compatible: true,
        version: '2.0',
        last_updated: lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
        total_sets: successfulSets.length,
        sets: {}
    };
    
    // 🎯 HER SET İÇİN TAM COOKIE DETAYI
    successfulSets.forEach(set => {
        result.sets[`set${set.set_id}`] = {
            cookies: set.cookies, // 🎯 FORMATLANMIŞ CHROME COOKIE'LERİ
            stats: set.stats,
            fingerprint: set.fingerprint,
            collection_time: set.collection_time
        };
    });

    res.json(result);
});

// 🎯 CHROME EKLENTİSİ İÇİN ÖZEL ENDPOINT
app.get('/chrome-extension-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            success: false,
            error: 'No cookies available',
            chrome_compatible: false
        });
    }

    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus && set.stats.chrome_compatible);

    if (successfulSets.length === 0) {
        return res.json({
            success: false,
            error: 'No chrome compatible cookies',
            chrome_compatible: false
        });
    }

    // 🎯 CHROME EKLENTİSİ İÇİN BASİT FORMAT
    const cookiesArray = [];
    successfulSets.forEach(set => {
        set.cookies.forEach(cookie => {
            cookiesArray.push({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                expirationDate: cookie.expires,
                storeId: cookie.storeId || '0',
                hostOnly: cookie.hostOnly || false
            });
        });
    });

    res.json({
        success: true,
        chrome_compatible: true,
        total_cookies: cookiesArray.length,
        total_sets: successfulSets.length,
        cookies: cookiesArray,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : new Date().toISOString()
    });
});

// WEBHOOK FONKSİYONU - CHROME UYUMLU
async function sendCookiesToWebhook(cookies, source) {
    try {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (webhookUrl) {
            const axios = require('axios');
            const payload = {
                cookies: cookies,
                count: cookies.length,
                timestamp: new Date().toISOString(),
                source: source,
                chrome_compatible: true,
                version: '2.0'
            };
            await axios.post(webhookUrl, payload, { timeout: 15000 });
            console.log('📤 Chrome uyumlu cookie\'ler webhooka gönderildi');
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ Webhook gönderilemedi:', error.message);
        return false;
    }
}

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'Chrome Extension Compatible Cookie Collector',
        config: CONFIG,
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.FINGERPRINT_COUNT} chrome fingerprint ile cookie topla`, 
            '/last-cookies': 'Son alınan cookie\'leri göster (Chrome uyumlu)',
            '/chrome-extension-cookies': 'Chrome eklentisi için optimize edilmiş format',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster'
        },
        features: {
            chrome_extension_compatible: true,
            persistent_storage: true,
            multiple_fingerprints: true,
            automatic_collection: CONFIG.AUTO_COLLECT_ENABLED,
            memory_optimized: true
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        stats: collectionStats
    });
});

// FINGERPRINT İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.FINGERPRINT_COUNT} CHROME FINGERPRINT COOKIE TOPLAMA ===`);
    const result = await getCookies();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `CHROME_FINGERPRINT_SET_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus && set.stats.chrome_compatible);
    const successfulCount = successfulSets.length;
    
    const RENDER_TOTAL_RAM = 512;
    const nodeMemoryMB = currentMemory.node;
    const estimatedUsedRAM = Math.min(RENDER_TOTAL_RAM, nodeMemoryMB + 150);
    const estimatedFreeRAM = RENDER_TOTAL_RAM - estimatedUsedRAM;
    
    let memoryStatus = "🟢 NORMAL";
    if (estimatedFreeRAM < 50) memoryStatus = "🔴 CRITICAL - RAM BİTİYOR!";
    else if (estimatedFreeRAM < 100) memoryStatus = "🟠 TEHLİKE - AZ RAM KALDI!";
    else if (estimatedFreeRAM < 200) memoryStatus = "🟡 DİKKAT - RAM AZALIYOR";
    
    const healthText = `
🚀 CHROME EKLENTİ UYUMLU COOKIE COLLECTOR
==========================================

🧠 RAM DURUMU:
├── Toplam RAM: 512 MB
├── Kullanılan: ${estimatedUsedRAM} MB
├── Boş RAM: ${estimatedFreeRAM} MB  
├── Node.js: ${nodeMemoryMB} MB
└── Durum: ${memoryStatus}

📊 CHROME COOKIE DURUMU:
├── Toplam Set: ${currentSetsCount}
├── Chrome Uyumlu: ${successfulCount}
├── Başarı Oranı: ${currentSetsCount > 0 ? ((successfulCount / currentSetsCount) * 100).toFixed(1) + '%' : '0%'}
├── Son Toplama: ${lastCollectionTime ? new Date(lastCollectionTime).toLocaleString('tr-TR') : 'Henüz yok'}
└── Chrome Uyumluluk: ✅ AKTİF

🎯 CHROME ÖZELLİKLERİ:
├── Eklenti Uyumlu Format: ✅ AKTİF
├── Local Storage Desteği: ✅ AKTİF  
├── Session Storage Desteği: ✅ AKTİF
├── JavaScript Cookie Okuma: ✅ AKTİF
└── Tam Chrome Benzetimi: ✅ AKTİF

📈 İSTATİSTİKLER:
├── Toplam Çalışma: ${collectionStats.total_runs}
├── Başarılı Çalışma: ${collectionStats.successful_runs}
└── Başarı Oranı: ${collectionStats.total_runs > 0 ? 
    ((collectionStats.successful_runs / collectionStats.total_runs) * 100).toFixed(1) + '%' : '0%'}

🌐 CHROME ENDPOINT'LERİ:
├── /last-cookies - Chrome uyumlu cookie'ler
├── /chrome-extension-cookies - Eklenti için optimize
├── /collect - Yeni cookie toplama
└── /health - Bu sayfa

💡 TAVSİYE:
${estimatedFreeRAM < 100 ? '❌ ACİL: FINGERPRINT sayısını AZALT! RAM bitmek üzere!' : '✅ Sistem stabil - Chrome eklentileri ile uyumlu'}

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
==========================================
    `.trim();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(healthText);
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const successRate = collectionStats.total_runs > 0 
        ? (collectionStats.successful_runs / collectionStats.total_runs * 100).toFixed(1)
        : 0;
    
    const chromeCompatibleSets = lastCookies.filter(set => set.stats.chrome_compatible);
    
    res.json({
        config: CONFIG,
        collection_stats: collectionStats,
        success_rate: successRate + '%',
        last_collection: lastCollectionTime,
        chrome_compatible_stats: {
            total_sets: chromeCompatibleSets.length,
            successful_sets: chromeCompatibleSets.filter(set => set.stats.has_required_hbus).length,
            success_rate: chromeCompatibleSets.length > 0 ? 
                (chromeCompatibleSets.filter(set => set.stats.has_required_hbus).length / chromeCompatibleSets.length * 100).toFixed(1) + '%' : '0%'
        },
        current_cookie_sets: {
            total_sets: lastCookies.length,
            chrome_compatible_sets: chromeCompatibleSets.length,
            sets: chromeCompatibleSets.map(set => ({
                set_id: set.set_id,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                chrome_compatible: set.stats.chrome_compatible,
                collection_time: set.collection_time,
                method: set.fingerprint.method
            }))
        },
        chrome_features: {
            extension_compatible: true,
            cookie_format: 'chrome_standard',
            storage_support: true,
            multiple_domains: true
        }
    });
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;

// 🎯 OTOMATİK MEMORY GÜNCELLEME
setInterval(() => {
    const nodeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    currentMemory = {
        node: nodeMB,
        total: nodeMB + 100 + (lastCookies.length * 25),
        updated: new Date().toLocaleTimeString('tr-TR')
    };
}, 5000);

// 🧠 SUNUCU BAŞLARKEN SON CHROME COOKIE VERİSİNİ RAM'E YÜKLE
(async () => {
  try {
    const loaded = await loadCookiesFromFile();
    if (loaded && loaded.length > 0) {
      lastCookies = loaded;
      console.log(`✅ ${loaded.length} chrome uyumlu cookie seti RAM'e yüklendi`);
    } else {
      console.log("ℹ️ Henüz kayıtlı chrome cookie bulunamadı, boş başlatılıyor.");
    }
  } catch (err) {
    console.error("❌ Chrome cookie yüklenirken hata:", err.message);
  }
})();

// 🎯 CHROME OTOMATİK COOKIE TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ CHROME OTOMATİK COOKIE TOPLAMA AKTİF');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} DAKİKALIK OTOMATİK ${CONFIG.FINGERPRINT_COUNT} CHROME FINGERPRINT ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookies();
        
        if (result.overall_success) {
            console.log(`✅ CHROME OTOMATİK: ${result.successful_attempts}/${CONFIG.FINGERPRINT_COUNT} başarılı`);
            
            if (process.env.WEBHOOK_URL && result.cookie_sets) {
                for (const set of result.cookie_sets) {
                    await sendCookiesToWebhook(set.cookies, `AUTO_CHROME_FINGERPRINT_SET_${set.set_id}`);
                }
            }
        } else {
            console.log('❌ CHROME OTOMATİK: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

app.listen(PORT, async () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 CHROME EKLENTİ UYUMLU COOKIE COLLECTOR ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 / - Endpoint listesi ve ayarlar`);
    console.log(`📍 /collect - ${CONFIG.FINGERPRINT_COUNT} chrome fingerprint ile cookie topla`);
    console.log('📍 /last-cookies - Chrome uyumlu cookie\'leri göster');
    console.log('📍 /chrome-extension-cookies - Eklenti için optimize edilmiş');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('🎯 4 HBUS cookie olan setler BAŞARILI sayılır');
    console.log('💾 Chrome eklenti uyumlu kalıcı kayıt: ✅ AKTİF');
    console.log('🛡️ Chrome özellikleri:');
    console.log('   ├── Eklenti uyumlu cookie formatı ✅');
    console.log('   ├── Local Storage desteği ✅');
    console.log('   ├── Session Storage desteği ✅');
    console.log('   ├── JavaScript cookie okuma ✅');
    console.log('   └── Tam Chrome benzetimi ✅');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.FINGERPRINT_COUNT} chrome fingerprint`);
    } else {
        console.log('⏰ Otomatik toplama: KAPALI');
    }
    
    console.log('====================================\n');
    
    // İlk çalıştırma
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        setTimeout(() => {
            console.log('🔄 İlk chrome cookie toplama başlatılıyor...');
            getCookies();
        }, CONFIG.INITIAL_COLLECTION_DELAY);
    }
});
