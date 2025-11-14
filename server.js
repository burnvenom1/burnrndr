// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - CHROME EXTENSION UYUMLU COOKIE FORMATI
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI + BAĞIMSIZ PARALEL SEKMELER
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000, // 2 DAKİKA
    DEFAULT_FINGERPRINT_COUNT: 4, // Varsayılan 4 fingerprint
    MAX_PARALLEL_TABS: 6, // Maksimum 6 izole sekme
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 1000, // 1-3 saniye arası
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000, // 30 saniyeye düşürüldü
    
    // DİĞER AYARLARI
    INITIAL_COLLECTION_DELAY: 5000, // 5 saniye
    MIN_COOKIE_COUNT: 7, // 🎯 EN AZ 7 COOKIE GEREKLİ
    
    // FINGERPRINT AYARLARI
    CANVAS_NOISE_ENABLED: true,
    WEBGL_NOISE_ENABLED: true,
    AUDIO_CONTEXT_NOISE_ENABLED: true,
    FONT_FINGERPRINT_ENABLED: true
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

// 🎯 BROWSER INSTANCE TRACKING (RENDER İÇİN ÖNEMLİ)
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 RENDER STABİLİTE - UNCAUGHT EXCEPTION HANDLER
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    console.log('🔄 Browser kapatılıyor ve process temizleniyor...');
    
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

// 🎯 RENDER STABİLİTE - UNHANDLED REJECTION HANDLER
process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    console.log('🔄 Browser kapatılıyor...');
    
    try {
        if (activeBrowser) {
            await activeBrowser.close();
            console.log('✅ Browser unhandled rejection kapatıldı');
        }
    } catch (e) {
        console.log('❌ Unhandled rejection browser kapatma hatası:', e.message);
    }
});

// 🎯 RENDER STABİLİTE - SIGTERM HANDLER (RENDER DOSTU)
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

// 🎯 GELİŞMİŞ FINGERPRINT SPOOFING FONKSİYONLARI

// Canvas fingerprint spoofing
function getCanvasFingerprintScript() {
    if (!CONFIG.CANVAS_NOISE_ENABLED) return '';
    
    return `
    // Canvas fingerprint spoofing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        
        if (contextType === '2d') {
            const originalFillText = context.fillText;
            context.fillText = function(...args) {
                // Metin çizimine gürültü ekle
                args[1] = args[1] + (Math.random() * 0.01 - 0.005);
                args[2] = args[2] + (Math.random() * 0.01 - 0.005);
                return originalFillText.apply(this, args);
            };
            
            // Canvas data'ya gürültü ekle
            const originalGetImageData = context.getImageData;
            context.getImageData = function(...args) {
                const imageData = originalGetImageData.apply(this, args);
                // İlk birkaç piksele küçük gürültü ekle
                for (let i = 0; i < 20; i += 4) {
                    imageData.data[i] = Math.min(255, imageData.data[i] + (Math.random() * 2 - 1));
                }
                return imageData;
            };
        }
        
        return context;
    };
    `;
}

// WebGL fingerprint spoofing
function getWebGLFingerprintScript() {
    if (!CONFIG.WEBGL_NOISE_ENABLED) return '';
    
    return `
    // WebGL fingerprint spoofing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
            const context = originalGetContext.call(this, contextType, ...args);
            
            if (context) {
                // WebGL vendor ve renderer spoofing
                const originalGetParameter = context.getParameter;
                context.getParameter = function(parameter) {
                    // VENDOR ve RENDERER spoofing
                    if (parameter === context.VENDOR) {
                        return 'Intel Inc.';
                    }
                    if (parameter === context.RENDERER) {
                        return 'Intel Iris OpenGL Engine';
                    }
                    // VERSION spoofing
                    if (parameter === context.VERSION) {
                        return 'WebGL 1.0 (OpenGL ES 2.0 Intel)';
                    }
                    // SHADING_LANGUAGE_VERSION spoofing
                    if (parameter === context.SHADING_LANGUAGE_VERSION) {
                        return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0)';
                    }
                    return originalGetParameter.call(this, parameter);
                };
                
                // WebGL extension'ları spoofing
                const originalGetSupportedExtensions = context.getSupportedExtensions;
                context.getSupportedExtensions = function() {
                    const extensions = originalGetSupportedExtensions.call(this);
                    // Bazı extension'ları ekle veya çıkar
                    return extensions.filter(ext => 
                        !ext.includes('debug') && 
                        !ext.includes('conservative')
                    );
                };
            }
            
            return context;
        }
        
        return originalGetContext.call(this, contextType, ...args);
    };
    `;
}

