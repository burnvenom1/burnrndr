// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - DOSYA TABANLI KALICI COOKIE + PROXY DESTEĞİ
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();

app.use(express.json());

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 10 * 60 * 1000, // 10 DAKİKA
    FINGERPRINT_COUNT: 10, // 10 FARKLI FINGERPRINT
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 1000, // 1-3 saniye arası
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000, // 30 saniyeye düşürüldü
    
    // DİĞER AYARLAR
    INITIAL_COLLECTION_DELAY: 5000, // 5 saniye
    COOKIE_FILE: 'last_cookies.json' // 🎯 KALICI COOKIE DOSYASI
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

// 🎯 BROWSER INSTANCE TRACKING (RENDER İÇİN ÖNEMLİ)
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 KALICI COOKIE DOSYASI İŞLEMLERİ
async function saveCookiesToFile(cookies) {
    try {
        const data = {
            cookies: cookies,
            timestamp: new Date().toISOString(),
            stats: {
                total_sets: cookies.length,
                total_cookies: cookies.reduce((sum, set) => sum + set.stats.total_cookies, 0),
                total_hbus_cookies: cookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0)
            }
        };
        
        const filePath = path.join(__dirname, CONFIG.COOKIE_FILE);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log('💾 Cookie\'ler dosyaya kaydedildi:', data.stats.total_sets + ' set');
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
        console.log('📥 Cookie\'ler dosyadan yüklendi:', parsed.stats.total_sets + ' set');
        return parsed.cookies;
    } catch (error) {
        console.log('❌ Cookie yükleme hatası:', error.message);
        return [];
    }
}

// 🎯 RENDER STABİLİTE - UNCAUGHT EXCEPTION HANDLER
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    console.log('🔄 Browser kapatılıyor ve process temizleniyor...');
    
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

// 🎯 RENDER STABİLİTE - UNHANDLED REJECTION HANDLER
process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    console.log('🔄 Browser kapatılıyor...');
    
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser unhandled rejection kapatıldı');
        }
    } catch (e) {
        console.log('❌ Unhandled rejection browser kapatma hatası:', e.message);
    }
});

// 🎯 RENDER STABİLİTE - SIGTERM HANDLER (RENDER DOSTU)
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
    
    const estimatedTotalMB = nodeMB + 80 + (lastCookies.length * 30);
    
    return {
        node_process: nodeMB + ' MB',
        estimated_total: estimatedTotalMB + ' MB',
        system_usage: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB / ' + 
                     Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        note: "estimated_total = Node.js + Browser (~80MB) + Context'ler (~30MB each)"
    };
}

// RASTGELE USER AGENT ÜRET
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// RASTGELE VIEWPORT ÜRET
function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 },
        { width: 1024, height: 768 },
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

// HBUS KONTROL FONKSİYONU
function checkRequiredHbusCookies(cookies) {
    const hbusSessionId = cookies.find(cookie => 
        cookie.name === 'hbus_sessionId'
    );
    const hbusAnonymousId = cookies.find(cookie => 
        cookie.name === 'hbus_anonymousId'
    );
    
    const hasSessionId = !!hbusSessionId;
    const hasAnonymousId = !!hbusAnonymousId;
    const success = hasSessionId && hasAnonymousId;
    
    return {
        success: success,
        hasSessionId: hasSessionId,
        hasAnonymousId: hasAnonymousId,
        sessionId: hbusSessionId,
        anonymousId: hbusAnonymousId
    };
}

