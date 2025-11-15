// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - DIRECT CONTEXT MODE (SEKMESİZ)
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI İLE PARALEL CONTEXT'LER + OTOMATİK ÜYELİK
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    // PARALEL İŞLEM AYARLARI
    PARALLEL_CONTEXTS: 4, // AYNI ANDA ÇALIŞACAK CONTEXT SAYISI
    MAX_CONCURRENT_JOBS: 12, // MAKSİMUM İŞ SAYISI
    
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000, // 2 DAKİKA
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    
    // DİĞER AYARLARI
    INITIAL_COLLECTION_DELAY: 5000,
    MIN_COOKIE_COUNT: 7,
    
    // FINGERPRINT AYARLARI
    CANVAS_NOISE_ENABLED: true,
    WEBGL_NOISE_ENABLED: true,
    
    // 🆕 HEPŞİBURADA KAYIT AYARLARI
    AUTO_REGISTRATION: true,
    REGISTRATION_DELAY: 0
};

// 🎯 HEPŞİBURADA ÜYELİK SİSTEMİ
class HepsiburadaSession {
    constructor() {
        this.cookies = new Map();
        this.xsrfToken = null;
        this.baseHeaders = null;
    }

    getCookieHeader() {
        const cookieArray = Array.from(this.cookies.values());
        return cookieArray
            .map(cookie => `${cookie.name}=${cookie.value}`)
            .join('; ');
    }

    parseAndStoreCookies(setCookieHeaders) {
        if (!setCookieHeaders) return;
        
        const cookiesArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        
        for (const cookieHeader of cookiesArray) {
            try {
                const parts = cookieHeader.split(';');
                const [nameValue] = parts;
                const [name, value] = nameValue.split('=');
                
                if (name && value) {
                    this.cookies.set(name.trim(), {
                        name: name.trim(),
                        value: value.trim(),
                        domain: '.hepsiburada.com',
                        path: '/'
                    });
                }
            } catch (error) {
                // Silent parse
            }
        }
    }

    async sendWorkerRequest(requestData) {
        try {
            const response = await fetch('https://deneme.burnvenom1.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            return await response.json();
        } catch (error) {
            console.log('❌ Worker hatası:', error.message);
            throw error;
        }
    }

    generateEmail() {
        const baseTemplates = [
            "jihpngpnd@emlhub.com", "tmrzfanje@emlpro.com", "wiraypzse@emlpro.com",
            "lnmwhbvvf@emltmp.com", "bshuzcvvf@emltmp.com", "hsfsqxcug@emltmp.com"
        ];
        
        const randomPart2 = Math.random().toString(36).substring(2, 6);
        const randomPart = Math.random().toString(36).substring(2, 6);
        const randomIndex = Math.floor(Math.random() * baseTemplates.length);
        const baseEmail = baseTemplates[randomIndex];
        const parts = baseEmail.split("@");
        const username = parts[0];
        const domain = parts[1];
        
        return username + '.' + randomPart.substring(0, 3) + '@' + randomPart2.substring(0, 3) + '.' + domain;
    }

    async getOtpCode(email) {
        const otpUrl = `https://script.google.com/macros/s/AKfycbxvTJG2ou3TGgCv2PHaaFjw8-dpRkxwnuJuJHZ6CXAVCo7jRXvm_Je5c370uGundLo3KQ/exec?email=${encodeURIComponent(email)}&mode=0`;
        
        try {
            const response = await fetch(otpUrl);
            const otpText = await response.text();
            
            let otpCode = null;
            const match = otpText.match(/\b\d{6}\b/);
            if (match) {
                otpCode = match[0];
            } else if (/^\d{6}$/.test(otpText.trim())) {
                otpCode = otpText.trim();
            }
            
            return otpCode;
        } catch (error) {
            console.log('❌ OTP API hatası:', error.message);
            return null;
        }
    }
}

// 🎯 PARALEL CONTEXT YÖNETİCİSİ (SEKMESİZ)
class ParallelContextCollector {
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
        
