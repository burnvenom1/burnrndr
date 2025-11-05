// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - TEK DOMAİNDEN COOKIE TOPLAMA
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

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
    MIN_COOKIE_COUNT: 7 // 🎯 EN AZ 7 COOKIE GEREKLİ
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

// 🎯 TEK DOMAİN İLE TÜM COOKIE'LER
async function getAllCookiesSimple(context) {
    try {
        console.log('🔍 TÜM COOKIE\'LER TEK DOMAİN İLE ALINIYOR...');
        
        // 🎯 SADECE PARENT DOMAIN - TÜM SUBDOMAIN'LERİ DAHİL
        const allCookies = await context.cookies(['https://hepsiburada.com']);
        
        console.log(`📊 TOPLAM ${allCookies.length} COOKIE BULUNDU`);
        
        // 🎯 COOKIE'LERİ GÖSTER
        allCookies.forEach(cookie => {
            const valuePreview = cookie.value.length > 20 ? 
                cookie.value.substring(0, 20) + '...' : cookie.value;
            console.log(`   🍪 ${cookie.name} = ${valuePreview} (${cookie.domain})`);
        });
        
        return allCookies;
        
    } catch (error) {
        console.log('❌ Cookie toplama hatası:', error.message);
        return [];
    }
}

// 🎯 COOKIE BEKLEME DÖNGÜSÜ - BASİTLEŞTİRİLMİŞ
async function waitForCookies(page, context, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Cookie kontrolü (${attempts}/${maxAttempts})...`);
        
        // 🎯 TEK DOMAİNDEN TÜM COOKIE'LERİ TOPLA
        const allCookies = await getAllCookiesSimple(context);
        
        console.log(`📊 Toplam Cookie Sayısı: ${allCookies.length}`);
        
        // 🎯 YENİ KRİTER: EN AZ 7 COOKIE VARSA BAŞARILI
        if (allCookies.length >= CONFIG.MIN_COOKIE_COUNT) {
            console.log(`✅ GEREKLİ ${CONFIG.MIN_COOKIE_COUNT}+ COOKIE BULUNDU!`);
            
            return {
                success: true,
                attempts: attempts,
                cookies: allCookies,
                stats: {
                    total_cookies: allCookies.length,
                    hbus_cookies: allCookies.filter(c => c.name.includes('hbus_')).length,
                    session_cookies: allCookies.filter(c => c.name.includes('session')).length,
                    auth_cookies: allCookies.filter(c => c.name.includes('auth') || c.name.includes('token')).length
                },
                method: 'SINGLE_DOMAIN_COOKIE_COLLECTION'
            };
        } else {
            console.log(`   ⚠️ Yetersiz cookie: ${allCookies.length}/${CONFIG.MIN_COOKIE_COUNT}`);
            
            // Mevcut cookie'leri göster
            if (allCookies.length > 0) {
                console.log('   📋 Mevcut Cookie İsimleri:');
                allCookies.slice(0, 8).forEach(cookie => {
                    console.log(`      - ${cookie.name}`);
                });
                if (allCookies.length > 8) {
                    console.log(`      ... ve ${allCookies.length - 8} daha`);
                }
            }
        }
        
        // 3-5 saniye arası rastgele bekle
        const waitTime = 3000 + Math.random() * 2000;
        console.log(`⏳ ${Math.round(waitTime/1000)} saniye bekleniyor...`);
        await page.waitForTimeout(waitTime);
    }
    
    console.log(`❌ MAKSİMUM DENEME SAYISINA ULAŞILDI, ${CONFIG.MIN_COOKIE_COUNT}+ COOKIE BULUNAMADI`);
    
    const finalCookies = await getAllCookiesSimple(context);
    const finalStats = {
        total_cookies: finalCookies.length,
        hbus_cookies: finalCookies.filter(c => c.name.includes('hbus_')).length,
        session_cookies: finalCookies.filter(c => c.name.includes('session')).length,
        auth_cookies: finalCookies.filter(c => c.name.includes('auth') || c.name.includes('token')).length
    };
    
    return {
        success: false,
        attempts: attempts,
        cookies: finalCookies,
        stats: finalStats,
        method: 'SINGLE_DOMAIN_COOKIE_COLLECTION'
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
                await page.goto('https://giris.hepsiburada.com', {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.PAGE_LOAD_TIMEOUT
                });

                console.log('✅ Sayfa yüklendi, JS çalışıyor...');

                // 4. COOKIE BEKLEME DÖNGÜSÜ - TEK DOMAİNDEN COOKIE TOPLA
                const cookieResult = await waitForCookies(page, context, CONFIG.MAX_HBUS_ATTEMPTS);
                
                const result = {
                    fingerprint_id: i,
                    success: cookieResult.success,
                    attempts: cookieResult.attempts,
                    cookies_count: cookieResult.cookies ? cookieResult.cookies.length : 0,
                    stats: cookieResult.stats || {},
                    timestamp: new Date().toISOString()
                };

                allResults.push(result);

                // 🎯 YENİ KRİTER: EN AZ 7 COOKIE VARSA BAŞARILI
                if (cookieResult.success && cookieResult.cookies) {
                    const successfulSet = {
                        set_id: i,
                        success: true,
                        cookies: cookieResult.cookies.map(cookie => ({
                            name: cookie.name,
                            value: cookie.value,
                            domain: cookie.domain,
                            path: cookie.path || '/',
                            expires: cookie.expires,
                            httpOnly: cookie.httpOnly || false,
                            secure: cookie.secure || false,
                            sameSite: cookie.sameSite || 'Lax'
                        })),
                        stats: cookieResult.stats,
                        collection_time: new Date()
                    };
                    
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ FINGERPRINT ${i}: BAŞARILI - ${cookieResult.cookies.length} cookie`);
                } else {
                    console.log(`❌ FINGERPRINT ${i}: BAŞARISIZ - Sadece ${cookieResult.cookies ? cookieResult.cookies.length : 0} cookie`);
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
        console.log(`   Başarılı (${CONFIG.MIN_COOKIE_COUNT}+ cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE - İŞLEM SONUNDA! 🎯
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            
            // 🎯 ESKİ COOKIE'LER İŞLEM SONUNDA SİLİNİP YENİLERİ KONUYOR!
            console.log('🔄 Eski cookie setleri siliniyor, yeni setler kaydediliyor...');
            lastCookies = currentSuccessfulSets; // 🎯 BURADA GÜNCELLENİYOR!
            lastCollectionTime = new Date();
            
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
            timestamp: new Date().toISOString(),
            criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required`
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

// ✅ ORİJİNAL SET FORMATI - SET1, SET2 ŞEKLİNDE
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı',
            timestamp: new Date().toISOString()
        });
    }

    // 🎯 SADECE BAŞARILI SET'LERİ FİLTRELE
    const successfulSets = lastCookies.filter(set => set.success);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı',
            available_sets: lastCookies.length,
            timestamp: new Date().toISOString()
        });
    }

    // 🎯 ORİJİNAL FORMAT: SADECE SET1, SET2... DİREKT COOKIE ARRAY'LERİ
    const result = {};
    
    // 🎯 LAST UPDATE ZAMANI EN ÜSTTE
    result.last_updated = lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR');
    result.total_successful_sets = successfulSets.length;
    result.min_cookies_required = CONFIG.MIN_COOKIE_COUNT;
    
    // 🎯 SETLER DİREKT COOKIE ARRAY'LERİ (ORİJİNAL FORMAT)
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

    // 🎯 ÖZET BİLGİLER
    result.summary = {
        total_cookies: successfulSets.reduce((sum, set) => sum + set.cookies.length, 0),
        total_hbus_cookies: successfulSets.reduce((sum, set) => sum + set.stats.hbus_cookies, 0),
        average_cookies_per_set: (successfulSets.reduce((sum, set) => sum + set.cookies.length, 0) / successfulSets.length).toFixed(1)
    };

    res.json(result);
});

