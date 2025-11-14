// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - CHROME EXTENSION UYUMLU COOKIE FORMATI
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI İLE PARALEL SEKMELER
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    // PARALEL İŞLEM AYARLARI
    PARALLEL_TABS: 6, // AYNI ANDA ÇALIŞACAK SEKME SAYISI
    MAX_CONCURRENT_JOBS: 12, // MAKSİMUM İŞ SAYISI
    
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000, // 2 DAKİKA
    FINGERPRINT_COUNT: 6, // 6 FARKLI FINGERPRINT
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 1000, // 1-3 saniye arası
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000, // 30 saniyeye düşürüldü
    
    // DİĞER AYARLAR
    INITIAL_COLLECTION_DELAY: 5000, // 5 saniye
    MIN_COOKIE_COUNT: 7, // 🎯 EN AZ 7 COOKIE GEREKLİ
    
    // FINGERPRINT AYARLARI
    CANVAS_NOISE_ENABLED: true,
    WEBGL_NOISE_ENABLED: true,
    AUDIO_CONTEXT_NOISE_ENABLED: true,
    FONT_FINGERPRINT_ENABLED: true
};

// 🎯 PARALEL İŞ YÖNETİCİSİ
class ParallelCookieCollector {
    constructor() {
        this.jobQueue = [];
        this.activeWorkers = new Map();
        this.completedJobs = [];
        this.isRunning = false;
        this.browser = null;
        this.nextJobId = 1;
    }
    
    // İŞ EKLE
    async addJob(fingerprintConfig) {
        const jobId = this.nextJobId++;
        const job = {
            id: jobId,
            fingerprintConfig,
            status: 'pending',
            createdAt: new Date(),
            promise: null,
            resolve: null,
            reject: null
        };
        
        job.promise = new Promise((resolve, reject) => {
            job.resolve = resolve;
            job.reject = reject;
        });
        
        this.jobQueue.push(job);
        this.processQueue();
        
        return job.promise;
    }
    
    // KUYRUĞU İŞLE
    async processQueue() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        while (this.jobQueue.length > 0 && this.activeWorkers.size < CONFIG.PARALLEL_TABS) {
            const job = this.jobQueue.shift();
            if (!job) continue;
            
            this.executeJob(job);
            
            // PARALEL İŞLEMLER ARASI KÜÇÜK BEKLEME
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isRunning = false;
    }
    
    // İŞİ ÇALIŞTIR
    async executeJob(job) {
        job.status = 'running';
        this.activeWorkers.set(job.id, job);
        
        console.log(`🔄 PARALEL İŞ #${job.id} BAŞLATILDI (Aktif: ${this.activeWorkers.size}/${CONFIG.PARALLEL_TABS})`);
        
        try {
            const result = await this.runWorker(job);
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();
            
            this.completedJobs.push(job);
            this.activeWorkers.delete(job.id);
            
            job.resolve(result);
            
            console.log(`✅ PARALEL İŞ #${job.id} TAMAMLANDI (Aktif: ${this.activeWorkers.size}/${CONFIG.PARALLEL_TABS})`);
            
            // YENİ İŞ İŞLE
            this.processQueue();
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
            
            this.activeWorkers.delete(job.id);
            job.reject(error);
            
            console.log(`❌ PARALEL İŞ #${job.id} HATA: ${error.message}`);
            
            // YENİ İŞ İŞLE
            this.processQueue();
        }
    }
    
    // WORKER ÇALIŞTIR
    async runWorker(job) {
        let context;
        let page;
        
        try {
            // 🎯 TAM İZOLASYON - HER WORKER İÇİN YENİ CONTEXT
            context = await this.browser.newContext(job.fingerprintConfig.contextOptions);
            
            // 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ EKLE
            await context.addInitScript(job.fingerprintConfig.fingerprintScript);
            
            page = await context.newPage();
            
            // 🎯 COOKIE'LERİ TEMİZLE
            await context.clearCookies();

            // 🎯 HEPSIBURADA'YA GİT
            console.log(`🌐 [İş #${job.id}] Hepsiburada'ya gidiliyor...`);
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'networkidle',
                timeout: CONFIG.PAGE_LOAD_TIMEOUT
            });

