// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - SADECE INLINE FINGERPRINT
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_inline_runs: 0,
    successful_inline: 0
};

// RASTGELE USER AGENT ÜRET
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
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
        { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
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
        hasAnonymousId: hasAnonymousId
    };
}

// ⚡ INLINE FINGERPRINT GENERATOR
function generateInlineFingerprint() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    
    const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
    const languages = ['tr-TR', 'en-US', 'tr', 'en'];
    const timezones = ['Europe/Istanbul', 'America/New_York', 'Europe/London'];
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
    ];
    
    return {
        userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        language: languages[Math.floor(Math.random() * languages.length)],
        hardwareConcurrency: Math.floor(Math.random() * 4) + 4,
        viewport: viewports[Math.floor(Math.random() * viewports.length)],
        timezone: timezones[Math.floor(Math.random() * timezones.length)]
    };
}

// HBUS BEKLEME DÖNGÜSÜ - JAVASCRIPT İLE COOKIE OKUMA
async function waitForHbusCookies(page, context, maxAttempts = 6) {
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
                hbusCheck: hbusCheck
            };
        }
        
        // 2-4 saniye arası rastgele bekle
        const waitTime = 2000 + Math.random() * 2000;
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
        hbusCheck: finalHbusCheck
    };
}

// ⚡ INLINE FINGERPRINT İLE COOKIE TOPLAMA
async function getCookiesInlineSpoofing() {
    let browser;
    let context;
    let page;
    const allResults = [];
    const successfulCollections = [];
    
    try {
        console.log('🚀 INLINE FINGERPRINT SPOOFING BAŞLATILIYOR...');
        collectionStats.total_inline_runs++;
        
        // ✅ TEK BROWSER, CONTEXT VE SAYFA AÇ
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
                '--disable-blink-features=AutomationControlled'
            ]
        });

        // ✅ TEK CONTEXT VE SAYFA
        context = await browser.newContext();
        page = await context.newPage();

        console.log('✅ Browser, context ve sayfa açıldı - 10 INLINE FINGERPRINT BAŞLIYOR...\n');

        // ✅ İLK KEZ HEPSIBURADA'YA GİT
        console.log('🌐 İlk yükleme: Hepsiburada\'ya gidiliyor...');
        await page.goto('https://www.hepsiburada.com/siparislerim', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // 10 FARKLI INLINE FINGERPRINT (AYNI SAYFA İÇİNDE)
        for (let i = 1; i <= 10; i++) {
            console.log(`\n🔄 === INLINE FINGERPRINT ${i}/10 ===`);
            
            try {
                // 1. ✅ COOKIE'LERİ TEMİZLE
                console.log('🧹 Cookie\'ler temizleniyor...');
                await context.clearCookies();
                
                // Tarayıcı cookie'lerini de temizle
                await page.evaluate(() => {
                    document.cookie.split(";").forEach(cookie => {
                        const eqPos = cookie.indexOf("=");
                        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                    });
                });

                // 2. ✅ YENİ FINGERPRINT ENJEKTE ET (AYNI SAYFA İÇİNDE)
                const fingerprint = generateInlineFingerprint();
                
                console.log(`🎯 Yeni Fingerprint: ${fingerprint.userAgent.substring(0, 60)}...`);
                console.log(`📏 Viewport: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`);

                // ✅ AYNI SAYFA İÇİNDE FINGERPRINT DEĞİŞTİR
                await page.evaluate((fp) => {
                    // USER AGENT DEĞİŞTİR
                    Object.defineProperty(navigator, 'userAgent', {
                        get: () => fp.userAgent,
                        configurable: true
                    });
                    
                    // PLATFORM DEĞİŞTİR
                    Object.defineProperty(navigator, 'platform', {
                        get: () => fp.platform,
                        configurable: true
                    });
                    
                    // LANGUAGE DEĞİŞTİR
                    Object.defineProperty(navigator, 'language', {
                        get: () => fp.language,
                        configurable: true
                    });
                    
                    // LANGUAGES DEĞİŞTİR
                    Object.defineProperty(navigator, 'languages', {
                        get: () => [fp.language, 'en-US', 'en'],
                        configurable: true
                    });
                    
                    // HARDWARE CONCURRENCY DEĞİŞTİR
                    Object.defineProperty(navigator, 'hardwareConcurrency', {
                        get: () => fp.hardwareConcurrency,
                        configurable: true
                    });
                    
                    // VIEWPORT DEĞİŞTİR
                    Object.defineProperty(window, 'innerWidth', {
                        get: () => fp.viewport.width,
                        configurable: true
                    });
                    
                    Object.defineProperty(window, 'innerHeight', {
                        get: () => fp.viewport.height,
                        configurable: true
                    });
                    
                    // SCREEN DEĞİŞTİR
                    Object.defineProperty(screen, 'width', {
                        get: () => fp.viewport.width,
                        configurable: true
                    });
                    
                    Object.defineProperty(screen, 'height', {
                        get: () => fp.viewport.height,
                        configurable: true
                    });
                    
                }, fingerprint);

                // 3. ✅ SAYFAYI YENİLE (YENİ FINGERPRINT İLE)
                console.log('🔄 Sayfa yeni fingerprint ile yenileniyor...');
                await page.reload({
                    waitUntil: 'networkidle',
                    timeout: 25000
                });

                console.log('✅ Yeni fingerprint yüklendi, JS çalışıyor...');

                // 4. ✅ HBUS BEKLEME DÖNGÜSÜ
                const hbusResult = await waitForHbusCookies(page, context, 5);
                
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

                // 5. ✅ BAŞARILI İSE KAYDET
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
                        
                        successfulCollections.push(successfulSet);
                        console.log(`✅ INLINE FINGERPRINT ${i}: BAŞARILI - ${hbusResult.cookies.length} cookie`);
                    }
                } else {
                    console.log(`❌ INLINE FINGERPRINT ${i}: BAŞARISIZ`);
                }

            } catch (error) {
                console.log(`❌ INLINE FINGERPRINT ${i} HATA:`, error.message);
                allResults.push({
                    fingerprint_id: i,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }

            // 6. ✅ FINGERPRINT'LER ARASI KISA BEKLEME
            if (i < 10) {
                const waitBetween = 500 + Math.random() * 1000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        console.log('\n✅ Tüm inline fingerprint denemeleri tamamlandı');

        // İSTATİSTİKLER
        const successfulCount = successfulCollections.length;
        
        console.log('\n📊 === INLINE FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı: ${successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);
        console.log(`   Toplam Süre: ~${(successfulCount * 2) + 10} saniye`);

        // ✅ SONUÇLARI GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_inline++;
            lastCookies = successfulCollections;
            lastCollectionTime = new Date();
            
            console.log('\n📋 BAŞARILI COOKIE SETLERİ:');
            successfulCollections.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS)`);
            });
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: successfulCollections,
            total_time_estimate: `${(successfulCount * 2) + 10} seconds`,
            method: 'INLINE_FINGERPRINT_SPOOFING',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ INLINE FINGERPRINT HATA:', error.message);
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        // ✅ BROWSER'I KAPAT
        if (page) {
            try {
                await page.close();
                console.log('✅ Sayfa kapatıldı');
            } catch (e) {
                console.log('⚠️ Sayfa kapatma hatası:', e.message);
            }
        }
        
        if (context) {
            try {
                await context.close();
                console.log('✅ Context kapatıldı');
            } catch (e) {
                console.log('⚠️ Context kapatma hatası:', e.message);
            }
        }
        
        if (browser) {
            try {
                await browser.close();
                console.log('✅ Browser kapatıldı');
            } catch (e) {
                console.log('⚠️ Browser kapatma hatası:', e.message);
            }
        }
    }
}

// ✅ SON COOKIE'LERİ GÖSTEREN ENDPOINT
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            success: false,
            message: 'Henüz cookie toplanmadı',
            timestamp: new Date().toISOString()
        });
    }

    const readyToUseCookies = lastCookies.map(set => ({
        set_id: set.set_id,
        collection_time: set.collection_time,
        total_cookies: set.stats.total_cookies,
        hbus_cookies: set.stats.hbus_cookies,
        has_required_hbus: set.stats.has_required_hbus,
        cookies: set.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite
        }))
    }));

    res.json({
        success: true,
        last_collection: lastCollectionTime,
        total_sets: lastCookies.length,
        total_cookies: lastCookies.reduce((sum, set) => sum + set.stats.total_cookies, 0),
        total_hbus_cookies: lastCookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0),
        cookie_sets: readyToUseCookies,
        timestamp: new Date().toISOString()
    });
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

// UYKU ÖNLEME PİNG SİSTEMİ
async function sendWakeupPing() {
    try {
        const axios = require('axios');
        
        let pingUrl;
        if (process.env.RENDER_EXTERNAL_URL) {
            pingUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
        } else {
            const APP_NAME = 'srv-d42fe8dl3ps73cd2ad0';
            pingUrl = `https://${APP_NAME}.onrender.com/health`;
        }
        
        console.log(`🔄 Uyku önleme ping: ${pingUrl}`);
        await axios.get(pingUrl, { timeout: 15000 });
        console.log('✅ Uyku önlendi!');
        return true;
        
    } catch (error) {
        console.log('⚠️ Ping hatası:', error.message);
        return false;
    }
}

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: '⚡ Inline Fingerprint Cookie Collector',
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': '⚡ Inline fingerprint ile cookie topla (15-20s)',
            '/last-cookies': 'Son alınan cookie\'leri göster',
            '/health': 'Status kontrol',
            '/stats': 'İstatistikler',
            '/wakeup': 'Uyku önleme ping'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        stats: collectionStats
    });
});