// WEBHOOK FONKSİYONU
async function sendCookiesToWebhook(cookies, source) {
    try {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (webhookUrl) {
            const axios = require('axios');
            const payload = {
                cookies: cookies,
                count: cookies.length,
                timestamp: new Date().toISOString(),
                source: source
            };
            await axios.post(webhookUrl, payload, { timeout: 10000 });
            console.log('📤 Cookie\'ler webhooka gönderildi');
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
        service: 'Optimize Cookie Collector - TEK DOMAİNDEN COOKIE TOPLAMA',
        config: CONFIG,
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`, 
            '/last-cookies': 'Son alınan cookie\'leri göster (set1, set2 formatında)',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        successful_sets_count: lastCookies.filter(set => set.success).length,
        stats: collectionStats,
        render_stability: 'ACTIVE - Error handlers enabled',
        success_criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required - HBUS kontrolü YOK`
    });
});

// FINGERPRINT İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT COOKIE TOPLAMA ===`);
    const result = await getCookies();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `FINGERPRINT_SET_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// 🎯 GÜNCELLENMİŞ HEALTH CHECK - GERÇEK DÜZ YAZI
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const successfulSets = lastCookies.filter(set => set.success);
    const successfulCount = successfulSets.length;
    
    // 🎯 COOKIE İSTATİSTİKLERİ
    let totalCookies = 0;
    let totalHbusCookies = 0;
    
    successfulSets.forEach(set => {
        totalCookies += set.stats.total_cookies;
        totalHbusCookies += set.stats.hbus_cookies;
    });
    
    // 🎯 DOĞRU RENDER MEMORY BİLGİSİ (512MB TOTAL)
    const RENDER_TOTAL_RAM = 512;
    const nodeMemoryMB = currentMemory.node;
    const estimatedUsedRAM = Math.min(RENDER_TOTAL_RAM, nodeMemoryMB + 150);
    const estimatedFreeRAM = RENDER_TOTAL_RAM - estimatedUsedRAM;
    
    let memoryStatus = "🟢 NORMAL";
    if (estimatedFreeRAM < 50) memoryStatus = "🔴 CRITICAL - RAM BİTİYOR!";
    else if (estimatedFreeRAM < 100) memoryStatus = "🟠 TEHLİKE - AZ RAM KALDI!";
    else if (estimatedFreeRAM < 200) memoryStatus = "🟡 DİKKAT - RAM AZALIYOR";
    
    // 🎯 TEK BİR DÜZ YAZI STRING'İ
    const healthText = `
