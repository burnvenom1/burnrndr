const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;

// SİSTEM CHROMIUM'UNU BUL
function findChromiumPath() {
    const paths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome'
    ];
    
    const fs = require('fs');
    for (const path of paths) {
        if (fs.existsSync(path)) {
            console.log('✅ Chromium bulundu:', path);
            return path;
        }
    }
    throw new Error('Chromium bulunamadı');
}

// RASTGELE USER AGENT ÜRET
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// PUPPETEER İLE COOKIE TOPLAMA
async function getCookiesWithPuppeteer() {
    let browser;
    
    try {
        console.log('🚀 Puppeteer başlatılıyor...');
        
        const chromiumPath = findChromiumPath();
        const userAgent = getRandomUserAgent();
        
        console.log(`🎯 User Agent: ${userAgent.substring(0, 50)}...`);
        
        // Browser'ı başlat (Sistem Chromium'u ile)
        browser = await puppeteer.launch({
            executablePath: chromiumPath,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--single-process',
                '--disable-web-security',
                '--window-size=1920,1080'
            ]
        });

        console.log('✅ Browser başlatıldı');
        
        const page = await browser.newPage();
        await page.setUserAgent(userAgent);
        await page.setJavaScriptEnabled(true);

        // Cookie temizle
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        
        console.log('🌐 Hepsiburada.com yükleniyor...');
        
        await page.goto('https://www.hepsiburada.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Kısa bekleme
        await page.waitForTimeout(3000);
        
        // Cookie'leri al
        const cookies = await page.cookies();
        console.log(`✅ ${cookies.length} cookie toplandı`);
        
        // HBUS kontrol
        const hbusCookies = cookies.filter(cookie => 
            cookie.name.includes('hb-') || 
            cookie.name.includes('AKA_') ||
            cookie.name.toLowerCase().includes('hbus')
        );

        console.log(`🔍 HBUS Cookie: ${hbusCookies.length}`);
        
        lastCookies = cookies;
        lastCollectionTime = new Date();

        await browser.close();
        
        return {
            success: true,
            all_cookies: cookies,
            hbus_cookies: hbusCookies,
            cookies_count: cookies.length,
            hbus_cookies_count: hbusCookies.length,
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

// EXPRESS ROUTES
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
    
    res.json({
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        cookies: lastCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value.substring(0, 30) + '...',
            domain: cookie.domain
        }))
    });
});

app.get('/collect', async (req, res) => {
    console.log('\n🎯 COOKIE TOPLAMA', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithPuppeteer();
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Cookie Collector',
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        uptime: process.uptime()
    });
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 PUPPETEER API ÇALIŞIYOR! Port:', PORT);
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithPuppeteer();
    }, 2000);
});
