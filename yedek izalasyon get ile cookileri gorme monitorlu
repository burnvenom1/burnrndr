// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - MEMORY LEAK ÖNLEYİCİ
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
    INITIAL_COLLECTION_DELAY: 5000 // 5 saniye
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

// 🎯 GERÇEK MEMORY HESAPLAMA FONKSİYONU
function getRealMemoryUsage() {
    const nodeMemory = process.memoryUsage();
    const nodeMB = Math.round(nodeMemory.heapUsed / 1024 / 1024);
    
    // Browser kapalıysa sadece Node.js memory'si
    // Browser açıksa tahmini toplam memory
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
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        // ✅ ESKİ COOKIE'LERİ SİL (sadece lastCookies array'ini temizle)
        lastCookies = [];
        
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

        console.log(`✅ Browser başlatıldı - ${CONFIG.FINGERPRINT_COUNT} FARKLI FINGERPRINT DENEMESİ BAŞLIYOR...\n`);

        // FARKLI FINGERPRINT İLE DENEME
        for (let i = 1; i <= CONFIG.FINGERPRINT_COUNT; i++) {
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
            if (i < CONFIG.FINGERPRINT_COUNT) {
                const waitBetween = CONFIG.WAIT_BETWEEN_FINGERPRINTS + Math.random() * 2000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        // 🎯 TÜM İŞLEMLER BİTTİ - BROWSER'I KAPAT
        await browser.close();
        console.log('\n✅ Tüm fingerprint denemeleri tamamlandı, browser kapatıldı');

        // İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (2 HBUS cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE - lastCookies KORUNUR!
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            console.log('\n📋 BAŞARILI COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS)`);
            });
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
        console.log('❌ FINGERPRINT HATA:', error.message);
        if (browser) {
            await browser.close();
        }
        
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ✅ YENİ: DİREK JSON FORMATINDA SETLER
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı',
            timestamp: new Date().toLocaleString('tr-TR')
        });
    }

    // 🎯 SADECE BAŞARILI SET'LERİ FİLTRELE
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı',
            timestamp: new Date().toLocaleString('tr-TR')
        });
    }

    // 🎯 DİREK JSON FORMATINDA SETLER
    const result = {
        timestamp: new Date().toLocaleString('tr-TR')
    };
    
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
        service: 'Optimize Cookie Collector',
        config: CONFIG,
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`, 
            '/last-cookies': 'Son alınan cookie\'leri göster (Kullanımlık)',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        stats: collectionStats
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
    
    // 🎯 TEK BİR DÜZ YAZI STRING'İ
    const healthText = `
🚀 OPTİMİZE COOKIE COLLECTOR - HEALTH STATUS
============================================

🧠 RAM DURUMU:
├── Toplam RAM: 512 MB
├── Kullanılan: ${estimatedUsedRAM} MB
├── Boş RAM: ${estimatedFreeRAM} MB  
├── Node.js: ${nodeMemoryMB} MB
└── Durum: ${memoryStatus}

🖥️ SİSTEM BİLGİLERİ:
├── Çalışma süresi: ${Math.round(process.uptime())} saniye
├── Node.js: ${process.version}
└── Platform: ${process.platform}

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

💡 TAVSİYE:
${estimatedFreeRAM < 100 ? '❌ ACİL: FINGERPRINT sayısını AZALT! RAM bitmek üzere!' : '✅ Sistem stabil - Her şey yolunda'}

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla
├── /last-cookies - Son cookie'leri göster  
├── /health - Bu sayfa
└── /stats - İstatistikler

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
============================================
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
            sets: lastCookies.map(set => ({
                set_id: set.set_id,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                collection_time: set.collection_time
            }))
        },
        performance: {
            estimated_time: `${Math.round(CONFIG.FINGERPRINT_COUNT * 8)}-${Math.round(CONFIG.FINGERPRINT_COUNT * 10)} seconds`
        }
    });
});

// OTOMATİK COOKIE TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    setInterval(async () => {
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

app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 OPTİMİZE COOKIE COLLECTOR ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 / - Endpoint listesi ve ayarlar`);
    console.log(`📍 /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`);
    console.log('📍 /last-cookies - Son cookie\'leri göster (Kullanımlık)');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('🎯 2 HBUS cookie olan setler BAŞARILI sayılır');
    console.log('🔄 Her toplamada eski cookie\'ler silinir, yenileri konur');
    console.log('📦 Tüm başarılı setler kullanıma hazır JSON formatında');
    console.log('🚨 Memory leak önleyici aktif');
    console.log('🧠 Gerçek zamanlı memory takibi AKTİF');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.FINGERPRINT_COUNT} fingerprint`);
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
