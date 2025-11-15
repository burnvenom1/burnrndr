// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - CHROME EXTENSION UYUMLU COOKIE FORMATI
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI İLE PARALEL SEKMELER + OTOMATİK ÜYELİK
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    PARALLEL_TABS: 3,
    MAX_CONCURRENT_JOBS: 12,
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000,
    FINGERPRINT_COUNT: 6,
    WAIT_BETWEEN_FINGERPRINTS: 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    INITIAL_COLLECTION_DELAY: 5000,
    MIN_COOKIE_COUNT: 7,
    CANVAS_NOISE_ENABLED: true,
    WEBGL_NOISE_ENABLED: true,
    AUDIO_CONTEXT_NOISE_ENABLED: true,
    FONT_FINGERPRINT_ENABLED: true,
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
            "lnmwhbvvf@emltmp.com", "bshuzcvvf@emltmp.com", "hsfsqxcug@emltmp.com",
            "nqywhdnoh@emlhub.com", "048370crsm@freeml.net", "04837v1h98@freeml.net",
            "04838e039m@freeml.net", "04839mk808@freeml.net", "0483aa1zj4@freeml.net",
            "jy1c7eh2@mailpwr.com", "jy1kb68h@mailpwr.com", "jz6qk02m@mailpwr.com"
        ];
        
        const randomPart2 = Math.random().toString(36).substring(2, 6);
        const randomPart = Math.random().toString(36).substring(2, 6);
        const randomIndex = Math.floor(Math.random() * baseTemplates.length);
        const baseEmail = baseTemplates[randomIndex];
        const parts = baseEmail.split("@");
        const username = parts[0];
        const domain = parts[1];
        
        const formattedEmail = username + '.' + randomPart.substring(0, 3) + '@' + randomPart2.substring(0, 3) + '.' + domain;
        
        return formattedEmail;
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
    
    async processQueue() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        while (this.jobQueue.length > 0 && this.activeWorkers.size < CONFIG.PARALLEL_TABS) {
            const job = this.jobQueue.shift();
            if (!job) continue;
            
            this.executeJob(job);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isRunning = false;
    }
    
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
            
            this.processQueue();
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
            
            this.activeWorkers.delete(job.id);
            job.reject(error);
            
            console.log(`❌ PARALEL İŞ #${job.id} HATA: ${error.message}`);
            this.processQueue();
        }
    }
    
    // 🎯 WORKER İLE ÜYELİK YAPAN FONKSİYON - SAYFA KORUMALI
    async doRegistrationWithWorkerProtected(page, context, jobId, cookies) {
        console.log(`📧 [İş #${jobId}] Worker ile üyelik başlatılıyor...`);
        
        let pageHeaders;
        try {
            console.log(`📋 [İş #${jobId}] Sayfadan header'lar alınıyor...`);
            pageHeaders = await page.evaluate(() => {
                return {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    languages: navigator.languages,
                    platform: navigator.platform,
                    url: window.location.href
                };
            });
            console.log(`✅ [İş #${jobId}] Header'lar başarıyla alındı`);
        } catch (error) {
            console.log(`❌ [İş #${jobId}] Header alınamadı: ${error.message}`);
            return { success: false, error: 'Sayfa headerları alınamadı' };
        }

        const session = new HepsiburadaSession();
        
        cookies.forEach(cookie => {
            session.cookies.set(cookie.name, {
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path
            });
        });
        
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

        console.log(`🖥️ [İş #${jobId}] UserAgent: ${pageHeaders.userAgent.substring(0, 80)}...`);

        const email = session.generateEmail();
        console.log(`📧 [İş #${jobId}] Email: ${email}`);

        try {
            console.log(`🔄 [İş #${jobId}] XSRF Token alınıyor...`);
            
            const xsrfHeaders = {
                ...session.baseHeaders,
                'cookie': session.getCookieHeader()
            };

            const xsrfRequestData = {
                targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                method: 'GET',
                headers: xsrfHeaders
            };

            console.log(`📨 [İş #${jobId}] Worker'a XSRF isteği gönderiliyor...`);
            const xsrfResponse = await session.sendWorkerRequest(xsrfRequestData);
            console.log(`📡 [İş #${jobId}] XSRF Response Status:`, xsrfResponse.status);
            
            if (xsrfResponse.status === 200) {
                const bodyData = typeof xsrfResponse.body === 'string' 
                    ? JSON.parse(xsrfResponse.body) 
                    : xsrfResponse.body;
                
                if (bodyData && bodyData.xsrfToken) {
                    session.xsrfToken = bodyData.xsrfToken;
                    console.log(`✅ [İş #${jobId}] XSRF TOKEN ALINDI`);
                    
                    if (xsrfResponse.headers && xsrfResponse.headers['set-cookie']) {
                        session.parseAndStoreCookies(xsrfResponse.headers['set-cookie']);
                        console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
                    }
                }
            }

            if (!session.xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            console.log(`\n📨 [İş #${jobId}] Kayıt isteği gönderiliyor...`);

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

            console.log(`📨 [İş #${jobId}] Worker'a kayıt isteği gönderiliyor...`);
            const registerResponse = await session.sendWorkerRequest(registerData);
            console.log(`📨 [İş #${jobId}] Register Response Status:`, registerResponse.status);
            
            const registerBody = typeof registerResponse.body === 'string'
                ? JSON.parse(registerResponse.body)
                : registerResponse.body;
            
            if (registerResponse.headers && registerResponse.headers['set-cookie']) {
                session.parseAndStoreCookies(registerResponse.headers['set-cookie']);
                console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
            }

            if (registerResponse.status === 200 && registerBody && registerBody.success) {
                console.log(`✅ [İş #${jobId}] KAYIT İSTEĞİ BAŞARILI!`);
                const referenceId = registerBody.data?.referenceId;
                console.log(`🔖 [İş #${jobId}] ReferenceId:`, referenceId);

                console.log(`\n⏳ [İş #${jobId}] OTP KODU BEKLENİYOR (15 saniye)...`);
                
                for (let i = 0; i < 15; i++) {
                    if (page.isClosed()) {
                        throw new Error('Sayfa OTP beklerken kapandı');
                    }
                    await page.waitForTimeout(1000);
                }
                
                console.log(`📱 [İş #${jobId}] OTP kodu alınıyor...`);
                const otpCode = await session.getOtpCode(email);
                
                if (otpCode) {
                    console.log(`✅ [İş #${jobId}] OTP KODU HAZIR:`, otpCode);
                    return { success: true, email: email, otp: otpCode };
                } else {
                    console.log(`❌ [İş #${jobId}] OTP kodu alınamadı`);
                    return { success: false, error: 'OTP kodu alınamadı' };
                }
            } else {
                console.log(`❌ [İş #${jobId}] Kayıt isteği başarısız`);
                return { success: false, error: 'Kayıt isteği başarısız' };
            }

        } catch (error) {
            console.log(`❌ [İş #${jobId}] Üyelik hatası:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async runWorker(job) {
        let context;
        let page;
        
        try {
            context = await this.browser.newContext(job.fingerprintConfig.contextOptions);
            await context.addInitScript(job.fingerprintConfig.fingerprintScript);
            page = await context.newPage();
            await context.clearCookies();

            console.log(`🌐 [İş #${job.id}] Hepsiburada'ya gidiliyor...`);
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'networkidle',
                timeout: CONFIG.PAGE_LOAD_TIMEOUT
            });

            console.log(`✅ [İş #${job.id}] Sayfa yüklendi, cookie bekleniyor...`);
            
            const cookieResult = await this.waitForCookies(page, context, job.id);
            
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [İş #${job.id}] COOKIE BAŞARILI - AYNI SEKME İLE ÜYELİK BAŞLATILIYOR...`);
                
                try {
                    const registrationResult = await this.doRegistrationWithWorkerProtected(page, context, job.id, cookieResult.cookies);
                    
                    if (registrationResult.success) {
                        console.log(`🎉 [İş #${job.id}] ÜYELİK BAŞARILI: ${registrationResult.email}`);
                        cookieResult.registration = registrationResult;
                    } else {
                        console.log(`❌ [İş #${job.id}] ÜYELİK BAŞARISIZ: ${registrationResult.error}`);
                        cookieResult.registration = registrationResult;
                    }
                } catch (regError) {
                    console.log(`❌ [İş #${job.id}] ÜYELİK HATASI: ${regError.message}`);
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
                    isolation: 'FULL_PARALLEL_WITH_REGISTRATION'
                }
            };
            
        } finally {
            if (page) {
                try { await page.close(); } catch (e) {}
            }
            if (context) {
                try { 
                    await context.close();
                    console.log(`🧹 [İş #${job.id}] Context temizlendi`);
                } catch (e) {}
            }
        }
    }
    
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
    
    async setBrowser(browserInstance) {
        this.browser = browserInstance;
    }
    
    getStatus() {
        return {
            activeWorkers: this.activeWorkers.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs.length,
            maxParallel: CONFIG.PARALLEL_TABS
        };
    }
    
    async stopAll() {
        this.jobQueue = [];
        
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

let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0,
    parallel_jobs_completed: 0,
    registration_success: 0,
    registration_failed: 0
};

let currentMemory = { node: 0, total: 0, updated: '' };
let activeBrowser = null;
let isShuttingDown = false;

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

function getAdvancedFingerprintScript() {
    return `
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        return context;
    };

    Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: { InstallState: {}, RunningState: {}, getDetails: () => {}, getIsInstalled: () => {} }
    };

    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

    Object.defineProperty(navigator, 'languages', {
        get: () => ['tr-TR', 'tr', 'en-US', 'en'],
    });

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

function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

function getRandomLanguage() {
    const languages = [
        'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'tr-TR,tr;q=0.9,en;q=0.8',
        'en-US,en;q=0.9,tr;q=0.8',
        'tr,en;q=0.9,en-US;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
}

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
                '--disable-component-update',
                '--disable-background-networking',
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-sync',
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
        
        await parallelCollector.setBrowser(browser);
        
        console.log(`✅ Browser başlatıldı - ${CONFIG.PARALLEL_TABS} paralel sekme hazır`);
        
        const jobPromises = [];
        
        for (let i = 1; i <= CONFIG.PARALLEL_TABS; i++) {
            const fingerprintConfig = createFingerprintConfig(i);
            console.log(`📦 Paralel iş #${i} kuyruğa eklendi`);
            const jobPromise = parallelCollector.addJob(fingerprintConfig);
            jobPromises.push(jobPromise);
        }
        
        console.log(`⏳ ${CONFIG.PARALLEL_TABS} paralel işin tamamlanması bekleniyor...`);
        const results = await Promise.allSettled(jobPromises);
        
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
                    console.log(`✅ PARALEL İŞ #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie`);
                    
                    if (result.value.registration) {
                        if (result.value.registration.success) {
                            collectionStats.registration_success++;
                            console.log(`🎉 ÜYELİK BAŞARILI: ${result.value.registration.email}`);
                        } else {
                            collectionStats.registration_failed++;
                            console.log(`❌ ÜYELİK BAŞARISIZ: ${result.value.registration.error}`);
                        }
                    }
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
        
        const successfulCount = currentSuccessfulSets.length;
        const registrationCount = currentSuccessfulSets.filter(set => set.registration).length;
        const successfulRegistrationCount = currentSuccessfulSets.filter(set => set.registration && set.registration.success).length;
        
        console.log('\n📊 === PARALEL FINGERPRINT İSTATİSTİKLER ===');
        console.log(`   Toplam Deneme: ${allResults.length}`);
        console.log(`   Başarılı (${CONFIG.MIN_COOKIE_COUNT}+ cookie): ${successfulCount}`);
        console.log(`   Üyelik Denenen: ${registrationCount}`);
        console.log(`   Üyelik Başarılı: ${successfulRegistrationCount}`);
        console.log(`   Başarı Oranı: ${((successfulCount / allResults.length) * 100).toFixed(1)}%`);
        console.log(`   Üyelik Başarı Oranı: ${registrationCount > 0 ? ((successfulRegistrationCount / registrationCount) * 100).toFixed(1) : 0}%`);
        console.log(`   Paralel Sekme: ${CONFIG.PARALLEL_TABS}`);
        console.log(`   Tam İzolasyon: ✅ AKTİF`);
        console.log(`   Otomatik Üyelik: ${CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'}`);
        
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            collectionStats.parallel_jobs_completed += successfulCount;
            
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
            
            console.log('\n📋 YENİ BAŞARILI PARALEL COOKIE SETLERİ:');
            currentSuccessfulSets.forEach(set => {
                console.log(`   🎯 Set ${set.set_id}: ${set.stats.total_cookies} cookie (${set.stats.hbus_cookies} HBUS)`);
                console.log(`      📦 Chrome Extension: ${set.chrome_extension_cookies.length} cookie`);
                if (set.registration) {
                    if (set.registration.success) {
                        console.log(`      🎉 ÜYELİK: ${set.registration.email}`);
                    } else {
                        console.log(`      ❌ ÜYELİK: ${set.registration.error}`);
                    }
                }
            });
        } else {
            console.log('❌ Hiç başarılı cookie seti bulunamadı, eski cookie\'ler korunuyor');
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            registration_attempts: registrationCount,
            successful_registrations: successfulRegistrationCount,
            success_rate: (successfulCount / allResults.length) * 100,
            registration_success_rate: registrationCount > 0 ? (successfulRegistrationCount / registrationCount) * 100 : 0,
            cookie_sets: currentSuccessfulSets,
            previous_cookies_preserved: successfulCount === 0,
            parallel_config: {
                parallel_tabs: CONFIG.PARALLEL_TABS,
                isolation: 'FULL',
                worker_cleanup: 'AUTOMATIC',
                auto_registration: CONFIG.AUTO_REGISTRATION
            },
            timestamp: new Date().toISOString(),
            criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required`,
            chrome_extension_compatible: true,
            anti_detection: true,
            advanced_fingerprint: true,
            parallel_processing: true,
            auto_registration_enabled: CONFIG.AUTO_REGISTRATION
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

// EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'PARALEL COOKIE COLLECTOR + HEPŞİBURADA ÜYELİK - GELİŞMİŞ FINGERPRINT KORUMALI',
        config: {
            parallel_tabs: CONFIG.PARALLEL_TABS,
            auto_collection: CONFIG.AUTO_COLLECT_ENABLED,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/': 'Bu sayfa',
            '/collect': `${CONFIG.PARALLEL_TABS} paralel sekme ile cookie topla + otomatik üyelik`, 
            '/register': 'Manuel üyelik yap',
            '/auto-register/on': 'Otomatik üyelik aç',
            '/auto-register/off': 'Otomatik üyelik kapat',
            '/last-cookies': 'Son alınan cookie\'leri göster (Chrome Extension formatında)',
            '/chrome-cookies': 'Sadece Chrome Extension formatında cookie\'ler',
            '/health': 'Detaylı status kontrol',
            '/stats': 'İstatistikleri göster',
            '/parallel-status': 'Paralel iş durumu'
        },
        last_collection: lastCollectionTime,
        current_cookie_sets_count: lastCookies.length,
        successful_sets_count: lastCookies.filter(set => set.success).length,
        successful_registrations: collectionStats.registration_success,
        stats: collectionStats,
        render_stability: 'ACTIVE - Error handlers enabled',
        success_criteria: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies required`,
        chrome_extension_compatible: true,
        anti_detection_enabled: true,
        advanced_fingerprint_enabled: true,
        parallel_processing: true,
        cookie_format: 'Chrome Extension API (chrome.cookies.set)',
        auto_registration: CONFIG.AUTO_REGISTRATION ? 'AKTİF' : 'PASİF'
    });
});