        while (this.jobQueue.length > 0 && this.activeWorkers.size < CONFIG.PARALLEL_CONTEXTS) {
            const job = this.jobQueue.shift();
            if (!job) continue;
            
            this.executeJob(job);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isRunning = false;
    }
    
    // İŞİ ÇALIŞTIR - DIRECT CONTEXT MODE
    async executeJob(job) {
        job.status = 'running';
        this.activeWorkers.set(job.id, job);
        
        console.log(`🔄 CONTEXT İŞ #${job.id} BAŞLATILDI (Aktif: ${this.activeWorkers.size}/${CONFIG.PARALLEL_CONTEXTS})`);
        
        try {
            const result = await this.runContextWorker(job);
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();
            
            this.completedJobs.push(job);
            this.activeWorkers.delete(job.id);
            
            job.resolve(result);
            
            console.log(`✅ CONTEXT İŞ #${job.id} TAMAMLANDI`);
            
            this.processQueue();
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
            
            this.activeWorkers.delete(job.id);
            job.reject(error);
            
            console.log(`❌ CONTEXT İŞ #${job.id} HATA: ${error.message}`);
            
            this.processQueue();
        }
    }
    
    // CONTEXT WORKER ÇALIŞTIR - SEKMESİZ
    async runContextWorker(job) {
        let context;
        let page;
        
        try {
            // 🎯 DİREKT CONTEXT AÇ - SEKMESİZ MOD
            context = await this.browser.newContext(job.fingerprintConfig.contextOptions);
            
            // 🎯 FINGERPRINT SCRİPT'İ EKLE
            await context.addInitScript(job.fingerprintConfig.fingerprintScript);
            
            // 🎯 COOKIE'LERİ TEMİZLE
            await context.clearCookies();

            // 🎯 SAYFA OLUŞTUR (SADECE 1 SAYFA)
            page = await context.newPage();
            
            console.log(`🌐 [Context #${job.id}] Hepsiburada'ya gidiliyor...`);
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'networkidle',
                timeout: CONFIG.PAGE_LOAD_TIMEOUT
            });

            console.log(`✅ [Context #${job.id}] Sayfa yüklendi, cookie bekleniyor...`);
            
            // 🎯 COOKIE BEKLEME
            const cookieResult = await this.waitForCookies(context, job.id);
            
            // 🎯 ÜYELİK İŞLEMİ
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [Context #${job.id}] COOKIE BAŞARILI - ÜYELİK BAŞLATILIYOR...`);
                
                try {
                    const pageHeaders = await page.evaluate(() => {
                        return {
                            userAgent: navigator.userAgent,
                            language: navigator.language,
                            languages: navigator.languages,
                            platform: navigator.platform
                        };
                    });

                    const registrationResult = await this.doRegistrationWithWorker(page, context, job.id, cookieResult.cookies, pageHeaders);
                    
                    if (registrationResult.success) {
                        console.log(`🎉 [Context #${job.id}] ÜYELİK BAŞARILI: ${registrationResult.email}`);
                        cookieResult.registration = registrationResult;
                    } else {
                        console.log(`❌ [Context #${job.id}] ÜYELİK BAŞARISIZ: ${registrationResult.error}`);
                        cookieResult.registration = registrationResult;
                    }
                } catch (regError) {
                    console.log(`❌ [Context #${job.id}] ÜYELİK HATASI: ${regError.message}`);
                    cookieResult.registration = { success: false, error: regError.message };
                }
            }
            
