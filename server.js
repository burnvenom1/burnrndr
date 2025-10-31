const express = require('express');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');
const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // maksimum 100 istek
    message: {
        error: 'Çok fazla istek gönderildi, lütfen 15 dakika sonra tekrar deneyin.'
    }
});
app.use(limiter);

// Middleware
app.use(express.json());

// Hata yönetimi
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// PUPPETEER İLE COOKIE TOPLAMA
async function getCookiesWithPuppeteer() {
    let browser;
    
    try {
        console.log('🚀 Puppeteer başlatılıyor...');
        
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
                '--disable-features=site-per-process'
            ]
        });

        console.log('✅ Browser başlatıldı');
        
        // Yeni sayfa oluştur
        const page = await browser.newPage();
        
        // Viewport ayarla
        await page.setViewport({ width: 1366, height: 768 });
        
        // User agent ayarla
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Extra headers ekle
        await page.setExtraHTTPHeaders({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        });

        console.log('🌐 Hepsiburada\'ya gidiliyor...');
        
        // Hepsiburada'ya git
        await page.goto('https://www.hepsiburada.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Sayfa yüklendi, JS çalışıyor...');
        
        // JavaScript'in çalışmasını bekle
        await page.waitForTimeout(8000);

        // Sayfanın tamamen yüklendiğinden emin ol
        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        });

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
            cookie.name.includes('Hepsiburada') ||
            cookie.name.includes('USER') ||
            cookie.name.includes('SESSION') ||
            cookie.name.includes('TOKEN')
        );

        console.log(`   HBUS Cookie: ${hbusCookies.length}`);
        
        // Önemli cookie'leri göster
        cookies.forEach((cookie, index) => {
            console.log(`   ${index + 1}. ${cookie.name}`);
            console.log(`      Domain: ${cookie.domain}`);
            console.log(`      Value: ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
            console.log(`      Size: ${cookie.value.length} karakter`);
            console.log(`      HttpOnly: ${cookie.httpOnly}`);
            console.log(`      Secure: ${cookie.secure}`);
            console.log(`      Session: ${cookie.session}`);
            console.log(`      Expires: ${cookie.expires ? new Date(cookie.expires * 1000).toLocaleString('tr-TR') : 'Session'}`);
            console.log('');
        });

        return {
            success: true,
            all_cookies: cookies,
            hbus_cookies: hbusCookies,
            cookies_count: cookies.length,
            hbus_cookies_count: hbusCookies.length,
            method: 'PUPPETEER_HEADLESS',
            timestamp: new Date().toISOString(),
            url: page.url()
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
            try {
                const pages = await browser.pages();
                await Promise.all(pages.map(page => page.close().catch(() => {})));
                await browser.close();
                console.log('🔚 Browser güvenli şekilde kapatıldı');
            } catch (closeError) {
                console.log('⚠️ Browser kapatılırken hata:', closeError.message);
            }
        }
    }
}

// COOKIE GÖNDERME FONKSİYONU
async function sendCookiesToWebhook(cookies, source) {
    try {
        const webhookUrl = process.env.WEBHOOK_URL;
        
        if (webhookUrl && cookies && cookies.length > 0) {
            const payload = {
                cookies: cookies,
                count: cookies.length,
                timestamp: new Date().toISOString(),
                source: source
            };
            
            // Webhook'a gönderme
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            console.log('📤 Cookie\'ler webhooka gönderildi:', response.status);
            return response.ok;
        } else {
            console.log('⚠️ Webhook URL tanımlı değil veya cookie yok');
            return false;
        }
    } catch (error) {
        console.log('❌ Webhook gönderilemedi:', error.message);
        return false;
    }
}

// EXPRESS ROUTES
app.get('/', async (req, res) => {
    console.log('\n=== MANUEL İSTEK ===', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithPuppeteer();
    
    // Webhook'a gönder
    if (result.success) {
        await sendCookiesToWebhook(result.all_cookies, 'MANUEL');
    }
    
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Puppeteer Cookie Collector',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/cookies', async (req, res) => {
    console.log('\n=== COOKIE İSTEĞİ ===', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithPuppeteer();
    res.json(result);
});

// 20 DAKİKADA BİR OTOMATİK COOKIE TOPLAMA
let autoInterval;
const AUTO_INTERVAL_MS = 20 * 60 * 1000; // 20 dakika

function startAutoCollector() {
    if (autoInterval) {
        clearInterval(autoInterval);
    }
    
    autoInterval = setInterval(async () => {
        console.log('\n🕒 === 20 DAKİKALIK OTOMATİK ÇALIŞMA ===');
        console.log('⏰', new Date().toLocaleString('tr-TR'));
        
        const result = await getCookiesWithPuppeteer();
        
        if (result.success) {
            console.log(`✅ OTOMATİK: ${result.cookies_count} cookie toplandı (${result.hbus_cookies_count} HBUS)`);
            await sendCookiesToWebhook(result.all_cookies, 'AUTO_20MIN');
        } else {
            console.log('❌ OTOMATİK: Cookie toplanamadı');
        }
        
        console.log('====================================\n');
    }, AUTO_INTERVAL_MS);
}

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 PUPPETEER COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🎯 Gerçek Chrome ile cookie toplar');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('📊 Endpoints:');
    console.log('   GET /          - Manuel cookie toplama');
    console.log('   GET /cookies   - Sadece cookie toplama');
    console.log('   GET /health    - Health check');
    console.log('====================================\n');
    
    // Environment kontrol
    if (!process.env.WEBHOOK_URL) {
        console.log('⚠️  UYARI: WEBHOOK_URL environment variable tanımlı değil');
        console.log('ℹ️   Webhook özelliği devre dışı');
    } else {
        console.log('✅ WEBHOOK_URL tanımlı');
    }
    
    // Otomatik collector'ü başlat
    startAutoCollector();
    
    // İlk çalıştırma
    setTimeout(async () => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        const result = await getCookiesWithPuppeteer();
        if (result.success) {
            console.log(`✅ İlk toplama: ${result.cookies_count} cookie`);
        }
    }, 5000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔚 SIGTERM alındı, sunucu kapatılıyor...');
    if (autoInterval) {
        clearInterval(autoInterval);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔚 SIGINT alındı, sunucu kapatılıyor...');
    if (autoInterval) {
        clearInterval(autoInterval);
    }
    process.exit(0);
});
