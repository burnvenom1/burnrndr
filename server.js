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

// PUPPETEER İLE COOKIE TOPLAMA
async function getCookiesWithPuppeteer() {
    let browser;
    
    try {
        console.log('🚀 Puppeteer başlatılıyor...');
        
        // Rastgele fingerprint ayarları
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();
        
        console.log(`🎯 Fingerprint: ${userAgent.substring(0, 50)}...`);
        console.log(`📏 Viewport: ${viewport.width}x${viewport.height}`);
        
        // Browser'ı başlat
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=site-per-process',
                `--window-size=${viewport.width},${viewport.height}`
            ]
        });

        console.log('✅ Browser başlatıldı');
        
        // Yeni sayfa oluştur
        const page = await browser.newPage();
        
        // Rastgele viewport ayarla
        await page.setViewport(viewport);
        
        // Rastgele user agent ayarla
        await page.setUserAgent(userAgent);
        
        // Extra headers ekle
        await page.setExtraHTTPHeaders({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        });

        // JavaScript'i enable et (bazı siteler için gerekli)
        await page.setJavaScriptEnabled(true);

        console.log('🧹 Önceki cookie\'ler temizleniyor...');
        
        // Tüm cookie'leri temizle
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
        
        console.log('✅ Cookie\'ler temizlendi');
        
        console.log('🌐 Hepsiburada\'ya gidiliyor...');
        
        // Hepsiburada'ya git
        await page.goto('https://giris.hepsiburada.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ Sayfa yüklendi, JS çalışıyor...');
        
        // JavaScript'in çalışmasını bekle (12 saniye)
        console.log('⏳ JS çalışıyor ve cookie oluşturuyor (12 saniye)...');
        await page.waitForTimeout(12000);

        // Sayfayı yenile (bazı cookie'ler için gerekli)
        console.log('🔄 Sayfa yenileniyor...');
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(5000);

        console.log('🍪 Cookie\'ler alınıyor...');
        
        // Tüm cookie'leri al
        const cookies = await page.cookies();
        
        console.log('📊 Cookie Analizi:');
        console.log(`   Toplam Cookie: ${cookies.length}`);
        
        // HBUS cookie'lerini filtrele
        const hbusCookies = cookies.filter(cookie => 
            cookie.name.includes('hb-') || 
            cookie.name.includes('AKA_') ||
            cookie.name.includes('hepsiburada') ||
            cookie.name.includes('hbus_')
        );

        console.log(`   HBUS Cookie: ${hbusCookies.length}`);
        
        // Cookie'leri detaylı göster
        cookies.forEach((cookie, index) => {
            console.log(`   ${index + 1}. ${cookie.name}`);
            console.log(`      Domain: ${cookie.domain}`);
            console.log(`      Value: ${cookie.value.substring(0, 30)}${cookie.value.length > 30 ? '...' : ''}`);
            console.log(`      Size: ${cookie.value.length} karakter`);
            console.log(`      HttpOnly: ${cookie.httpOnly}`);
            console.log(`      Secure: ${cookie.secure}`);
            console.log(`      Session: ${cookie.session}`);
            console.log('');
        });

        // Son cookie'leri güncelle
        lastCookies = cookies;
        lastCollectionTime = new Date();

        return {
            success: true,
            all_cookies: cookies,
            hbus_cookies: hbusCookies,
            cookies_count: cookies.length,
            hbus_cookies_count: hbusCookies.length,
            fingerprint: {
                user_agent: userAgent,
                viewport: viewport,
                collection_time: lastCollectionTime
            },
            method: 'PUPPETEER_CLEAN',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ PUPPETEER HATA:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        // Browser'ı kapat
        if (browser) {
            await browser.close();
            console.log('🔚 Browser kapatıldı');
        }
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
    
    res.json({
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        cookies: lastCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value.substring(0, 50) + (cookie.value.length > 50 ? '...' : ''),
            domain: cookie.domain,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            session: cookie.session,
            size: cookie.value.length
        })),
        hbus_cookies: lastCookies.filter(cookie => 
            cookie.name.includes('hb-') || cookie.name.includes('AKA_')
        ).length
    });
});

// YENİ COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log('\n=== YENİ COOKIE TOPLAMA ===', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithPuppeteer();
    
    // Webhook'a gönder
    if (result.success && process.env.WEBHOOK_URL) {
        await sendCookiesToWebhook(result.all_cookies, 'PUPPETEER_COLLECT');
    }
    
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Puppeteer Cookie Collector',
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 20 DAKİKADA BİR OTOMATİK
setInterval(async () => {
    console.log('\n🕒 === 20 DAKİKALIK OTOMATİK ÇALIŞMA ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    
    const result = await getCookiesWithPuppeteer();
    
    if (result.success) {
        console.log(`✅ OTOMATİK: ${result.cookies_count} cookie toplandı (${result.hbus_cookies_count} HBUS)`);
        
        // Webhook'a gönder
        if (process.env.WEBHOOK_URL) {
            await sendCookiesToWebhook(result.all_cookies, 'PUPPETEER_AUTO_20MIN');
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
    console.log('🚀 PUPPETEER COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Son cookie\'leri göster');
    console.log('📍 /collect - Yeni cookie topla');
    console.log('📍 /health - Status kontrol');
    console.log('🎯 Her seferinde cookie temizler');
    console.log('🆔 Her seferinde fingerprint değişir');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithPuppeteer();
    }, 3000);
}); 
