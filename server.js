// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - PARALEL SEKMELİ GELİŞMİŞ FINGERPRINT KORUMASI
// 🎯 GERÇEK PARALEL İŞLEM - TAM İZOLASYON - GÜVENLİ KAPANMA
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// ⚙️ AYARLAR - PARALEL İŞLEM İÇİN OPTİMİZE
const CONFIG = {
    // PARALEL İŞLEM AYARLARI
    PARALLEL_TABS: 6, // AYNI ANDA ÇALIŞACAK SEKME SAYISI
    MAX_CONCURRENT_JOBS: 12, // MAKSİMUM İŞ SAYISI
    WORKER_TIMEOUT: 45000, // 45 SANİYE
    
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000, // 2 DAKİKA
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    
    // DİĞER AYARLAR
    INITIAL_COLLECTION_DELAY: 5000,
    MIN_COOKIE_COUNT: 7,
    
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
            
            // 🎯 SAYFAYA GİT
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'networkidle',
                timeout: CONFIG.PAGE_LOAD_TIMEOUT
            });
            
            // 🎯 İNSAN DAVRANIŞI SİMÜLASYONU
            await this.simulateHumanBehavior(page);
            
            // 🎯 COOKIE BEKLEME DÖNGÜSÜ
            const cookieResult = await this.waitForCookies(page, context);
            
            return {
                jobId: job.id,
                success: cookieResult.success,
                cookies: cookieResult.cookies,
                chrome_extension_cookies: convertToChromeExtensionFormat(cookieResult.cookies),
                stats: cookieResult.stats,
                attempts: cookieResult.attempts,
                worker_info: {
                    userAgent: job.fingerprintConfig.contextOptions.userAgent,
                    viewport: job.fingerprintConfig.contextOptions.viewport,
                    isolation: 'FULL'
                }
            };
            
        } finally {
            // 🎯 GÜVENLİ TEMİZLİK - HER WORKER KENDİ CONTEXT'İNİ KAPATSIN
            if (page) {
                try {
                    await page.close();
                } catch (e) {
                    console.log(`⚠️ Sayfa kapatma hatası (İş #${job.id}):`, e.message);
                }
            }
            
            if (context) {
                try {
                    await context.close();
                    console.log(`🧹 İş #${job.id} context temizlendi`);
                } catch (e) {
                    console.log(`⚠️ Context kapatma hatası (İş #${job.id}):`, e.message);
                }
            }
        }
    }
    
    // İNSAN DAVRANIŞI SİMÜLASYONU
    async simulateHumanBehavior(page) {
        try {
            await page.mouse.move(200, 150, { steps: 3 });
            await page.waitForTimeout(200);
            
            // Logo'ya tıkla
            const logo = await page.$('.logo, a[href*="/"]');
            if (logo) {
                await logo.click({ delay: 80 });
                await page.waitForTimeout(600);
            }
            
            // Rastgele element tıkla
            const randomElement = await page.$('button, a, .btn');
            if (randomElement) {
                await randomElement.click({ delay: 80 });
                await page.waitForTimeout(600);
            }
            
            await page.waitForTimeout(3000);
            
        } catch (error) {
            console.log('⚠️ Davranış simülasyonu hatası:', error.message);
        }
    }
    
    // COOKIE BEKLEME DÖNGÜSÜ
    async waitForCookies(page, context, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const allCookies = await context.cookies(['https://hepsiburada.com']);
            
            if (allCookies.length >= CONFIG.MIN_COOKIE_COUNT) {
                return {
                    success: true,
                    attempts: attempts,
                    cookies: allCookies,
                    stats: {
                        total_cookies: allCookies.length,
                        hbus_cookies: allCookies.filter(c => c.name.includes('hbus_')).length
                    }
                };
            }
            
            const waitTime = 3000 + Math.random() * 2000;
            await page.waitForTimeout(waitTime);
        }
        
        const finalCookies = await context.cookies(['https://hepsiburada.com']);
        return {
            success: false,
            attempts: attempts,
            cookies: finalCookies,
            stats: {
                total_cookies: finalCookies.length,
                hbus_cookies: finalCookies.filter(c => c.name.includes('hbus_')).length
            }
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

// GLOBAL DEĞİŞKENLER
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0,
    parallel_jobs_completed: 0
};

