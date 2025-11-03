// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - CHROME EKLENTİ UYUMLU COOKIE
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// ⚙️ AYARLAR - CHROME EKLENTİ UYUMLULUĞU İÇİN OPTİMİZE
const CONFIG = {
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 10 * 60 * 1000, // 10 DAKİKA
    FINGERPRINT_COUNT: 6, // 6 FARKLI FINGERPRINT
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 2000, // 2-4 saniye arası
    MAX_HBUS_ATTEMPTS: 8,
    PAGE_LOAD_TIMEOUT: 40000, // 40 saniye
    
    // DİĞER AYARLAR
    INITIAL_COLLECTION_DELAY: 5000, // 5 saniye
    COOKIE_FILE: 'chrome_cookies.json'
};

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0
};

// 🎯 GERÇEK ZAMANLI MEMORY TAKİBİ
let currentMemory = { node: 0, total: 0, updated: '' };

// 🎯 BROWSER INSTANCE TRACKING
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 KALICI COOKIE DOSYASI İŞLEMLERİ
async function saveCookiesToFile(cookies) {
    try {
        const data = {
            cookies: cookies,
            timestamp: new Date().toISOString(),
            stats: {
                total_sets: cookies.length,
                total_cookies: cookies.reduce((sum, set) => sum + set.stats.total_cookies, 0),
                total_hbus_cookies: cookies.reduce((sum, set) => sum + set.stats.hbus_cookies, 0)
            }
        };
        
        const filePath = path.join(__dirname, CONFIG.COOKIE_FILE);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log('💾 Cookie\'ler dosyaya kaydedildi:', data.stats.total_sets + ' set');
        return true;
    } catch (error) {
        console.log('❌ Cookie kaydetme hatası:', error.message);
        return false;
    }
}

async function loadCookiesFromFile() {
    try {
        const filePath = path.join(__dirname, CONFIG.COOKIE_FILE);
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log('📥 Cookie\'ler dosyadan yüklendi:', parsed.stats.total_sets + ' set');
        return parsed.cookies;
    } catch (error) {
        console.log('❌ Cookie yükleme hatası:', error.message);
        return [];
    }
}

// 🎯 CHROME EKLENTİLERİ İÇİN ÖZEL COOKIE FORMATI
function formatCookiesForChrome(cookies) {
    return cookies.map(cookie => {
        // 🎯 CHROME EKLENTİLERİ İLE TAM UYUMLU FORMAT
        const chromeCookie = {
            name: cookie.name || '',
            value: cookie.value || '',
            domain: cookie.domain || '.hepsiburada.com',
            path: cookie.path || '/',
            secure: cookie.secure !== undefined ? cookie.secure : true,
            httpOnly: cookie.httpOnly || false,
            sameSite: cookie.sameSite || 'Lax'
        };
        
        // 🎯 EXPIRES DATE FORMATI - CHROME UYUMLU
        if (cookie.expires) {
            if (typeof cookie.expires === 'number') {
                chromeCookie.expirationDate = cookie.expires;
            } else if (cookie.expires instanceof Date) {
                chromeCookie.expirationDate = Math.floor(cookie.expires.getTime() / 1000);
            } else if (typeof cookie.expires === 'string') {
                const date = new Date(cookie.expires);
                chromeCookie.expirationDate = Math.floor(date.getTime() / 1000);
            }
        } else {
            // 1 yıl geçerli
            chromeCookie.expirationDate = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);
        }
        
        // 🎯 CHROME SPECIFIC ALANLAR
        chromeCookie.storeId = '0';
        chromeCookie.hostOnly = !chromeCookie.domain.startsWith('.');
        chromeCookie.session = false;
        
        return chromeCookie;
    });
}

// 🎯 RENDER STABİLİTE - ERROR HANDLERS
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser emergency kapatıldı');
        }
    } catch (e) {
        console.log('❌ Emergency browser kapatma hatası:', e.message);
    }
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser unhandled rejection kapatıldı');
        }
    } catch (e) {
        console.log('❌ Unhandled rejection browser kapatma hatası:', e.message);
    }
});

