// 🚀 10 FARKLI FINGERPRINT İLE COOKIE TOPLAMA
// 
// 📋 GEREKLİ AYARLAR:
// 1. Environment Variables:
//    - PLAYWRIGHT_BROWSERS_PATH=/opt/render/project/playwright
// 2. Build Command:
//    - npm install && npx playwright install chromium
// 3. Package.json:
//    - "playwright": "^1.40.0" dependency
//
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_collections: 0,
    successful_collections: 0,
    failed_collections: 0
};

// RASTGELE USER AGENT ÜRET
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
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
        { width: 1600, height: 900 },
        { width: 1024, height: 768 },
        { width: 1536, height: 960 },
        { width: 1280, height: 800 },
        { width: 1680, height: 1050 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// HBUS KONTROL FONKSİYONU
function checkRequiredHbusCookies(cookies) {
    const hasSessionId = cookies.some(cookie => cookie.name === 'hbus_sessionId');
    const hasAnonymousId = cookies.some(cookie => cookie.name === 'hbus_anonymousId');
    
    return hasSessionId && hasAnonymousId;
}

// TEK FINGERPRINT İLE COOKIE TOPLAMA
async function collectCookiesWithFingerprint(fingerprintId) {
    let browser;
    
    try {
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();
        
        console.log(`\n🎯 FINGERPRINT ${fingerprintId} BAŞLIYOR...`);
        console.log(`   UA: ${userAgent.substring(0, 40)}...`);
        console.log(`   Viewport: ${viewport.width}x${viewport.height}`);
        
        const startTime = Date.now();
        
        // Browser'ı başlat
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process', // ✅ Free plan için optimize
                '--disable-gpu'
            ]
        });

        // Yeni context (farklı fingerprint)
        const context = await browser.newContext({
            viewport: viewport,
            userAgent: userAgent,
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        const page = await context.newPage();

        // Cookie'leri temizle
        await context.clearCookies();
        
        console.log('   🌐 HB Ana Sayfa Yükleniyor...');
        
        // Sayfayı yükle
              console.log('🌐 Hepsiburada\'ya gidiliyor...');
                await page.goto('https://www.hepsiburada.com/siparislerim', {
                    waitUntil: 'networkidle',
                    timeout: 40000
                });
        console.log('   ✅ Sayfa yüklendi, 4sn bekleniyor...');
        await page.waitForTimeout(4000);

        // Cookie'leri al
        const cookies = await context.cookies();
        const hbusSuccess = checkRequiredHbusCookies(cookies);
        
        const duration = Date.now() - startTime;
        console.log(`   📊 ${cookies.length} cookie, HBUS: ${hbusSuccess ? '✅' : '❌'} (${duration}ms)`);

        // HBUS cookie'lerini göster
        cookies.forEach(cookie => {
            if (cookie.name.includes('hbus_')) {
                console.log(`      🎯 ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
            }
        });

        await browser.close();

        return {
            fingerprint_id: fingerprintId,
            success: hbusSuccess,
            cookies_count: cookies.length,
            hbus_cookies: cookies.filter(c => c.name.includes('hbus_')),
            user_agent: userAgent,
            viewport: viewport,
            duration: duration,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log(`   ❌ FINGERPRINT ${fingerprintId} HATA:`, error.message);
        if (browser) await browser.close();
        
        return {
            fingerprint_id: fingerprintId,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// 10 FARKLI FINGERPRINT İLE COOKIE TOPLAMA
async function collect10Fingerprints() {
    console.log('\n🚀 10 FARKLI FINGERPRINT İLE COOKIE TOPLAMA BAŞLATILIYOR...');
    console.log('⏰ Başlangıç:', new Date().toLocaleTimeString('tr-TR'));
    
    const allResults = [];
    const startTime = Date.now();

    // 10 FARKLI FINGERPRINT İLE SIRALI ÇALIŞ
    for (let i = 1; i <= 10; i++) {
        const result = await collectCookiesWithFingerprint(i);
        allResults.push(result);
        
        collectionStats.total_collections++;
        if (result.success) collectionStats.successful_collections++;
        else collectionStats.failed_collections++;
        
        // 2 saniye bekle (rate limit önleme)
        if (i < 10) {
            console.log('   ⏳ 2 saniye bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    const totalDuration = Date.now() - startTime;
    
    // İSTATİSTİKLER
    const successful = allResults.filter(r => r.success).length;
    const totalCookies = allResults.reduce((sum, r) => sum + (r.cookies_count || 0), 0);
    const totalHbusCookies = allResults.reduce((sum, r) => sum + (r.hbus_cookies?.length || 0), 0);
    
    console.log('\n📈 10 FINGERPRINT SONUÇ:');
    console.log(`   ✅ Başarılı: ${successful}/10`);
    console.log(`   🍪 Toplam Cookie: ${totalCookies}`);
    console.log(`   🎯 Toplam HBUS Cookie: ${totalHbusCookies}`);
    console.log(`   ⏱️  Toplam Süre: ${Math.round(totalDuration/1000)} saniye`);
    console.log(`   📊 Ortalama: ${Math.round(totalDuration/1000/10)} saniye/fingerprint`);

    // SON COOKIE'LERİ GÜNCELLE (son başarılı fingerprint)
    const lastSuccess = allResults.find(r => r.success);
    if (lastSuccess && lastSuccess.hbus_cookies) {
        lastCookies = lastSuccess.hbus_cookies;
        lastCollectionTime = new Date();
    }

    return {
        success: successful > 0,
        total_fingerprints: 10,
        successful_fingerprints: successful,
        total_cookies: totalCookies,
        total_hbus_cookies: totalHbusCookies,
        total_duration: `${Math.round(totalDuration/1000)} seconds`,
        average_per_fingerprint: `${Math.round(totalDuration/1000/10)} seconds`,
        results: allResults,
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

// UYKU ÖNLEME PİNG SİSTEMİ
async function sendWakeupPing() {
    try {
        const axios = require('axios');
        let pingUrl;
        
        if (process.env.RENDER_EXTERNAL_URL) {
            pingUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
        } else {
            const APP_NAME = 'srv-d42fe8dl3ps73cd2ad0'; // ⬅️ SERVIS ID'N ILE DEĞİŞTİR
            pingUrl = `https://${APP_NAME}.onrender.com/health`;
        }
        
        console.log(`🔄 Uyku önleme ping: ${pingUrl}`);
        await axios.get(pingUrl, { timeout: 15000 });
        console.log('✅ Uyku önlendi!');
        return true;
        
    } catch (error) {
        console.log('⚠️ Ping hatası:', error.message);
        return false;
    }
}

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: '10 Fingerprint Cookie Collector',
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': '10 fingerprint ile cookie topla',
            '/collect-single': 'Tek fingerprint ile cookie topla', 
            '/health': 'Status kontrol',
            '/stats': 'İstatistikleri göster',
            '/wakeup': 'Uyku önleme ping'
        },
        last_collection: lastCollectionTime,
        stats: collectionStats
    });
});

