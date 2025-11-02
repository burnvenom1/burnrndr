// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - TAM VERSİYON (UYKU ÖNLEYİCİSİZ)
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_10_fingerprint_runs: 0,
    total_single_runs: 0,
    successful_10_fingerprint: 0,
    successful_single: 0
};

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
async function waitForHbusCookies(page, context, maxAttempts = 8) {
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
            console.log('✅ GEREKLİ HBUS COOKIE'LERİ BULUNDU!');
            
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
                    console.log('📋 Mevcut HBUS Cookie'leri:');
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
    
    console.log('❌ MAKSİMUM DENEME SAYISINA ULAŞILDI, HBUS COOKIE'LERİ BULUNAMADI');
    
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

// TEK FINGERPRINT İLE COOKIE TOPLAMA - DÜZELTİLMİŞ
async function getCookiesSingle() {
    let browser;
    let context;
    let page;
    
    try {
        console.log('🚀 TEK FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...');
        collectionStats.total_single_runs++;
        
        // Browser'ı başlat
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

        // Context oluştur
        context = await createNewContext(browser);
        page = await context.newPage();

        // Cookie'leri temizle
        console.log('🧹 Cookie'ler temizleniyor...');
        await context.clearCookies();

        // HEPSIBURADA'YA GİT
        console.log('🌐 Hepsiburada'ya gidiliyor...');
        await page.goto('https://www.hepsiburada.com/siparislerim', {
            waitUntil: 'networkidle',
            timeout: 40000
        });

        console.log('✅ Sayfa yüklendi, JS çalışıyor...');

        // HBUS BEKLEME DÖNGÜSÜ
        const hbusResult = await waitForHbusCookies(page, context, 6);
        
        let result;
        if (hbusResult.success && hbusResult.cookies) {
            // ✅ ESKİLERİ SİL, YENİ BAŞARILI SETİ KOY
            const successfulSet = {
                set_id: 1,
                success: true,
                cookies: hbusResult.cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value, // ✅ TAM VALUE
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

            lastCookies = [successfulSet];
            lastCollectionTime = new Date();
            collectionStats.successful_single++;
            
            console.log(`✅ TEK FINGERPRINT: BAŞARILI - ${hbusResult.cookies.length} cookie toplandı`);
            
            result = {
                success: true,
                cookie_sets: [successfulSet],
                timestamp: new Date().toISOString()
            };
        } else {
            console.log(`❌ TEK FINGERPRINT: BAŞARISIZ`);
            lastCookies = [];
            
            result = {
                success: false,
                error: 'HBUS cookie'leri bulunamadı',
                attempts: hbusResult.attempts,
                timestamp: new Date().toISOString()
            };
        }

        return result;

    } catch (error) {
        console.log('❌ TEK FINGERPRINT HATA:', error.message);
        lastCookies = [];
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        // ✅ FINALLY BLOĞUNA TAŞI: HER DURUMDA KAPAT
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

// 10 FINGERPRINT İLE COOKIE TOPLAMA - DÜZELTİLMİŞ
async function getCookies10Fingerprint() {
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log('🚀 10 FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...');
        collectionStats.total_10_fingerprint_runs++;
        
        // ✅ ESKİ COOKIE'LERİ SİL
        lastCookies = [];
        
        // Browser'ı başlat
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

        console.log('✅ Browser başlatıldı - 10 FARKLI FINGERPRINT DENEMESİ BAŞLIYOR...\n');

        // 10 FARKLI FINGERPRINT İLE DENEME
        for (let i = 1; i <= 10; i++) {
            console.log(`\n🔄 === FINGERPRINT ${i}/10 ===`);
            
            let context;
            let page;
            
            try {
                // 1. YENİ CONTEXT OLUŞTUR
                context = await createNewContext(browser);
                page = await context.newPage();

                // 2. COOKIE'LERİ TEMİZLE
                console.log('🧹 Cookie'ler temizleniyor...');
                await context.clearCookies();

                // 3. HEPSIBURADA'YA GİT
                console.log('🌐 Hepsiburada'ya gidiliyor...');
                await page.goto('https://www.hepsiburada.com/siparislerim', {
                    waitUntil: 'networkidle',
                    timeout: 40000
                });

                console.log('✅ Sayfa yüklendi, JS çalışıyor...');

                // 4. HBUS BEKLEME DÖNGÜSÜ
                const hbusResult = await waitForHbusCookies(page, context, 6);
                
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
                // ✅ SAYFA VE CONTEXT KAPATMA
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
                
                console.log(`   🧹 Fingerprint ${i} tamamen temizlendi`);
            }

            // FINGERPRINT'LER ARASI BEKLEME
            if (i < 10) {
                const waitBetween = 1000 + Math.random() * 2000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        // BROWSER'I KAPAT
        await browser.close();
        console.log('\n✅ Tüm fingerprint denemeleri tamamlandı, browser kapatıldı');

        // İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === 10 FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (2 HBUS cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_10_fingerprint++;
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
        console.log('❌ 10 FINGERPRINT HATA:', error.message);
        if (browser) {
            await browser.close();
        }
        
        lastCookies = [];
        
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ✅ YENİ: SON COOKIE'LERİ GÖSTEREN ENDPOINT
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            success: false,
            message: 'Henüz cookie toplanmadı',
            timestamp: new Date().toISOString()
        });
    }

    // 🎯 KULLANIMA HAZIR COOKIE FORMATI
    const readyToUseCookies = lastCookies.map(set => ({
        set_id: set.set_id,
        collection_time: set.collection_time,
        total_cookies: set.stats.total_cookies,
        hbus_cookies: set.stats.hbus_cookies,
        has_required_hbus: set.stats.has_required_hbus,
        
        // 🎯 KULLANIMA HAZIR COOKIE'LER
        cookies: set.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value, // ✅ TAM VALUE - KULLANIMA HAZIR
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
            console.log('📤 Cookie'ler webhooka gönderildi');
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
        service: 'Optimize Cookie Collector - 10 Fingerprint & Single',
        endpoints: {
            '/': 'Bu sayfa',
            '/collect-single': 'Tek fingerprint ile cookie topla',
            '/collect-10': '10 fingerprint ile cookie topla', 
            '/last-cookies': 'Son alınan cookie'leri göster (Kullanımlık)',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        stats: collectionStats
    });
});

// TEK FINGERPRINT İLE COOKIE TOPLA
app.get('/collect-single', async (req, res) => {
    console.log('\n=== TEK FINGERPRINT COOKIE TOPLAMA ===');
    const result = await getCookiesSingle();
    
    if (result.success && process.env.WEBHOOK_URL && result.cookie_sets) {
        await sendCookiesToWebhook(result.cookie_sets[0].cookies, 'SINGLE_FINGERPRINT');
    }
    
    res.json(result);
});

// 10 FINGERPRINT İLE COOKIE TOPLA
app.get('/collect-10', async (req, res) => {
    console.log('\n=== 10 FINGERPRINT COOKIE TOPLAMA ===');
    const result = await getCookies10Fingerprint();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `10_FINGERPRINT_SET_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// DETAYLI HEALTH CHECK
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const totalCookies = lastCookies.reduce((sum, set) => sum + set.stats.total_cookies, 0);
    const totalHbusCookies = lastCookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0);
    
    res.json({ 
        status: 'OK', 
        service: 'Optimize Cookie Collector',
        system: {
            uptime: Math.round(process.uptime()) + ' seconds',
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            node_version: process.version,
            platform: process.platform
        },
        collection: {
            last_collection: lastCollectionTime,
            current_sets_count: currentSetsCount,
            total_cookies: totalCookies,
            total_hbus_cookies: totalHbusCookies
        },
        statistics: collectionStats,
        endpoints: {
            single: '/collect-single',
            multi: '/collect-10',
            last_cookies: '/last-cookies',
            health: '/health',
            stats: '/stats'
        },
        timestamp: new Date().toISOString()
    });
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const successRate10 = collectionStats.total_10_fingerprint_runs > 0 
        ? (collectionStats.successful_10_fingerprint / collectionStats.total_10_fingerprint_runs * 100).toFixed(1)
        : 0;
        
    const successRateSingle = collectionStats.total_single_runs > 0
        ? (collectionStats.successful_single / collectionStats.total_single_runs * 100).toFixed(1)
        : 0;
    
    res.json({
        collection_stats: collectionStats,
        success_rates: {
            '10_fingerprint': successRate10 + '%',
            'single': successRateSingle + '%'
        },
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
            estimated_10_fingerprint_time: '80-100 seconds',
            estimated_single_time: '8-12 seconds'
        }
    });
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 OPTİMİZE COOKIE COLLECTOR ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Endpoint listesi');
    console.log('📍 /collect-single - Tek fingerprint ile cookie topla');
    console.log('📍 /collect-10 - 10 fingerprint ile cookie topla');
    console.log('📍 /last-cookies - Son cookie'leri göster (Kullanımlık)');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('🎯 2 HBUS cookie olan setler BAŞARILI sayılır');
    console.log('🔄 Her toplamada eski cookie'ler silinir, yenileri konur');
    console.log('📦 Tüm başarılı setler kullanıma hazır JSON formatında');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookies10Fingerprint();
    }, 5000);
});