process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM ALINDI - Graceful shutdown');
    isShuttingDown = true;
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser SIGTERM ile kapatıldı');
        }
        process.exit(0);
    } catch (error) {
        console.log('❌ SIGTERM shutdown hatası:', error.message);
        process.exit(1);
    }
});

// 🎯 GERÇEK MEMORY HESAPLAMA FONKSİYONU
function getRealMemoryUsage() {
    const nodeMemory = process.memoryUsage();
    const nodeMB = Math.round(nodeMemory.heapUsed / 1024 / 1024);
    
    const estimatedTotalMB = nodeMB + 80 + (lastCookies.length * 30);
    
    return {
        node_process: nodeMB + ' MB',
        estimated_total: estimatedTotalMB + ' MB',
        system_usage: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB / ' + 
                     Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        note: "estimated_total = Node.js + Browser (~80MB) + Context'ler (~30MB each)"
    };
}

// RASTGELE USER AGENT ÜRET
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
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
        { width: 1600, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// RASTGELE DİL AYARLARI
function getRandomLanguage() {
    const languages = [
        'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'tr-TR,tr;q=0.9,en;q=0.8',
        'en-US,en;q=0.9,tr;q=0.8',
        'tr,en;q=0.9,en-US;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
}

// HBUS KONTROL FONKSİYONU
function checkRequiredHbusCookies(cookies) {
    const hbusSessionId = cookies.find(cookie => cookie.name === 'hbus_sessionId');
    const hbusAnonymousId = cookies.find(cookie => cookie.name === 'hbus_anonymousId');
    
    const hasSessionId = !!hbusSessionId;
    const hasAnonymousId = !!hbusAnonymousId;
    const success = hasSessionId && hasAnonymousId;
    
    return {
        success: success,
        hasSessionId: hasSessionId,
        hasAnonymousId: hasAnonymousId,
        sessionId: hbusSessionId,
        anonymousId: hbusAnonymousId
    };
}

// YENİ CONTEXT OLUŞTUR
async function createNewContext(browser) {
    const userAgent = getRandomUserAgent();
    const viewport = getRandomViewport();
    const language = getRandomLanguage();
    
    console.log('🆕 Yeni Fingerprint:');
    console.log(`   📱 User-Agent: ${userAgent.substring(0, 60)}...`);
    console.log(`   📏 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`   🌐 Dil: ${language}`);
    
    const context = await browser.newContext({
        viewport: viewport,
        userAgent: userAgent,
        extraHTTPHeaders: {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': language,
            'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        }
    });
    
    return context;
}

// HBUS BEKLEME DÖNGÜSÜ
async function waitForHbusCookies(page, context, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 HBUS kontrolü (${attempts}/${maxAttempts})...`);
        
        try {
            // 🎯 CONTEXT COOKIE'LERİNİ KONTROL ET
            const contextCookies = await context.cookies();
            const contextHbusCheck = checkRequiredHbusCookies(contextCookies);
            
            if (contextHbusCheck.success) {
                console.log('✅ CONTEXT: HBUS COOKIE\'LERİ BULUNDU!');
                return {
                    success: true,
                    attempts: attempts,
                    cookies: contextCookies,
                    hbusCheck: contextHbusCheck,
                    method: 'CONTEXT_COOKIES'
                };
            }
            
            // 🎯 JS COOKIE'LERİNİ KONTROL ET
            const browserCookies = await page.evaluate(() => {
                return document.cookie;
            });
            
            if (browserCookies && browserCookies.includes('hbus_')) {
                console.log('📊 JS Cookie Tespit Edildi');
                
                // JS cookie'lerini context'e ekle
                const cookiesToAdd = [];
                browserCookies.split(';').forEach(cookie => {
                    const [name, value] = cookie.trim().split('=');
                    if (name && value && name.includes('hbus_')) {
                        cookiesToAdd.push({
                            name: name.trim(),
                            value: value.trim(),
                            domain: '.hepsiburada.com',
                            path: '/'
                        });
                    }
                });
                
                if (cookiesToAdd.length > 0) {
                    console.log(`📋 JS'den ${cookiesToAdd.length} HBUS cookie eklendi`);
                    await context.addCookies(cookiesToAdd);
                    
                    // Tekrar kontrol et
                    const updatedCookies = await context.cookies();
                    const updatedCheck = checkRequiredHbusCookies(updatedCookies);
                    
                    if (updatedCheck.success) {
                        console.log('✅ JS + CONTEXT: HBUS COOKIE\'LERİ TAMAM!');
                        return {
                            success: true,
                            attempts: attempts,
                            cookies: updatedCookies,
                            hbusCheck: updatedCheck,
                            method: 'JAVASCRIPT_TO_CONTEXT'
                        };
                    }
                }
            }
            
        } catch (error) {
            console.log('⚠️ Cookie kontrol hatası:', error.message);
        }
        
        // 🎯 BEKLEME
        const waitTime = 3000 + Math.random() * 2000;
        console.log(`⏳ ${Math.round(waitTime/1000)}s bekleniyor...`);
        await page.waitForTimeout(waitTime);
    }
    
    console.log('❌ MAKSİMUM DENEME SAYISINA ULAŞILDI');
    const finalCookies = await context.cookies();
    const finalCheck = checkRequiredHbusCookies(finalCookies);
    
    return {
        success: false,
        attempts: attempts,
        cookies: finalCookies,
        hbusCheck: finalCheck,
        method: 'FINAL_ATTEMPT'
    };
}

// FINGERPRINT İLE COOKIE TOPLAMA
async function getCookies() {
    if (isShuttingDown) {
        console.log('❌ Shutdown modunda - yeni işlem başlatılmıyor');
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        console.log('📊 Mevcut cookie setleri:', lastCookies.length + ' set');
        
        // 🚨 MEMORY LEAK ÖNLEYİCİ BROWSER AYARLARI
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
                '--disable-blink-features=AutomationControlled',
                '--no-zygote'
            ]
        });

        activeBrowser = browser;

        console.log(`✅ Browser başlatıldı - ${CONFIG.FINGERPRINT_COUNT} FARKLI FINGERPRINT DENEMESİ BAŞLIYOR...\n`);

        for (let i = 1; i <= CONFIG.FINGERPRINT_COUNT; i++) {
            if (isShuttingDown) break;
            
            console.log(`\n🔄 === FINGERPRINT ${i}/${CONFIG.FINGERPRINT_COUNT} ===`);
            
            let context;
            let page;
            
            try {
                // 1. YENİ CONTEXT OLUŞTUR
                context = await createNewContext(browser);
                page = await context.newPage();

                // 2. COOKIE'LERİ TEMİZLE
                console.log('🧹 Cookie\'ler temizleniyor...');
                await context.clearCookies();

                // 3. HEPSIBURADA'YA GİT
                console.log('🌐 Hepsiburada\'ya gidiliyor...');
                await page.goto('https://www.hepsiburada.com/siparislerim', {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.PAGE_LOAD_TIMEOUT
                });

                console.log('✅ Sayfa yüklendi, JS çalışıyor...');

                // 4. HBUS BEKLEME DÖNGÜSÜ
                const hbusResult = await waitForHbusCookies(page, context, CONFIG.MAX_HBUS_ATTEMPTS);
                
                const result = {
                    fingerprint_id: i,
                    success: hbusResult.success,
                    attempts: hbusResult.attempts,
                    cookies_count: hbusResult.cookies ? hbusResult.cookies.length : 0,
                    hbus_cookies_count: hbusResult.cookies ? hbusResult.cookies.filter(c => c.name.includes('hbus_')).length : 0,
                    required_hbus_success: hbusResult.hbusCheck.success,
                    method: hbusResult.method,
                    timestamp: new Date().toISOString()
                };

                allResults.push(result);

                // BAŞARILI İSE COOKIE'LERİ KAYDET
                if (hbusResult.success && hbusResult.cookies) {
                    const hbusCheck = checkRequiredHbusCookies(hbusResult.cookies);
                    if (hbusCheck.success) {
                        const successfulSet = {
                            set_id: i,
                            success: true,
                            cookies: hbusResult.cookies,
                            chrome_cookies: formatCookiesForChrome(hbusResult.cookies), // 🎯 CHROME UYUMLU
                            stats: {
                                total_cookies: hbusResult.cookies.length,
                                hbus_cookies: hbusResult.cookies.filter(c => c.name.includes('hbus_')).length,
                                has_required_hbus: true,
                                chrome_compatible: true
                            },
                            collection_time: new Date()
                        };
                        
                        currentSuccessfulSets.push(successfulSet);
                        console.log(`✅ FINGERPRINT ${i}: BAŞARILI - ${hbusResult.cookies.length} cookie (${successfulSet.stats.hbus_cookies} HBUS) - Chrome uyumlu`);
                    }
                } else {
                    console.log(`❌ FINGERPRINT ${i}: BAŞARISIZ`);
                }

            } catch (error) {
                console.log(`❌ FINGERPRINT ${i} HATA:`, error.message);
                allResults.push({
                    fingerprint_id: i,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } finally {
                // 🧹 TEMİZLİK
                if (page) {
                    try {
                        await page.close();
                        console.log(`   ✅ Sayfa ${i} kapatıldı`);
                    } catch (e) {
                        console.log(`   ⚠️ Sayfa kapatma hatası: ${e.message}`);
                    }
                }
                
                if (context) {
                    try {
                        await context.close();
                        console.log(`   ✅ Context ${i} kapatıldı`);
                    } catch (e) {
                        console.log(`   ⚠️ Context kapatma hatası: ${e.message}`);
                    }
                }
            }

            // FINGERPRINT'LER ARASI BEKLEME
            if (i < CONFIG.FINGERPRINT_COUNT && !isShuttingDown) {
                const waitBetween = CONFIG.WAIT_BETWEEN_FINGERPRINTS + Math.random() * 2000;
                console.log(`⏳ ${Math.round(waitBetween/1000)}s sonra next fingerprint...`);
                await new Promise(resolve => setTimeout(resolve, waitBetween));
            }
        }

        // 🎯 BROWSER'I KAPAT
        await browser.close();
        activeBrowser = null;
        console.log('\n✅ Tüm fingerprint denemeleri tamamlandı');

        // İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (2 HBUS cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            
            console.log('🔄 Eski cookie setleri siliniyor, yeni setler kaydediliyor...');
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            // 🎯 DOSYAYA KALICI KAYDET
            await saveCookiesToFile(currentSuccessfulSets);
            
            console.log('\n📋 YENİ CHROME UYUMLU COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS)`);
            });
        } else {
            console.log('❌ Hiç başarılı cookie seti bulunamadı, eski cookie\'ler korunuyor');
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            chrome_compatible: true,
            previous_cookies_preserved: successfulCount === 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.log('❌ FINGERPRINT HATA:', error.message);
        if (browser) {
            await browser.close();
            activeBrowser = null;
        }
        
        return {
            overall_success: false,
            error: error.message,
            chrome_compatible: false,
            timestamp: new Date().toISOString()
        };
    }
}

