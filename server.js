const express = require('express');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const app = express();

// PowerShell header'ları
const powerShellHeaders = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7', 
    'sec-ch-ua': '"Chromium";v="138", "Google Chrome";v="138", "Not-A.Brand";v="8"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
};

const hepsiburadaUrl = "https://giris.hepsiburada.com/?ReturnUrl=https%3A%2F%2Foauth.hepsiburada.com%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3DSPA%26redirect_uri%3Dhttps%253A%252F%252Fwww.hepsiburada.com%252Fuyelik%252Fcallback%26response_type%3Dcode%26scope%3Dopenid%2520profile%26state%3D2625099e1d0741198c6e59d723027292%26code_challenge%3DaBsDQXrxrlqq2CDfKrzLBnt73W7yuTuOe2KA0d5Ztro%26code_challenge_method%3DS256%26response_mode%3Dquery%26ActivePage%3DPURE_LOGIN%26oidcReturnUrl%3Dhttps%253A%252F%252Fwww.hepsiburada.com";

async function getCookiesWithJSRender() {
    console.log('🔍 Hepsiburada - JS Render başlıyor...');
    
    try {
        // 1. HTML'i al (PowerShell header'ları ile)
        console.log('📡 Siteye istek atılıyor...');
        const { data: html } = await axios.get(hepsiburadaUrl, {
            headers: powerShellHeaders,
            timeout: 15000
        });

        console.log('✅ HTML alındı, JS çalıştırılıyor...');

        // 2. JSDOM ile JavaScript render et
        const dom = new JSDOM(html, {
            url: hepsiburadaUrl,
            runScripts: 'dangerously', // ✅ BU JS ÇALIŞTIRIR!
            resources: 'usable',
            pretendToBeVisual: true,
            beforeParse(window) {
                // Tarayıcı ortamını simüle et
                window.scrollTo = () => {};
                window.matchMedia = () => ({ 
                    matches: false, 
                    addListener: () => {}, 
                    removeListener: () => {} 
                });
            }
        });

        // 3. JavaScript'in çalışıp cookie'leri oluşturmasını bekle
        console.log('⏳ JS çalışıyor ve cookie oluşturuyor (5 saniye)...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 4. JS çalıştıktan sonra cookie'leri al
        const cookiesString = dom.window.document.cookie;
        const cookies = cookiesString ? cookiesString.split('; ').filter(c => c) : [];
        
        console.log('🍪 JS RENDER SONRASI COOKIELER:');
        console.log('='.repeat(50));
        console.log(`Toplam Cookie: ${cookies.length}`);
        
        cookies.forEach((cookie, index) => {
            const [name, value] = cookie.split('=');
            console.log(`${index + 1}. ${name}`);
            console.log(`   Değer: ${value}`);
            console.log('');
        });

        return {
            success: true,
            cookies: cookies.map(cookie => {
                const [name, value] = cookie.split('=');
                return { name, value };
            }),
            cookies_count: cookies.length,
            timestamp: new Date().toISOString(),
            method: 'JSDOM_JS_RENDER'
        };

    } catch (error) {
        console.log('❌ HATA:', error.message);
        
        // Test cookie'leri (gerçekler gelmezse)
        const testCookies = [
            { name: 'hb-ss', value: 'js_session_' + Math.random().toString(36).substring(2, 15) },
            { name: 'AKA_A2', value: 'A' },
            { name: 'test_cookie', value: 'js_render_' + Date.now() }
        ];
        
        console.log('🧪 TEST COOKIE (JS Render başarısız):');
        testCookies.forEach((cookie, index) => {
            console.log(`${index + 1}. ${cookie.name} = ${cookie.value}`);
        });

        return {
            success: false,
            error: error.message,
            cookies: testCookies,
            cookies_count: testCookies.length,
            timestamp: new Date().toISOString(),
            method: 'JSDOM_JS_RENDER_FAILED'
        };
    }
}

// Express routes
app.get('/', async (req, res) => {
    console.log('\n=== YENİ JS RENDER İSTEĞİ ===', new Date().toLocaleTimeString('tr-TR'));
    
    const result = await getCookiesWithJSRender();
    
    console.log('📊 SONUÇ:');
    console.log(`   Başarı: ${result.success}`);
    console.log(`   Cookie Sayısı: ${result.cookies_count}`);
    console.log(`   Yöntem: ${result.method}`);
    console.log('✅ İstek tamamlandı\n');
    
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Hepsiburada JS Render Cookie API',
        timestamp: new Date().toISOString()
    });
});

// 20 dakikada bir otomatik
setInterval(async () => {
    console.log('\n🕒 === 20 DAKİKALIK OTOMATİK JS RENDER ===');
    const result = await getCookiesWithJSRender();
    console.log(`✅ Otomatik JS Render: ${result.cookies_count} cookie`);
    console.log('==========================================\n');
}, 20 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 JS RENDER COOKIE API ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('🎯 JSDOM ile JavaScript render eder');
    console.log('⏰ 20 dakikada bir otomatik çalışır');
    console.log('🍪 JS çalıştıktan sonra cookie alır');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        getCookiesWithJSRender();
    }, 2000);
});