            console.log(`✅ [İş #${job.id}] Sayfa yüklendi, JS çalışıyor...`);

            // 🎯 İNSAN DAVRANIŞI SİMÜLASYONU
            console.log(`🎭 [İş #${job.id}] Basit insan davranışı simülasyonu...`);

            // 1. Mouse hareketi
            await page.mouse.move(200, 150, { steps: 3 });
            await page.waitForTimeout(200);

            // 2. Logo'ya tıkla
            try {
                const logo = await page.$('.logo, a[href*="/"]');
                if (logo) {
                    await logo.click({ delay: 80 });
                    console.log(`✅ [İş #${job.id}] Logo tıklandı`);
                    await page.waitForTimeout(600);
                }
            } catch (e) {}

            // 3. Başka bir yere tıkla
            try {
                const randomElement = await page.$('button, a, .btn');
                if (randomElement) {
                    await randomElement.click({ delay: 80 });
                    console.log(`✅ [İş #${job.id}] Rastgele element tıklandı`);
                    await page.waitForTimeout(600);
                }
            } catch (e) {}

            // 3 saniye bekle
            console.log(`⏳ [İş #${job.id}] 3 saniye bekleniyor...`);
            await page.waitForTimeout(3000);

            // 🎯 COOKIE BEKLEME DÖNGÜSÜ - TEK DOMAİNDEN COOKIE TOPLA
            const cookieResult = await this.waitForCookies(page, context, job.id);
            
            return {
                jobId: job.id,
                success: cookieResult.success,
                cookies: cookieResult.cookies,
                chrome_extension_cookies: convertToChromeExtensionFormat(cookieResult.cookies),
                stats: cookieResult.stats,
                attempts: cookieResult.attempts,
                worker_info: {
                    userAgent: job.fingerprintConfig.contextOptions.userAgent.substring(0, 40) + '...',
                    viewport: job.fingerprintConfig.contextOptions.viewport,
                    isolation: 'FULL_PARALLEL'
                }
            };
            
        } finally {
            // 🎯 GÜVENLİ TEMİZLİK - HER WORKER KENDİ CONTEXT'İNİ KAPATSIN
            if (page) {
                try {
                    await page.close();
                } catch (e) {
                    console.log(`⚠️ [İş #${job.id}] Sayfa kapatma hatası:`, e.message);
                }
            }
            
            if (context) {
                try {
                    await context.close();
                    console.log(`🧹 [İş #${job.id}] Context temizlendi`);
                } catch (e) {
                    console.log(`⚠️ [İş #${job.id}] Context kapatma hatası:`, e.message);
                }
            }
        }
    }
    
    // COOKIE BEKLEME DÖNGÜSÜ
    async waitForCookies(page, context, jobId, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const allCookies = await context.cookies(['https://hepsiburada.com']);
            
            if (allCookies.length >= CONFIG.MIN_COOKIE_COUNT) {
                console.log(`✅ [İş #${jobId}] GEREKLİ ${CONFIG.MIN_COOKIE_COUNT}+ COOKIE BULUNDU!`);
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
                    method: 'PARALLEL_SINGLE_DOMAIN_COOKIE_COLLECTION'
                };
            } else {
                console.log(`   ⚠️ [İş #${jobId}] Yetersiz cookie: ${allCookies.length}/${CONFIG.MIN_COOKIE_COUNT}`);
            }
            
            const waitTime = 3000 + Math.random() * 2000;
            console.log(`⏳ [İş #${jobId}] ${Math.round(waitTime/1000)} saniye bekleniyor...`);
            await page.waitForTimeout(waitTime);
        }
        
        const finalCookies = await context.cookies(['https://hepsiburada.com']);
        console.log(`❌ [İş #${jobId}] MAKSİMUM DENEME SAYISINA ULAŞILDI, ${CONFIG.MIN_COOKIE_COUNT}+ COOKIE BULUNAMADI`);
        
        return {
            success: false,
            attempts: attempts,
            cookies: finalCookies,
            stats: {
                total_cookies: finalCookies.length,
                hbus_cookies: finalCookies.filter(c => c.name.includes('hbus_')).length,
                session_cookies: finalCookies.filter(c => c.name.includes('session')).length,
                auth_cookies: finalCookies.filter(c => c.name.includes('auth') || c.name.includes('token')).length
            },
            method: 'PARALLEL_SINGLE_DOMAIN_COOKIE_COLLECTION'
        };
    }
    
    // BROWSER AYARLA
    async setBrowser(browserInstance) {
        this.browser = browserInstance;
    }
    
    // DURUM KONTROLÜ
    getStatus() {
        return {
            activeWorkers: this.activeWorkers.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs.length,
            maxParallel: CONFIG.PARALLEL_TABS
        };
    }
    
    // TÜM İŞLERİ DURDUR
    async stopAll() {
        this.jobQueue = [];
        
        // AKTİF İŞLERİ DURDUR
        for (const [jobId, job] of this.activeWorkers.entries()) {
            job.status = 'cancelled';
            job.reject(new Error('İş iptal edildi'));
        }
        
        this.activeWorkers.clear();
        console.log('🛑 Tüm paralel işler durduruldu');
    }
}