// ✅ CHROME EKLENTİ UYUMLU ENDPOINT'LER
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı',
            chrome_compatible: false
        });
    }

    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı',
            chrome_compatible: false
        });
    }

    // 🎯 CHROME EKLENTİLERİ İLE TAM UYUMLU JSON
    const result = {
        chrome_extension_compatible: true,
        version: '1.0',
        last_updated: lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
        total_sets: successfulSets.length,
        sets: {}
    };
    
    successfulSets.forEach(set => {
        result.sets[`set${set.set_id}`] = set.chrome_cookies;
    });

    res.json(result);
});

// 🎯 CHROME EKLENTİSİ İÇİN ÖZEL ENDPOINT
app.get('/chrome-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            success: false,
            error: 'No cookies available',
            chrome_compatible: false
        });
    }

    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);

    if (successfulSets.length === 0) {
        return res.json({
            success: false,
            error: 'No valid cookies found',
            chrome_compatible: false
        });
    }

    // 🎯 TÜM COOKIE'LERİ TEK BİR ARRAY'DE BİRLEŞTİR
    const allCookies = [];
    successfulSets.forEach(set => {
        allCookies.push(...set.chrome_cookies);
    });

    res.json({
        success: true,
        chrome_compatible: true,
        total_cookies: allCookies.length,
        total_sets: successfulSets.length,
        cookies: allCookies,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : new Date().toISOString()
    });
});