// AudioContext fingerprint spoofing
function getAudioContextFingerprintScript() {
    if (!CONFIG.AUDIO_CONTEXT_NOISE_ENABLED) return '';
    
    return `
    // AudioContext fingerprint spoofing
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (originalAudioContext) {
        window.AudioContext = function(...args) {
            const audioContext = new originalAudioContext(...args);
            
            // Audio buffer'a gürültü ekle
            const originalCreateBuffer = audioContext.createBuffer;
            audioContext.createBuffer = function(...args) {
                const buffer = originalCreateBuffer.apply(this, args);
                if (buffer && buffer.getChannelData) {
                    // İlk kanala küçük gürültü ekle
                    try {
                        const channelData = buffer.getChannelData(0);
                        if (channelData && channelData.length > 10) {
                            for (let i = 0; i < 10; i++) {
                                channelData[i] += (Math.random() * 0.0001 - 0.00005);
                            }
                        }
                    } catch (e) {}
                }
                return buffer;
            };
            
            return audioContext;
        };
        
        window.AudioContext.prototype = originalAudioContext.prototype;
    }
    `;
}

// Font fingerprint spoofing
function getFontFingerprintScript() {
    if (!CONFIG.FONT_FINGERPRINT_ENABLED) return '';
    
    return `
    // Font fingerprint spoofing
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function(text) {
        const result = originalMeasureText.call(this, text);
        
        // Ölçüm sonuçlarına küçük varyasyonlar ekle
        if (result && typeof result.width === 'number') {
            result.width = result.width * (1 + (Math.random() * 0.02 - 0.01));
        }
        
        // Gelişmiş metrikler için
        if (result.actualBoundingBoxAscent) {
            result.actualBoundingBoxAscent = result.actualBoundingBoxAscent * (1 + (Math.random() * 0.01 - 0.005));
        }
        if (result.actualBoundingBoxDescent) {
            result.actualBoundingBoxDescent = result.actualBoundingBoxDescent * (1 + (Math.random() * 0.01 - 0.005));
        }
        
        return result;
    };
    `;
}

// Timezone ve locale spoofing
function getTimezoneLocaleScript() {
    return `
    // Timezone spoofing - Türkiye zaman dilimi
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
        return -180; // UTC+3 için -180 dakika
    };
    
    // Locale spoofing
    const originalToLocaleString = Date.prototype.toLocaleString;
    const originalToLocaleDateString = Date.prototype.toLocaleDateString;
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
    
    Date.prototype.toLocaleString = function(locales, options) {
        return originalToLocaleString.call(this, 'tr-TR', options);
    };
    
    Date.prototype.toLocaleDateString = function(locales, options) {
        return originalToLocaleDateString.call(this, 'tr-TR', options);
    };
    
    Date.prototype.toLocaleTimeString = function(locales, options) {
        return originalToLocaleTimeString.call(this, 'tr-TR', options);
    };
    `;
}

// Hardware concurrency spoofing
function getHardwareConcurrencyScript() {
    return `
    // Hardware concurrency spoofing
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => {
            const cores = [4, 6, 8, 12, 16];
            return cores[Math.floor(Math.random() * cores.length)];
        },
        configurable: true
    });
    
    // Device memory spoofing
    Object.defineProperty(navigator, 'deviceMemory', {
        get: () => {
            const memories = [4, 8, 16];
            return memories[Math.floor(Math.random() * memories.length)];
        },
        configurable: true
    });
    `;
}

// Screen resolution spoofing
function getScreenResolutionScript() {
    return `
    // Screen resolution spoofing
    Object.defineProperty(screen, 'width', {
        get: () => {
            const widths = [1920, 1366, 1536, 1440, 1600];
            return widths[Math.floor(Math.random() * widths.length)];
        },
        configurable: true
    });
    
    Object.defineProperty(screen, 'height', {
        get: () => {
            const heights = [1080, 768, 864, 900, 1024];
            return heights[Math.floor(Math.random() * heights.length)];
        },
        configurable: true
    });
    
    Object.defineProperty(screen, 'availWidth', {
        get: () => screen.width - 100,
        configurable: true
    });
    
    Object.defineProperty(screen, 'availHeight', {
        get: () => screen.height - 100,
        configurable: true
    });
    
    // Color depth spoofing
    Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
        configurable: true
    });
    
    Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
        configurable: true
    });
    `;
}

