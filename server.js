const express = require('express');
const puppeteer = require('puppeteer');
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// RASTGELE VIEWPORT ÜRET
function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// HBUS COOKIE KONTROLÜ
function checkHbusCookies(cookies) {
    const hbusCookies = cookies.filter(cookie => 
        cookie.name.toLowerCase().includes('hbus') ||
        cookie.name.includes('HBUS') ||
        cookie.name.includes('hb-')
    );
    
    console.log(`🔍 HBUS Cookie Kontrolü: ${hbusCookies.length} adet bulundu`);
    
    hbusCookies.forEach((cookie, index) => {
        console.log(`   ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 20)}...`);
    });
    
    return {
        success: hbusCookies.length >= 2,
        count: hbusCookies.length,
        cookies: hbusCookies
    };
}

// NETWORKIDLE0 BEKLEME
async function waitForNetworkIdle(page) {
    console.log('⏳ Network idle bekleniyor...');
    
    await page.goto('https://www.hepsiburada.com/', {
        waitUntil: 'networkidle0',  // 🎯 NETWORKIDLE0 kullanıldı
        timeout: 15000
    });
    
    console.log('✅ Network idle tamamlandı');
}

// NETWORKIDLE0 İLE COOKIE TOPLAMA
async function getCookiesWithNetworkIdle() {
    let browser;
    
    try {
        console.log('🚀 Network idle ile cookie toplama başlatılıyor...');
        
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();
        
        console.log(`🎯 ${userAgent.substring(0, 40)}...`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                `--window-size=${viewport.width},${viewport.height}`
            ]
        });

        const page = await browser.newPage();
        
        await page.setViewport(viewport);
        await page.setUserAgent(userAgent);
        await page.setJavaScriptEnabled(true);

        // Cookie temizle
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        
        console.log('🌐 Hepsiburada.com yükleniyor (networkidle0)...');
        
        // NETWORKIDLE0 ile bekle
        await waitForNetworkIdle(page);
        
        // Cookie kontrol
        console.log('🔍 Cookie kontrol...');
        const cookies = await page.cookies();
        const hbusCheck = checkHbusCookies(cookies);
        
        if (hbusCheck.success) {
            console.log('🎉 HBUS cookie\'leri başarıyla alındı!');
            
            lastCookies = cookies;
            lastCollectionTime = new Date();
            
            await browser.close();
            
            return {
                success: true,
                all_cookies: cookies,
                hbus_cookies: hbusCheck.cookies,
                cookies_count: cookies.length,
                hbus_cookies_count: hbusCheck.count,
                collection_time: lastCollectionTime,
                method: 'NETWORKIDLE0',
                timestamp: new Date().toISOString()
            };
        }
        
        console.log('🔄 Yeterli HBUS cookie yok, sayfa yenileniyor...');
        
        // Yenileme de networkidle0 ile
        await page.reload({ 
            waitUntil: 'networkidle0',  // 🎯 YENİLEME DE NETWORKIDLE0
            timeout: 10000 
        });
        
        // İkinci cookie kontrol
        console.log('🔍 Yeniden cookie kontrol...');
        const newCookies = await page.cookies();
        const newHbusCheck = checkHbusCookies(newCookies);
        
        lastCookies = newCookies;
        lastCollectionTime = new Date();
        
        await browser.close();
        
        return {
            success: newHbusCheck.success,
            all_cookies: newCookies,
            hbus_cookies: newHbusCheck.cookies,
            cookies_count: newCookies.length,
            hbus_cookies_count: newHbusCheck.count,
            collection_time: lastCollectionTime,
            method: 'NETWORKIDLE0_RELOAD',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ HATA:', error.message);
        
        if (browser) {
            await browser.close();
        }
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
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
                timeout: 5000,
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

// ANA SAYFA
app.get('/', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            message: 'Henüz cookie toplanmadı. /collect endpointine giderek cookie toplayın.',
            endpoints: {
                '/': 'Son cookie\'leri göster',
                '/collect': 'Yeni cookie topla (NetworkIdle0)',
                '/health': 'Status kontrol'
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
        hbus_cookies: hbusCheck.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value.substring(0, 15) + '...',
            domain: cookie.domain
        }))
    });
});

// NETWORKIDLE0 İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log('\n🎯 NETWORKIDLE0 COOKIE TOPLAMA', new Date().toLocaleTimeString('tr-TR'));
    const startTime = Date.now();
    
    const result = await getCookiesWithNetworkIdle();
    
    const endTime = Date.now();
    console.log(`⏱️ Toplam süre: ${endTime - startTime}ms`);
    
    // Webhook'a gönder
    if (result.success && process.env.WEBHOOK_URL) {
        await sendCookiesToWebhook(result.all_cookies, 'NETWORKIDLE0_COLLECT');
    }
    
    res.json({
        ...result,
        duration_ms: endTime - startTime
    });
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const hbusCheck = lastCookies.length > 0 ? checkHbusCookies(lastCookies) : { success: false, count: 0 };
    
    res.json({ 
        status: 'OK', 
        service: 'NetworkIdle0 Hepsiburada Cookie Collector',
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusCheck.success ? 'SUCCESS' : 'FAILED',
        hbus_cookies_count: hbusCheck.count,
        required_hbus: 2,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 20 DAKİKADA BİR OTOMATİK
setInterval(async () => {
    console.log('\n🕒 === 20 DAKİKALIK OTOMATİK ÇALIŞMA ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    
    const startTime = Date.now();
    const result = await getCookiesWithNetworkIdle();
    const endTime = Date.now();
    
    console.log(`⏱️ Süre: ${endTime - startTime}ms`);
    
    if (result.success) {
        console.log(`✅ OTOMATİK: ${result.cookies_count} cookie (${result.hbus_cookies_count} HBUS)`);
        
        if (process.env.WEBHOOK_URL) {
            await sendCookiesToWebhook(result.all_cookies, 'AUTO_20MIN_NETWORKIDLE0');
        }
    } else {
        console.log('❌ OTOMATİK: Cookie toplanamadı');
    }
    
    console.log('====================================\n');
}, 20 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🎯 ===================================');
    console.log('🎯 NETWORKIDLE0 COOKIE API ÇALIŞIYOR!');
    console.log('🎯 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Son cookie\'leri göster');
    console.log('📍 /collect - NetworkIdle0 ile cookie topla');
    console.log('📍 /health - Status kontrol');
    console.log('🎯 HBUS kontrol: Minimum 2 cookie');
    console.log('🕒 NetworkIdle0: Tüm requestler bitene kadar bekler');
    console.log('⏰ 20 dakikada bir otomatik');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithNetworkIdle();
    }, 1000);
});