// YENİ CONTEXT OLUŞTUR (FINGERPRINT DEĞİŞTİR)
async function createNewContext(browser) {
    const userAgent = getRandomUserAgent();
    const viewport = getRandomViewport();
    const language = getRandomLanguage();
    
    console.log('🆕 Yeni Fingerprint:');
    console.log(`   📱 User-Agent: ${userAgent.substring(0, 60)}...`);
    console.log(`   📏 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`   🌐 Dil: ${language}`);
    
    const context = await browser.newContext({
        viewport: viewport,
        userAgent: userAgent,
        extraHTTPHeaders: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': language,
            'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        }
    });
    
    return context;
}

// HBUS BEKLEME DÖNGÜSÜ - JAVASCRIPT İLE COOKIE OKUMA
async function waitForHbusCookies(page, context, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 HBUS kontrolü (${attempts}/${maxAttempts})...`);
        
        // 🎯 SAYFA İÇİNDE JAVASCRIPT İLE COOKIE OKU
        const browserCookies = await page.evaluate(() => {
            return document.cookie;
        });
        
        // JavaScript cookie'lerini parse et
        const cookiesArray = [];
        if (browserCookies) {
            browserCookies.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                if (name && value) {
                    cookiesArray.push({ 
                        name: name.trim(), 
                        value: value.trim() 
                    });
                }
            });
        }
        
        console.log(`📊 JS Cookie Sayısı: ${cookiesArray.length}`);
        
        // HBUS kontrolü yap
        const hbusCheck = checkRequiredHbusCookies(cookiesArray);
        
        if (hbusCheck.success) {
            console.log('✅ GEREKLİ HBUS COOKIE\'LERİ BULUNDU!');
            
            // Context cookie'lerini de güncelle ve döndür
            const contextCookies = await context.cookies();
            return {
                success: true,
                attempts: attempts,
                cookies: contextCookies,
                hbusCheck: hbusCheck,
                method: 'JAVASCRIPT_COOKIE_READ'
            };
        } else {
            // Hangi cookie'lerin eksik olduğunu göster
            if (cookiesArray.length > 0) {
                const hbusCookies = cookiesArray.filter(c => c.name.includes('hbus_'));
                if (hbusCookies.length > 0) {
                    console.log('📋 Mevcut HBUS Cookie\'leri:');
                    hbusCookies.forEach(cookie => {
                        console.log(`   - ${cookie.name}`);
                    });
                }
            }
        }
        
        // 3-5 saniye arası rastgele bekle
        const waitTime = 3000 + Math.random() * 2000;
        console.log(`⏳ ${Math.round(waitTime/1000)} saniye bekleniyor...`);
        await page.waitForTimeout(waitTime);
    }
    
    console.log('❌ MAKSİMUM DENEME SAYISINA ULAŞILDI, HBUS COOKIE\'LERİ BULUNAMADI');
    
    const finalContextCookies = await context.cookies();
    const finalHbusCheck = checkRequiredHbusCookies(finalContextCookies);
    
    return {
        success: false,
        attempts: attempts,
        cookies: finalContextCookies,
        hbusCheck: finalHbusCheck,
        method: 'JAVASCRIPT_COOKIE_READ'
    };
}