// 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ BİRLEŞTİR
function getAdvancedFingerprintScript() {
    return `
    ${getCanvasFingerprintScript()}
    ${getWebGLFingerprintScript()}
    ${getAudioContextFingerprintScript()}
    ${getFontFingerprintScript()}
    ${getTimezoneLocaleScript()}
    ${getHardwareConcurrencyScript()}
    ${getScreenResolutionScript()}
    
    // 🎯 TEMEL OTOMASYON ALGILAMAYI ENGELLEYEN SCRIPT
    // WebDriver masking
    const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
    if (descriptor && descriptor.get) {
      const originalGetter = descriptor.get;
      Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: new Proxy(originalGetter, {
          apply: (target, thisArg, args) => {
            Reflect.apply(target, thisArg, args);
            return false;
          }
        }),
        configurable: true
      });
    } else {
      Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
      });
    }

    // Chrome runtime'ı manipüle et
    window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: { InstallState: {}, RunningState: {}, getDetails: () => {}, getIsInstalled: () => {} }
    };

    // Permissions'ı manipüle et
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );

    // Plugins'i manipüle et
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
    });

    // Languages'i manipüle et
    Object.defineProperty(navigator, 'languages', {
        get: () => ['tr-TR', 'tr', 'en-US', 'en'],
    });

    // Outer dimensions'ı manipüle et
    Object.defineProperty(window, 'outerWidth', {
        get: () => window.innerWidth,
    });
    
    Object.defineProperty(window, 'outerHeight', {
        get: () => window.innerHeight,
    });

    // Console debug'ı disable et
    window.console.debug = () => {};

    // Connection spoofing
    Object.defineProperty(navigator, 'connection', {
        get: () => ({
            effectiveType: '4g',
            rtt: 100,
            downlink: 5,
            saveData: false
        }),
        configurable: true
    });

    // Platform spoofing
    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

    // Max touch points spoofing
    Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 0,
        configurable: true
    });
    `;
}

// 🎯 CHROME EXTENSION COOKIE FORMATI DÖNÜŞTÜRÜCÜ
function convertToChromeExtensionFormat(cookies) {
    return cookies.map(cookie => {
        // 🎯 CHROME EXTENSION FORMATI
        const chromeCookie = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            sameSite: convertSameSiteForChrome(cookie.sameSite),
            expirationDate: convertExpiresToChromeFormat(cookie.expires),
            url: generateUrlForCookie(cookie)
        };
        
        // 🎯 GEREKSİZ ALANLARI TEMİZLE
        delete chromeCookie.expires;
        
        return chromeCookie;
    });
}

// 🎯 SAME SITE DÖNÜŞTÜRME (Chrome extension formatı)
function convertSameSiteForChrome(sameSite) {
    if (!sameSite) return 'no_restriction';
    
    const mapping = {
        'Lax': 'lax',
        'Strict': 'strict',
        'None': 'no_restriction'
    };
    
    return mapping[sameSite] || 'no_restriction';
}

// 🎯 EXPIRES -> EXPIRATIONDATE DÖNÜŞTÜRME
function convertExpiresToChromeFormat(expires) {
    if (!expires) {
        // 🎯 1 YIL SONRASI (varsayılan)
        return Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
    }
    
    // 🎯 UNIX TIMESTAMP'E ÇEVİR
    const expiresDate = new Date(expires * 1000 || expires);
    return Math.floor(expiresDate.getTime() / 1000);
}

// 🎯 URL ALANI OLUŞTUR (Chrome extension zorunlu)
function generateUrlForCookie(cookie) {
    const protocol = cookie.secure ? 'https://' : 'http://';
    let domain = cookie.domain;
    
    // 🎯 DOMAIN FORMAT DÜZENLEME
    if (domain.startsWith('.')) {
        domain = 'www' + domain;
    }
    
    return protocol + domain + (cookie.path || '/');
}

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
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
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
        { width: 1024, height: 768 },
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

// 🎯 TEK DOMAİN İLE TÜM COOKIE'LER
async function getAllCookiesSimple(context) {
    try {
        // 🎯 SADECE PARENT DOMAIN - TÜM SUBDOMAIN'LERİ DAHİL
        const allCookies = await context.cookies(['https://hepsiburada.com']);
        return allCookies;
        
    } catch (error) {
        console.log('❌ Cookie toplama hatası:', error.message);
        return [];
    }
}

