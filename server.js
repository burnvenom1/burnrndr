// 🚀 RENDER'DA PLAYWRIGHT ÇALIŞTIRMA ÇÖZÜMÜ
// 
// 📋 GEREKLİ AYARLAR:
// 1. Environment Variables:
//    - PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/playwright
// 2. Build Command:
//    - npm install && npx playwright install chromium
// 3. Package.json:
//    - "playwright": "^1.40.0" dependency
//
// ❗ ÖNEMLİ: executablePath KULLANMA! Playwright otomatik bulsun.
// ✅ Bu ayarlarla Render'da Playwright KESİN çalışır!
//
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
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    // Cookie array'i içindeki nesneleri kontrol et
    const hbusSessionId = cookies.find(cookie => 
        cookie.name === 'hbus_sessionId' || cookie.name === 'hbus_sessionId'
    );
    const hbusAnonymousId = cookies.find(cookie => 
        cookie.name === 'hbus_anonymousId' || cookie.name === 'hbus_anonymousId'
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

// HBUS BEKLEME DÖNGÜSÜ - JAVASCRIPT İLE COOKIE OKUMA
async function waitForHbusCookies(page, context, maxAttempts = 10) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 HBUS kontrolü (${attempts}/${maxAttempts})...`);
        
        // 🎯 SAYFA İÇİNDE JAVASCRIPT İLE COOKIE OKU - Cache sorunu yok!
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
                console.log('📋 Mevcut Cookie\'ler:');
                cookiesArray.forEach(cookie => {
                    console.log(`   - ${cookie.name}`);
                });
            } else {
                console.log('📋 Henüz hiç cookie yok');
            }
        }
        
        // 4 saniye bekle (sadece son deneme değilse)
        if (attempts < maxAttempts) {
            console.log('⏳ 4 saniye bekleniyor...');
            await page.waitForTimeout(4000);
        }
    }
    
    console.log('❌ MAKSİMUM DENEME SAYISINA ULAŞILDI, HBUS COOKIE\'LERİ BULUNAMADI');
    
    // Son olarak context cookie'lerini de kontrol et
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

// PLAYWRIGHT İLE COOKIE TOPLAMA
async function getCookiesWithPlaywright() {
    let browser;
    let maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        retryCount++;
        console.log(`\n🔄 DENEME ${retryCount}/${maxRetries}`);
        
        try {
            console.log('🚀 Playwright başlatılıyor...');
            
            const userAgent = getRandomUserAgent();
            const viewport = getRandomViewport();
            
            console.log(`🎯 Fingerprint: ${userAgent.substring(0, 50)}...`);
            console.log(`📏 Viewport: ${viewport.width}x${viewport.height}`);
            
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
                    `--window-size=${viewport.width},${viewport.height}`
                ]
            });

            console.log('✅ Browser başlatıldı');
            
            // Yeni context oluştur
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

            // Yeni sayfa oluştur
            const page = await context.newPage();

            console.log('🧹 Önceki cookie\'ler temizleniyor...');
            
            // Context'i temizle (cookie'leri sil)
            await context.clearCookies();
            
            console.log('✅ Cookie\'ler temizlendi');
            
            console.log('🌐 Hepsiburada\'ya gidiliyor...');
            
            // Hepsiburada'ya git
            await page.goto('https://www.hepsiburada.com/', {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            console.log('✅ Sayfa yüklendi, JS çalışıyor...');
            
            // JavaScript'in çalışmasını bekle
            console.log('⏳ JS çalışıyor ve cookie oluşturuyor...');
            await page.waitForTimeout(5000);

            // HBUS BEKLEME DÖNGÜSÜ - JAVASCRIPT İLE
            const hbusResult = await waitForHbusCookies(page, context, 10);
            
            if (hbusResult.success) {
                // BAŞARILI - Tüm cookie'leri al
                const allCookies = await context.cookies();
                
                console.log('📊 Cookie Analizi:');
                console.log(`   Toplam Cookie: ${allCookies.length}`);
                console.log(`   HBUS Cookie: ${allCookies.filter(c => c.name.includes('hbus_')).length}`);
                
                // Cookie'leri detaylı göster
                allCookies.forEach((cookie, index) => {
                    console.log(`   ${index + 1}. ${cookie.name}`);
                    console.log(`      Domain: ${cookie.domain}`);
                    console.log(`      Value: ${cookie.value.substring(0, 30)}${cookie.value.length > 30 ? '...' : ''}`);
                    console.log(`      Size: ${cookie.value.length} karakter`);
                });

                // Son cookie'leri güncelle
                lastCookies = allCookies;
                lastCollectionTime = new Date();

                await browser.close();

                return {
                    success: true,
                    all_cookies: allCookies,
                    hbus_cookies: allCookies.filter(c => c.name.includes('hbus_')),
                    cookies_count: allCookies.length,
                    hbus_cookies_count: allCookies.filter(c => c.name.includes('hbus_')).length,
                    required_hbus_success: true,
                    attempts: hbusResult.attempts,
                    retry_count: retryCount,
                    fingerprint: {
                        user_agent: userAgent,
                        viewport: viewport,
                        collection_time: lastCollectionTime
                    },
                    method: 'PLAYWRIGHT_WITH_JS_COOKIE_CHECK',
                    timestamp: new Date().toISOString()
                };
            } else {
                // BAŞARISIZ - Tarayıcıyı kapat ve yeniden dene
                console.log(`❌ HBUS cookie'leri bulunamadı, tarayıcı kapatılıyor... (Deneme ${retryCount}/${maxRetries})`);
                await browser.close();
                browser = null;
                
                // Son deneme değilse bekle ve yeniden dene
                if (retryCount < maxRetries) {
                    console.log('⏳ 5 saniye bekleniyor ve yeniden deneniyor...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

        } catch (error) {
            console.log('❌ PLAYWRIGHT HATA:', error.message);
            if (browser) {
                await browser.close();
            }
            
            // Son deneme değilse yeniden dene
            if (retryCount < maxRetries) {
                console.log('⏳ 5 saniye bekleniyor ve yeniden deneniyor...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                return {
                    success: false,
                    error: error.message,
                    retry_count: retryCount,
                    timestamp: new Date().toISOString()
                };
            }
        }
    }
    
    // Tüm denemeler başarısız
    return {
        success: false,
        error: 'Tüm denemeler başarısız oldu',
        retry_count: retryCount,
        timestamp: new Date().toISOString()
    };
}

