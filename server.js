// 🚀 COOKIE ÖMÜR TAKİP SİSTEMİ - DÜZELTİLMİŞ
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// 🎯 PLAYWRIGHT CACHE PATH AYARI - CHROMIUM BULSUN
const fs = require('fs');
const path = require('path');
const PLAYWRIGHT_CACHE_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/render/project/playwright-cache';
if (!fs.existsSync(PLAYWRIGHT_CACHE_PATH)) {
    fs.mkdirSync(PLAYWRIGHT_CACHE_PATH, { recursive: true });
}
process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_CACHE_PATH;
console.log('📁 Playwright cache path:', PLAYWRIGHT_CACHE_PATH);

// COOKIE TAKİP VERİLERİ
let cookieHistory = [];
let currentCookies = [];
let cookieLifespanStats = {
    total_tests: 0,
    changed_cookies: 0,
    average_lifespan: 0,
    min_lifespan: 0,
    max_lifespan: 0
};

// COOKIE KARŞILAŞTIRMA FONKSİYONU
function compareCookies(oldCookies, newCookies) {
    const changes = {
        added: [],
        removed: [],
        changed: [],
        unchanged: []
    };

    const oldMap = new Map(oldCookies.map(c => [c.name, c]));
    const newMap = new Map(newCookies.map(c => [c.name, c]));

    for (const [name, cookie] of newMap) {
        if (!oldMap.has(name)) {
            changes.added.push(cookie);
        }
    }

    for (const [name, cookie] of oldMap) {
        if (!newMap.has(name)) {
            changes.removed.push(cookie);
        }
    }

    for (const [name, newCookie] of newMap) {
        if (oldMap.has(name)) {
            const oldCookie = oldMap.get(name);
            if (oldCookie.value !== newCookie.value) {
                changes.changed.push({
                    name: name,
                    old_value: oldCookie.value.substring(0, 20) + '...',
                    new_value: newCookie.value.substring(0, 20) + '...',
                    old_cookie: oldCookie,
                    new_cookie: newCookie
                });
            } else {
                changes.unchanged.push(newCookie);
            }
        }
    }

    return changes;
}

// COOKIE ÖMÜR HESAPLAMA
function calculateCookieLifespan(history) {
    if (history.length < 2) return [];

    const changes = [];
    
    for (let i = 1; i < history.length; i++) {
        const current = history[i];
        const previous = history[i - 1];
        
        const comparison = compareCookies(previous.cookies, current.cookies);
        
        if (comparison.changed.length > 0 || comparison.added.length > 0 || comparison.removed.length > 0) {
            const lifespanMs = new Date(current.timestamp) - new Date(previous.timestamp);
            const lifespanMinutes = Math.round(lifespanMs / (1000 * 60));
            
            changes.push({
                timestamp: current.timestamp,
                previous_timestamp: previous.timestamp,
                lifespan_minutes: lifespanMinutes,
                changes: comparison
            });
        }
    }

    return changes;
}