let currentMemory = { node: 0, total: 0, updated: '' };
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 FINGERPRINT SCRİPT FONKSİYONLARI (Önceki script'ten aynen alındı)
function getCanvasFingerprintScript() {
    if (!CONFIG.CANVAS_NOISE_ENABLED) return '';
    return `
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        if (contextType === '2d') {
            const originalFillText = context.fillText;
            context.fillText = function(...args) {
                args[1] = args[1] + (Math.random() * 0.01 - 0.005);
                args[2] = args[2] + (Math.random() * 0.01 - 0.005);
                return originalFillText.apply(this, args);
            };
            const originalGetImageData = context.getImageData;
            context.getImageData = function(...args) {
                const imageData = originalGetImageData.apply(this, args);
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

function getWebGLFingerprintScript() {
    if (!CONFIG.WEBGL_NOISE_ENABLED) return '';
    return `
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
            const context = originalGetContext.call(this, contextType, ...args);
            if (context) {
                const originalGetParameter = context.getParameter;
                context.getParameter = function(parameter) {
                    if (parameter === context.VENDOR) return 'Intel Inc.';
                    if (parameter === context.RENDERER) return 'Intel Iris OpenGL Engine';
                    if (parameter === context.VERSION) return 'WebGL 1.0 (OpenGL ES 2.0 Intel)';
                    if (parameter === context.SHADING_LANGUAGE_VERSION) return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0)';
                    return originalGetParameter.call(this, parameter);
                };
                const originalGetSupportedExtensions = context.getSupportedExtensions;
                context.getSupportedExtensions = function() {
                    const extensions = originalGetSupportedExtensions.call(this);
                    return extensions.filter(ext => !ext.includes('debug') && !ext.includes('conservative'));
                };
            }
            return context;
        }
        return originalGetContext.call(this, contextType, ...args);
    };
    `;
}

function getAudioContextFingerprintScript() {
    if (!CONFIG.AUDIO_CONTEXT_NOISE_ENABLED) return '';
    return `
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (originalAudioContext) {
        window.AudioContext = function(...args) {
            const audioContext = new originalAudioContext(...args);
            const originalCreateBuffer = audioContext.createBuffer;
            audioContext.createBuffer = function(...args) {
                const buffer = originalCreateBuffer.apply(this, args);
                if (buffer && buffer.getChannelData) {
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

function getFontFingerprintScript() {
    if (!CONFIG.FONT_FINGERPRINT_ENABLED) return '';
    return `
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function(text) {
        const result = originalMeasureText.call(this, text);
        if (result && typeof result.width === 'number') {
            result.width = result.width * (1 + (Math.random() * 0.02 - 0.01));
        }
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

function getAdvancedFingerprintScript() {
    return `
    ${getCanvasFingerprintScript()}
    ${getWebGLFingerprintScript()}
    ${getAudioContextFingerprintScript()}
    ${getFontFingerprintScript()}
    
    // Timezone spoofing
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() { return -180; };
    
    // Hardware concurrency spoofing
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => [4, 6, 8, 12, 16][Math.floor(Math.random() * 5)],
        configurable: true
    });
    
    // Screen resolution spoofing
    Object.defineProperty(screen, 'width', {
        get: () => [1920, 1366, 1536, 1440, 1600][Math.floor(Math.random() * 5)],
        configurable: true
    });
    
    Object.defineProperty(screen, 'height', {
        get: () => [1080, 768, 864, 900, 1024][Math.floor(Math.random() * 5)],
        configurable: true
    });
    
    // WebDriver masking
    Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    // Chrome runtime manipulation
    window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: { InstallState: {}, RunningState: {}, getDetails: () => {}, getIsInstalled: () => {} }
    };

    // Permissions manipulation
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );

    // Platform spoofing
    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

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
    `;
}

// 🎯 FINGERPRINT KONFİGÜRASYONU OLUŞTUR
function createFingerprintConfig(fingerprintId) {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 }
    ];
    
    const languages = [
        'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'tr-TR,tr;q=0.9,en;q=0.8',
        'en-US,en;q=0.9,tr;q=0.8'
    ];
    
    return {
        contextOptions: {
            viewport: viewports[fingerprintId % viewports.length],
            userAgent: userAgents[fingerprintId % userAgents.length],
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': languages[fingerprintId % languages.length],
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        },
        fingerprintScript: getAdvancedFingerprintScript()
    };
}

// 🎯 CHROME EXTENSION FORMAT DÖNÜŞTÜRÜCÜ (Önceki script'ten aynen)
function convertToChromeExtensionFormat(cookies) {
    return cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        secure: cookie.secure || false,
        httpOnly: cookie.httpOnly || false,
        sameSite: convertSameSiteForChrome(cookie.sameSite),
        expirationDate: convertExpiresToChromeFormat(cookie.expires),
        url: generateUrlForCookie(cookie)
    }));
}

function convertSameSiteForChrome(sameSite) {
    const mapping = { 'Lax': 'lax', 'Strict': 'strict', 'None': 'no_restriction' };
    return mapping[sameSite] || 'no_restriction';
}

function convertExpiresToChromeFormat(expires) {
    if (!expires) return Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
    const expiresDate = new Date(expires * 1000 || expires);
    return Math.floor(expiresDate.getTime() / 1000);
}

function generateUrlForCookie(cookie) {
    const protocol = cookie.secure ? 'https://' : 'http://';
    let domain = cookie.domain;
    if (domain.startsWith('.')) domain = 'www' + domain;
    return protocol + domain + (cookie.path || '/');
}

// 🎯 ANA COOKIE TOPLAMA FONKSİYONU - PARALEL VERSİYON
async function getCookiesParallel() {
    if (isShuttingDown) {
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ GELİŞMİŞ FINGERPRINT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        // 🎯 BROWSER BAŞLAT - TÜM WORKER'LAR AYNI BROWSER'I KULLANSIN
        browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=AutomationControlled',
                '--no-default-browser-check',
                '--disable-features=DefaultBrowserPrompt',
                '--deny-permission-prompts',
                '--disable-geolocation',
                '--disable-notifications',
                '--disable-media-stream',
                '--disable-web-security',
                '--disable-site-isolation-trials',
                '--disable-extensions',
                '--disable-default-apps',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu',
                '--no-zygote'
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
                console.log(`      🖥️  Worker: ${set.worker_info.userAgent.substring(0, 40)}...`);
            });
        }
        
        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            parallel_config: {
                parallel_tabs: CONFIG.PARALLEL_TABS,
                isolation: 'FULL',
                worker_timeout: CONFIG.WORKER_TIMEOUT
            },
            timestamp: new Date().toISOString(),
            chrome_extension_compatible: true,
            anti_detection: true,
            advanced_fingerprint: true,
            parallel_processing: true
        };

    } catch (error) {
        console.log('❌ PARALEL FINGERPRINT HATA:', error.message);
        return {
            overall_success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        // 🎯 BROWSER'I GÜVENLİ ŞEKİLDE KAPAT
        if (browser) {
            try {
                await browser.close();
                activeBrowser = null;
                console.log('✅ Browser paralel işlemler sonrası kapatıldı');
            } catch (e) {
                console.log('❌ Browser kapatma hatası:', e.message);
            }
        }
    }
}

// 🎯 ERROR HANDLERS (Önceki script'ten aynen)
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    await parallelCollector.stopAll();
    if (activeBrowser) await activeBrowser.close();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    await parallelCollector.stopAll();
    if (activeBrowser) await activeBrowser.close();
});

process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM ALINDI - Graceful shutdown');
    isShuttingDown = true;
    await parallelCollector.stopAll();
    if (activeBrowser) await activeBrowser.close();
    process.exit(0);
});

// 🎯 EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'PARALEL COOKIE COLLECTOR - TAM İZOLASYONLU',
        config: CONFIG,
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.PARALLEL_TABS} paralel sekme ile cookie topla`,
            '/last-cookies': 'Son alınan cookie\'leri göster',
            '/chrome-cookies': 'Sadece Chrome Extension formatında cookie\'ler',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster',
            '/parallel-status': 'Paralel iş durumu'
        },
        features: {
            parallel_processing: true,
            full_isolation: true,
            independent_tabs: true,
            safe_shutdown: true,
            chrome_extension_compatible: true,
            advanced_fingerprint: true
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
            max_concurrent_jobs: CONFIG.MAX_CONCURRENT_JOBS,
            worker_timeout: CONFIG.WORKER_TIMEOUT
        },
        features: {
            full_isolation: '✅ HER SEKMEDE TAM İZOLASYON',
            independent_fingerprint: '✅ HER SEKMEDE FARKLI FINGERPRINT',
            safe_cleanup: '✅ HER İŞ SONUNDA CONTEXT TEMİZLİĞİ',
            queue_management: '✅ AKILLI KUYRUK YÖNETİMİ'
        }
    });
});

// 🎯 COOKIE TOPLAMA ENDPOINT'İ
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ COOKIE TOPLAMA ===`);
    const result = await getCookiesParallel();
    res.json(result);
});

// 🎯 DİĞER ENDPOINT'LER (Önceki script'ten aynen)
app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({ error: 'Henüz cookie toplanmadı', timestamp: new Date().toISOString() });
    }

    const successfulSets = lastCookies.filter(set => set.success);
    if (successfulSets.length === 0) {
        return res.json({ error: 'Başarılı cookie seti bulunamadı', available_sets: lastCookies.length });
    }

    const result = {
        last_updated: lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
        total_successful_sets: successfulSets.length,
        parallel_processing: true,
        chrome_extension_compatible: true,
        advanced_fingerprint_enabled: true
    };

    successfulSets.forEach(set => {
        result[`set${set.set_id}`] = set.chrome_extension_cookies;
    });

    res.json(result);
});

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

// 🎯 SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;

// 🎯 OTOMATİK TOPLAMA (PARALEL VERSİYON)
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