🚀 OPTİMİZE COOKIE COLLECTOR - TEK DOMAİNDEN COOKIE TOPLAMA
============================================================

🧠 RAM DURUMU:
├── Toplam RAM: 512 MB
├── Kullanılan: ${estimatedUsedRAM} MB
├── Boş RAM: ${estimatedFreeRAM} MB  
├── Node.js: ${nodeMemoryMB} MB
└── Durum: ${memoryStatus}

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
├── Başarı Kriteri: ${CONFIG.MIN_COOKIE_COUNT}+ cookie
├── Domain: .hepsiburada.com
└── Son Toplama: ${lastCollectionTime ? new Date(lastCollectionTime).toLocaleString('tr-TR') : 'Henüz yok'}

📈 İSTATİSTİKLER:
├── Toplam Çalışma: ${collectionStats.total_runs}
├── Başarılı Çalışma: ${collectionStats.successful_runs}
└── Başarı Oranı: ${collectionStats.total_runs > 0 ? 
    ((collectionStats.successful_runs / collectionStats.total_runs) * 100).toFixed(1) + '%' : '0%'}

🛡️ RENDER STABİLİTE:
├── Uncaught Exception Handler: ✅ ACTIVE
├── Unhandled Rejection Handler: ✅ ACTIVE  
├── SIGTERM Handler: ✅ ACTIVE
├── Graceful Shutdown: ✅ ACTIVE
└── Browser Tracking: ✅ ACTIVE