// 🎯 GELİŞMİŞ COOKIE TOPLAMA FONKSİYONU
async function collectCookies() {
    let browser;
    let context;
    let page;
    
    try {
        console.log('🍪 COOKIE TOPLANIYOR...');
        
        // 🎯 BROWSER AYARLARI - DAHA İYİ FINGERPRINT
        browser = await chromium.launch({
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
                '--disable-blink-features=AutomationControlled'
            ]
        });

        // 🎯 DAHA GERÇEKÇİ BROWSER CONTEXT
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'tr-TR',
            timezoneId: 'Europe/Istanbul',
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        });

        page = await context.newPage();

        // 🎯 DAHA AKILLI SAYFA YÖNLENDİRME
        console.log('🌐 Hepsiburada ana sayfaya gidiliyor...');
        await page.goto('https://www.hepsiburada.com', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // 🎯 COOKIE'LERİN OLUŞMASI İÇİN BEKLEME VE ETKİLEŞİM
        console.log('⏳ Cookie oluşumu bekleniyor...');
        
        // Sayfada biraz gezinti yap (cookie oluşumu için)
        await page.waitForTimeout(3000);
        
        // Rastgele tıklamalar yap
        try {
            await page.click('a[href*="elektronik"]').catch(() => {});
            await page.waitForTimeout(2000);
        } catch (e) {}

        // 🎯 JavaScript ile cookie'leri oku ve DEBUG
        const jsCookies = await page.evaluate(() => {
            console.log('🔍 JavaScript cookie okunuyor...');
            const cookies = document.cookie;
            console.log('📄 Cookie string:', cookies);
            return cookies;
        });

        console.log('📊 JavaScript Cookie String:', jsCookies);
        console.log('📊 JavaScript Cookie Length:', jsCookies.length);

        // 🎯 CONTEXT COOKIE'LERİNİ AL
        const contextCookies = await context.cookies();
        console.log('🔍 Context Cookie Sayısı:', contextCookies.length);
        
        // 🎯 COOKIE'LERİ DETAYLI LOGLA
        contextCookies.forEach((cookie, index) => {
            console.log(`🍪 ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 30)}... (${cookie.value.length} chars)`);
        });

        // 🎯 HBUS COOKIE'LERİNİ FİLTRELE
        const hbusCookies = contextCookies.filter(c => 
            c.name.includes('hbus_') || 
            c.name.includes('HBUS') || 
            c.domain.includes('hepsiburada')
        );

        console.log('🎯 HBUS Cookie Sayısı:', hbusCookies.length);
        hbusCookies.forEach(cookie => {
            console.log(`   🔵 ${cookie.name} = ${cookie.value.substring(0, 20)}...`);
        });

        // 🎯 COOKIE VERİLERİNİ HAZIRLA
        const cookieData = {
            timestamp: new Date().toISOString(),
            timestamp_readable: new Date().toLocaleString('tr-TR'),
            total_cookies: contextCookies.length,
            hbus_cookies: hbusCookies.length,
            all_cookie_names: contextCookies.map(c => c.name),
            hbus_cookie_names: hbusCookies.map(c => c.name),
            cookies: contextCookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value.substring(0, 30) + (cookie.value.length > 30 ? '...' : ''),
                full_value_length: cookie.value.length,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'Session',
                httpOnly: cookie.httpOnly || false,
                secure: cookie.secure || false,
                sameSite: cookie.sameSite || 'Lax'
            })),
            js_cookies: jsCookies,
            js_cookies_parsed: jsCookies.split(';').map(c => c.trim())
        };

        // 🎯 GEÇMİŞE EKLE
        cookieHistory.push(cookieData);
        
        // Sadece son 50 kayıt tut
        if (cookieHistory.length > 50) {
            cookieHistory = cookieHistory.slice(-50);
        }

        // 🎯 MEVCUT COOKIE'LERİ GÜNCELLE
        currentCookies = contextCookies;

        console.log(`✅ ${contextCookies.length} cookie toplandı (${hbusCookies.length} HBUS)`);
        
        return cookieData;

    } catch (error) {
        console.log('❌ COOKIE TOPLAMA HATASI:', error.message);
        return {
            timestamp: new Date().toISOString(),
            error: error.message,
            cookies: [],
            all_cookie_names: [],
            hbus_cookie_names: []
        };
    } finally {
        // 🎯 TEMİZLİK
        if (page) {
            try { await page.close(); } catch (e) {}
        }
        if (context) {
            try { await context.close(); } catch (e) {}
        }
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
    }
}

// COOKIE DEĞİŞİM ANALİZİ
function analyzeCookieChanges() {
    if (cookieHistory.length < 2) {
        return { message: 'Yeterli veri yok, en az 2 ölçüm gerekli' };
    }

    const changes = calculateCookieLifespan(cookieHistory);
    const allLifespans = changes.map(c => c.lifespan_minutes);
    
    if (allLifespans.length > 0) {
        cookieLifespanStats = {
            total_tests: changes.length,
            changed_cookies: changes.reduce((sum, change) => sum + change.changes.changed.length, 0),
            average_lifespan: Math.round(allLifespans.reduce((a, b) => a + b, 0) / allLifespans.length),
            min_lifespan: Math.min(...allLifespans),
            max_lifespan: Math.max(...allLifespans),
            last_change: changes.length > 0 ? changes[changes.length - 1] : null
        };
    }

    return {
        stats: cookieLifespanStats,
        recent_changes: changes.slice(-5),
        total_measurements: cookieHistory.length
    };
}

// EXPRESS ROUTES

// ANA SAYFA
app.get('/', (req, res) => {
    res.json({
        service: '🍪 Cookie Ömür Takip Sistemi - GELİŞMİŞ',
        description: 'Cookie\'lerin ne zaman değiştiğini takip eder',
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': 'Cookie topla',
            '/history': 'Cookie geçmişi',
            '/analysis': 'Cookie değişim analizi',
            '/current': 'Mevcut cookie\'ler',
            '/stats': 'İstatistikler',
            '/debug': 'Debug bilgileri'
        },
        current_status: {
            total_measurements: cookieHistory.length,
            last_collection: cookieHistory.length > 0 ? cookieHistory[cookieHistory.length - 1].timestamp_readable : 'Henüz yok',
            active_tracking: '5 dakikada bir otomatik'
        }
    });
});

// COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log('\n=== MANUEL COOKIE TOPLAMA ===');
    const result = await collectCookies();
    
    // Analiz yap
    const analysis = analyzeCookieChanges();
    
    res.json({
        collection: result,
        analysis: analysis
    });
});

// 🎯 YENİ: DEBUG ENDPOINT'İ
app.get('/debug', (req, res) => {
    const lastCollection = cookieHistory.length > 0 ? cookieHistory[cookieHistory.length - 1] : null;
    
    res.json({
        system: {
            playwright_cache_path: PLAYWRIGHT_CACHE_PATH,
            cache_exists: fs.existsSync(PLAYWRIGHT_CACHE_PATH),
            node_version: process.version,
            platform: process.platform
        },
        cookies: {
            total_history: cookieHistory.length,
            last_collection: lastCollection ? {
                timestamp: lastCollection.timestamp_readable,
                total_cookies: lastCollection.total_cookies,
                hbus_cookies: lastCollection.hbus_cookies,
                all_names: lastCollection.all_cookie_names,
                hbus_names: lastCollection.hbus_cookie_names
            } : 'Henüz yok',
            current_cookies_count: currentCookies.length
        }
    });
});

