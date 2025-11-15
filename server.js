// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - TAM OTOMATİK HEPŞİBURADA ÜYELİK SİSTEMİ
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI + TAM OTP & KAYIT OTOMASYONU
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    PARALLEL_CONTEXTS: 3,
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 3 * 60 * 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    MIN_COOKIE_COUNT: 7,
    AUTO_REGISTRATION: true,
    OTP_WAIT_TIME: 25000, // 25 saniye OTP bekleme
    MAX_REGISTRATION_ATTEMPTS: 2
};

// 🎯 TAM OTOMATİK HEPŞİBURADA ÜYELİK SİSTEMİ
class HepsiburadaSession {
    constructor() {
        this.cookies = new Map();
        this.xsrfToken = null;
        this.baseHeaders = null;
        this.email = null;
        this.referenceId = null;
        this.requestId = null;
    }

    getCookieHeader() {
        const cookieArray = Array.from(this.cookies.values());
        return cookieArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
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
            } catch (error) {}
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
        const randomPart = Math.random().toString(36).substring(2, 8);
        const randomIndex = Math.floor(Math.random() * baseTemplates.length);
        const baseEmail = baseTemplates[randomIndex];
        const parts = baseEmail.split("@");
        return parts[0] + '.' + randomPart + '@' + parts[1];
    }

    async getOtpCode(email, maxAttempts = 10) {
        console.log(`📱 OTP kodu bekleniyor: ${email}`);
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const otpUrl = `https://script.google.com/macros/s/AKfycbxvTJG2ou3TGgCv2PHaaFjw8-dpRkxwnuJuJHZ6CXAVCo7jRXvm_Je5c370uGundLo3KQ/exec?email=${encodeURIComponent(email)}&mode=0`;
                const response = await fetch(otpUrl);
                const otpText = await response.text();
                
                console.log(`📨 OTP API Response (Attempt ${attempt}):`, otpText);
                
                // Çeşitli OTP formatlarını kontrol et
                const match = otpText.match(/\b\d{6}\b/);
                if (match) {
                    console.log(`✅ OTP KODU BULUNDU: ${match[0]}`);
                    return match[0];
                }
                
                if (/^\d{6}$/.test(otpText.trim())) {
                    console.log(`✅ OTP KODU BULUNDU: ${otpText.trim()}`);
                    return otpText.trim();
                }
                
                // 5 saniye bekle
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                console.log(`❌ OTP deneme ${attempt} hatası:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        console.log('❌ OTP kodu alınamadı');
        return null;
    }

    // 🎯 TAM KAYIT SÜRECİ - TÜM ADIMLAR
    async completeRegistration(pageHeaders) {
        try {
            console.log('🚀 TAM KAYIT SÜRECİ BAŞLATILIYOR...');
            
            // 🎯 1. HEADER AYARLARI
            this.baseHeaders = {
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

            // 🎯 2. EMAIL OLUŞTUR
            this.email = this.generateEmail();
            console.log(`📧 Email oluşturuldu: ${this.email}`);

            // 🎯 3. XSRF TOKEN AL
            console.log('🔄 XSRF Token alınıyor...');
            const xsrfToken = await this.getXsrfToken();
            if (!xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            // 🎯 4. KAYIT İSTEĞİ GÖNDER
            console.log('📨 Kayıt isteği gönderiliyor...');
            const registerResult = await this.sendRegisterRequest(xsrfToken);
            if (!registerResult.success) {
                throw new Error('Kayıt isteği başarısız');
            }

            this.referenceId = registerResult.referenceId;
            console.log(`✅ Kayıt isteği başarılı - ReferenceId: ${this.referenceId}`);

            // 🎯 5. OTP KODU BEKLE VE AL
            console.log(`⏳ OTP kodu bekleniyor (${CONFIG.OTP_WAIT_TIME/1000} saniye)...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.OTP_WAIT_TIME));

            console.log('📱 OTP kodu alınıyor...');
            const otpCode = await this.getOtpCode(this.email);
            if (!otpCode) {
                throw new Error('OTP kodu alınamadı');
            }

            console.log(`✅ OTP kodu alındı: ${otpCode}`);

            // 🎯 6. 2. XSRF TOKEN AL
            console.log('🔄 2. XSRF Token alınıyor...');
            const xsrfToken2 = await this.getXsrfToken();
            if (!xsrfToken2) {
                throw new Error('2. XSRF Token alınamadı');
            }

            // 🎯 7. OTP DOĞRULAMA
            console.log('📨 OTP doğrulama gönderiliyor...');
            const otpVerifyResult = await this.verifyOtp(xsrfToken2, otpCode);
            if (!otpVerifyResult.success) {
                throw new Error('OTP doğrulama başarısız');
            }

            this.requestId = otpVerifyResult.requestId;
            console.log(`✅ OTP doğrulama başarılı - RequestId: ${this.requestId}`);

            // 🎯 8. 3. XSRF TOKEN AL
            console.log('🔄 3. XSRF Token alınıyor...');
            const xsrfToken3 = await this.getXsrfToken();
            if (!xsrfToken3) {
                throw new Error('3. XSRF Token alınamadı');
            }

            // 🎯 9. KAYIT TAMAMLAMA
            console.log('📨 Kayıt tamamlanıyor...');
            const completeResult = await this.completeRegistrationRequest(xsrfToken3);
            if (!completeResult.success) {
                throw new Error('Kayıt tamamlama başarısız');
            }

            console.log('🎉 🎉 🎉 KAYIT BAŞARIYLA TAMAMLANDI! 🎉 🎉 🎉');
            return {
                success: true,
                email: this.email,
                accessToken: completeResult.accessToken,
                referenceId: this.referenceId,
                requestId: this.requestId
            };

        } catch (error) {
            console.log('❌ Kayıt sürecinde hata:', error.message);
            return {
                success: false,
                error: error.message,
                email: this.email
            };
        }
    }

    async getXsrfToken() {
        const xsrfHeaders = {
            ...this.baseHeaders,
            'cookie': this.getCookieHeader()
        };

        const xsrfRequestData = {
            targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
            method: 'GET',
            headers: xsrfHeaders
        };

        const response = await this.sendWorkerRequest(xsrfRequestData);
        
        if (response.status === 200) {
            const bodyData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
            if (bodyData && bodyData.xsrfToken) {
                if (response.headers && response.headers['set-cookie']) {
                    this.parseAndStoreCookies(response.headers['set-cookie']);
                }
                return bodyData.xsrfToken;
            }
        }
        return null;
    }

    async sendRegisterRequest(xsrfToken) {
        const registerHeaders = {
            ...this.baseHeaders,
            'content-type': 'application/json',
            'x-xsrf-token': xsrfToken,
            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
            'cookie': this.getCookieHeader()
        };

        const registerData = {
            targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/createregisterrequest',
            method: 'POST',
            headers: registerHeaders,
            body: JSON.stringify({ email: this.email })
        };

        const response = await this.sendWorkerRequest(registerData);
        
        if (response.headers && response.headers['set-cookie']) {
            this.parseAndStoreCookies(response.headers['set-cookie']);
        }

        if (response.status === 200) {
            const bodyData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
            if (bodyData && bodyData.success) {
                return {
                    success: true,
                    referenceId: bodyData.data?.referenceId
                };
            }
        }
        
        return { success: false };
    }

    async verifyOtp(xsrfToken, otpCode) {
        const otpHeaders = {
            ...this.baseHeaders,
            'content-type': 'application/json',
            'x-xsrf-token': xsrfToken,
            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
            'cookie': this.getCookieHeader()
        };

        const otpData = {
            targetUrl: 'https://oauth.hepsiburada.com/api/account/ValidateTwoFactorEmailOtp',
            method: 'POST',
            headers: otpHeaders,
            body: JSON.stringify({
                otpReference: this.referenceId,
                otpCode: otpCode
            })
        };

        const response = await this.sendWorkerRequest(otpData);
        
        if (response.headers && response.headers['set-cookie']) {
            this.parseAndStoreCookies(response.headers['set-cookie']);
        }

        if (response.status === 200) {
            const bodyData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
            if (bodyData && bodyData.success) {
                return {
                    success: true,
                    requestId: bodyData.data?.requestId || bodyData.requestId
                };
            }
        }
        
        return { success: false };
    }

    async completeRegistrationRequest(xsrfToken) {
        const completeHeaders = {
            ...this.baseHeaders,
            'content-type': 'application/json',
            'x-xsrf-token': xsrfToken,
            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
            'cookie': this.getCookieHeader()
        };

        const completeData = {
            targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/register',
            method: 'POST',
            headers: completeHeaders,
            body: JSON.stringify({
                subscribeEmail: true,
                firstName: "Test",
                lastName: "User", 
                password: "TestPassword123!",
                subscribeSms: false,
                requestId: this.requestId
            })
        };

        const response = await this.sendWorkerRequest(completeData);
        
        if (response.headers && response.headers['set-cookie']) {
            this.parseAndStoreCookies(response.headers['set-cookie']);
        }

        if (response.status === 200) {
            const bodyData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
            if (bodyData && bodyData.success) {
                return {
                    success: true,
                    accessToken: bodyData.data?.accessToken
                };
            }
        }
        
        return { success: false };
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
        
        while (this.jobQueue.length > 0 && this.activeWorkers.size < CONFIG.PARALLEL_CONTEXTS) {
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
        
        console.log(`🔄 CONTEXT #${job.id} BAŞLATILDI (Aktif: ${this.activeWorkers.size}/${CONFIG.PARALLEL_CONTEXTS})`);
        
        try {
            const result = await this.runContextWorker(job);
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();
            
            this.completedJobs.push(job);
            this.activeWorkers.delete(job.id);
            job.resolve(result);
            
            console.log(`✅ CONTEXT #${job.id} TAMAMLANDI`);
            this.processQueue();
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
            
            this.activeWorkers.delete(job.id);
            job.reject(error);
            
            console.log(`❌ CONTEXT #${job.id} HATA: ${error.message}`);
            this.processQueue();
        }
    }
    
    async runContextWorker(job) {
        let context;
        let page;
        
        try {
            context = await this.browser.newContext(job.fingerprintConfig.contextOptions);
            await context.addInitScript(job.fingerprintConfig.fingerprintScript);
            await context.clearCookies();

            page = await context.newPage();
            
            console.log(`🌐 [Context #${job.id}] Hepsiburada'ya gidiliyor...`);
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'networkidle',
                timeout: CONFIG.PAGE_LOAD_TIMEOUT
            });

            console.log(`✅ [Context #${job.id}] Sayfa yüklendi, cookie bekleniyor...`);
            
            const cookieResult = await this.waitForCookies(context, job.id);
            
            let registrationResult = null;
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

                    // 🎯 COOKIE'LERİ SESSION'A AKTAR
                    const session = new HepsiburadaSession();
                    cookieResult.cookies.forEach(cookie => {
                        session.cookies.set(cookie.name, {
                            name: cookie.name,
                            value: cookie.value,
                            domain: cookie.domain,
                            path: cookie.path
                        });
                    });

                    registrationResult = await session.completeRegistration(pageHeaders);
                    
                    if (registrationResult.success) {
                        console.log(`🎉 [Context #${job.id}] ÜYELİK BAŞARILI: ${registrationResult.email}`);
                    } else {
                        console.log(`❌ [Context #${job.id}] ÜYELİK BAŞARISIZ: ${registrationResult.error}`);
                    }
                } catch (regError) {
                    console.log(`❌ [Context #${job.id}] ÜYELİK HATASI: ${regError.message}`);
                    registrationResult = { success: false, error: regError.message };
                }
            }
            
            return {
                jobId: job.id,
                success: cookieResult.success,
                cookies: cookieResult.cookies,
                chrome_extension_cookies: convertToChromeExtensionFormat(cookieResult.cookies),
                stats: cookieResult.stats,
                attempts: cookieResult.attempts,
                registration: registrationResult,
                worker_info: {
                    userAgent: job.fingerprintConfig.contextOptions.userAgent.substring(0, 40) + '...',
                    viewport: job.fingerprintConfig.contextOptions.viewport,
                    isolation: 'FULL_CONTEXT_ISOLATION'
                }
            };
            
        } finally {
            if (page) {
                try { await page.close(); } catch (e) {}
            }
            if (context) {
                try { 
                    await context.close();
                    console.log(`🧹 [Context #${job.id}] Context temizlendi`);
                } catch (e) {}
            }
        }
    }
    
    async waitForCookies(context, jobId, maxAttempts = CONFIG.MAX_HBUS_ATTEMPTS) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            const allCookies = await context.cookies(['https://hepsiburada.com']);
            
            if (allCookies.length >= CONFIG.MIN_COOKIE_COUNT) {
                console.log(`✅ [Context #${jobId}] ${CONFIG.MIN_COOKIE_COUNT}+ COOKIE BULUNDU!`);
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
            
            console.log(`⏳ [Context #${job.id}] Cookie bekleniyor... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
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
    
    async setBrowser(browserInstance) {
        this.browser = browserInstance;
    }
    
    getStatus() {
        return {
            activeContexts: this.activeWorkers.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs.length,
            maxParallel: CONFIG.PARALLEL_CONTEXTS
        };
    }
    
    async stopAll() {
        this.jobQueue = [];
        for (const [jobId, job] of this.activeWorkers.entries()) {
            job.status = 'cancelled';
            job.reject(new Error('İş iptal edildi'));
        }
        this.activeWorkers.clear();
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

// 🎯 GERÇEKÇİ FINGERPRINT FONKSİYONLARI (KISA VERSİYON)
function getRandomUserAgent() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ
function getAdvancedFingerprintScript() {
    return `
    // Fingerprint spoofing
    Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    // Chrome runtime
    window.chrome = {
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
        app: { getIsInstalled: () => false }
    };

    // Platform spoofing
    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

    // Languages spoofing
    Object.defineProperty(navigator, 'languages', {
        get: () => ['tr-TR', 'tr', 'en-US', 'en'],
    });

    // Hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
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

// 🎯 CHROME EXTENSION COOKIE FORMATI
function convertToChromeExtensionFormat(cookies) {
    return cookies.map(cookie => {
        return {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            sameSite: !cookie.sameSite ? 'no_restriction' : 
                     cookie.sameSite === 'Lax' ? 'lax' :
                     cookie.sameSite === 'Strict' ? 'strict' : 'no_restriction',
            expirationDate: cookie.expires ? Math.floor(new Date(cookie.expires * 1000 || cookie.expires).getTime() / 1000) : 
                           Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            url: (cookie.secure ? 'https://' : 'http://') + 
                 (cookie.domain.startsWith('.') ? 'www' + cookie.domain : cookie.domain) + 
                 (cookie.path || '/')
        };
    });
}

// 🎯 FINGERPRINT KONFİGÜRASYONU
function createFingerprintConfig(fingerprintId) {
    const viewport = getRandomViewport();
    const userAgent = getRandomUserAgent();
    
    return {
        contextOptions: {
            viewport: viewport,
            userAgent: userAgent,
            locale: 'tr-TR',
            timezoneId: 'Europe/Istanbul',
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        },
        fingerprintScript: getAdvancedFingerprintScript()
    };
}

// 🎯 PARALEL CONTEXT COOKIE TOPLAMA
async function getCookiesParallel() {
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT COOKIE TOPLAMA BAŞLATILIYOR...`);
        collectionStats.total_runs++;
        
        browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-default-browser-check',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        activeBrowser = browser;
        await parallelCollector.setBrowser(browser);
        
        console.log(`✅ Browser başlatıldı - ${CONFIG.PARALLEL_CONTEXTS} paralel context hazır`);
        
        const jobPromises = [];
        for (let i = 1; i <= CONFIG.PARALLEL_CONTEXTS; i++) {
            const fingerprintConfig = createFingerprintConfig(i);
            const jobPromise = parallelCollector.addJob(fingerprintConfig);
            jobPromises.push(jobPromise);
        }
        
        console.log(`⏳ ${CONFIG.PARALLEL_CONTEXTS} paralel context işin tamamlanması bekleniyor...`);
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
                    console.log(`✅ CONTEXT #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie`);
                    
                    if (result.value.registration && result.value.registration.success) {
                        collectionStats.registration_success++;
                        console.log(`🎉 ÜYELİK BAŞARILI: ${result.value.registration.email}`);
                    } else if (result.value.registration) {
                        collectionStats.registration_failed++;
                    }
                }
            }
        });
        
        const successfulCount = currentSuccessfulSets.length;
        const successfulRegistrationCount = currentSuccessfulSets.filter(set => set.registration && set.registration.success).length;
        
        console.log('\n📊 === PARALEL CONTEXT İSTATİSTİKLER ===');
        console.log(`   Toplam Context: ${allResults.length}`);
        console.log(`   Başarılı Context: ${successfulCount}`);
        console.log(`   Üyelik Başarılı: ${successfulRegistrationCount}`);
        
        if (successfulCount > 0) {
            collectionStats.successful_runs++;
            collectionStats.parallel_jobs_completed += successfulCount;
            lastCookies = currentSuccessfulSets;
            lastCollectionTime = new Date();
        }

        return {
            overall_success: successfulCount > 0,
            total_attempts: allResults.length,
            successful_attempts: successfulCount,
            successful_registrations: successfulRegistrationCount,
            cookie_sets: currentSuccessfulSets,
            parallel_config: {
                parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
                isolation: 'FULL_CONTEXT_ISOLATION',
                auto_registration: CONFIG.AUTO_REGISTRATION
            },
            timestamp: new Date().toISOString(),
            chrome_extension_compatible: true
        };

    } catch (error) {
        console.log('❌ PARALEL CONTEXT HATA:', error.message);
        return { overall_success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
            activeBrowser = null;
        }
    }
}