// ⚡ INLINE FINGERPRINT İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log('\n=== ⚡ INLINE FINGERPRINT COOKIE TOPLAMA ===');
    const result = await getCookiesInlineSpoofing();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `INLINE_FP_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const totalCookies = lastCookies.reduce((sum, set) => sum + set.stats.total_cookies, 0);
    const totalHbusCookies = lastCookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0);
    
    res.json({ 
        status: 'OK', 
        service: '⚡ Inline Fingerprint Cookie Collector',
        system: {
            uptime: Math.round(process.uptime()) + ' seconds',
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            node_version: process.version
        },
        collection: {
            last_collection: lastCollectionTime,
            current_sets_count: currentSetsCount,
            total_cookies: totalCookies,
            total_hbus_cookies: totalHbusCookies
        },
        statistics: collectionStats,
        timestamp: new Date().toISOString()
    });
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const successRateInline = collectionStats.total_inline_runs > 0 
        ? (collectionStats.successful_inline / collectionStats.total_inline_runs * 100).toFixed(1)
        : 0;
    
    res.json({
        collection_stats: collectionStats,
        success_rate: successRateInline + '%',
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
            method: 'Inline Fingerprint',
            estimated_time: '15-20 seconds ⚡'
        }
    });
});

// MANUEL UYKU ÖNLEME
app.get('/wakeup', async (req, res) => {
    console.log('🔔 Manuel uyku önleme ping gönderiliyor...');
    const result = await sendWakeupPing();
    res.json({ 
        wakeup_sent: result, 
        message: result ? 'Uyku önleme ping gönderildi' : 'Ping gönderilemedi',
        timestamp: new Date().toISOString() 
    });
});

// 20 DAKİKADA BİR INLINE FINGERPRINT OTOMATİK
setInterval(async () => {
    console.log('\n🕒 === 20 DAKİKALIK OTOMATİK INLINE FINGERPRINT ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    
    const result = await getCookiesInlineSpoofing();
    
    if (result.overall_success) {
        console.log(`✅ OTOMATİK: ${result.successful_attempts}/10 başarılı`);
        
        if (process.env.WEBHOOK_URL && result.cookie_sets) {
            for (const set of result.cookie_sets) {
                await sendCookiesToWebhook(set.cookies, `AUTO_INLINE_FP_${set.set_id}`);
            }
        }
    } else {
        console.log('❌ OTOMATİK: Cookie toplanamadı');
    }

    console.log('====================================\n');
}, 20 * 60 * 1000);

// 25 DAKİKADA BİR UYKU ÖNLEME PİNG
setInterval(async () => {
    console.log('\n🔔 === UYKU ÖNLEME PİNG ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    await sendWakeupPing();
    console.log('====================================\n');
}, 25 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 INLINE FINGERPRINT COLLECTOR ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Endpoint listesi');
    console.log('📍 /collect - ⚡ Inline fingerprint ile cookie topla (15-20s)');
    console.log('📍 /last-cookies - Son cookie\'leri göster');
    console.log('📍 /health - Status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('📍 /wakeup - Manuel uyku önleme');
    console.log('🎯 2 HBUS cookie olan setler BAŞARILI sayılır');
    console.log('⚡ Aynı sayfa içinde 10 farklı fingerprint');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('🔔 25 dakikada bir uyku önleme ping');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk inline cookie toplama başlatılıyor...');
        getCookiesInlineSpoofing();
    }, 5000);
});