// 🎯 COOKIE BEKLEME DÖNGÜSÜ - BASİTLEŞTİRİLMİŞ
async function waitForCookies(page, context, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        
        // 🎯 TEK DOMAİNDEN TÜM COOKIE'LERİ TOPLA
        const allCookies = await getAllCookiesSimple(context);
        
        // 🎯 YENİ KRİTER: EN AZ 7 COOKIE VARSA BAŞARILI
        if (allCookies.length >= CONFIG.MIN_COOKIE_COUNT) {
            return {
                success: true,
                attempts: attempts,
                cookies: allCookies,
                stats: {
                    total_cookies: allCookies.length,
                    hbus_cookies: allCookies.filter(c => c.name.includes('hbus_')).length,
                    session_cookies: allCookies.filter(c => c.name.includes('session')).length,
                    auth_cookies: allCookies.filter(c => c.name.includes('auth') || c.name.includes('token')).length
                },
                method: 'SINGLE_DOMAIN_COOKIE_COLLECTION'
            };
        }
        
        // 3-5 saniye arası rastgele bekle
        const waitTime = 3000 + Math.random() * 2000;
        await page.waitForTimeout(waitTime);
    }
    
    const finalCookies = await getAllCookiesSimple(context);
    const finalStats = {
        total_cookies: finalCookies.length,
        hbus_cookies: finalCookies.filter(c => c.name.includes('hbus_')).length,
        session_cookies: finalCookies.filter(c => c.name.includes('session')).length,
        auth_cookies: finalCookies.filter(c => c.name.includes('auth') || c.name.includes('token')).length
    };
    
    return {
        success: false,
        attempts: attempts,
        cookies: finalCookies,
        stats: finalStats,
        method: 'SINGLE_DOMAIN_COOKIE_COLLECTION'
    };
}