// ✅ EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'TAM OTOMATİK HEPŞİBURADA ÜYELİK SİSTEMİ',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            otp_wait_time: CONFIG.OTP_WAIT_TIME
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + TAM OTOMATİK üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/stats': 'İstatistikler'
        },
        mode: 'TAM_OTOMATIK_ÜYELİK',
        last_collection: lastCollectionTime,
        successful_sets_count: lastCookies.filter(set => set.success).length,
        successful_registrations: collectionStats.registration_success
    });
});

app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT + TAM OTOMATİK ÜYELİK ===`);
    const result = await getCookiesParallel();
    res.json(result);
});

app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({ error: 'Henüz cookie toplanmadı' });
    }

    const successfulSets = lastCookies.filter(set => set.success);
    if (successfulSets.length === 0) {
        return res.json({ error: 'Başarılı cookie seti bulunamadı' });
    }

    const result = {
        last_updated: lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
        total_successful_sets: successfulSets.length,
        successful_registrations: successfulSets.filter(set => set.registration && set.registration.success).length,
        context_mode: 'TAM_OTOMATIK_ÜYELİK',
        chrome_extension_compatible: true
    };
    
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

app.get('/chrome-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({ error: 'Henüz cookie toplanmadı' });
    }

    const successfulSets = lastCookies.filter(set => set.success);
    if (successfulSets.length === 0) {
        return res.json({ error: 'Başarılı cookie seti bulunamadı' });
    }

    const chromeSets = {};
    successfulSets.forEach(set => {
        chromeSets[`context${set.set_id}`] = set.chrome_extension_cookies;
    });

    res.json({
        chrome_extension_format: true,
        context_mode: 'TAM_OTOMATIK_ÜYELİK',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null
    });
});

app.get('/stats', (req, res) => {
    res.json({
        collection_stats: collectionStats,
        success_rate: collectionStats.total_runs > 0 ? 
            (collectionStats.successful_runs / collectionStats.total_runs * 100).toFixed(1) + '%' : '0%',
        registration_success_rate: collectionStats.registration_success > 0 ?
            (collectionStats.registration_success / (collectionStats.registration_success + collectionStats.registration_failed) * 100).toFixed(1) + '%' : '0%',
        last_collection: lastCollectionTime,
        current_cookie_sets: lastCookies.length,
        successful_cookie_sets: lastCookies.filter(set => set.success).length,
        successful_registrations: lastCookies.filter(set => set.registration && set.registration.success).length
    });
});

// 🎯 OTOMATİK CONTEXT TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA + ÜYELİK AKTİF');
    
    setInterval(async () => {
        const shouldRun = lastCookies.length === 0 || 
                         (lastCollectionTime && (Date.now() - lastCollectionTime.getTime() > CONFIG.AUTO_COLLECT_INTERVAL));
        
        if (shouldRun) {
            console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT TOPLAMA ===`);
            await getCookiesParallel();
        }
    }, 60000);
}

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 TAM OTOMATİK HEPŞİBURADA ÜYELİK SİSTEMİ');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log(`📍 Mod: ✅ TAM OTOMATİK ÜYELİK`);
    console.log(`📍 /collect - ${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + TAM OTOMATİK üyelik`);
    console.log('🎯 ÜYELİK SÜRECİ:');
    console.log('   1. Cookie toplama');
    console.log('   2. XSRF Token alma');
    console.log('   3. Kayıt isteği gönderme');
    console.log('   4. OTP kodu bekleme (' + CONFIG.OTP_WAIT_TIME/1000 + ' saniye)');
    console.log('   5. OTP kodu alma');
    console.log('   6. OTP doğrulama');
    console.log('   7. Kayıt tamamlama');
    console.log('   8. Başarılı üyelik! 🎉');
});