🎯 YENİ SİSTEM:
├── Toplama Yöntemi: 🎯 TEK DOMAİN (.hepsiburada.com)
├── HBUS Kontrolü: ❌ KAPALI
├── Minimum Cookie: ✅ ${CONFIG.MIN_COOKIE_COUNT}+
└── Tüm Subdomain'ler: ✅ KAPSIYOR

💡 TAVSİYE:
${estimatedFreeRAM < 100 ? '❌ ACİL: FINGERPRINT sayısını AZALT! RAM bitmek üzere!' : '✅ Sistem stabil - Her şey yolunda'}

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla
├── /last-cookies - Son cookie'leri göster (set1, set2 formatında)  
├── /health - Bu sayfa
└── /stats - İstatistikler

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
============================================================
    `.trim();
    
    // 🎯 DÜZ TEXT OLARAK GÖNDER
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
            successful_sets: lastCookies.filter(set => set.success).length,
            sets: lastCookies.map(set => ({
                set_id: set.set_id,
                success: set.success,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                session_cookies: set.stats.session_cookies,
                auth_cookies: set.stats.auth_cookies,
                collection_time: set.collection_time
            }))
        },
        performance: {
            estimated_time: `${Math.round(CONFIG.FINGERPRINT_COUNT * 8)}-${Math.round(CONFIG.FINGERPRINT_COUNT * 10)} seconds`
        },
        render_stability: {
            error_handlers: 'ACTIVE',
            graceful_shutdown: 'ACTIVE',
            browser_tracking: 'ACTIVE'
        },
        success_criteria: {
            hbus_check: 'DISABLED',
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            domain: '.hepsiburada.com',
            description: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies from single domain`
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
        total: nodeMB + 80 + (lastCookies.length * 30),
        updated: new Date().toLocaleTimeString('tr-TR')
    };
}, 5000); // 5 saniyede bir güncelle

// 🎯 RENDER STABİLİTE - OTOMATİK COOKIE TOPLAMA (SETINTERVAL İLE)
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ OTOMATİK COOKIE TOPLAMA AKTİF - setInterval ile');
    
    setInterval(async () => {
        // 🎯 SHUTDOWN KONTROLÜ
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} DAKİKALIK OTOMATİK ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookies();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK: ${result.successful_attempts}/${CONFIG.FINGERPRINT_COUNT} başarılı`);
            
            if (process.env.WEBHOOK_URL && result.cookie_sets) {
                for (const set of result.cookie_sets) {
                    await sendCookiesToWebhook(set.cookies, `AUTO_FINGERPRINT_SET_${set.set_id}`);
                }
            }
        } else {
            console.log('❌ OTOMATİK: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

app.listen(PORT, async () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 OPTİMİZE COOKIE COLLECTOR - TEK DOMAİNDEN COOKIE TOPLAMA ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 / - Endpoint listesi ve ayarlar`);
    console.log(`📍 /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`);
    console.log('📍 /last-cookies - Son cookie\'leri göster (set1, set2 formatında)');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log(`🎯 ${CONFIG.MIN_COOKIE_COUNT}+ cookie olan setler BAŞARILI sayılır`);
    console.log('🎯 HBUS cookie kontrolü: ❌ KAPALI');
    console.log('🎯 Domain: .hepsiburada.com (tüm subdomain\'leri kapsar)');
    console.log('🔄 Cookie güncelleme: 🎯 İŞLEM SONUNDA silinir ve güncellenir');
    console.log('🚨 Memory leak önleyici aktif');
    console.log('🧠 Gerçek zamanlı memory takibi AKTİF');
    console.log('🛡️ RENDER STABİLİTE ÖNLEMLERİ:');
    console.log('   ├── Uncaught Exception Handler ✅');
    console.log('   ├── Unhandled Rejection Handler ✅');
    console.log('   ├── SIGTERM Handler ✅');
    console.log('   ├── Graceful Shutdown ✅');
    console.log('   └── Browser Instance Tracking ✅');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.FINGERPRINT_COUNT} fingerprint (setInterval)`);
    } else {
        console.log('⏰ Otomatik toplama: KAPALI');
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