// 🎯 CHROME MANIFEST V3 UYUMLU ENDPOINT
app.get('/chrome-extension', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            status: 'error',
            message: 'No cookies available'
        });
    }

    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);

    if (successfulSets.length === 0) {
        return res.json({
            status: 'error',
            message: 'No valid cookies found'
        });
    }

    const response = {
        status: 'success',
        data: {
            cookies: [],
            metadata: {
                total_sets: successfulSets.length,
                last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : new Date().toISOString(),
                source: 'hepsiburada.com'
            }
        }
    };

    successfulSets.forEach(set => {
        response.data.cookies.push({
            set_id: set.set_id,
            cookies: set.chrome_cookies,
            stats: {
                total: set.chrome_cookies.length,
                hbus: set.chrome_cookies.filter(c => c.name.includes('hbus_')).length
            }
        });
    });

    res.json(response);
});

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'Chrome Extension Compatible Cookie Collector',
        config: CONFIG,
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`, 
            '/last-cookies': 'Son cookie\'leri göster (Chrome uyumlu)',
            '/chrome-cookies': 'Chrome eklentisi için optimize edilmiş format',
            '/chrome-extension': 'Chrome Manifest V3 uyumlu endpoint',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster'
        },
        features: {
            chrome_extension_compatible: true,
            persistent_storage: true,
            multiple_fingerprints: true,
            automatic_collection: CONFIG.AUTO_COLLECT_ENABLED
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        stats: collectionStats
    });
});

// FINGERPRINT İLE COOKIE TOPLA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT COOKIE TOPLAMA ===`);
    const result = await getCookies();
    res.json(result);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const successfulSets = lastCookies.filter(set => set.stats.has_required_hbus);
    const successfulCount = successfulSets.length;
    
    const RENDER_TOTAL_RAM = 512;
    const nodeMemoryMB = currentMemory.node;
    const estimatedUsedRAM = Math.min(RENDER_TOTAL_RAM, nodeMemoryMB + 150);
    const estimatedFreeRAM = RENDER_TOTAL_RAM - estimatedUsedRAM;
    
    let memoryStatus = "🟢 NORMAL";
    if (estimatedFreeRAM < 50) memoryStatus = "🔴 CRITICAL - RAM BİTİYOR!";
    else if (estimatedFreeRAM < 100) memoryStatus = "🟠 TEHLİKE - AZ RAM KALDI!";
    else if (estimatedFreeRAM < 200) memoryStatus = "🟡 DİKKAT - RAM AZALIYOR";
    
    const healthText = `
🚀 CHROME EKLENTİ UYUMLU COOKIE COLLECTOR
==========================================

🧠 RAM DURUMU:
├── Toplam RAM: 512 MB
├── Kullanılan: ${estimatedUsedRAM} MB
├── Boş RAM: ${estimatedFreeRAM} MB  
├── Node.js: ${nodeMemoryMB} MB
└── Durum: ${memoryStatus}

📊 CHROME COOKIE DURUMU:
├── Toplam Set: ${currentSetsCount}
├── Chrome Uyumlu: ${successfulCount}
├── Başarı Oranı: ${currentSetsCount > 0 ? ((successfulCount / currentSetsCount) * 100).toFixed(1) + '%' : '0%'}
├── Son Toplama: ${lastCollectionTime ? new Date(lastCollectionTime).toLocaleString('tr-TR') : 'Henüz yok'}
└── Chrome Uyumluluk: ✅ AKTİF

📈 İSTATİSTİKLER:
├── Toplam Çalışma: ${collectionStats.total_runs}
├── Başarılı Çalışma: ${collectionStats.successful_runs}
└── Başarı Oranı: ${collectionStats.total_runs > 0 ? 
    ((collectionStats.successful_runs / collectionStats.total_runs) * 100).toFixed(1) + '%' : '0%'}

🌐 CHROME ENDPOINT'LERİ:
├── /last-cookies - Chrome uyumlu cookie'ler
├── /chrome-cookies - Eklenti için optimize
├── /chrome-extension - Manifest V3 uyumlu
├── /collect - Yeni cookie toplama
└── /health - Bu sayfa

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
==========================================
    `.trim();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(healthText);
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const successRate = collectionStats.total_runs > 0 
        ? (collectionStats.successful_runs / collectionStats.total_runs * 100).toFixed(1)
        : 0;
    
    const chromeCompatibleSets = lastCookies.filter(set => set.stats.chrome_compatible);
    
    res.json({
        config: CONFIG,
        collection_stats: collectionStats,
        success_rate: successRate + '%',
        last_collection: lastCollectionTime,
        chrome_compatible_stats: {
            total_sets: chromeCompatibleSets.length,
            successful_sets: chromeCompatibleSets.filter(set => set.stats.has_required_hbus).length,
            success_rate: chromeCompatibleSets.length > 0 ? 
                (chromeCompatibleSets.filter(set => set.stats.has_required_hbus).length / chromeCompatibleSets.length * 100).toFixed(1) + '%' : '0%'
        },
        current_cookie_sets: {
            total_sets: lastCookies.length,
            chrome_compatible_sets: chromeCompatibleSets.length,
            sets: chromeCompatibleSets.map(set => ({
                set_id: set.set_id,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                chrome_compatible: set.stats.chrome_compatible,
                collection_time: set.collection_time
            }))
        }
    });
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;