            return {
                jobId: job.id,
                success: cookieResult.success,
                cookies: cookieResult.cookies,
                chrome_extension_cookies: convertToChromeExtensionFormat(cookieResult.cookies),
                stats: cookieResult.stats,
                attempts: cookieResult.attempts,
                registration: cookieResult.registration,
                worker_info: {
                    userAgent: job.fingerprintConfig.contextOptions.userAgent.substring(0, 40) + '...',
                    viewport: job.fingerprintConfig.contextOptions.viewport,
                    isolation: 'DIRECT_CONTEXT_MODE'
                }
            };
            
        } finally {
            // 🎯 CONTEXT'İ TEMİZLE
            if (page) {
                try {
                    await page.close();
                } catch (e) {
                    console.log(`⚠️ [Context #${job.id}] Sayfa kapatma hatası:`, e.message);
                }
            }
            
            if (context) {
                try {
                    await context.close();
                    console.log(`🧹 [Context #${job.id}] Context temizlendi`);
                } catch (e) {
                    console.log(`⚠️ [Context #${job.id}] Context kapatma hatası:`, e.message);
                }
            }
        }
    }

    // 🎯 WORKER İLE ÜYELİK YAPAN FONKSİYON
    async doRegistrationWithWorker(page, context, jobId, cookies, pageHeaders) {
        console.log(`📧 [Context #${jobId}] Worker ile üyelik başlatılıyor...`);
        
        try {
            const session = new HepsiburadaSession();
            
            // 🎯 COOKIE'LERİ SESSION'A YÜKLE
            cookies.forEach(cookie => {
                session.cookies.set(cookie.name, {
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path
                });
            });
            
            // 🎯 BASE HEADER'LARI AYARLA
            session.baseHeaders = {
                'accept': 'application/json, text/plain, */*',
                'accept-language': pageHeaders.languages ? pageHeaders.languages.join(',') : 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'accept-encoding': 'gzip, deflate, br',
                'cache-control': 'no-cache',
                'connection': 'keep-alive',
                'origin': 'https://giris.hepsiburada.com',
                'referer': 'https://giris.hepsiburada.com/',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors', 
                'sec-fetch-site': 'same-site',
                'user-agent': pageHeaders.userAgent,
                'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': `"${pageHeaders.platform}"`
            };

            console.log(`🖥️ [Context #${jobId}] Context bilgileri: ${pageHeaders.userAgent.substring(0, 50)}...`);

            // 🎯 EMAIL OLUŞTUR
            const email = session.generateEmail();
            console.log(`📧 [Context #${jobId}] Email: ${email}`);

            // 🎯 1. XSRF TOKEN AL
            console.log(`🔄 [Context #${jobId}] XSRF Token alınıyor...`);
            
            const xsrfHeaders = {
                ...session.baseHeaders,
                'cookie': session.getCookieHeader()
            };

            const xsrfRequestData = {
                targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                method: 'GET',
                headers: xsrfHeaders
            };

            const xsrfResponse = await session.sendWorkerRequest(xsrfRequestData);
            
            if (xsrfResponse.status === 200) {
                const bodyData = typeof xsrfResponse.body === 'string' 
                    ? JSON.parse(xsrfResponse.body) 
                    : xsrfResponse.body;
                
                if (bodyData && bodyData.xsrfToken) {
                    session.xsrfToken = bodyData.xsrfToken;
                    console.log(`✅ [Context #${jobId}] XSRF TOKEN ALINDI`);
                    
                    if (xsrfResponse.headers && xsrfResponse.headers['set-cookie']) {
                        session.parseAndStoreCookies(xsrfResponse.headers['set-cookie']);
                    }
                }
            }

            if (!session.xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            // 🎯 2. KAYIT İSTEĞİ GÖNDER
            console.log(`📨 [Context #${jobId}] Kayıt isteği gönderiliyor...`);

            const registerHeaders = {
                ...session.baseHeaders,
                'content-type': 'application/json',
                'x-xsrf-token': session.xsrfToken,
                'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                'cookie': session.getCookieHeader()
            };

            const registerData = {
                targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/createregisterrequest',
                method: 'POST',
                headers: registerHeaders,
                body: JSON.stringify({ email: email })
            };

            const registerResponse = await session.sendWorkerRequest(registerData);
            const registerBody = typeof registerResponse.body === 'string'
                ? JSON.parse(registerResponse.body)
                : registerResponse.body;
            
            if (registerResponse.headers && registerResponse.headers['set-cookie']) {
                session.parseAndStoreCookies(registerResponse.headers['set-cookie']);
            }

            if (registerResponse.status === 200 && registerBody && registerBody.success) {
                console.log(`✅ [Context #${jobId}] KAYIT İSTEĞİ BAŞARILI!`);
                const referenceId = registerBody.data?.referenceId;

                // 🎯 OTP KODU BEKLE
                console.log(`⏳ [Context #${jobId}] OTP KODU BEKLENİYOR (15 saniye)...`);
                await new Promise(resolve => setTimeout(resolve, 15000));

                console.log(`📱 [Context #${jobId}] OTP kodu alınıyor...`);
                const otpCode = await session.getOtpCode(email);
                
                if (otpCode) {
                    console.log(`✅ [Context #${jobId}] OTP KODU HAZIR:`, otpCode);
                    return { success: true, email: email, otp: otpCode };
                } else {
                    console.log(`❌ [Context #${jobId}] OTP kodu alınamadı`);
                    return { success: false, error: 'OTP kodu alınamadı' };
                }
            } else {
                console.log(`❌ [Context #${jobId}] Kayıt isteği başarısız`);
                return { success: false, error: 'Kayıt isteği başarısız' };
            }

        } catch (error) {
            console.log(`❌ [Context #${jobId}] Üyelik hatası:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    // COOKIE BEKLEME DÖNGÜSÜ
    async waitForCookies(context, jobId, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const allCookies = await context.cookies(['https://hepsiburada.com']);
            
            if (allCookies.length >= CONFIG.MIN_COOKIE_COUNT) {
                console.log(`✅ [Context #${jobId}] GEREKLİ ${CONFIG.MIN_COOKIE_COUNT}+ COOKIE BULUNDU!`);
                return {
                    success: true,
                    attempts: attempts,
                    cookies: allCookies,
                    stats: {
                        total_cookies: allCookies.length,
                        hbus_cookies: allCookies.filter(c => c.name.includes('hbus_')).length
                    },
                    method: 'DIRECT_CONTEXT_COOKIE_COLLECTION'
                };
            } else {
                console.log(`   ⚠️ [Context #${jobId}] Yetersiz cookie: ${allCookies.length}/${CONFIG.MIN_COOKIE_COUNT}`);
            }
            
            const waitTime = 3000 + Math.random() * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const finalCookies = await context.cookies(['https://hepsiburada.com']);
        console.log(`❌ [Context #${jobId}] MAKSİMUM DENEME SAYISINA ULAŞILDI`);
        
        return {
            success: false,
            attempts: attempts,
            cookies: finalCookies,
            stats: {
                total_cookies: finalCookies.length,
                hbus_cookies: finalCookies.filter(c => c.name.includes('hbus_')).length
            },
            method: 'DIRECT_CONTEXT_COOKIE_COLLECTION'
        };
    }
    
    // BROWSER AYARLA
    async setBrowser(browserInstance) {
        this.browser = browserInstance;
    }
    
    // DURUM KONTROLÜ
    getStatus() {
        return {
            activeContexts: this.activeWorkers.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs.length,
            maxParallel: CONFIG.PARALLEL_CONTEXTS
        };
    }
    
    // TÜM İŞLERİ DURDUR
    async stopAll() {
        this.jobQueue = [];
        
        for (const [jobId, job] of this.activeWorkers.entries()) {
            job.status = 'cancelled';
            job.reject(new Error('İş iptal edildi'));
        }
        
        this.activeWorkers.clear();
        console.log('🛑 Tüm context işler durduruldu');
    }
}

// 🎯 PARALEL CONTEXT YÖNETİCİSİNİ BAŞLAT
const parallelCollector = new ParallelContextCollector();

// GLOBAL DEĞİŞKENLER
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0,
    parallel_jobs_completed: 0,
    registration_success: 0,
    registration_failed: 0
};

let activeBrowser = null;
let isShuttingDown = false;

// 🎯 ERROR HANDLERS
process.on('uncaughtException', async (error) => {
    console.log('🚨 UNCAUGHT EXCEPTION:', error);
    
    try {
        await parallelCollector.stopAll();
        if (activeBrowser) {
            await activeBrowser.close();
        }
    } catch (e) {
        console.log('❌ Emergency browser kapatma hatası:', e.message);
    }
    
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.log('🚨 UNHANDLED REJECTION:', reason);
    
    try {
        await parallelCollector.stopAll();
        if (activeBrowser) {
            await activeBrowser.close();
        }
    } catch (e) {
        console.log('❌ Unhandled rejection browser kapatma hatası:', e.message);
    }
});

process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM ALINDI - Graceful shutdown');
    isShuttingDown = true;
    
    try {
        await parallelCollector.stopAll();
        if (activeBrowser) {
            await activeBrowser.close();
        }
        process.exit(0);
    } catch (error) {
        console.log('❌ SIGTERM shutdown hatası:', error.message);
        process.exit(1);
    }
});