// COOKIE GÖNDERME FONKSİYONU
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

            await axios.post(webhookUrl, payload, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });
            
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

// ANA SAYFA - SON COOKIE'LERİ GÖSTER
app.get('/', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            message: 'Henüz cookie toplanmadı. /collect endpointine giderek cookie toplayın.',
            endpoints: {
                '/': 'Son cookie\'leri göster',
                '/collect': 'Yeni cookie topla',
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

// YENİ COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log('\n=== YENİ COOKIE TOPLAMA ===', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithPlaywright();
    
    // Webhook'a gönder
    if (result.success && process.env.WEBHOOK_URL) {
        await sendCookiesToWebhook(result.all_cookies, 'PLAYWRIGHT_COLLECT');
    }
    
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const hbusCheck = lastCookies.length > 0 ? checkRequiredHbusCookies(lastCookies) : { success: false };
    
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Playwright Cookie Collector',
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusCheck.success ? 'SUCCESS' : 'FAILED',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 20 DAKİKADA BİR OTOMATİK
setInterval(async () => {
    console.log('\n🕒 === 20 DAKİKALIK OTOMATİK ÇALIŞMA ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    
    const result = await getCookiesWithPlaywright();
    
    if (result.success) {
        console.log(`✅ OTOMATİK: ${result.cookies_count} cookie toplandı (${result.hbus_cookies_count} HBUS)`);
        
        // Webhook'a gönder
        if (process.env.WEBHOOK_URL) {
            await sendCookiesToWebhook(result.all_cookies, 'PLAYWRIGHT_AUTO_20MIN');
        }
    } else {
        console.log('❌ OTOMATİK: Cookie toplanamadı');
    }

    console.log('====================================\n');
}, 20 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 PLAYWRIGHT JS COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Son cookie\'leri göster');
    console.log('📍 /collect - Yeni cookie topla');
    console.log('📍 /health - Status kontrol');
    console.log('🎯 HBUS Kontrol: hbus_sessionId ve hbus_anonymousId');
    console.log('🔍 JavaScript Cookie Okuma - Cache sorunu YOK');
    console.log('⏰ 4 saniye aralıklı HBUS kontrolü');
    console.log('🔄 Maksimum 10 deneme HBUS kontrolü');
    console.log('🔄 Maksimum 3 yeniden deneme');
    console.log('❌ Başarısızlıkta tarayıcı kapatılıp yeniden açılır');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithPlaywright();
    }, 3000);
});
