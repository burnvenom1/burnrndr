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

// SON 5 İŞLEMİ KAYDET
let lastOperations = [];

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

// HBUS KONTROLÜ
function checkHbusCookies(cookies) {
    const hbusCookies = cookies.filter(cookie => 
        cookie.name.includes('hb-') || 
        cookie.name.includes('AKA_') ||
        cookie.name.toLowerCase().includes('hbus')
    );
    
    console.log(`🔍 HBUS Kontrol: ${hbusCookies.length} adet bulundu`);
    
    hbusCookies.forEach((cookie, index) => {
        console.log(`   ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 20)}...`);
    });
    
    return {
        success: hbusCookies.length >= 2,
        count: hbusCookies.length,
        cookies: hbusCookies
    };
}

// İŞLEM KAYDET
function saveOperation(result, method) {
    const operation = {
        timestamp: new Date().toISOString(),
        method: method,
        success: result.success,
        cookies_count: result.cookies_count || 0,
        hbus_count: result.hbus_cookies_count || 0,
        hbus_success: result.hbus_cookies_count >= 2
    };
    
    // Son 5 işlemi tut
    lastOperations.unshift(operation);
    if (lastOperations.length > 5) {
        lastOperations = lastOperations.slice(0, 5);
    }
    
    console.log(`📝 İşlem kaydedildi: ${method} - ${result.cookies_count} cookie`);
}

// PLAYWRIGHT İLE COOKIE TOPLAMA
async function getCookiesWithPlaywright() {
    let browser;
    
    try {
        console.log('🚀 Playwright başlatılıyor...');
        
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();
        
        console.log(`🎯 Fingerprint: ${userAgent.substring(0, 50)}...`);
        console.log(`📏 Viewport: ${viewport.width}x${viewport.height}`);
        
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                `--window-size=${viewport.width},${viewport.height}`
            ]
        });

        console.log('✅ Browser başlatıldı');
        
        const context = await browser.newContext({
            viewport: viewport,
            userAgent: userAgent
        });

        const page = await context.newPage();

        console.log('🧹 Cookie temizleniyor...');
        await context.clearCookies();
        
        console.log('🌐 Hepsiburada yükleniyor...');
        await page.goto('https://giris.hepsiburada.com/?ReturnUrl=https%3A%2F%2Foauth.hepsiburada.com%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3DSPA%26redirect_uri%3Dhttps%253A%252F%252Fwww.hepsiburada.com%252Fuyelik%252Fcallback%26response_type%3Dcode%26scope%3Dopenid%2520profile%26state%3Df883eaadc71d42c8bfe3aa90bc07585a%26code_challenge%3DI4Ihs_2x7BPCMgYoGd7YrazWUqIYgxTzIGMQVovpJfg%26code_challenge_method%3DS256%26response_mode%3Dquery%26customizeSegment%3DORDERS%26ActivePage%3DPURE_LOGIN%26oidcReturnUrl%3D%252Fsiparislerim', {
            waitUntil: 'networkidle',
            timeout: 15000
        });

        console.log('✅ Sayfa yüklendi, JS çalışıyor...');
        
        // HBUS BEKLEME DÖNGÜSÜ
        let hbusCheck;
        let attempts = 0;
        const maxAttempts = 3;
        
        do {
            attempts++;
            console.log(`⏳ HBUS bekleniyor... (${attempts}/${maxAttempts})`);
            await page.waitForTimeout(2000);
            
            const cookies = await context.cookies();
            hbusCheck = checkHbusCookies(cookies);
            
            if (hbusCheck.success) {
                console.log('🎉 HBUS cookie\'leri başarıyla alındı!');
                break;
            }
            
        } while (attempts < maxAttempts && !hbusCheck.success);
        
        // Final cookie kontrolü
        const finalCookies = await context.cookies();
        const finalHbusCheck = checkHbusCookies(finalCookies);
        
        console.log(`📊 Toplam Cookie: ${finalCookies.length}`);
        console.log(`🔍 Final HBUS: ${finalHbusCheck.count} adet`);
        
        lastCookies = finalCookies;
        lastCollectionTime = new Date();

        await browser.close();
        
        const result = {
            success: true,
            all_cookies: finalCookies,
            hbus_cookies: finalHbusCheck.cookies,
            cookies_count: finalCookies.length,
            hbus_cookies_count: finalHbusCheck.count,
            attempts: attempts,
            timestamp: new Date().toISOString()
        };
        
        // İşlemi kaydet
        saveOperation(result, 'PLAYWRIGHT_COLLECT');
        
        return result;

    } catch (error) {
        console.log('❌ HATA:', error.message);
        if (browser) await browser.close();
        
        const errorResult = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
        
        saveOperation(errorResult, 'PLAYWRIGHT_ERROR');
        return errorResult;
    }
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

// ANA SAYFA - SON COOKIE'LERİ VE İŞLEMLERİ GÖSTER
app.get('/', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            message: 'Henüz cookie toplanmadı. /collect endpointine giderek cookie toplayın.',
            endpoints: {
                '/': 'Son cookie\'leri ve işlemleri göster',
                '/collect': 'Yeni cookie topla',
                '/health': 'Status kontrol',
                '/history': 'Son 5 işlemi göster'
            }
        });
    }
    
    const hbusCheck = checkHbusCookies(lastCookies);
    
    res.json({
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusCheck.success ? 'SUCCESS' : 'FAILED',
        hbus_cookies_count: hbusCheck.count,
        required_hbus: 2,
        cookies: lastCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value.substring(0, 30) + (cookie.value.length > 30 ? '...' : ''),
            domain: cookie.domain,
            size: cookie.value.length
        })),
        recent_operations: lastOperations.slice(0, 3) // Son 3 işlem
    });
});

// SON 5 İŞLEMİ GÖSTER
app.get('/history', (req, res) => {
    res.json({
        total_operations: lastOperations.length,
        operations: lastOperations
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
    const hbusCheck = lastCookies.length > 0 ? checkHbusCookies(lastCookies) : { success: false, count: 0 };
    
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Playwright Cookie Collector',
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusCheck.success ? 'SUCCESS' : 'FAILED',
        hbus_cookies_count: hbusCheck.count,
        required_hbus: 2,
        recent_operations: lastOperations.length,
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
        console.log(`✅ OTOMATİK: ${result.cookies_count} cookie (${result.hbus_cookies_count} HBUS)`);
        
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
    console.log('🚀 PLAYWRIGHT COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Son cookie\'leri ve işlemleri göster');
    console.log('📍 /collect - Yeni cookie topla');
    console.log('📍 /health - Status kontrol');
    console.log('📍 /history - Son 5 işlemi göster');
    console.log('🎯 HBUS kontrol: Minimum 2 cookie');
    console.log('⏰ 2 saniye aralıklı HBUS kontrolü');
    console.log('📝 Son 5 işlem kaydı');
    console.log('⏰ 20 dakikada bir otomatik');
    console.log('====================================\n');
    
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithPlaywright();
    }, 2000);
});