// COOKIE GEÇMİŞİ
app.get('/history', (req, res) => {
    res.json({
        total_measurements: cookieHistory.length,
        history: cookieHistory.map(entry => ({
            timestamp: entry.timestamp_readable,
            total_cookies: entry.total_cookies,
            hbus_cookies: entry.hbus_cookies,
            all_cookie_names: entry.all_cookie_names,
            hbus_cookie_names: entry.hbus_cookie_names
        }))
    });
});

// COOKIE ANALİZİ
app.get('/analysis', (req, res) => {
    const analysis = analyzeCookieChanges();
    
    res.json({
        analysis: analysis,
        recommendations: getCookieRecommendations(analysis)
    });
});

// MEVCUT COOKIE'LER
app.get('/current', (req, res) => {
    if (cookieHistory.length === 0) {
        return res.json({ message: 'Henüz cookie toplanmadı' });
    }
    
    const current = cookieHistory[cookieHistory.length - 1];
    res.json({
        last_update: current.timestamp_readable,
        total_cookies: current.total_cookies,
        hbus_cookies: current.hbus_cookies,
        all_cookie_names: current.all_cookie_names,
        hbus_cookie_names: current.hbus_cookie_names,
        cookies: current.cookies
    });
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const analysis = analyzeCookieChanges();
    
    res.json({
        lifespan_stats: cookieLifespanStats,
        current_state: {
            total_measurements: cookieHistory.length,
            current_cookies: currentCookies.length,
            tracking_duration: cookieHistory.length > 1 ? 
                Math.round((new Date() - new Date(cookieHistory[0].timestamp)) / (1000 * 60)) + ' dakika' : 'Yeni başladı'
        },
        predictions: {
            next_expected_change: cookieLifespanStats.average_lifespan > 0 ? 
                `~${cookieLifespanStats.average_lifespan} dakika sonra` : 'Bilinmiyor',
            stability: cookieLifespanStats.average_lifespan > 30 ? 'Yüksek' : 
                      cookieLifespanStats.average_lifespan > 10 ? 'Orta' : 'Düşük'
        }
    });
});

// TAVSİYELER
function getCookieRecommendations(analysis) {
    if (!analysis.stats || analysis.stats.total_tests === 0) {
        return ['Daha fazla veri toplanması gerekiyor'];
    }

    const stats = analysis.stats;
    const recommendations = [];

    if (stats.average_lifespan < 10) {
        recommendations.push('❌ Cookie ömrü çok kısa (<10 dk) - Sık yenileme gerekebilir');
    } else if (stats.average_lifespan < 30) {
        recommendations.push('⚠️ Cookie ömrü orta seviye (10-30 dk) - Orta sıklıkta yenileme');
    } else {
        recommendations.push('✅ Cookie ömrü uzun (>30 dk) - Nadiren yenileme gerekir');
    }

    if (stats.changed_cookies > 0) {
        recommendations.push(`🔍 ${stats.changed_cookies} cookie değişimi tespit edildi`);
    }

    recommendations.push(`🎯 Önerilen yenileme sıklığı: ${Math.max(5, Math.floor(stats.average_lifespan / 2))} dakika`);

    return recommendations;
}

// 5 DAKİKADA BİR OTOMATİK COOKIE TOPLAMA
setInterval(async () => {
    console.log('\n🕒 === 5 DAKİKALIK OTOMATİK COOKIE KONTROLÜ ===');
    console.log('⏰', new Date().toLocaleString('tr-TR'));
    
    const result = await collectCookies();
    const analysis = analyzeCookieChanges();
    
    if (analysis.stats && analysis.stats.total_tests > 0) {
        const lastChange = analysis.stats.last_change;
        if (lastChange) {
            console.log(`📈 Son değişim: ${lastChange.lifespan_minutes} dakika önce`);
            console.log(`🔁 Değişen cookie: ${lastChange.changes.changed.length} adet`);
        }
        
        console.log(`📊 Ortalama ömür: ${analysis.stats.average_lifespan} dakika`);
    }
    
    console.log('====================================\n');
}, 5 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 COOKIE ÖMÜR TAKİP SİSTEMİ ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 / - Endpoint listesi');
    console.log('📍 /collect - Cookie topla');
    console.log('📍 /history - Cookie geçmişi');
    console.log('📍 /analysis - Cookie değişim analizi');
    console.log('📍 /current - Mevcut cookie\'ler');
    console.log('📍 /stats - İstatistikler');
    console.log('📍 /debug - Debug bilgileri');
    console.log('⏰ 5 dakikada bir otomatik cookie toplama');
    console.log('🎯 Cookie değişim sürelerini analiz eder');
    console.log('📈 Ortalama cookie ömrünü hesaplar');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        collectCookies();
    }, 3000);
});
