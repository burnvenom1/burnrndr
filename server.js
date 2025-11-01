// 🚀 COOKIE DEĞİŞİM TAKİP SİSTEMİ
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// 🎯 PLAYWRIGHT CACHE PATH AYARI
const fs = require('fs');
const path = require('path');
const PLAYWRIGHT_CACHE_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/render/project/playwright';
if (!fs.existsSync(PLAYWRIGHT_CACHE_PATH)) {
    fs.mkdirSync(PLAYWRIGHT_CACHE_PATH, { recursive: true });
}
process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_CACHE_PATH;
console.log('📁 Playwright cache path:', PLAYWRIGHT_CACHE_PATH);

// COOKIE TAKİP VERİLERİ
let cookieHistory = [];
let lastComparison = null;

// COOKIE KARŞILAŞTIRMA FONKSİYONU - SADECE DEĞİŞENLERİ GÖSTER
function compareCookies(oldCookies, newCookies) {
    const changes = {
        added: [],
        removed: [], 
        changed: [],
        unchanged: []
    };

    const oldMap = new Map(oldCookies.map(c => [c.name, c]));
    const newMap = new Map(newCookies.map(c => [c.name, c]));

    // YENİ EKLENEN COOKIE'LER
    for (const [name, cookie] of newMap) {
        if (!oldMap.has(name)) {
            changes.added.push({
                name: cookie.name,
                value: cookie.value.substring(0, 30) + (cookie.value.length > 30 ? '...' : ''),
                domain: cookie.domain
            });
        }
    }

    // SİLİNEN COOKIE'LER
    for (const [name, cookie] of oldMap) {
        if (!newMap.has(name)) {
            changes.removed.push({
                name: cookie.name,
                value: cookie.value.substring(0, 30) + (cookie.value.length > 30 ? '...' : ''),
                domain: cookie.domain
            });
        }
    }

    // DEĞİŞEN COOKIE'LER
    for (const [name, newCookie] of newMap) {
        if (oldMap.has(name)) {
            const oldCookie = oldMap.get(name);
            if (oldCookie.value !== newCookie.value) {
                changes.changed.push({
                    name: name,
                    old_value: oldCookie.value.substring(0, 30) + (oldCookie.value.length > 30 ? '...' : ''),
                    new_value: newCookie.value.substring(0, 30) + (newCookie.value.length > 30 ? '...' : ''),
                    domain: newCookie.domain,
                    value_length_changed: oldCookie.value.length !== newCookie.value.length
                });
            } else {
                changes.unchanged.push(newCookie.name);
            }
        }
    }

    return changes;
}

// 🎯 COOKIE TOPLAMA FONKSİYONU
async function collectCookies() {
    let browser;
    let context;
    let page;
    
    try {
        console.log('🍪 COOKIE TOPLANIYOR...');
        
        // BROWSER AYARLARI
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--disable-web-security'
            ]
        });

        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        page = await context.newPage();

        // HEPSIBURADA'YA GİT
        console.log('🌐 Hepsiburada\'ya gidiliyor...');
        await page.goto('https://www.hepsiburada.com', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // COOKIE'LERİN OLUŞMASINI BEKLE
        console.log('⏳ Cookie\'ler bekleniyor...');
        await page.waitForTimeout(5000);

        // CONTEXT COOKIE'LERİNİ AL
        const contextCookies = await context.cookies();
        
        // COOKIE VERİLERİNİ HAZIRLA
        const cookieData = {
            timestamp: new Date().toISOString(),
            timestamp_readable: new Date().toLocaleString('tr-TR'),
            total_cookies: contextCookies.length,
            hbus_cookies: contextCookies.filter(c => c.name.includes('hbus_')).length,
            cookies: contextCookies
        };

        // 🎯 KARŞILAŞTIRMA YAP - SADECE DEĞİŞENLERİ GÖSTER
        let comparisonResult = {
            is_first_collection: false,
            changes: null,
            message: ''
        };

        if (cookieHistory.length === 0) {
            // İLK TOPLAMA
            comparisonResult = {
                is_first_collection: true,
                changes: null,
                message: '📝 İLK COOKIE TOPLAMA - Karşılaştırma için referans alındı',
                summary: {
                    total_cookies: cookieData.total_cookies,
                    hbus_cookies: cookieData.hbus_cookies,
                    cookie_names: contextCookies.map(c => c.name)
                }
            };
            console.log('📝 İlk cookie toplama - referans alındı');
        } else {
            // SONRAKİ TOPLAMALAR - KARŞILAŞTIRMA YAP
            const previousCookies = cookieHistory[cookieHistory.length - 1].cookies;
            const changes = compareCookies(previousCookies, contextCookies);
            
            comparisonResult = {
                is_first_collection: false,
                changes: changes,
                message: getChangeMessage(changes),
                summary: {
                    total_cookies: cookieData.total_cookies,
                    hbus_cookies: cookieData.hbus_cookies,
                    total_changes: changes.added.length + changes.removed.length + changes.changed.length
                }
            };

            console.log('🔍 Cookie değişim analizi:');
            if (changes.added.length > 0) {
                console.log(`   ➕ Yeni eklenen: ${changes.added.length} cookie`);
                changes.added.forEach(cookie => {
                    console.log(`      - ${cookie.name} (${cookie.domain})`);
                });
            }
            if (changes.removed.length > 0) {
                console.log(`   ➖ Silinen: ${changes.removed.length} cookie`);
                changes.removed.forEach(cookie => {
                    console.log(`      - ${cookie.name} (${cookie.domain})`);
                });
            }
            if (changes.changed.length > 0) {
                console.log(`   🔄 Değişen: ${changes.changed.length} cookie`);
                changes.changed.forEach(cookie => {
                    console.log(`      - ${cookie.name}: ${cookie.old_value} → ${cookie.new_value}`);
                });
            }
            if (comparisonResult.summary.total_changes === 0) {
                console.log('   ✅ Hiçbir cookie değişmedi');
            }
        }

        // GEÇMİŞE EKLE
        cookieHistory.push(cookieData);
        
        // Sadece son 20 kayıt tut
        if (cookieHistory.length > 20) {
            cookieHistory = cookieHistory.slice(-20);
        }

        // KARŞILAŞTIRMA SONUCUNU KAYDET
        lastComparison = comparisonResult;

        console.log(`✅ ${contextCookies.length} cookie toplandı`);
        
        return {
            collection: cookieData,
            comparison: comparisonResult
        };

    } catch (error) {
        console.log('❌ COOKIE TOPLAMA HATASI:', error.message);
        return {
            error: error.message,
            comparison: {
                is_first_collection: false,
                changes: null,
                message: 'Hata: ' + error.message
            }
        };
    } finally {
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    }
}