// 🎯 PARALEL İŞ YÖNETİCİSİNİ BAŞLAT
const parallelCollector = new ParallelCookieCollector();

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0,
    parallel_jobs_completed: 0
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
        await parallelCollector.stopAll();
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
        await parallelCollector.stopAll();
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
        await parallelCollector.stopAll();
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

// 🎯 FINGERPRINT KONFİGÜRASYONU OLUŞTUR
function createFingerprintConfig(fingerprintId) {
    return {
        contextOptions: {
            viewport: getRandomViewport(),
            userAgent: getRandomUserAgent(),
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': getRandomLanguage(),
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        },
        fingerprintScript: getAdvancedFingerprintScript()
    };
}

// 🎯 PARALEL COOKIE TOPLAMA FONKSİYONU
async function getCookiesParallel() {
    if (isShuttingDown) {
        console.log('❌ Shutdown modunda - yeni işlem başlatılmıyor');
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ GELİŞMİŞ FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        console.log('📊 Mevcut cookie setleri korunuyor:', lastCookies.length + ' set');
        
        // 🚨 MEMORY LEAK ÖNLEYİCİ BROWSER AYARLARI + OTOMASYON ENGELLEME
        browser = await chromium.launch({
            headless: true,
            args: [
                // 🎯 OTOMASYON ALGILAMAYI ENGELLE
                '--disable-blink-features=AutomationControlled',
                '--disable-features=AutomationControlled',
                '--no-default-browser-check',
                '--disable-features=DefaultBrowserPrompt',
                
                // 🎯 İZİN KONTROLLERİ
                '--deny-permission-prompts',
                '--disable-geolocation',
                '--disable-notifications',
                '--disable-media-stream',
                
                // 🎯 DİĞER GÜVENLİK AYARLARI
                '--disable-web-security',
                '--disable-site-isolation-trials',
                '--disable-component-update',
                '--disable-background-networking',
                
                // 🎯 PERFORMANS OPTİMİZASYONLARI
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-sync',
                
                // 🎯 VARSAYILAN AYARLAR
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--no-zygote',
                '--max-old-space-size=400'
            ]
        });

        activeBrowser = browser;
        
        // 🎯 PARALEL COLLECTOR'A BROWSER'I AYARLA
        await parallelCollector.setBrowser(browser);
        
        console.log(`✅ Browser başlatıldı - ${CONFIG.PARALLEL_TABS} paralel sekme hazır`);
        
        // 🎯 TÜM FINGERPRINT'LERİ PARALEL İŞ OLARAK EKLE
        const jobPromises = [];
        
        for (let i = 1; i <= CONFIG.PARALLEL_TABS; i++) {
            const fingerprintConfig = createFingerprintConfig(i);
            
            console.log(`📦 Paralel iş #${i} kuyruğa eklendi`);
            const jobPromise = parallelCollector.addJob(fingerprintConfig);
            jobPromises.push(jobPromise);
        }
        
        // 🎯 TÜM İŞLERİN TAMAMLANMASINI BEKLE
        console.log(`⏳ ${CONFIG.PARALLEL_TABS} paralel işin tamamlanması bekleniyor...`);
        const results = await Promise.allSettled(jobPromises);
        
        // 🎯 SONUÇLARI İŞLE
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allResults.push(result.value);
                
                if (result.value.success) {
                    const successfulSet = {
                        set_id: result.value.jobId,
                        success: true,
                        cookies: result.value.cookies,
                        chrome_extension_cookies: result.value.chrome_extension_cookies,
                        stats: result.value.stats,
                        collection_time: new Date(),
                        worker_info: result.value.worker_info
                    };
                    
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ PARALEL İŞ #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie`);
                } else {
                    console.log(`❌ PARALEL İŞ #${result.value.jobId}: BAŞARISIZ - ${result.value.cookies.length} cookie`);
                }
            } else {
                console.log(`❌ PARALEL İŞ #${index + 1}: HATA - ${result.reason.message}`);
                allResults.push({
                    jobId: index + 1,
                    success: false,
                    error: result.reason.message
                });
            }
        });
        
        // 🎯 İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        
        console.log('\n📊 === PARALEL FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (${CONFIG.MIN_COOKIE_COUNT}+ cookie): ${successfulCount}`);
        console.log(`   Başarısız: ${allResults.length - successfulCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);
        console.log(`   Paralel Sekme: ${CONFIG.PARALLEL_TABS}`);
        console.log(`   Tam İzolasyon: ✅ AKTİF`);
        
        // 🎯 SON COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            collectionStats.parallel_jobs_completed += successfulCount;
            
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            console.log('\n📋 YENİ BAŞARILI PARALEL COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS)`);
                console.log(`      📦 Chrome Extension: ${set.chrome_extension_cookies.length} cookie`);
                console.log(`      🖥️  Worker: ${set.worker_info.userAgent}`);
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
            previous_cookies_preserved: successfulCount === 0,
            parallel_config: {
                parallel_tabs: CONFIG.PARALLEL_TABS,
                isolation: 'FULL',
                worker_cleanup: 'AUTOMATIC'
            },
            timestamp: new Date().toISOString(),
            criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required`,
            chrome_extension_compatible: true,
            anti_detection: true,
            advanced_fingerprint: true,
            parallel_processing: true
        };

    } catch (error) {
        console.log('❌ PARALEL FINGERPRINT HATA:', error.message);
        if (browser) {
            await browser.close();
            activeBrowser = null;
        }
        
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        if (browser) {
            await browser.close();
            activeBrowser = null;
            console.log('✅ Browser paralel işlemler sonrası kapatıldı');
        }
    }
}

// ✅ CHROME EXTENSION UYUMLU SET FORMATI
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({
            error: 'Henüz cookie toplanmadı',
            timestamp: new Date().toISOString()
        });
    }

    // 🎯 SADECE BAŞARILI SET'LERİ FİLTRELE
    const successfulSets = lastCookies.filter(set => set.success);

    if (successfulSets.length === 0) {
        return res.json({
            error: 'Başarılı cookie seti bulunamadı',
            available_sets: lastCookies.length,
            timestamp: new Date().toISOString()
        });
    }

    // 🎯 CHROME EXTENSION UYUMLU FORMAT
    const result = {};
    
    // 🎯 LAST UPDATE ZAMANI EN ÜSTTE
    result.last_updated = lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR');
    result.total_successful_sets = successfulSets.length;
    result.min_cookies_required = CONFIG.MIN_COOKIE_COUNT;
    result.chrome_extension_compatible = true;
    result.anti_detection_enabled = true;
    result.advanced_fingerprint_enabled = true;
    result.parallel_processing = true;
    result.format_info = "Cookies are in Chrome Extension API format (chrome.cookies.set)";
    
    // 🎯 SETLER - CHROME EXTENSION FORMATINDA
    successfulSets.forEach(set => {
        result[`set${set.set_id}`] = set.chrome_extension_cookies;
    });

    // 🎯 ÖZET BİLGİLER
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

    // 🎯 SADECE CHROME EXTENSION FORMATI
    const chromeSets = {};
    
    successfulSets.forEach(set => {
        chromeSets[`set${set.set_id}`] = set.chrome_extension_cookies;
    });

    res.json({
        chrome_extension_format: true,
        anti_detection_enabled: true,
        advanced_fingerprint_enabled: true,
        parallel_processing: true,
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

// 🎯 PARALEL DURUM ENDPOINT'İ
app.get('/parallel-status', (req, res) => {
    res.json({
        parallel_engine: 'ACTIVE',
        ...parallelCollector.getStatus(),
        config: {
            parallel_tabs: CONFIG.PARALLEL_TABS,
            max_concurrent_jobs: CONFIG.MAX_CONCURRENT_JOBS
        },
        features: {
            full_isolation: '✅ HER SEKMEDE TAM İZOLASYON',
            independent_fingerprint: '✅ HER SEKMEDE FARKLI FINGERPRINT',
            safe_cleanup: '✅ HER İŞ SONUNDA CONTEXT TEMİZLİĞİ',
            queue_management: '✅ AKILLI KUYRUK YÖNETİMİ'
        }
    });
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
        service: 'PARALEL COOKIE COLLECTOR - GELİŞMİŞ FINGERPRINT KORUMALI',
        config: CONFIG,
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.PARALLEL_TABS} paralel sekme ile cookie topla`, 
            '/last-cookies': 'Son alınan cookie\'leri göster (Chrome Extension formatında)',
            '/chrome-cookies': 'Sadece Chrome Extension formatında cookie\'ler',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster',
            '/parallel-status': 'Paralel iş durumu'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        successful_sets_count: lastCookies.filter(set => set.success).length,
        stats: collectionStats,
        render_stability: 'ACTIVE - Error handlers enabled',
        success_criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required - HBUS kontrolü YOK`,
        chrome_extension_compatible: true,
        anti_detection_enabled: true,
        advanced_fingerprint_enabled: true,
        parallel_processing: true,
        cookie_format: 'Chrome Extension API (chrome.cookies.set)'
    });
});

// PARALEL COOKIE TOPLAMA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ COOKIE TOPLAMA ===`);
    const result = await getCookiesParallel();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `PARALEL_FINGERPRINT_SET_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// 🎯 GÜNCELLENMİŞ HEALTH CHECK
app.get('/health', (req, res) => {
    const healthText = `
