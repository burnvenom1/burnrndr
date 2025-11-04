// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - OTOMATİK TÜM COOKIE'LER
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// ⚙️ AYARLAR
const CONFIG = {
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 10 * 60 * 1000,
    FINGERPRINT_COUNT: 10,
    WAIT_BETWEEN_FINGERPRINTS: 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    INITIAL_COLLECTION_DELAY: 5000
};

// DEĞİŞKENLER
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = { total_runs: 0, successful_runs: 0 };
let currentMemory = { node: 0, total: 0, updated: '' };
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 ERROR HANDLERS
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    if (activeBrowser) await activeBrowser.close().catch(() => {});
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    if (activeBrowser) await activeBrowser.close().catch(() => {});
});

process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM ALINDI - Graceful shutdown');
    isShuttingDown = true;
    if (activeBrowser) await activeBrowser.close().catch(() => {});
    process.exit(0);
});

// 🎯 MEMORY USAGE
function getRealMemoryUsage() {
    const nodeMemory = process.memoryUsage();
    const nodeMB = Math.round(nodeMemory.heapUsed / 1024 / 1024);
    const estimatedTotalMB = nodeMB + 80 + (lastCookies.length * 30);
    
    return {
        node_process: nodeMB + ' MB',
        estimated_total: estimatedTotalMB + ' MB',
        system_usage: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB / ' + 
                     Math.round(os.totalmem() / 1024 / 1024) + ' MB'
    };
}

// 🎯 RASTGELE USER AGENT
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 🎯 RASTGELE VIEWPORT
function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// 🎯 HBUS KONTROLÜ
function checkRequiredHbusCookies(cookies) {
    const hbusSessionId = cookies.find(cookie => cookie.name === 'hbus_sessionId');
    const hbusAnonymousId = cookies.find(cookie => cookie.name === 'hbus_anonymousId');
    
    return {
        success: !!hbusSessionId && !!hbusAnonymousId,
        hasSessionId: !!hbusSessionId,
        hasAnonymousId: !!hbusAnonymousId
    };
}

// 🎯 YENİ CONTEXT OLUŞTUR
async function createNewContext(browser) {
    const userAgent = getRandomUserAgent();
    const viewport = getRandomViewport();
    
    const context = await browser.newContext({
        viewport: viewport,
        userAgent: userAgent,
        extraHTTPHeaders: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        }
    });
    
    return context;
}

// 🎯 TÜM COOKIE'LERİ OTOMATİK TOPLA - DOMAİN BELİRTMEDEN
async function getAllCookiesAutomatically(context) {
    try {
        console.log('🔍 TÜM COOKIE\'LER OTOMATİK TOPLANIYOR...');
        
        // 🎯 DOMAİN BELİRTMEDEN TÜM COOKIE'LERİ AL
        const allCookies = await context.cookies();
        
        console.log(`📊 TOPLAM ${allCookies.length} COOKIE BULUNDU`);
        
        // 🎯 COOKIE'LERİ DETAYLI GÖSTER
        if (allCookies.length > 0) {
            console.log('📋 ALINAN COOKIE\'LER:');
            allCookies.forEach(cookie => {
                const valuePreview = cookie.value.length > 20 ? 
                    cookie.value.substring(0, 20) + '...' : cookie.value;
                console.log(`   🍪 ${cookie.name} = ${valuePreview} (${cookie.domain})`);
            });
        }
        
        return allCookies;
        
    } catch (error) {
        console.log('❌ Cookie toplama hatası:', error.message);
        return [];
    }
}