// FINGERPRINT İLE COOKIE TOPLAMA - MEMORY LEAK ÖNLEYİCİ
async function getCookies() {
    // 🎯 SHUTDOWN KONTROLÜ
    if (isShuttingDown) {
        console.log('❌ Shutdown modunda - yeni işlem başlatılmıyor');
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        // 🚨 ESKİ COOKIE'LER İŞLEM BAŞINDA SİLİNMİYOR! 🚨
        console.log('📊 Mevcut cookie setleri korunuyor:', lastCookies.length + ' set');
        
        // 🚨 MEMORY LEAK ÖNLEYİCİ BROWSER AYARLARI
        browser = await chromium.launch({
            headless: true,
            args: [
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
                '--max-old-space-size=400'
            ]
        });

        // 🎯 BROWSER TRACKING (RENDER STABİLİTE İÇİN)
        activeBrowser = browser;

        console.log(`✅ Browser başlatıldı - ${CONFIG.FINGERPRINT_COUNT} FARKLI FINGERPRINT DENEMESİ BAŞLIYOR...\n`);

        // FARKLI FINGERPRINT İLE DENEME
        for (let i = 1; i <= CONFIG.FINGERPRINT_COUNT; i++) {
            // 🎯 SHUTDOWN KONTROLÜ - HER ITERASYONDA
            if (isShuttingDown) {
                console.log('❌ Shutdown modu - işlem yarıda kesiliyor');
                break;
            }
            
            console.log(`\n🔄 === FINGERPRINT ${i}/${CONFIG.FINGERPRINT_COUNT} ===`);
            
            let context;
            let page;
            
            try {
                // 1. YENİ CONTEXT OLUŞTUR
                context = await createNewContext(browser);
                page = await context.newPage();

                // 2. COOKIE'LERİ TEMİZLE
                console.log('🧹 Cookie\'ler temizleniyor...');
                await context.clearCookies();

                // 3. HEPSIBURADA'YA GİT
                console.log('🌐 Hepsiburada\'ya gidiliyor...');
                await page.goto('https://www.hepsiburada.com/siparislerim', {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.PAGE_LOAD_TIMEOUT
                });

                console.log('✅ Sayfa yüklendi, JS çalışıyor...');

                // 4. HBUS BEKLEME DÖNGÜSÜ
                const hbusResult = await waitForHbusCookies(page, context, CONFIG.MAX_HBUS_ATTEMPTS);
                
                const result = {
                    fingerprint_id: i,
                    success: hbusResult.success,
                    attempts: hbusResult.attempts,
                    cookies_count: hbusResult.cookies ? hbusResult.cookies.length : 0,
                    hbus_cookies_count: hbusResult.cookies ? hbusResult.cookies.filter(c => c.name.includes('hbus_')).length : 0,
                    required_hbus_success: hbusResult.hbusCheck.success,
                    timestamp: new Date().toISOString()
                };

                allResults.push(result);

                // BAŞARILI İSE COOKIE'LERİ KAYDET
                if (hbusResult.success && hbusResult.cookies) {
                    const hbusCheck = checkRequiredHbusCookies(hbusResult.cookies);
                    if (hbusCheck.success) {
                        const successfulSet = {
                            set_id: i,
                            success: true,
                            cookies: hbusResult.cookies.map(cookie => ({
                                name: cookie.name,
                                value: cookie.value,
                                domain: cookie.domain,
                                path: cookie.path || '/',
                                expires: cookie.expires,
                                httpOnly: cookie.httpOnly || false,
                                secure: cookie.secure || false,
                                sameSite: cookie.sameSite || 'Lax'
                            })),
                            stats: {
                                total_cookies: hbusResult.cookies.length,
                                hbus_cookies: hbusResult.cookies.filter(c => c.name.includes('hbus_')).length,
                                has_required_hbus: true
                            },
                            collection_time: new Date()
                        };
                        
                        currentSuccessfulSets.push(successfulSet);
                        console.log(`✅ FINGERPRINT ${i}: BAŞARILI - ${hbusResult.cookies.length} cookie (${successfulSet.stats.hbus_cookies} HBUS)`);
                    }
                } else {
                    console.log(`❌ FINGERPRINT ${i}: BAŞARISIZ`);
                }

            } catch (error) {
                console.log(`❌ FINGERPRINT ${i} HATA:`, error.message);
                allResults.push({
                    fingerprint_id: i,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } finally {
                // 🚨 MEMORY LEAK ÖNLEYİCİ - HER FINGERPRINT SONRASI TEMİZLİK
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
                
                console.log(`   🧹 Fingerprint ${i} memory temizlendi`);
            }

            // FINGERPRINT'LER ARASI BEKLEME
            if (i < CONFIG.FINGERPRINT_COUNT && !isShuttingDown) {
                const waitBetween = CONFIG.WAIT_BETWEEN_FINGERPRINTS + Math.random() * 2000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        // 🎯 TÜM İŞLEMLER BİTTİ - BROWSER'I KAPAT
        await browser.close();
        activeBrowser = null; // 🎯 BROWSER TRACKING TEMİZLE
        console.log('\n✅ Tüm fingerprint denemeleri tamamlandı, browser kapatıldı');

        // İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (2 HBUS cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE - İŞLEM SONUNDA! 🎯
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            
            // 🎯 ESKİ COOKIE'LER İŞLEM SONUNDA SİLİNİP YENİLERİ KONUYOR!
            console.log('🔄 Eski cookie setleri siliniyor, yeni setler kaydediliyor...');
            lastCookies = currentSuccessfulSets; // 🎯 BURADA GÜNCELLENİYOR!
            lastCollectionTime = new Date();
            
            // 🎯 DOSYAYA KALICI KAYDET
            await saveCookiesToFile(currentSuccessfulSets);
            
            console.log('\n📋 YENİ BAŞARILI COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS)`);
            });
        } else {
            console.log('❌ Hiç başarılı cookie seti bulunamadı, eski cookie\'ler korunuyor');
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            previous_cookies_preserved: successfulCount === 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ FINGERPRINT HATA:', error.message);
        if (browser) {
            await browser.close();
            activeBrowser = null; // 🎯 BROWSER TRACKING TEMİZLE
        }
        
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ✅ DİREK JSON FORMATINDA SETLER - SADECE set1, set2...
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı'
        });
    }

    // 🎯 SADECE BAŞARILI SET'LERİ FİLTRELE
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı'
        });
    }

    // 🎯 SADECE SET1, SET2... FORMATI
    const result = {};
    
    // 🎯 LAST UPDATE ZAMANI EN ÜSTTE
    result.last_updated = lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR');
    
    // 🎯 SETLER DİREKT COOKIE ARRAY'LERİ
    successfulSets.forEach(set => {
        result[`set${set.set_id}`] = set.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite
        }));
    });

    res.json(result);
});

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'Optimize Cookie Collector - RENDER STABLE + KALICI COOKIE + PROXY',
        config: CONFIG,
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`, 
            '/last-cookies': 'Son alınan cookie\'leri göster (Kullanımlık)',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster',
            '/proxy-register': 'Worker POST3 proxy desteği',
            '/test-proxy': 'Proxy test'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        stats: collectionStats,
        render_stability: 'ACTIVE - Error handlers enabled',
        cookie_persistence: 'ACTIVE - Dosyaya kalıcı kayıt',
        proxy_support: 'ACTIVE - Worker POST3 proxy desteği'
    });
});

// FINGERPRINT İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT COOKIE TOPLAMA ===`);
    const result = await getCookies();
    res.json(result);
});