🚀 PARALEL COOKIE COLLECTOR - TAM İZOLASYONLU
=============================================

🔄 PARALEL DURUM:
├── Aktif İşler: ${parallelCollector.getStatus().activeWorkers}
├── Kuyruktaki İşler: ${parallelCollector.getStatus().queuedJobs}
├── Tamamlanan İşler: ${parallelCollector.getStatus().completedJobs}
├── Maksimum Paralel: ${CONFIG.PARALLEL_TABS}
└── İzolasyon: ✅ TAM İZOLASYON

📊 COOKIE DURUMU:
├── Toplam Set: ${lastCookies.length}
├── Başarılı Set: ${lastCookies.filter(set => set.success).length}
├── Son Toplama: ${lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : 'Henüz yok'}
└── Paralel İş Tamamlanan: ${collectionStats.parallel_jobs_completed}

🛡️ GÜVENLİK ÖZELLİKLERİ:
├── Paralel İşlem: ✅ AKTİF
├── Tam İzolasyon: ✅ HER SEKMEDE
├── Bağımsız Fingerprint: ✅ HER SEKMEDE
├── Güvenli Temizlik: ✅ İŞ SONU OTOMATİK
├── Graceful Shutdown: ✅ AKTİF
└── Queue Management: ✅ AKTİF