// 🎯 COOKIE TOPLAMA - ANA FONKSİYON
async function getCookies() {
    if (isShuttingDown) {
        console.log('❌ Shutdown modu');
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT İLE COOKIE TOPLAMA BAŞLIYOR...`);
        collectionStats.total_runs++;
        
        // 🎯 BROWSER'I BAŞLAT
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
                '--disable-blink-features=AutomationControlled'
            ]
        });

        activeBrowser = browser;

        // 🎯 FINGERPRINT DÖNGÜSÜ
        for (let i = 1; i <= CONFIG.FINGERPRINT_COUNT; i++) {
            if (isShuttingDown) break;
            
            console.log(`\n🔄 === FINGERPRINT ${i}/${CONFIG.FINGERPRINT_COUNT} ===`);
            
            let context;
            let page;
            
            try {
                // 1. YENİ CONTEXT
                context = await createNewContext(browser);
                page = await context.newPage();

                // 2. TÜM COOKIE'LERİ TEMİZLE
                await context.clearCookies();
                console.log('🧹 Tüm cookie\'ler temizlendi');

                // 3. HEPSIBURADA'YA GİT
                console.log('🌐 Hepsiburada\'ya gidiliyor...');
                await page.goto('https://www.hepsiburada.com/siparislerim', {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.PAGE_LOAD_TIMEOUT
                });

                console.log('✅ Sayfa yüklendi, cookie\'ler bekleniyor...');

                // 4. COOKIE'LERİ BEKLE VE TOPLA
                let attempts = 0;
                let success = false;
                let collectedCookies = [];

                while (attempts < CONFIG.MAX_HBUS_ATTEMPTS && !success) {
                    attempts++;
                    console.log(`🔄 Cookie kontrolü (${attempts}/${CONFIG.MAX_HBUS_ATTEMPTS})...`);

                    // 🎯 TÜM COOKIE'LERİ OTOMATİK TOPLA
                    collectedCookies = await getAllCookiesAutomatically(context);
                    
                    // 🎯 HBUS KONTROLÜ
                    const hbusCheck = checkRequiredHbusCookies(collectedCookies);
                    
                    if (hbusCheck.success) {
                        console.log('✅ HBUS COOKIE\'LERİ BULUNDU!');
                        success = true;
                        break;
                    } else {
                        console.log(`📊 ${collectedCookies.length} cookie var, HBUS bekleniyor...`);
                        if (!hbusCheck.hasSessionId) console.log('   ❌ hbus_sessionId eksik');
                        if (!hbusCheck.hasAnonymousId) console.log('   ❌ hbus_anonymousId eksik');
                    }

                    // BEKLE
                    const waitTime = 3000 + Math.random() * 2000;
                    console.log(`⏳ ${Math.round(waitTime/1000)}s bekleniyor...`);
                    await page.waitForTimeout(waitTime);
                }

                // 🎯 SONUÇ KAYDET
                const result = {
                    fingerprint_id: i,
                    success: success,
                    attempts: attempts,
                    cookies_count: collectedCookies.length,
                    hbus_cookies_count: collectedCookies.filter(c => c.name.includes('hbus_')).length,
                    timestamp: new Date().toISOString()
                };

                allResults.push(result);

                // 🎯 BAŞARILI İSE KAYDET
                if (success && collectedCookies.length > 0) {
                    const successfulSet = {
                        set_id: i,
                        success: true,
                        cookies: collectedCookies.map(cookie => ({
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
                            total_cookies: collectedCookies.length,
                            hbus_cookies: collectedCookies.filter(c => c.name.includes('hbus_')).length,
                            has_required_hbus: true
                        },
                        collection_time: new Date()
                    };
                    
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ FINGERPRINT ${i}: BAŞARILI - ${collectedCookies.length} cookie`);
                } else {
                    console.log(`❌ FINGERPRINT ${i}: BAŞARISIZ - ${collectedCookies.length} cookie`);
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
                // TEMİZLİK
                if (page) await page.close().catch(() => {});
                if (context) await context.close().catch(() => {});
            }

            // BEKLEME
            if (i < CONFIG.FINGERPRINT_COUNT && !isShuttingDown) {
                const waitBetween = CONFIG.WAIT_BETWEEN_FINGERPRINTS + Math.random() * 2000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        // 🎯 BROWSER'I KAPAT
        await browser.close();
        activeBrowser = null;

        // 🎯 SONUÇLARI İŞLE
        const successfulCount = currentSuccessfulSets.length;
        console.log('\n📊 === SONUÇLAR ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı: ${successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // 🎯 COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            console.log('\n📋 YENİ COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie`);
            });
        } else {
            console.log('❌ Hiç başarılı set bulunamadı');
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ GENEL HATA:', error.message);
        if (browser) {
            await browser.close();
            activeBrowser = null;
        }
        return { error: error.message, timestamp: new Date().toISOString() };
    }
}

// 🎯 ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'Otomatik Cookie Collector - Tüm Cookie\'ler',
        status: 'Çalışıyor',
        last_collection: lastCollectionTime,
        current_sets: lastCookies.length,
        config: {
            fingerprint_count: CONFIG.FINGERPRINT_COUNT,
            auto_collect: CONFIG.AUTO_COLLECT_ENABLED
        }
    });
});

app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({ error: 'Henüz cookie toplanmadı' });
    }

    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);
    if (successfulSets.length === 0) {
        return res.json({ error: 'Başarılı cookie seti yok' });
    }

    const result = {};
    result.last_updated = lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : 'Yok';
    
    successfulSets.forEach(set => {
        result[`set${set.set_id}`] = set.cookies;
    });

    res.json(result);
});

app.get('/collect', async (req, res) => {
    console.log('\n=== MANUEL COOKIE TOPLAMA ===');
    const result = await getCookies();
    res.json(result);
});

app.get('/health', (req, res) => {
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);
    const successfulCount = successfulSets.length;
    
    const healthText = `
🚀 OTOMATİK COOKIE COLLECTOR - TÜM COOKIE'LER
=============================================
📊 DURUM:
├── Çalışma Süresi: ${Math.round(process.uptime())} saniye
├── Toplam Set: ${lastCookies.length}
├── Başarılı Set: ${successfulCount}
├── Son Toplama: ${lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : 'Yok'}
└── Fingerprint: ${CONFIG.FINGERPRINT_COUNT}

🧠 BELLEK:
├── Node.js: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
├── Sistem: ${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB / ${Math.round(os.totalmem() / 1024 / 1024)} MB
└── Durum: 🟢 NORMAL

🔧 AYARLAR:
├── Otomatik Toplama: ${CONFIG.AUTO_COLLECT_ENABLED ? '✅ AKTİF' : '❌ KAPALI'}
├── Max Deneme: ${CONFIG.MAX_HBUS_ATTEMPTS}
└── Timeout: ${CONFIG.PAGE_LOAD_TIMEOUT / 1000}s

🌐 ENDPOINT'LER:
├── /collect - Cookie topla
├── /last-cookies - Son cookie'ler
└── /health - Bu sayfa

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
=============================================
    `.trim();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(healthText);
});

// 🎯 SUNUCU
const PORT = process.env.PORT || 3000;

// 🎯 OTOMATİK TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ OTOMATİK COOKIE TOPLAMA AKTİF');
    setInterval(async () => {
        if (isShuttingDown) return;
        console.log(`\n🕒 OTOMATİK ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT BAŞLIYOR...`);
        await getCookies();
        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

// 🎯 UYGULAMA BAŞLATMA
app.listen(PORT, () => {
    console.log('\n🚀 OTOMATİK COOKIE COLLECTOR ÇALIŞIYOR!');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile topla`);
    console.log('📍 /last-cookies - Son cookie\'leri göster');
    console.log('📍 /health - Durum kontrolü');
    console.log('🎯 TÜM COOKIE\'LER OTOMATİK TOPLANACAK');
    console.log('🎯 DOMAİN BELİRTMEYE GEREK YOK');
    console.log('🎯 KALICI DOSYA YOK - SADECE RAM\n');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        setTimeout(() => {
            console.log('🔄 İlk cookie toplama başlatılıyor...');
            getCookies();
        }, CONFIG.INITIAL_COLLECTION_DELAY);
    }
});