// 🎯 GÜNCELLENMİŞ HEALTH CHECK - GERÇEK DÜZ YAZI
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const totalCookies = lastCookies.reduce((sum, set) => sum + set.stats.total_cookies, 0);
    const totalHbusCookies = lastCookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0);
    
    // 🎯 BAŞARILI SET'LERİ HESAPLA
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);
    const successfulCount = successfulSets.length;
    
    // 🎯 DOĞRU RENDER MEMORY BİLGİSİ (512MB TOTAL)
    const RENDER_TOTAL_RAM = 512;
    const nodeMemoryMB = currentMemory.node;
    const estimatedUsedRAM = Math.min(RENDER_TOTAL_RAM, nodeMemoryMB + 150);
    const estimatedFreeRAM = RENDER_TOTAL_RAM - estimatedUsedRAM;
    
    let memoryStatus = "🟢 NORMAL";
    if (estimatedFreeRAM < 50) memoryStatus = "🔴 CRITICAL - RAM BİTİYOR!";
    else if (estimatedFreeRAM < 100) memoryStatus = "🟠 TEHLİKE - AZ RAM KALDI!";
    else if (estimatedFreeRAM < 200) memoryStatus = "🟡 DİKKAT - RAM AZALIYOR";
    
    // PROXY DURUMU
    const USE_PROXY = process.env.USE_PROXY === 'true';
    const PROXY_URL = process.env.PROXY_URL;
    
    const healthText = `
🚀 OPTİMİZE COOKIE COLLECTOR - RENDER STABLE + KALICI COOKIE + PROXY
====================================================================

🧠 RAM DURUMU:
├── Toplam RAM: 512 MB
├── Kullanılan: ${estimatedUsedRAM} MB
├── Boş RAM: ${estimatedFreeRAM} MB  
├── Node.js: ${nodeMemoryMB} MB
└── Durum: ${memoryStatus}

🔌 PROXY DURUMU:
├── Proxy: ${USE_PROXY ? '🟢 AKTİF' : '🔴 PASİF'}
├── URL: ${PROXY_URL || 'AYARLANMAMIŞ'}
└── Worker POST3: 🟢 DESTEKLENİYOR

🖥️ SİSTEM BİLGİLERİ:
├── Çalışma süresi: ${Math.round(process.uptime())} saniye
├── Node.js: ${process.version}
├── Platform: ${process.platform}
└── Render Stability: ✅ ACTIVE

📊 COOKIE DURUMU:
├── Toplam Set: ${currentSetsCount}
├── Başarılı: ${successfulCount}
├── Başarısız: ${currentSetsCount - successfulCount} 
├── Başarı Oranı: ${currentSetsCount > 0 ? ((successfulCount / currentSetsCount) * 100).toFixed(1) + '%' : '0%'}
├── Toplam Cookie: ${totalCookies}
├── HBUS Cookie: ${totalHbusCookies}
└── Son Toplama: ${lastCollectionTime ? new Date(lastCollectionTime).toLocaleString('tr-TR') : 'Henüz yok'}

📈 İSTATİSTİKLER:
├── Toplam Çalışma: ${collectionStats.total_runs}
├── Başarılı Çalışma: ${collectionStats.successful_runs}
└── Başarı Oranı: ${collectionStats.total_runs > 0 ? 
    ((collectionStats.successful_runs / collectionStats.total_runs) * 100).toFixed(1) + '%' : '0%'}

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla
├── /last-cookies - Son cookie'leri göster  
├── /health - Bu sayfa
├── /stats - İstatistikler
├── /proxy-register - 🆕 Worker POST3 proxy desteği
└── /test-proxy - 🆕 Proxy test

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
====================================================================
    `.trim();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(healthText);
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const successRate = collectionStats.total_runs > 0 
        ? (collectionStats.successful_runs / collectionStats.total_runs * 100).toFixed(1)
        : 0;
    
    res.json({
        config: CONFIG,
        collection_stats: collectionStats,
        success_rate: successRate + '%',
        last_collection: lastCollectionTime,
        current_cookie_sets: {
            total_sets: lastCookies.length,
            sets: lastCookies.map(set => ({
                set_id: set.set_id,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                collection_time: set.collection_time
            }))
        },
        proxy_settings: {
            use_proxy: process.env.USE_PROXY === 'true',
            proxy_url: process.env.PROXY_URL ? 'AYARLI' : 'AYARSIZ'
        }
    });
});