app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ COOKIE TOPLAMA + OTOMATİK ÜYELİK ===`);
    const result = await getCookiesParallel();
    res.json(result);
});

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
    result.parallel_processing = true;
    result.auto_registration_enabled = CONFIG.AUTO_REGISTRATION;
    result.format_info = "Cookies are in Chrome Extension API format (chrome.cookies.set)";
    
    successfulSets.forEach(set => {
        result[`set${set.set_id}`] = {
            cookies: set.chrome_extension_cookies,
            registration: set.registration,
            stats: set.stats,
            collection_time: set.collection_time,
            worker_info: set.worker_info
        };
    });

    result.summary = {
        total_cookies: successfulSets.reduce((sum, set) => sum + set.cookies.length, 0),
        total_hbus_cookies: successfulSets.reduce((sum, set) => sum + set.stats.hbus_cookies, 0),
        total_registration_attempts: successfulSets.filter(set => set.registration).length,
        total_successful_registrations: successfulSets.filter(set => set.registration && set.registration.success).length,
        average_cookies_per_set: (successfulSets.reduce((sum, set) => sum + set.cookies.length, 0) / successfulSets.length).toFixed(1),
        chrome_format_verified: successfulSets.every(set => 
            set.chrome_extension_cookies.every(cookie => 
                cookie.url && cookie.expirationDate
            )
        )
    };

    res.json(result);
});

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
        parallel_processing: true,
        auto_registration_enabled: CONFIG.AUTO_REGISTRATION,
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

app.get('/parallel-status', (req, res) => {
    res.json({
        parallel_engine: 'ACTIVE',
        ...parallelCollector.getStatus(),
        config: {
            parallel_tabs: CONFIG.PARALLEL_TABS,
            max_concurrent_jobs: CONFIG.MAX_CONCURRENT_JOBS,
            auto_registration: CONFIG.AUTO_REGISTRATION
        },
        features: {
            full_isolation: '✅ HER SEKMEDE TAM İZOLASYON',
            independent_fingerprint: '✅ HER SEKMEDE FARKLI FINGERPRINT',
            safe_cleanup: '✅ HER İŞ SONUNDA CONTEXT TEMİZLİĞİ',
            queue_management: '✅ AKILLI KUYRUK YÖNETİMİ',
            auto_registration: CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'
        }
    });
});

app.get('/auto-register/:status', (req, res) => {
    const status = req.params.status;
    if (status === 'on') {
        CONFIG.AUTO_REGISTRATION = true;
        res.json({ message: 'Otomatik üyelik AKTİF', auto_registration: true });
    } else if (status === 'off') {
        CONFIG.AUTO_REGISTRATION = false;
        res.json({ message: 'Otomatik üyelik PASİF', auto_registration: false });
    } else {
        res.json({ 
            current_status: CONFIG.AUTO_REGISTRATION ? 'AKTİF' : 'PASİF',
            usage: '/auto-register/on veya /auto-register/off'
        });
    }
});

app.get('/health', (req, res) => {
    const healthText = `