// 🎯 FINGERPRINT SCRİPT'İ
function getAdvancedFingerprintScript() {
    return `
    // Fingerprint spoofing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        return context;
    };

    // WebDriver masking
    Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    // Platform spoofing
    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

    // Languages spoofing
    Object.defineProperty(navigator, 'languages', {
        get: () => ['tr-TR', 'tr', 'en-US', 'en'],
    });
    `;
}

// 🎯 CHROME EXTENSION COOKIE FORMATI DÖNÜŞTÜRÜCÜ
function convertToChromeExtensionFormat(cookies) {
    return cookies.map(cookie => {
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
        
        delete chromeCookie.expires;
        return chromeCookie;
    });
}

function convertSameSiteForChrome(sameSite) {
    if (!sameSite) return 'no_restriction';
    const mapping = {
        'Lax': 'lax',
        'Strict': 'strict',
        'None': 'no_restriction'
    };
    return mapping[sameSite] || 'no_restriction';
}

function convertExpiresToChromeFormat(expires) {
    if (!expires) {
        return Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
    }
    const expiresDate = new Date(expires * 1000 || expires);
    return Math.floor(expiresDate.getTime() / 1000);
}

function generateUrlForCookie(cookie) {
    const protocol = cookie.secure ? 'https://' : 'http://';
    let domain = cookie.domain;
    if (domain.startsWith('.')) {
        domain = 'www' + domain;
    }
    return protocol + domain + (cookie.path || '/');
}