// 🎯 YENİ ENDPOINT: PROXY İLE KAYIT - WORKER UYUMLU
app.post('/proxy-register', async (req, res) => {
    console.log('🔄 PROXY İSTEĞİ ALINDI - WORKER UYUMLU');
    console.log('⏰', new Date().toLocaleString('tr-TR'));
    
    try {
        const { 
            postBody,
            headers,
            url,
            method,
            cookies,
            fingerprint,
            xsrfToken
        } = req.body;

        if (!postBody || !headers || !url) {
            return res.status(400).json({
                success: false,
                error: "Eksik bilgi: postBody, headers ve url gereklidir"
            });
        }

        console.log('✅ Worker bilgileri alındı:');
        console.log('   🎯 URL:', url);
        console.log('   📋 Header Sayısı:', Object.keys(headers).length);
        console.log('   👤 Kullanıcı:', `${postBody.firstName} ${postBody.lastName}`);

        // 🎯 PROXY AYARI
        const USE_PROXY = process.env.USE_PROXY === 'true';
        const PROXY_URL = process.env.PROXY_URL;

        console.log('⚙️ Proxy Ayarları:', USE_PROXY ? 'AKTİF' : 'PASİF');

        // 🎯 WORKER'IN TAM HEADERS'INI KULLAN
        const requestHeaders = { ...headers };

        // 🎯 COOKIE KONTROLÜ
        if (!requestHeaders.cookie && cookies?.length > 0) {
            const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            requestHeaders.cookie = cookieHeader;
            console.log('🍪 Cookie Header oluşturuldu');
        }

        // 🎯 XSRF TOKEN KONTROLÜ
        if (xsrfToken && !requestHeaders['x-xsrf-token']) {
            requestHeaders['x-xsrf-token'] = xsrfToken;
            console.log('🔐 XSRF Token eklendi');
        }

        // 🎯 FETCH OPTIONS
        const fetchOptions = {
            method: method || "POST",
            headers: requestHeaders,
            body: JSON.stringify(postBody)
        };

        // 🎯 PROXY EKLE (EĞER AKTİFSE)
        if (USE_PROXY && PROXY_URL) {
            fetchOptions.agent = new HttpsProxyAgent(PROXY_URL);
            console.log('🔌 Proxy eklendi');
        }

        // 🎯 İSTEĞİ GÖNDER
        console.log('🚀 POST isteği gönderiliyor...');
        const response = await fetch(url, fetchOptions);
        
        console.log('📊 Response Status:', response.status);

        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { success: false, error: "Invalid JSON", raw: responseText };
        }

        // 🎯 SONUÇ
        const result = {
            success: response.ok && responseData?.success,
            data: responseData,
            status: response.status,
            proxy_used: USE_PROXY
        };

        console.log('🎯 Sonuç:', result.success ? '✅ BAŞARILI' : '❌ BAŞARISIZ');
        
        res.json(result);

    } catch (error) {
        console.log('💥 Hata:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🧪 TEST ENDPOINT
app.get('/test-proxy', async (req, res) => {
    try {
        const USE_PROXY = process.env.USE_PROXY === 'true';
        const PROXY_URL = process.env.PROXY_URL;
        
        const fetchOptions = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        if (USE_PROXY && PROXY_URL) {
            fetchOptions.agent = new HttpsProxyAgent(PROXY_URL);
        }

        const response = await fetch('https://httpbin.org/ip', fetchOptions);
        const data = await response.json();
        
        res.json({
            proxy_used: USE_PROXY,
            your_ip: data.origin,
            proxy_status: 'ÇALIŞIYOR'
        });
    } catch (error) {
        res.json({
            proxy_used: USE_PROXY,
            error: error.message,
            proxy_status: 'HATA'
        });
    }
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;

// 🎯 OTOMATİK MEMORY GÜNCELLEME
setInterval(() => {
    const nodeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    currentMemory = {
        node: nodeMB,
        total: nodeMB + 80 + (lastCookies.length * 30),
        updated: new Date().toLocaleTimeString('tr-TR')
    };
}, 5000);

// 🧠 SUNUCU BAŞLARKEN SON COOKIE VERİSİNİ RAM'E YÜKLE
(async () => {
  try {
    const loaded = await loadCookiesFromFile();
    if (loaded && loaded.length > 0) {
      lastCookies = loaded;
      console.log(`✅ ${loaded.length} cookie seti RAM'e yüklendi (last_cookies.json)`);
    } else {
      console.log("ℹ️ Henüz kayıtlı cookie bulunamadı, boş başlatılıyor.");
    }
  } catch (err) {
    console.error("❌ last_cookies.json yüklenirken hata:", err.message);
  }
})();

// 🎯 RENDER STABİLİTE - OTOMATİK COOKIE TOPLAMA (SETINTERVAL İLE)
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ OTOMATİK COOKIE TOPLAMA AKTİF - setInterval ile');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} DAKİKALIK OTOMATİK ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookies();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK: ${result.successful_attempts}/${CONFIG.FINGERPRINT_COUNT} başarılı`);
        } else {
            console.log('❌ OTOMATİK: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

app.listen(PORT, async () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 OPTİMİZE COOKIE COLLECTOR - RENDER STABLE + KALICI COOKIE + PROXY ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 / - Endpoint listesi ve ayarlar`);
    console.log(`📍 /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`);
    console.log('📍 /last-cookies - Son cookie\'leri göster (Kullanımlık)');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('🎯 YENİ: /proxy-register - Worker POST3 proxy desteği');
    console.log('🧪 YENİ: /test-proxy - Proxy test');
    
    // Proxy durumu
    const USE_PROXY = process.env.USE_PROXY === 'true';
    const PROXY_URL = process.env.PROXY_URL;
    console.log(`🔌 Proxy Durumu: ${USE_PROXY ? 'AKTİF' : 'PASİF'}`);
    if (USE_PROXY && PROXY_URL) {
        console.log(`🔌 Proxy URL: ${PROXY_URL}`);
    }
    
    console.log('====================================\n');
    
    // İlk çalıştırma
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        setTimeout(() => {
            console.log('🔄 İlk cookie toplama başlatılıyor...');
            getCookies();
        }, CONFIG.INITIAL_COLLECTION_DELAY);
    }
});