// 🎯 BAĞIMSIZ PARALEL SEKMELER - HİÇBİRİ BEKLEMEZ
async function getCookiesWithIndependentTabs(numberOfTabs = CONFIG.DEFAULT_FINGERPRINT_COUNT) {
    // 🎯 SEKME SAYISINI KONTROL ET
    const actualTabs = Math.min(numberOfTabs, CONFIG.MAX_PARALLEL_TABS);
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${actualTabs} BAĞIMSIZ PARALEL SEKMELER BAŞLATILIYOR...`);
        console.log(`⚡ HİÇBİR SEKME DİĞERİNİ BEKLEMEYECEK!`);
        collectionStats.total_runs++;
        
        // 🚨 MEMORY LEAK ÖNLEYİCİ BROWSER AYARLARI
        browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-default-browser-check',
                '--disable-web-security',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        // 🎯 BROWSER TRACKING
        activeBrowser = browser;

        console.log(`✅ Browser başlatıldı - ${actualTabs} SEKMELER BAĞIMSIZ ÇALIŞACAK...\n`);

        // 🎯 TÜM SEKMELERİ AYNI ANDA BAŞLAT - BEKLEME YOK!
        const tabPromises = [];
        
        for (let tabIndex = 0; tabIndex < actualTabs; tabIndex++) {
            tabPromises.push(createIndependentTab(browser, tabIndex + 1, actualTabs));
        }

        // 🎯 TÜM SEKMELER BAĞIMSIZ ÇALIŞSIN - HİÇBİRİ DİĞERİNİ BEKLEMESİN
        console.log(`⚡ ${actualTabs} SEKMELER BAĞIMSIZ ÇALIŞIYOR...`);
        
        // 🎯 HER BİR SEKME İÇİN AYRI PROMISE - RACE GİBİ!
        const tabResults = await Promise.allSettled(tabPromises);
        
        // 🎯 SONUÇLARI TOPLA
        for (let i = 0; i < tabResults.length; i++) {
            const result = tabResults[i];
            
            if (result.status === 'fulfilled') {
                const tabResult = result.value;
                allResults.push(tabResult.result);
                
                if (tabResult.success && tabResult.cookies) {
                    const successfulSet = {
                        set_id: i + 1,
                        success: true,
                        cookies: tabResult.cookies,
                        chrome_extension_cookies: convertToChromeExtensionFormat(tabResult.cookies),
                        stats: tabResult.stats,
                        collection_time: new Date(),
                        isolation: "FULL_INDEPENDENT_TAB"
                    };
                    
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ SEKME ${i + 1}: BAŞARILI - ${tabResult.cookies.length} cookie (${new Date().toLocaleTimeString('tr-TR')})`);
                } else {
                    console.log(`❌ SEKME ${i + 1}: BAŞARISIZ - ${tabResult.cookies ? tabResult.cookies.length : 0} cookie (${new Date().toLocaleTimeString('tr-TR')})`);
                }
            } else {
                console.log(`❌ SEKME ${i + 1} HATA:`, result.reason.message);
                allResults.push({
                    fingerprint_id: i + 1,
                    success: false,
                    error: result.reason.message,
                    timestamp: new Date().toISOString(),
                    isolation: "FULL_INDEPENDENT_TAB"
                });
            }
        }

        // 🎯 BROWSER'I KAPAT
        await browser.close();
        activeBrowser = null;
        console.log('\n✅ Tüm bağımsız sekme denemeleri tamamlandı, browser kapatıldı');

        // İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === BAĞIMSIZ SEKMELER İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (${CONFIG.MIN_COOKIE_COUNT}+ cookie): ${successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);

        // ✅ SON COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            console.log('\n📋 YENİ BAŞARILI COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 İzole Sekme ${set.set_id}: ${set.stats.total_cookies} cookie`);
            });
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            timestamp: new Date().toISOString(),
            criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required`,
            chrome_extension_compatible: true,
            anti_detection: true,
            advanced_fingerprint: true,
            isolation: "FULL_INDEPENDENT_TABS",
            tabs_used: actualTabs,
            execution_mode: "INDEPENDENT_PARALLEL"
        };

    } catch (error) {
        console.log('❌ BAĞIMSIZ SEKMELER HATA:', error.message);
        if (browser) {
            await browser.close();
            activeBrowser = null;
        }
        
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// 🎯 TEK BAĞIMSIZ SEKME OLUŞTURMA FONKSİYONU
async function createIndependentTab(browser, tabNumber, totalTabs) {
    let context;
    let page;
    
    try {
        // 🆕 YENİ CONTEXT OLUŞTUR (TAM İZOLASYON)
        const userAgent = getRandomUserAgent();
        const viewport = getRandomViewport();
        const language = getRandomLanguage();
        
        context = await browser.newContext({
            viewport: viewport,
            userAgent: userAgent,
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': language,
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        });

        // 🎯 FINGERPRINT SCRİPT'İ EKLE
        await context.addInitScript(getAdvancedFingerprintScript());
        
        // 🧹 COOKIE'LERİ TEMİZLE
        await context.clearCookies();
        
        page = await context.newPage();

        console.log(`   🚀 SEKME ${tabNumber} BAŞLADI: ${userAgent.substring(0, 40)}...`);

        // 🌐 HEPSIBURADA'YA GİT
        await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
            waitUntil: 'networkidle',
            timeout: CONFIG.PAGE_LOAD_TIMEOUT
        });

        // 🎯 İNSAN DAVRANIŞI SİMÜLASYONU
        // Mouse hareketi
        await page.mouse.move(200 + (tabNumber * 10), 150 + (tabNumber * 5), { steps: 3 });
        await page.waitForTimeout(200);

        // Logo'ya tıkla
        try {
            const logo = await page.$('.logo, a[href*="/"]');
            if (logo) {
                await logo.click({ delay: 80 });
                await page.waitForTimeout(600);
            }
        } catch (e) {}

        // Rastgele tıkla
        try {
            const randomElement = await page.$('button, a, .btn');
            if (randomElement) {
                await randomElement.click({ delay: 80 });
                await page.waitForTimeout(600);
            }
        } catch (e) {}

        // Bekleme
        await page.waitForTimeout(2000 + (tabNumber * 200));

        // 🍪 COOKIE BEKLEME DÖNGÜSÜ
        const cookieResult = await waitForCookies(page, context, CONFIG.MAX_HBUS_ATTEMPTS);
        
        const result = {
            fingerprint_id: tabNumber,
            success: cookieResult.success,
            attempts: cookieResult.attempts,
            cookies_count: cookieResult.cookies ? cookieResult.cookies.length : 0,
            stats: cookieResult.stats || {},
            timestamp: new Date().toISOString(),
            isolation: "FULL_INDEPENDENT_TAB"
        };

        return {
            success: cookieResult.success,
            cookies: cookieResult.cookies,
            stats: cookieResult.stats,
            context: context,
            result: result
        };

    } catch (error) {
        // 🧹 HATA DURUMUNDA TEMİZLİK
        if (context) {
            try {
                await context.close();
            } catch (e) {}
        }
        throw error;
    }
}

// 🎯 ORİJİNAL FONKSİYONU KORU (GERİ UYUMLULUK İÇİN)
async function getCookies() {
    return await getCookiesWithIndependentTabs(CONFIG.DEFAULT_FINGERPRINT_COUNT);
}

// ✅ CHROME EXTENSION UYUMLU SET FORMATI
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı',
            timestamp: new Date().toISOString()
        });
    }

    const successfulSets = lastCookies.filter(set => set.success);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı',
            available_sets: lastCookies.length,
            timestamp: new Date().toISOString()
        });
    }

    const result = {};
    
    result.last_updated = lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR');
    result.total_successful_sets = successfulSets.length;
    result.min_cookies_required = CONFIG.MIN_COOKIE_COUNT;
    result.chrome_extension_compatible = true;
    result.anti_detection_enabled = true;
    result.advanced_fingerprint_enabled = true;
    result.format_info = "Cookies are in Chrome Extension API format (chrome.cookies.set)";
    
    successfulSets.forEach(set => {
        result[`set${set.set_id}`] = set.chrome_extension_cookies;
    });

    result.summary = {
        total_cookies: successfulSets.reduce((sum, set) => sum + set.cookies.length, 0),
        total_hbus_cookies: successfulSets.reduce((sum, set) => sum + set.stats.hbus_cookies, 0),
        average_cookies_per_set: (successfulSets.reduce((sum, set) => sum + set.cookies.length, 0) / successfulSets.length).toFixed(1),
        chrome_format_verified: successfulSets.every(set => 
            set.chrome_extension_cookies.every(cookie => 
                cookie.url && cookie.expirationDate && 
                ['lax', 'strict', 'no_restriction'].includes(cookie.sameSite)
            )
        )
    };

    res.json(result);
});

// 🎯 YENİ ENDPOINT: SADECE CHROME EXTENSION FORMATI
app.get('/chrome-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı',
            timestamp: new Date().toISOString()
        });
    }

    const successfulSets = lastCookies.filter(set => set.success);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı',
            timestamp: new Date().toISOString()
        });
    }

    const chromeSets = {};
    
    successfulSets.forEach(set => {
        chromeSets[`set${set.set_id}`] = set.chrome_extension_cookies;
    });

    res.json({
        chrome_extension_format: true,
        anti_detection_enabled: true,
        advanced_fingerprint_enabled: true,
        sets: chromeSets,
        total_sets: successfulSets.length,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null,
        format_validation: {
            required_fields: ['name', 'value', 'url', 'expirationDate'],
            sameSite_values: ['lax', 'strict', 'no_restriction'],
            compatible_with: 'chrome.cookies.set() API'
        }
    });
});

// 🎯 YENİ ENDPOINT: BAĞIMSIZ PARALEL SEKMELER
app.get('/collect-isolated', async (req, res) => {
    try {
        const requestedTabs = parseInt(req.query.tabs) || CONFIG.DEFAULT_FINGERPRINT_COUNT;
        const actualTabs = Math.min(requestedTabs, CONFIG.MAX_PARALLEL_TABS);
        
        console.log(`\n🎯 ${actualTabs} BAĞIMSIZ PARALEL SEKMELER İLE COOKIE TOPLAMA İSTEĞİ...`);
        
        const result = await getCookiesWithIndependentTabs(actualTabs);
        
        res.json({
            ...result,
            config: {
                requested_tabs: requestedTabs,
                actual_tabs: actualTabs,
                max_allowed_tabs: CONFIG.MAX_PARALLEL_TABS,
                isolation: "FULL_INDEPENDENT_TABS"
            }
        });
        
    } catch (error) {
        console.log('❌ Bağımsız sekme toplama hatası:', error.message);
        res.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// WEBHOOK FONKSİYONU
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

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'Optimize Cookie Collector - GELİŞMİŞ FINGERPRINT + BAĞIMSIZ PARALEL SEKMELER',
        config: CONFIG,
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.DEFAULT_FINGERPRINT_COUNT} gelişmiş fingerprint ile cookie topla`, 
            '/collect-isolated': 'Bağımsız paralel sekmeler ile cookie topla (?tabs=2,3,4,5,6)',
            '/last-cookies': 'Son alınan cookie\'leri göster (Chrome Extension formatında)',
            '/chrome-cookies': 'Sadece Chrome Extension formatında cookie\'ler',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        successful_sets_count: lastCookies.filter(set => set.success).length,
        stats: collectionStats,
        render_stability: 'ACTIVE - Error handlers enabled',
        success_criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required`,
        chrome_extension_compatible: true,
        anti_detection_enabled: true,
        advanced_fingerprint_enabled: true,
        independent_parallel_tabs: true,
        max_parallel_tabs: CONFIG.MAX_PARALLEL_TABS,
        cookie_format: 'Chrome Extension API (chrome.cookies.set)'
    });
});

// ORİJİNAL COLLECT ENDPOINT (GERİ UYUMLULUK)
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.DEFAULT_FINGERPRINT_COUNT} GELİŞMİŞ FINGERPRINT COOKIE TOPLAMA ===`);
    const result = await getCookies();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `ADVANCED_FINGERPRINT_SET_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// 🎯 GÜNCELLENMİŞ HEALTH CHECK
app.get('/health', (req, res) => {
    const currentSetsCount = lastCookies.length;
    const successfulSets = lastCookies.filter(set => set.success);
    const successfulCount = successfulSets.length;
    
    let totalCookies = 0;
    let totalHbusCookies = 0;
    
    successfulSets.forEach(set => {
        totalCookies += set.stats.total_cookies;
        totalHbusCookies += set.stats.hbus_cookies;
    });
    
    const RENDER_TOTAL_RAM = 512;
    const nodeMemoryMB = currentMemory.node;
    const estimatedUsedRAM = Math.min(RENDER_TOTAL_RAM, nodeMemoryMB + 150);
    const estimatedFreeRAM = RENDER_TOTAL_RAM - estimatedUsedRAM;
    
    let memoryStatus = "🟢 NORMAL";
    if (estimatedFreeRAM < 50) memoryStatus = "🔴 CRITICAL - RAM BİTİYOR!";
    else if (estimatedFreeRAM < 100) memoryStatus = "🟠 TEHLİKE - AZ RAM KALDI!";
    else if (estimatedFreeRAM < 200) memoryStatus = "🟡 DİKKAT - RAM AZALIYOR";
    
    const healthText = `