// 🎯 OTOMATİK MEMORY GÜNCELLEME
setInterval(() => {
    const nodeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    currentMemory = {
        node: nodeMB,
        total: nodeMB + 80 + (lastCookies.length * 30),
        updated: new Date().toLocaleTimeString('tr-TR')
    };
}, 5000);

// 🧠 SUNUCU BAŞLARKEN SON COOKIE VERİSİNİ RAM'E YÜKLE
(async () => {
  try {
    const loaded = await loadCookiesFromFile();
    if (loaded && loaded.length > 0) {
      lastCookies = loaded;
      console.log(`✅ ${loaded.length} chrome uyumlu cookie seti RAM'e yüklendi`);
    } else {
      console.log("ℹ️ Henüz kayıtlı cookie bulunamadı, boş başlatılıyor.");
    }
  } catch (err) {
    console.error("❌ Cookie yüklenirken hata:", err.message);
  }
})();

// 🎯 OTOMATİK COOKIE TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ OTOMATİK COOKIE TOPLAMA AKTİF');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} DAKİKALIK OTOMATİK ${CONFIG.FINGERPRINT_COUNT} FINGERPRINT ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookies();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK: ${result.successful_attempts}/${CONFIG.FINGERPRINT_COUNT} başarılı`);
        } else {
            console.log('❌ OTOMATİK: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

app.listen(PORT, async () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 CHROME EKLENTİ UYUMLU COOKIE COLLECTOR ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 / - Endpoint listesi ve ayarlar`);
    console.log(`📍 /collect - ${CONFIG.FINGERPRINT_COUNT} fingerprint ile cookie topla`);
    console.log('📍 /last-cookies - Chrome uyumlu cookie\'leri göster');
    console.log('📍 /chrome-cookies - Eklenti için optimize edilmiş');
    console.log('📍 /chrome-extension - Manifest V3 uyumlu');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log('🎯 2 HBUS cookie olan setler BAŞARILI sayılır');
    console.log('💾 Chrome eklenti uyumlu kalıcı kayıt: ✅ AKTİF');
    console.log('🛡️ Chrome özellikleri:');
    console.log('   ├── Eklenti uyumlu cookie formatı ✅');
    console.log('   ├── expirationDate (Unix timestamp) ✅');
    console.log('   ├── hostOnly ve storeId alanları ✅');
    console.log('   └── Manifest V3 uyumluluk ✅');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.FINGERPRINT_COUNT} fingerprint`);
    } else {
        console.log('⏰ Otomatik toplama: KAPALI');
    }
    
    console.log('====================================\n');
    
    // İlk çalıştırma
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        setTimeout(() => {
            console.log('🔄 İlk chrome cookie toplama başlatılıyor...');
            getCookies();
        }, CONFIG.INITIAL_COLLECTION_DELAY);
    }
});