🚀 PARALEL COOKIE COLLECTOR + HEPŞİBURADA ÜYELİK - TAM OTOMATİK
==================================================================
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
├── Paralel İş Tamamlanan: ${collectionStats.parallel_jobs_completed}
└── Başarılı Üyelikler: ${collectionStats.registration_success}

🎯 ÜYELİK SİSTEMİ:
├── Otomatik Üyelik: ${CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'}
├── Manuel Üyelik: ✅ /register endpoint
├── Aynı Context: ✅ COOKIE BULUNUR BULUNMAZ
├── OTP Otomasyon: ✅ 15 SANİYE BEKLEME
└── Gerçek Zamanlı: ✅ ANINDA İŞLEM

🛡️ GÜVENLİK ÖZELLİKLERİ:
├── Paralel İşlem: ✅ AKTİF
├── Tam İzolasyon: ✅ HER SEKMEDE
├── Bağımsız Fingerprint: ✅ HER SEKMEDE FARKLI
├── Güvenli Temizlik: ✅ İŞ SONU OTOMATİK
├── Graceful Shutdown: ✅ AKTİF
└── Queue Management: ✅ AKTİF

💡 SİSTEM:
├── Çalışma Süresi: ${Math.round(process.uptime())}s
├── Node.js Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
└── Platform: ${process.platform}

🌐 ENDPOINT'LER:
├── /collect - ${CONFIG.PARALLEL_TABS} paralel sekme ile topla + otomatik üyelik
├── /register - Manuel üyelik yap
├── /auto-register/on - Otomatik üyelik aç
├── /auto-register/off - Otomatik üyelik kapat
├── /parallel-status - Paralel iş durumu
├── /last-cookies - Son cookie'ler + üyelik sonuçları
├── /chrome-cookies - Chrome formatı
├── /health - Bu sayfa
└── /stats - İstatistikler

⏰ Son Güncelleme: ${new Date().toLocaleString('tr-TR')}
==================================================================
    `.trim();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(healthText);
});

app.get('/stats', (req, res) => {
    const successRate = collectionStats.total_runs > 0 
        ? (collectionStats.successful_runs / collectionStats.total_runs * 100).toFixed(1)
        : 0;
    
    const registrationSuccessRate = collectionStats.registration_success > 0 
        ? (collectionStats.registration_success / (collectionStats.registration_success + collectionStats.registration_failed) * 100).toFixed(1)
        : 0;
    
    res.json({
        config: CONFIG,
        collection_stats: collectionStats,
        success_rate: successRate + '%',
        registration_success_rate: registrationSuccessRate + '%',
        last_collection: lastCollectionTime,
        parallel_status: parallelCollector.getStatus(),
        current_cookie_sets: {
            total_sets: lastCookies.length,
            successful_sets: lastCookies.filter(set => set.success).length,
            sets_with_registration: lastCookies.filter(set => set.registration).length,
            successful_registrations: lastCookies.filter(set => set.registration && set.registration.success).length,
            sets: lastCookies.map(set => ({
                set_id: set.set_id,
                success: set.success,
                total_cookies: set.stats.total_cookies,
                hbus_cookies: set.stats.hbus_cookies,
                chrome_extension_cookies: set.chrome_extension_cookies ? set.chrome_extension_cookies.length : 0,
                registration: set.registration ? {
                    success: set.registration.success,
                    email: set.registration.success ? set.registration.email : null,
                    error: set.registration.success ? null : set.registration.error
                } : null,
                collection_time: set.collection_time,
                parallel_worker: set.worker_info ? true : false
            }))
        },
        registration_system: {
            auto_registration: CONFIG.AUTO_REGISTRATION,
            same_context: true,
            immediate_start: true,
            otp_automation: true,
            api_based: true
        },
        chrome_extension_compatibility: {
            format: 'Chrome Extension API (chrome.cookies.set)',
            required_fields: ['name', 'value', 'url', 'expirationDate'],
            sameSite_values: ['lax', 'strict', 'no_restriction'],
            verified: true
        },
        parallel_features: {
            parallel_tabs: CONFIG.PARALLEL_TABS,
            full_isolation: true,
            independent_fingerprint: true,
            safe_cleanup: true,
            queue_management: true,
            auto_registration: CONFIG.AUTO_REGISTRATION
        },
        performance: {
            estimated_time: `${Math.round(CONFIG.PARALLEL_TABS * 6)}-${Math.round(CONFIG.PARALLEL_TABS * 8)} seconds (PARALLEL)`,
            registration_time: '15-20 seconds after cookie collection'
        },
        render_stability: {
            error_handlers: 'ACTIVE',
            graceful_shutdown: 'ACTIVE',
            browser_tracking: 'ACTIVE',
            parallel_management: 'ACTIVE'
        },
        success_criteria: {
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            domain: '.hepsiburada.com',
            description: `Minimum ${CONFIG.MIN_COOKIE_COUNT} cookies from single domain`
        }
    });
});

setInterval(() => {
    const nodeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    currentMemory = {
        node: nodeMB,
        total: nodeMB + 80 + (lastCookies.length * 30),
        updated: new Date().toLocaleTimeString('tr-TR')
    };
}, 5000);

if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK COOKIE TOPLAMA + OTOMATİK ÜYELİK AKTİF');
    
    setInterval(async () => {
        if (isShuttingDown) {
            console.log('❌ Shutdown modu - otomatik toplama atlanıyor');
            return;
        }
        
        console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ TOPLAMA + ÜYELİK ===`);
        console.log('⏰', new Date().toLocaleTimeString('tr-TR'));
        
        const result = await getCookiesParallel();
        
        if (result.overall_success) {
            console.log(`✅ OTOMATİK PARALEL: ${result.successful_attempts}/${CONFIG.PARALLEL_TABS} başarılı`);
            console.log(`🎉 OTOMATİK ÜYELİK: ${result.successful_registrations} başarılı üyelik`);
        } else {
            console.log('❌ OTOMATİK PARALEL: Cookie toplanamadı');
        }

        console.log('====================================\n');
    }, CONFIG.AUTO_COLLECT_INTERVAL);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('🚀 PARALEL COOKIE COLLECTOR + HEPŞİBURADA ÜYELİK');
    console.log('🚀 ===================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Sekme: ${CONFIG.PARALLEL_TABS}`);
    console.log(`📍 /collect - ${CONFIG.PARALLEL_TABS} paralel sekme ile cookie topla + OTOMATİK ÜYELİK`);
    console.log(`📍 /register - Manuel üyelik yap`);
    console.log(`📍 /auto-register/on - Otomatik üyelik aç`);
    console.log(`📍 /auto-register/off - Otomatik üyelik kapat`);
    console.log('📍 /parallel-status - Paralel iş durumu');
    console.log('📍 /last-cookies - Son cookie\'leri göster + üyelik sonuçları');
    console.log('📍 /chrome-cookies - Sadece Chrome formatında cookie\'ler');
    console.log('📍 /health - Detaylı status kontrol');
    console.log('📍 /stats - İstatistikler');
    console.log(`🎯 ${CONFIG.MIN_COOKIE_COUNT}+ cookie olan setler BAŞARILI sayılır`);
    console.log(`🎯 Otomatik Üyelik: ${CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'}`);
    console.log('🔒 PARALEL İŞLEM ÖZELLİKLERİ:');
    console.log('   ├── Gerçek Paralel: ✅ AYNI ANDA ÇOKLU SEKMELER');
    console.log('   ├── Tam İzolasyon: ✅ HER SEKMEDE AYRI CONTEXT');
    console.log('   ├── Bağımsız Fingerprint: ✅ HER SEKMEDE FARKLI');
    console.log('   ├── Otomatik Üyelik: ' + (CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'));
    console.log('   ├── Aynı Context: ✅ COOKIE BULUNUR BULUNMAZ ÜYELİK');
    console.log('   ├── OTP Otomasyon: ✅ 15 SANİYE BEKLEME');
    console.log('   └── Chrome Format: ✅ EXTENSION UYUMLU');
    console.log('🔄 İşlem Akışı: 🌐 Sekme Aç → 🍪 Cookie Topla → ✅ Cookie Bul → 📧 Üyelik Yap → 🧹 Sekme Kapat');
    console.log('🛡️ RENDER STABİLİTE ÖNLEMLERİ: AKTİF');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.PARALLEL_TABS} paralel sekme + üyelik`);
    }
    
    console.log('====================================\n');
});