// 🎯 RASTGELE USER AGENT ÜRET
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 🎯 RASTGELE VIEWPORT ÜRET
function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// 🎯 FINGERPRINT KONFİGÜRASYONU OLUŞTUR
function createFingerprintConfig(fingerprintId) {
    return {
        contextOptions: {
            viewport: getRandomViewport(),
            userAgent: getRandomUserAgent(),
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        },
        fingerprintScript: getAdvancedFingerprintScript()
    };
}

// 🎯 PARALEL CONTEXT COOKIE TOPLAMA FONKSİYONU
async function getCookiesParallel() {
    if (isShuttingDown) {
        console.log('❌ Shutdown modunda - yeni işlem başlatılmıyor');
        return { error: 'Service shutting down' };
    }
    
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        // BROWSER AYARLARI
        browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=AutomationControlled',
                '--no-default-browser-check',
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
        
        console.log(`✅ Browser başlatıldı - ${CONFIG.PARALLEL_CONTEXTS} paralel context hazır`);
        
        // 🎯 TÜM FINGERPRINT'LERİ PARALEL İŞ OLARAK EKLE
        const jobPromises = [];
        
        for (let i = 1; i <= CONFIG.PARALLEL_CONTEXTS; i++) {
            const fingerprintConfig = createFingerprintConfig(i);
            console.log(`📦 Context iş #${i} kuyruğa eklendi`);
            const jobPromise = parallelCollector.addJob(fingerprintConfig);
            jobPromises.push(jobPromise);
        }
        
        // 🎯 TÜM İŞLERİN TAMAMLANMASINI BEKLE
        console.log(`⏳ ${CONFIG.PARALLEL_CONTEXTS} paralel context işin tamamlanması bekleniyor...`);
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
                        registration: result.value.registration,
                        collection_time: new Date(),
                        worker_info: result.value.worker_info
                    };
                    
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ CONTEXT İŞ #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie`);
                    
                    // 🎯 ÜYELİK İSTATİSTİKLERİ
                    if (result.value.registration) {
                        if (result.value.registration.success) {
                            collectionStats.registration_success++;
                            console.log(`🎉 ÜYELİK BAŞARILI: ${result.value.registration.email}`);
                        } else {
                            collectionStats.registration_failed++;
                        }
                    }
                } else {
                    console.log(`❌ CONTEXT İŞ #${result.value.jobId}: BAŞARISIZ - ${result.value.cookies.length} cookie`);
                }
            } else {
                console.log(`❌ CONTEXT İŞ #${index + 1}: HATA - ${result.reason.message}`);
            }
        });
        
        // 🎯 İSTATİSTİKLER
        const successfulCount = currentSuccessfulSets.length;
        const registrationCount = currentSuccessfulSets.filter(set => set.registration).length;
        const successfulRegistrationCount = currentSuccessfulSets.filter(set => set.registration && set.registration.success).length;
        
        console.log('\n📊 === PARALEL CONTEXT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı Context: ${successfulCount}`);
        console.log(`   Üyelik Başarılı: ${successfulRegistrationCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);
        console.log(`   Context Mod: ✅ SEKMESİZ`);
        
        // 🎯 SON COOKIE'LERİ GÜNCELLE
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            collectionStats.parallel_jobs_completed += successfulCount;
            
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            console.log('\n📋 YENİ BAŞARILI CONTEXT COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Context ${set.set_id}: ${set.stats.total_cookies} cookie`);
                if (set.registration && set.registration.success) {
                    console.log(`      🎉 ÜYELİK: ${set.registration.email}`);
                }
            });
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            successful_registrations: successfulRegistrationCount,
            success_rate: (successfulCount / allResults.length) * 100,
            cookie_sets: currentSuccessfulSets,
            parallel_config: {
                parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
                isolation: 'DIRECT_CONTEXT',
                worker_cleanup: 'AUTOMATIC',
                auto_registration: CONFIG.AUTO_REGISTRATION
            },
            timestamp: new Date().toISOString(),
            chrome_extension_compatible: true,
            context_mode: 'SEKMESIZ_DIRECT_CONTEXT'
        };

    } catch (error) {
        console.log('❌ PARALEL CONTEXT HATA:', error.message);
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
            console.log('✅ Browser context işlemler sonrası kapatıldı');
        }
    }
}