💡 SİSTEM:
├── Çalışma Süresi: ${Math.round(process.uptime())}s
├── Node.js Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
└── Platform: ${process.platform}

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.PARALLEL_TABS} paralel sekme ile topla
├── /parallel-status - Paralel iş durumu
├── /last-cookies - Son cookie'ler
├── /chrome-cookies - Chrome formatı
├── /health - Bu sayfa
└── /stats - İstatistikler

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
=============================================
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
        parallel_status: parallelCollector.getStatus(),
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
                parallel_worker: set.worker_info ? true : false
            }))
        },
        chrome_extension_compatibility: {
            format: 'Chrome Extension API (chrome.cookies.set)',
            required_fields: ['name', 'value', 'url', 'expirationDate'],
            sameSite_values: ['lax', 'strict', 'no_restriction'],
            verified: lastCookies.filter(set => set.success).every(set => 
                set.chrome_extension_cookies && 
                set.chrome_extension_cookies.every(cookie => 
                    cookie.url && cookie.expirationDate
                )
            )
        },
        parallel_features: {
            parallel_tabs: CONFIG.PARALLEL_TABS,
            full_isolation: true,
            independent_fingerprint: true,
            safe_cleanup: true,
            queue_management: true
        },
        advanced_fingerprint_features: {
            webdriver_masking: true,
            chrome_runtime_manipulation: true,
            permissions_override: true,
            plugin_spoofing: true,
            language_spoofing: true,
            dimension_masking: true,
            console_debug_disable: true,
            webgl_vendor_spoofing: true,
            canvas_fingerprint_spoofing: CONFIG.CANVAS_NOISE_ENABLED,
            audio_context_spoofing: CONFIG.AUDIO_CONTEXT_NOISE_ENABLED,
            font_fingerprint_spoofing: CONFIG.FONT_FINGERPRINT_ENABLED,
            timezone_locale_spoofing: true,
            hardware_concurrency_spoofing: true,
            screen_resolution_spoofing: true,
            connection_spoofing: true,
            platform_spoofing: true
        },
        performance: {
            estimated_time: `${Math.round(CONFIG.PARALLEL_TABS * 6)}-${Math.round(CONFIG.PARALLEL_TABS * 8)} seconds (PARALLEL)`
        },
        render_stability: {
            error_handlers: 'ACTIVE',
            graceful_shutdown: 'ACTIVE',
            browser_tracking: 'ACTIVE',
            parallel_management: 'ACTIVE'
        },
        success_criteria: {
            hbus_check: 'DISABLED',
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            domain: '.hepsiburada.com',
            description: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies from single domain`
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

// 🎯 RENDER STABİLİTE - OTOMATİK COOKIE TOPLAMA (PARALEL)
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK COOKIE TOPLAMA AKTİF');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ TOPLAMA ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookiesParallel();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK PARALEL: ${result.successful_attempts}/${CONFIG.PARALLEL_TABS} başarılı`);
        } else {
            console.log('❌ OTOMATİK PARALEL: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 PARALEL COOKIE COLLECTOR - TAM İZOLASYONLU ÇALIŞIYOR!');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Sekme: ${CONFIG.PARALLEL_TABS}`);
    console.log(`📍 /collect - ${CONFIG.PARALLEL_TABS} paralel sekme ile cookie topla`);
    console.log('📍 /parallel-status - Paralel iş durumu');
    console.log('📍 /last-cookies - Son cookie\'leri göster');
    console.log('📍 /chrome-cookies - Sadece Chrome formatında cookie\'ler');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log(`🎯 ${CONFIG.MIN_COOKIE_COUNT}+ cookie olan setler BAŞARILI sayılır`);
    console.log('🎯 Domain: .hepsiburada.com (tüm subdomain\'leri kapsar)');
    console.log('🔒 PARALEL İŞLEM ÖZELLİKLERİ:');
    console.log('   ├── Gerçek Paralel: ✅ AYNI ANDA ÇOKLU SEKMELER');
    console.log('   ├── Tam İzolasyon: ✅ HER SEKMEDE AYRI CONTEXT');
    console.log('   ├── Bağımsız Fingerprint: ✅ HER SEKMEDE FARKLI');
    console.log('   ├── Akıllı Kuyruk: ✅ İŞ BİTEN YENİ İŞ ALIR');
    console.log('   ├── Güvenli Temizlik: ✅ İŞ SONU OTOMATİK TEMİZLİK');
    console.log('   └── Graceful Shutdown: ✅ TÜM İŞLERİ GÜVENLİ DURDUR');
    console.log('🔄 Cookie güncelleme: 🎯 PARALEL İŞLEM SONUNDA');
    console.log('🛡️ RENDER STABİLİTE ÖNLEMLERİ: AKTİF');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.PARALLEL_TABS} paralel sekme`);
    }
    
    console.log('====================================\n');
});
