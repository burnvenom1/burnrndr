const express = require('express');
const { chromium } = require('playwright');
const app = express();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;

// PLAYWRIGHT CHROMIUM PATH BUL
function getChromiumPath() {
    const fs = require('fs');
    
    // İndirilen chromium path'leri
    const paths = [
        '/opt/render/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
        '/opt/render/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell'
    ];
    
    for (const path of paths) {
        if (fs.existsSync(path)) {
            console.log('✅ Chromium bulundu:', path);
            return path;
        }
    }
    
    // Hiçbiri yoksa normal playwright kullan
    console.log('⚠️  Chromium path bulunamadı, playwright otomatik kullanacak');
    return null;
}

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

// PLAYWRIGHT İLE COOKIE TOPLAMA
async function getCookiesWithPlaywright() {
    let browser;
    
    try {
        console.log('🚀 Playwright başlatılıyor...');
        
        // Rastgele fingerprint ayarları
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();
        const chromiumPath = getChromiumPath();
        
        console.log(`🎯 Fingerprint: ${userAgent.substring(0, 50)}...`);
        console.log(`📏 Viewport: ${viewport.width}x${viewport.height}`);
        
        // Launch options
        const launchOptions = {
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
        };

        // Chromium path varsa ekle
        if (chromiumPath) {
            launchOptions.executablePath = chromiumPath;
            console.log(`🔧 Chromium Path: ${chromiumPath}`);
        } else {
            console.log('🔧 Playwright otomatik chromium kullanacak');
        }

        browser = await chromium.launch(launchOptions);
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
        await page.goto('https://giris.hepsiburada.com/', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('✅ Sayfa yüklendi, JS çalışıyor...');
        
        // JavaScript'in çalışmasını bekle (12 saniye)
        console.log('⏳ JS çalışıyor ve cookie oluşturuyor (12 saniye)...');
        await page.waitForTimeout(12000);

        // Sayfayı yenile (bazı cookie'ler için gerekli)
        console.log('🔄 Sayfa yenileniyor...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        console.log('🍪 Cookie\'ler alınıyor...');
        
        // Tüm cookie'leri al
        const cookies = await context.cookies();
        
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
            console.log(`      Session: ${!cookie.expires}`);
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
            method: 'PLAYWRIGHT_CLEAN',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ PLAYWRIGHT HATA:', error.message);
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
            session: !cookie.expires,
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
    const result = await getCookiesWithPlaywright();
    
    // Webhook'a gönder
    if (result.success && process.env.WEBHOOK_URL) {
        await sendCookiesToWebhook(result.all_cookies, 'PLAYWRIGHT_COLLECT');
    }
    
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Playwright Cookie Collector',
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
    console.log('🚀 PLAYWRIGHT COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Son cookie\'leri göster');
    console.log('📍 /collect - Yeni cookie topla');
    console.log('📍 /health - Status kontrol');
    console.log('🎯 Her seferinde cookie temizler');
    console.log('🆔 Her seferinde fingerprint değişir');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('🔧 playwright + manuel chromium path');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithPlaywright();
    }, 3000);
});