// ✅ EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'PARALEL CONTEXT COOKIE COLLECTOR + HEPŞİBURADA ÜYELİK - SEKMESİZ MOD',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_collection: CONFIG.AUTO_COLLECT_ENABLED,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + otomatik üyelik`, 
            '/last-cookies': 'Son alınan cookie\'leri göster',
            '/chrome-cookies': 'Sadece Chrome Extension formatında cookie\'ler',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster',
            '/parallel-status': 'Paralel context durumu'
        },
        mode: 'SEKMESIZ_DIRECT_CONTEXT',
        performance: 'DAHA HAFİF - DAHA HIZLI',
        last_collection: lastCollectionTime,
        successful_sets_count: lastCookies.filter(set => set.success).length
    });
});

// PARALEL COOKIE TOPLAMA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT COOKIE TOPLAMA ===`);
    const result = await getCookiesParallel();
    res.json(result);
});

// SON COOKIE'LER
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
            timestamp: new Date().toISOString()
        });
    }

    const result = {};
    
    result.last_updated = lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR');
    result.total_successful_sets = successfulSets.length;
    result.context_mode = 'SEKMESIZ_DIRECT_CONTEXT';
    result.chrome_extension_compatible = true;
    
    successfulSets.forEach(set => {
        result[`context${set.set_id}`] = {
            cookies: set.chrome_extension_cookies,
            registration: set.registration,
            stats: set.stats,
            collection_time: set.collection_time
        };
    });

    res.json(result);
});

// CHROME EXTENSION FORMATI
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
        chromeSets[`context${set.set_id}`] = set.chrome_extension_cookies;
    });

    res.json({
        chrome_extension_format: true,
        context_mode: 'SEKMESIZ_DIRECT_CONTEXT',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null
    });
});

