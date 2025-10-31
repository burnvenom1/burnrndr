const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

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
                '--disable-gpu'
            ]
        });

        console.log('✅ Browser başlatıldı');
        
        // Yeni sayfa oluştur
        const page = await browser.newPage();
        
        // User agent ayarla
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36');
        
        // Extra headers ekle
        await page.setExtraHTTPHeaders({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="138", "Google Chrome";v="138", "Not-A.Brand";v="8"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        });

        console.log('🌐 Hepsiburada\'ya gidiliyor...');
        
        // Hepsiburada'ya git
        await page.goto('https://giris.hepsiburada.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('✅ Sayfa yüklendi, JS çalışıyor...');
        
        // JavaScript'in çalışmasını bekle (10 saniye)
        await page.waitForTimeout(10000);

        console.log('🍪 Cookie\'ler alınıyor...');
        
        // Tüm cookie'leri al
        const cookies = await page.cookies();
        
        console.log('📊 Cookie Analizi:');
        console.log(`   Toplam Cookie: ${cookies.length}`);
        
        // HBUS cookie'lerini filtrele
        const hbusCookies = cookies.filter(cookie => 
            cookie.name.includes('hb-') || 
            cookie.name.includes('AKA_') ||
            cookie.name.includes('hepsiburada')
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
            console.log('');
        });

        return {
            success: true,
            all_cookies: cookies,
            hbus_cookies: hbusCookies,
            cookies_count: cookies.length,
            hbus_cookies_count: hbusCookies.length,
            method: 'PUPPETEER_HEADLESS',
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
            const payload = {
                cookies: cookies,
                count: cookies.length,
                timestamp: new Date().toISOString(),
                source: source
            };
            
            // Burada webhook'a gönderme kodu
            console.log('📤 Cookie\'ler webhooka gönderilecek:', cookies.length);
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ Webhook gönderilemedi:', error.message);
        return false;
    }
}

// EXPRESS ROUTES
app.get('/', async (req, res) => {
    console.log('\n=== PUPPETEER İSTEK ===', new Date().toLocaleTimeString('tr-TR'));
    const result = await getCookiesWithPuppeteer();
    
    // Webhook'a gönder
    if (result.success) {
        await sendCookiesToWebhook(result.all_cookies, 'PUPPETEER');
    }
    
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada Puppeteer Cookie Collector',
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
        await sendCookiesToWebhook(result.all_cookies, 'PUPPETEER_AUTO');
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
    console.log('🎯 Gerçek Chrome ile cookie toplar');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        getCookiesWithPuppeteer();
    }, 3000);
});