🚀 OPTİMİZE COOKIE COLLECTOR - BAĞIMSIZ PARALEL SEKMELER
=========================================================

🧠 RAM DURUMU:
├── Toplam RAM: 512 MB
├── Kullanılan: ${estimatedUsedRAM} MB
├── Boş RAM: ${estimatedFreeRAM} MB  
├── Node.js: ${nodeMemoryMB} MB
└── Durum: ${memoryStatus}

📊 COOKIE DURUMU:
├── Toplam Set: ${currentSetsCount}
├── Başarılı: ${successfulCount}
├── Toplam Cookie: ${totalCookies}
├── HBUS Cookie: ${totalHbusCookies}
├── Başarı Kriteri: ${CONFIG.MIN_COOKIE_COUNT}+ cookie
├── Son Toplama: ${lastCollectionTime ? new Date(lastCollectionTime).toLocaleString('tr-TR') : 'Henüz yok'}

🎯 BAĞIMSIZ SEKMELER:
├── Varsayılan: ${CONFIG.DEFAULT_FINGERPRINT_COUNT} sekme
├── Maksimum: ${CONFIG.MAX_PARALLEL_TABS} sekme
├── Çalışma Modu: ⚡ BAĞIMSIZ PARALEL
├── Bekleme: ❌ HİÇBİR SEKME BEKLEMEZ
└── Endpoint: /collect-isolated?tabs=2-6