// 10 FINGERPRINT İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log('\n=== 10 FINGERPRINT COOKIE TOPLAMA ===');
    const result = await collect10Fingerprints();
    
    // Webhook'a gönder (son başarılı cookie'ler)
    if (result.success && process.env.WEBHOOK_URL && lastCookies.length > 0) {
        await sendCookiesToWebhook(lastCookies, '10_FINGERPRINT_COLLECT');
    }
    
    res.json(result);
});

// TEK FINGERPRINT İLE COOKIE TOPLA
app.get('/collect-single', async (req, res) => {
    console.log('\n=== TEK FINGERPRINT COOKIE TOPLAMA ===');
    const result = await collectCookiesWithFingerprint(1);
    
    if (result.success && process.env.WEBHOOK_URL) {
        await sendCookiesToWebhook(result.hbus_cookies || [], 'SINGLE_FINGERPRINT_COLLECT');
    }
    
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: '10 Fingerprint Cookie Collector',
        last_collection: lastCollectionTime,
        stats: collectionStats,
        uptime: Math.round(process.uptime()) + 's',
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        timestamp: new Date().toISOString()
    });
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    res.json({
        collection_stats: collectionStats,
        last_collection: lastCollectionTime,
        total_cookies: lastCookies.length,
        hbus_cookies: lastCookies.filter(c => c.name.includes('hbus_')).length,
        performance: {
            estimated_10_fingerprint_time: '80-100 seconds',
            average_per_fingerprint: '8-10 seconds'
        }
    });
});

// MANUEL UYKU ÖNLEME
app.get('/wakeup', async (req, res) => {
    console.log('🔔 Manuel uyku önleme ping gönderiliyor...');
    const result = await sendWakeupPing();
    res.json({ wakeup_sent: result, timestamp: new Date().toISOString() });
});

// 30 DAKİKADA BİR 10 FINGERPRINT COOKIE TOPLAMA
setInterval(async () => {
    console.log('\n🕒 === 30 DAKİKALIK OTOMATİK 10 FINGERPRINT ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    
    await collect10Fingerprints();
    console.log('====================================\n');
}, 30 * 60 * 1000);

// 25 DAKİKADA BİR UYKU ÖNLEME PİNG
setInterval(async () => {
    console.log('\n🔔 === UYKU ÖNLEME PİNG ===');
    console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
    await sendWakeupPing();
    console.log('====================================\n');
}, 25 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 10 FINGERPRINT COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Endpoint listesi');
    console.log('📍 /collect - 10 fingerprint ile cookie topla');
    console.log('📍 /collect-single - Tek fingerprint ile cookie topla');
    console.log('📍 /health - Status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('📍 /wakeup - Manuel uyku önleme');
    console.log('🎯 10 FARKLI FINGERPRINT ile cookie toplama');
    console.log('⏱️  Tahmini süre: 80-100 saniye (10 fingerprint)');
    console.log('⏰ 30 dakikada bir otomatik 10 fingerprint');
    console.log('🔔 25 dakikada bir uyku önleme ping');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        collect10Fingerprints();
    }, 5000);
});
