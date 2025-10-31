// 🚀 RENDER FREE PLAN OPTİMUM SCRİPT
// ✅ HB Ana Sayfa = 4 saniyede cookie!
// ✅ Tek denemede bulma
// ✅ Free plan friendly

const express = require('express');
const { chromium } = require('playwright');
const app = express();

// SON COOKIE'LER
let lastCookies = [];
let lastCollectionTime = null;

// HAFİF FINGERPRINT
function getLightUserAgent() {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
}

// HBUS KONTROL
function checkRequiredHbusCookies(cookies) {
    const hasSessionId = cookies.some(c => c.name === 'hbus_sessionId');
    const hasAnonymousId = cookies.some(c => c.name === 'hbus_anonymousId');
    
    console.log('🔍 HBUS Kontrol:');
    console.log(`   - hbus_sessionId: ${hasSessionId ? '✅ VAR' : '❌ YOK'}`);
    console.log(`   - hbus_anonymousId: ${hasAnonymousId ? '✅ VAR' : '❌ YOK'}`);
    
    return hasSessionId && hasAnonymousId;
}

// HAFİF COOKIE TOPLAMA
async function lightWeightCollection() {
    let browser;
    
    try {
        console.log('🚀 HAFİF MOD BAŞLATILIYOR...');
        
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                '--disable-gpu',
                '--max-old-space-size=128'
            ]
        });

        const context = await browser.newContext({
            userAgent: getLightUserAgent(),
            viewport: { width: 1280, height: 720 }
        });

        const page = await context.newPage();

        // COOKIE TEMİZLE
        await context.clearCookies();
        
        console.log('🌐 HB Ana Sayfa Yükleniyor...');
        
        // HAFİF YÜKLEME
        await page.goto('https://www.hepsiburada.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log('✅ Sayfa yüklendi, 4sn JS bekleniyor...');
        
        // 4 SANİYE BEKLE - TEK DENEME!
        await page.waitForTimeout(4000);

        // COOKIE'LERİ AL
        const cookies = await context.cookies();
        const hbusSuccess = checkRequiredHbusCookies(cookies);
        
        console.log(`📊 ${cookies.length} cookie, HBUS: ${hbusSuccess ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);

        // DETAYLI LOG
        cookies.forEach(cookie => {
            if (cookie.name.includes('hbus')) {
                console.log(`   🎯 ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
            }
        });

        lastCookies = cookies;
        lastCollectionTime = new Date();

        await browser.close();

        return {
            success: true,
            cookies_count: cookies.length,
            hbus_success: hbusSuccess,
            hbus_cookies: cookies.filter(c => c.name.includes('hbus')),
            attempts: 1,
            duration: '4s',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ HATA:', error.message);
        if (browser) await browser.close();
        
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
            message: 'HB Cookie Collector - Free Plan Optimized',
            endpoints: {
                '/': 'Son cookie\'leri göster',
                '/collect': 'Yeni cookie topla (4sn)',
                '/health': 'Status kontrol'
            }
        });
    }
    
    const hbusSuccess = checkRequiredHbusCookies(lastCookies);
    
    res.json({
        last_collection: lastCollectionTime,
        cookies_count: lastCookies.length,
        hbus_status: hbusSuccess ? 'SUCCESS' : 'FAILED',
        hbus_cookies: lastCookies.filter(c => c.name.includes('hbus')).map(c => ({
            name: c.name,
            value: c.value.substring(0, 30) + '...'
        })),
        plan: 'FREE_OPTIMIZED',
        duration: '4 seconds'
    });
});

app.get('/collect', async (req, res) => {
    console.log('\n=== HAFİF TOPLAMA BAŞLATILDI ===');
    const result = await lightWeightCollection();
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ACTIVE', 
        plan: 'FREE_OPTIMIZED',
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        uptime: Math.round(process.uptime()) + 's',
        strategy: 'HB_ANA_SAYFA_4SN',
        service_id: 'srv-d42fe8dl3ps73cd2ad0'
    });
});

// UYKU ÖNLEME SİSTEMİ - SERVIS ID ILE
setInterval(async () => {
    try {
        const axios = require('axios');
        const APP_NAME = 'srv-d42fe8dl3ps73cd2ad0'; // ⬅️ SERVIS ID'N
        const pingUrl = `https://${APP_NAME}.onrender.com/health`;
        
        console.log(`🔄 Ping gönderiliyor: ${pingUrl}`);
        await axios.get(pingUrl, { 
            timeout: 15000 
        });
        console.log('✅ Uyku önlendi!');
        
    } catch (error) {
        console.log('⚠️ Ping başarısız (normal):', error.message);
    }
}, 25 * 60 * 1000); // 25 dakikada bir

// 20 DAKİKADA BİR OTOMATİK COOKIE TOPLAMA
setInterval(async () => {
    console.log('\n⏰ OTOMATİK HAFİF TOPLAMA...');
    await lightWeightCollection();
}, 20 * 60 * 1000);

// SUNUCU BAŞLAT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🎯 HB FREE OPTIMUM API ÇALIŞIYOR!');
    console.log('📍 Port:', PORT);
    console.log('📍 Service ID: srv-d42fe8dl3ps73cd2ad0');
    console.log('✅ HB Ana Sayfa - 4 saniye');
    console.log('✅ Tek denemede cookie bulma');
    console.log('⏰ 20 dakikada bir otomatik toplama');
    console.log('🔄 25 dakikada bir uyku önleme');
    console.log('====================================\n');
    
    // İLK ÇALIŞTIRMA
    setTimeout(() => {
        lightWeightCollection();
    }, 2000);
});