// PARALEL DURUM
app.get('/parallel-status', (req, res) => {
    res.json({
        parallel_engine: 'DIRECT_CONTEXT_MODE',
        ...parallelCollector.getStatus(),
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION
        },
        features: {
            direct_context: '✅ SEKMESİZ CONTEXT MODE',
            independent_fingerprint: '✅ HER CONTEXT\'TE FARKLI FINGERPRINT',
            safe_cleanup: '✅ HER İŞ SONUNDA CONTEXT TEMİZLİĞİ',
            auto_registration: CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'
        }
    });
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    const healthText = `
🚀 PARALEL CONTEXT COOKIE COLLECTOR - SEKMESİZ MOD
==================================================

🔄 PARALEL DURUM:
├── Aktif Context'ler: ${parallelCollector.getStatus().activeContexts}
├── Kuyruktaki İşler: ${parallelCollector.getStatus().queuedJobs}
├── Tamamlanan İşler: ${parallelCollector.getStatus().completedJobs}
├── Maksimum Paralel: ${CONFIG.PARALLEL_CONTEXTS}
└── Mod: ✅ SEKMESİZ DIRECT CONTEXT

📊 COOKIE DURUMU:
├── Toplam Context Set: ${lastCookies.length}
├── Başarılı Set: ${lastCookies.filter(set => set.success).length}
├── Son Toplama: ${lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : 'Henüz yok'}
└── Başarılı Üyelikler: ${collectionStats.registration_success}

🎯 SİSTEM:
├── Çalışma Süresi: ${Math.round(process.uptime())}s
├── Node.js Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
└── Context Mod: SEKMESİZ

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.PARALLEL_CONTEXTS} paralel context ile topla
├── /last-cookies - Son cookie'ler
├── /chrome-cookies - Chrome formatı
├── /parallel-status - Paralel durum
├── /health - Bu sayfa
└── /stats - İstatistikler

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
==================================================
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
        current_context_sets: {
            total_sets: lastCookies.length,
            successful_sets: lastCookies.filter(set => set.success).length,
            successful_registrations: lastCookies.filter(set => set.registration && set.registration.success).length
        },
        context_mode: {
            type: 'SEKMESIZ_DIRECT_CONTEXT',
            performance: 'DAHA HAFİF - DAHA HIZLI',
            memory_usage: 'OPTIMIZE',
            isolation: 'FULL_CONTEXT_ISOLATION'
        }
    });
});

// 🎯 OTOMATİK CONTEXT TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA AKTİF');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT TOPLAMA ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookiesParallel();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK CONTEXT: ${result.successful_attempts}/${CONFIG.PARALLEL_CONTEXTS} başarılı`);
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 PARALEL CONTEXT COOKIE COLLECTOR - SEKMESİZ MOD');
    console.log('🚀 ===================================');
    
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log(`📍 Mod: ✅ SEKMESİZ DIRECT CONTEXT`);
    console.log(`📍 /collect - ${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla`);
    console.log(`📍 /last-cookies - Son cookie'leri göster`);
    console.log(`📍 /chrome-cookies - Chrome formatında cookie'ler`);
    console.log(`📍 /parallel-status - Paralel context durumu`);
    console.log(`🎯 ${CONFIG.MIN_COOKIE_COUNT}+ cookie olan context'ler BAŞARILI sayılır`);
    console.log(`🎯 Otomatik Üyelik: ${CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'}`);
    console.log('🔒 CONTEXT MOD ÖZELLİKLERİ:');
    console.log('   ├── Sekmesiz: ✅ SADECE CONTEXT');
    console.log('   ├── Daha Hafif: ✅ AZ MEMORY');
    console.log('   ├── Daha Hızlı: ✅ AZ OVERHEAD');
    console.log('   ├── Tam İzolasyon: ✅ HER CONTEXT AYRI');
    console.log('   └── Otomatik Temizlik: ✅ CONTEXT KAPATMA');
    console.log('🔄 İşlem Akışı: 🌐 Context Aç → 📄 Sayfa Oluştur → 🍪 Cookie Topla → 🧹 Context Kapat');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.PARALLEL_CONTEXTS} paralel context`);
    }
    
    console.log('====================================\n');
});
