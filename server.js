const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const app = express();

let lastCookies = [];
let lastCollectionTime = null;

// Rastgele fingerprint fonksiyonları
function getRandomUserAgent() {
    const list = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    return list[Math.floor(Math.random() * list.length)];
}
function getRandomViewport() {
    const sizes = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 }
    ];
    return sizes[Math.floor(Math.random() * sizes.length)];
}

// === COOKIE TOPLAMA ===
async function getCookiesWithPuppeteer() {
    let browser;
    try {
        console.log('🚀 Puppeteer başlatılıyor...');
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.setUserAgent(userAgent);

        await page.goto('https://giris.hepsiburada.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        await page.waitForTimeout(8000);

        const cookies = await page.cookies();

        lastCookies = cookies;
        lastCollectionTime = new Date();

        console.log(`🍪 ${cookies.length} cookie toplandı.`);
        return { success: true, cookies, timestamp: new Date().toISOString() };

    } catch (err) {
        console.error('❌ Hata:', err.message);
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.close();
    }
}

// === EXPRESS ROUTES ===
app.get('/', (req, res) => {
    res.json({
        message: 'Hepsiburada Puppeteer Cookie Collector',
        endpoints: {
            '/collect': 'Yeni cookie topla',
            '/health': 'Durum kontrol'
        },
        lastCollectionTime,
        cookiesCount: lastCookies.length
    });
});

app.get('/collect', async (req, res) => {
    const result = await getCookiesWithPuppeteer();
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        cookiesCount: lastCookies.length,
        lastCollectionTime
    });
});

// === SUNUCU BAŞLAT ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});