// DEĞİŞİM MESAJI OLUŞTUR
function getChangeMessage(changes) {
    const addedCount = changes.added.length;
    const removedCount = changes.removed.length;
    const changedCount = changes.changed.length;

    if (addedCount === 0 && removedCount === 0 && changedCount === 0) {
        return '✅ Hiçbir cookie değişmedi';
    }

    const messages = [];
    if (addedCount > 0) messages.push(`➕ ${addedCount} yeni cookie eklendi`);
    if (removedCount > 0) messages.push(`➖ ${removedCount} cookie silindi`);
    if (changedCount > 0) messages.push(`🔄 ${changedCount} cookie değişti`);

    return messages.join(', ');
}

// EXPRESS ROUTES

// ANA SAYFA
app.get('/', (req, res) => {
    res.json({
        service: '🍪 Cookie Değişim Takip Sistemi',
        description: 'Sadece değişen cookie\'leri gösterir',
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': 'Cookie topla ve değişimleri göster',
            '/changes': 'Son değişimleri göster',
            '/history': 'Toplama geçmişi'
        }
    });
});

// 🎯 ANA ENDPOINT: COOKIE TOPLA VE DEĞİŞİMLERİ GÖSTER
app.get('/collect', async (req, res) => {
    console.log('\n=== COOKIE TOPLAMA VE DEĞİŞİM KONTROLÜ ===');
    const result = await collectCookies();
    
    res.json(result);
});

// 🎯 DEĞİŞİMLERİ GÖSTER
app.get('/changes', (req, res) => {
    if (!lastComparison) {
        return res.json({ message: 'Henüz karşılaştırma yapılmadı' });
    }

    res.json({
        last_comparison: lastComparison,
        total_collections: cookieHistory.length,
        last_collection_time: cookieHistory.length > 0 ? 
            cookieHistory[cookieHistory.length - 1].timestamp_readable : 'Henüz yok'
    });
});

// TOPLAMA GEÇMİŞİ
app.get('/history', (req, res) => {
    res.json({
        total_collections: cookieHistory.length,
        history: cookieHistory.map(entry => ({
            timestamp: entry.timestamp_readable,
            total_cookies: entry.total_cookies,
            hbus_cookies: entry.hbus_cookies
        }))
    });
});

// 5 DAKİKADA BİR OTOMATİK COOKIE TOPLAMA
setInterval(async () => {
    console.log('\n🕒 === 5 DAKİKALIK OTOMATİK KONTROL ===');
    console.log('⏰', new Date().toLocaleString('tr-TR'));
    
    const result = await collectCookies();
    
    if (result.comparison && !result.comparison.is_first_collection) {
        console.log('📊 Değişim Özeti:', result.comparison.message);
    }
    
    console.log('====================================\n');
}, 5 * 60 * 1000);

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 COOKIE DEĞİŞİM TAKİP SİSTEMİ ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log('📍 /collect - Cookie topla ve değişimleri göster');
    console.log('📍 /changes - Son değişimleri göster');
    console.log('📍 /history - Toplama geçmişi');
    console.log('⏰ 5 dakikada bir otomatik kontrol');
    console.log('🎯 SADECE değişen cookie\'leri gösterir');
    console.log('====================================\n');
    
    // İlk çalıştırma
    setTimeout(() => {
        console.log('🔄 İlk cookie toplama başlatılıyor...');
        collectCookies();
    }, 3000);
});