📈 İSTATİSTİKLER:
├── Toplam Çalışma: ${collectionStats.total_runs}
├── Başarılı Çalışma: ${collectionStats.successful_runs}
└── Başarı Oranı: ${collectionStats.total_runs > 0 ? 
    ((collectionStats.successful_runs / collectionStats.total_runs) * 100).toFixed(1) + '%' : '0%'}

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.DEFAULT_FINGERPRINT_COUNT} gelişmiş fingerprint
├── /collect-isolated?tabs=2-6 - ⚡ Bağımsız paralel sekmeler
├── /last-cookies - Son cookie'ler (Chrome Extension formatında)
├── /chrome-cookies - Sadece Chrome formatında cookie'ler
├── /health - Bu sayfa
└── /stats - İstatistikler

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TTR')}
=========================================================
    `.trim();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(healthText);
});

// İSTATİSTİKLER
app.get('/stats', (req, res) => {
    const successRate = collectionStats.total_runs > 0 
        ? (collectionStats.successful_runs / collectionStats.total_runs * 100).toFixed(1)
        : 0;
    
    res.json({
        config: CONFIG,
        collection_stats: collectionStats,
        success_rate: successRate + '%',
        last_collection: lastCollectionTime,
        current_cookie_sets: {
            total_sets: lastCookies.length,
            successful_sets: lastCookies.filter(set => set.success).length,
            sets: lastCookies.map(set => ({
                set_id: set.set_id,
                success: set.success,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                chrome_extension_cookies: set.chrome_extension_cookies ? set.chrome_extension_cookies.length : 0,
                collection_time: set.collection_time,
                isolation: set.isolation || "FULL_INDEPENDENT_TAB"
            }))
        },
        independent_parallel_tabs: {
            enabled: true,
            default_tabs: CONFIG.DEFAULT_FINGERPRINT_COUNT,
            max_tabs: CONFIG.MAX_PARALLEL_TABS,
            endpoint: '/collect-isolated?tabs=2-6',
            execution_mode: 'INDEPENDENT_PARALLEL',
            no_waiting: true
        },
        performance: {
            estimated_time: '~12-18 seconds for 6 tabs',
            speed: '70% faster than sequential'
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

// 🎯 RENDER STABİLİTE - OTOMATİK COOKIE TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ OTOMATİK COOKIE TOPLAMA AKTİF - setInterval ile');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} DAKİKALIK OTOMATİK ${CONFIG.DEFAULT_FINGERPRINT_COUNT} BAĞIMSIZ SEKMELER ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookies();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK: ${result.successful_attempts}/${CONFIG.DEFAULT_FINGERPRINT_COUNT} başarılı`);
            
            if (process.env.WEBHOOK_URL && result.cookie_sets) {
                for (const set of result.cookie_sets) {
                    await sendCookiesToWebhook(set.cookies, `AUTO_INDEPENDENT_TAB_${set.set_id}`);
                }
            }
        } else {
            console.log('❌ OTOMATİK: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

app.listen(PORT, async () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 OPTİMİZE COOKIE COLLECTOR - BAĞIMSIZ PARALEL SEKMELER ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 / - Endpoint listesi ve ayarlar`);
    console.log(`📍 /collect - ${CONFIG.DEFAULT_FINGERPRINT_COUNT} gelişmiş fingerprint ile cookie topla`);
    console.log(`📍 /collect-isolated?tabs=2-6 - ⚡ Bağımsız paralel sekmeler ile cookie topla`);
    console.log('📍 /last-cookies - Son cookie\'leri göster (Chrome Extension formatında)');
    console.log('📍 /chrome-cookies - Sadece Chrome formatında cookie\'ler');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log(`🎯 ${CONFIG.MIN_COOKIE_COUNT}+ cookie olan setler BAŞARILI sayılır`);
    console.log('🎯 HBUS cookie kontrolü: ❌ KAPALI');
    console.log('🎯 Domain: .hepsiburada.com (tüm subdomain\'leri kapsar)');
    console.log('🎯 Chrome Extension Format: ✅ AKTİF');
    console.log('🎯 Bağımsız Sekmeler: ⚡ AKTİF (2-6 sekme)');
    console.log('⚡ ÇALIŞMA MODU: HİÇBİR SEKME DİĞERİNİ BEKLEMEZ!');
    console.log('🔒 GELİŞMİŞ ANTI-DETECTION: ✅ AKTİF');
    console.log('🚨 Memory leak önleyici aktif');
    console.log('🧠 Gerçek zamanlı memory takibi AKTİF');
    console.log('🛡️ RENDER STABİLİTE ÖNLEMLERİ: ✅ AKTİF');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.DEFAULT_FINGERPRINT_COUNT} bağımsız sekme`);
    } else {
        console.log('⏰ Otomatik toplama: KAPALI');
    }
    
    console.log('====================================\n');
    
    // İlk çalıştırma
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        setTimeout(() => {
            console.log('🔄 İlk cookie toplama başlatılıyor...');
            getCookies();
        }, CONFIG.INITIAL_COLLECTION_DELAY);
    }
});
