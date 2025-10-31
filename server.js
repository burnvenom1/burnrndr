// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - SAYFA KAPATMADAN MULTI FINGERPRINT
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;

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
    
    console.log('🔍 HBUS Kontrolü:');
    console.log(`   - hbus_sessionId: ${hasSessionId ? '✅ VAR' : '❌ YOK'}`);
    console.log(`   - hbus_anonymousId: ${hasAnonymousId ? '✅ VAR' : '❌ YOK'}`);
    console.log(`   - SONUÇ: ${success ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);
    
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

// OPTİMİZE EDİLMİŞ COOKIE TOPLAMA - TEK BROWSER İLE MULTI FINGERPRINT
async function getCookiesWithOptimizedPlaywright() {
    let browser;
    const allResults = [];
    const successfulCollections = [];
    
    try {
        console.log('🚀 OPTİMİZE PLAYWRIGHT BAŞLATILIYOR...');
        console.log('🎯 TEK BROWSER - ÇOKLU FINGERPRINT - SAYFA KAPATMADAN');
        
        // Browser'ı başlat (SADECE 1 KERE)
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
                // 1. YENİ CONTEXT OLUŞTUR (FINGERPRINT DEĞİŞTİR)
                context = await createNewContext(browser);
                page = await context.newPage();

                // 2. COOKIE'LERİ TEMİZLE
                console.log('🧹 Cookie\'ler temizleniyor...');
                await context.clearCookies();

                // 3. HEPSIBURADA'YA GİT
                console.log('🌐 Hepsiburada\'ya gidiliyor...');
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
                    successfulCollections.push({
                        fingerprint_id: i,
                        cookies: hbusResult.cookies,
                        collection_time: new Date()
                    });
                    
                    console.log(`✅ FINGERPRINT ${i}: BAŞARILI - ${hbusResult.cookies.length} cookie toplandı`);
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
                // CONTEXT'İ KAPAT (SAYFA VE COOKIE'LER TEMİZLENİR)
                if (context) {
                    await context.close();
                    console.log(`🧹 Fingerprint ${i} context temizlendi`);
                }
            }

            // FINGERPRINT'LER ARASI BEKLEME (1-3 saniye arası rastgele)
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
        const successfulCount = successfulCollections.length;
        const totalCookies = successfulCollections.reduce((sum, col) => sum + col.cookies.length, 0);
        
        console.log('\n📊 === İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı: ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Toplam Cookie: ${totalCookies}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // EN BAŞARILI COOKIE SET'İNİ SEÇ
        let bestCookies = [];
        if (successfulCollections.length > 0) {
            // En fazla HBUS cookie'si olan seti seç
            bestCookies = successfulCollections.reduce((best, current) => {
                const bestHbusCount = best.cookies.filter(c => c.name.includes('hbus_')).length;
                const currentHbusCount = current.cookies.filter(c => c.name.includes('hbus_')).length;
                return currentHbusCount > bestHbusCount ? current : best;
            }).cookies;

            // Global cookie listesini güncelle
            lastCookies = bestCookies;
            lastCollectionTime = new Date();
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            best_cookies: {
                count: bestCookies.length,
                hbus_count: bestCookies.filter(c => c.name.includes('hbus_')).length,
                hbus_check: checkRequiredHbusCookies(bestCookies)
            },
            all_results: allResults,
            successful_collections: successfulCollections.map(col => ({
                fingerprint_id: col.fingerprint_id,
                cookies_count: col.cookies.length,
                hbus_count: col.cookies.filter(c => c.name.includes('hbus_')).length
            })),
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ OPTİMİZE PLAYWRIGHT HATA:', error.message);
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

// WEBHOOK FONKSİYONU (Aynı)
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

// EXPRESS ROUTES (Aynı)
app.get('/', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            message: 'Henüz cookie toplanmadı. /collect endpointine giderek cookie toplayın.',
            endpoints: {
                '/': 'Son cookie\'leri göster',
                '/collect': 'Yeni cookie topla (Optimize)',
                '/health': 'Status kontrol'
            }
        });
    }
    
    const hbusCheck = checkRequiredHbusCookies(lastCookies);
    
    res.json({
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusCheck.success ? 'SUCCESS' : 'FAILED',
        required_cookies: {
            hbus_sessionId: hbusCheck.hasSessionId,
            hbus_anonymousId: hbusCheck.hasAnonymousId
        },
        cookies: lastCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value.substring(0, 50) + (cookie.value.length > 50 ? '...' : ''),
            domain: cookie.domain,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            session: !cookie.expires,
            size: cookie.value.length
        }))
    });
});

// OPTİMİZE EDİLMİŞ COLLECT ENDPOINT
app.get('/collect', async (req, res) => {
    console.log('\n=== OPTİMİZE COOKIE TOPLAMA ===', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithOptimizedPlaywright();
    
    // Webhook'a gönder
    if (result.overall_success && process.env.WEBHOOK_URL) {
        await sendCookiesToWebhook(result.best_cookies, 'OPTIMIZED_PLAYWRIGHT');
    }
    
    res.json(result);
});

// HEALTH CHECK (Aynı)
app.get('/health', (req, res) => {
    const hbusCheck = lastCookies.length > 0 ? checkRequiredHbusCookies(lastCookies) : { success: false };
    
    res.json({ 
        status: 'OK', 
        service: 'OPTIMIZED Hepsiburada Cookie Collector',
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusCheck.success ? 'SUCCESS' : 'FAILED',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 15 DAKİKADA BİR OTOMATİK (DAHA SIK)
setInterval(async () => {
    console.log('\n🕒 === 15 DAKİKALIK OTOMATİK ÇALIŞMA ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    
    const result = await getCookiesWithOptimizedPlaywright();
    
    if (result.overall_success) {
        console.log(`✅ OTOMATİK: ${result.successful_attempts}/10 başarılı, ${result.best_cookies.count} cookie`);
        
        if (process.env.WEBHOOK_URL) {
            await sendCookiesToWebhook(result.best_cookies, 'AUTO_OPTIMIZED_15MIN');
        }
    } else {
        console.log('❌ OTOMATİK: Cookie toplanamadı');
    }

    console.log('====================================\n');
}, 15 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 OPTİMİZE PLAYWRIGHT API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Son cookie\'leri göster');
    console.log('📍 /collect - Optimize cookie topla (10 fingerprint)');
    console.log('📍 /health - Status kontrol');
    console.log('🎯 TEK BROWSER - ÇOKLU FINGERPRINT');
    console.log('🔄 10 farklı fingerprint denemesi');
    console.log('🧹 Her denemede cookie temizleme');
    console.log('⏰ 15 dakikada bir otomatik çalışır');
    console.log('📊 En iyi cookie seti otomatik seçilir');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk optimize cookie toplama başlatılıyor...');
        getCookiesWithOptimizedPlaywright();
    }, 3000);
});
