// 🚀 TAM VE EKSİKSİZ PLAYWRIGHT SCRIPT - CONTEXT API MODE
// 🎯 PARALEL CONTEXT'LER + GERÇEK HEADER YAKALAMA + OTOMATİK ÜYELİK
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    PARALLEL_CONTEXTS: 4,
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    MIN_COOKIE_COUNT: 7,
    AUTO_REGISTRATION: true
};

// 🎯 HEPŞİBURADA ÜYELİK SİSTEMİ
class HepsiburadaSession {
    constructor() {
        this.cookies = new Map();
        this.xsrfToken = null;
        this.baseHeaders = null;
        this.fingerprint = null;
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
        return parts[0] + '.' + randomPart.substring(0, 3) + '@' + randomPart2.substring(0, 3) + '.' + parts[1];
    }

    async getOtpCode(email) {
        const otpUrl = `https://script.google.com/macros/s/AKfycbxvTJG2ou3TGgCv2PHaaFjw8-dpRkxwnuJuJHZ6CXAVCo7jRXvm_Je5c370uGundLo3KQ/exec?email=${encodeURIComponent(email)}&mode=0`;
        try {
            const response = await fetch(otpUrl);
            const otpText = await response.text();
            const match = otpText.match(/\b\d{6}\b/);
            return match ? match[0] : (/^\d{6}$/.test(otpText.trim()) ? otpText.trim() : null);
        } catch (error) {
            return null;
        }
    }
}

// 🎯 CONTEXT İÇİ API İSTEK YÖNETİCİSİ
class ContextApiManager {
    constructor(page, context, jobId) {
        this.page = page;
        this.context = context;
        this.jobId = jobId;
        this.capturedHeaders = null;
        this.xsrfToken = null;
        this.fingerprint = null;
    }

    // 🎯 CONTEXT İÇİNDEN API İSTEĞİ YAP - GERÇEK HEADER YAKALA
    async makeApiRequest(url, options = {}) {
        try {
            console.log(`🌐 [Context #${this.jobId}] API isteği: ${url}`);
            
            const response = await this.page.evaluate(async (requestOptions) => {
                const { url, method = 'GET', headers = {}, body = null } = requestOptions;
                
                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: headers,
                        credentials: 'include',
                        body: body
                    });
                    
                    const responseHeaders = {};
                    response.headers.forEach((value, key) => {
                        responseHeaders[key] = value;
                    });
                    
                    const responseText = await response.text();
                    
                    return {
                        success: true,
                        status: response.status,
                        statusText: response.statusText,
                        headers: responseHeaders,
                        body: responseText,
                        url: response.url
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }, { url, ...options });

            if (response.success) {
                console.log(`✅ [Context #${this.jobId}] API başarılı: ${response.status}`);
                
                if (response.headers && response.headers['set-cookie']) {
                    this.parseCapturedCookies(response.headers['set-cookie']);
                }
                
                return response;
            } else {
                console.log(`❌ [Context #${this.jobId}] API hatası: ${response.error}`);
                throw new Error(response.error);
            }
            
        } catch (error) {
            console.log(`❌ [Context #${this.jobId}] API istek hatası: ${error.message}`);
            throw error;
        }
    }

    parseCapturedCookies(setCookieHeader) {
        if (!setCookieHeader) return;
        
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        cookies.forEach(cookieHeader => {
            const parts = cookieHeader.split(';');
            const [nameValue] = parts;
            const [name, value] = nameValue.split('=');
            if (name && value) {
                console.log(`🍪 [Context #${this.jobId}] Cookie yakalandı: ${name}`);
            }
        });
    }

    // 🎯 GERÇEK HEADER'LARI YAKALA - FEATURES ENDPOINT'İ İLE
    async captureRealHeaders() {
        console.log(`🎯 [Context #${this.jobId}] Gerçek header'lar yakalanıyor...`);
        
        try {
            const featuresResponse = await this.makeApiRequest(
                'https://oauth.hepsiburada.com/api/features?clientId=SPA',
                {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                    }
                }
            );

            if (featuresResponse.success) {
                console.log(`✅ [Context #${this.jobId}] Features endpoint başarılı`);
                
                const xsrfResponse = await this.makeApiRequest(
                    'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                    {
                        method: 'GET',
                        headers: {
                            'accept': 'application/json, text/plain, */*',
                            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        }
                    }
                );

                if (xsrfResponse.success && xsrfResponse.body) {
                    try {
                        const xsrfData = JSON.parse(xsrfResponse.body);
                        if (xsrfData && xsrfData.xsrfToken) {
                            this.xsrfToken = xsrfData.xsrfToken;
                            console.log(`✅ [Context #${this.jobId}] XSRF Token yakalandı: ${this.xsrfToken}`);
                        }
                    } catch (e) {
                        console.log(`❌ [Context #${this.jobId}] XSRF Token parse hatası`);
                    }
                }

                return {
                    success: true,
                    xsrfToken: this.xsrfToken,
                    featuresStatus: featuresResponse.status
                };
                
            } else {
                throw new Error('Features endpoint başarısız');
            }
            
        } catch (error) {
            console.log(`❌ [Context #${this.jobId}] Header yakalama hatası: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🎯 YAKALANAN HEADER'LAR İLE KAYIT İŞLEMLERİ
    async performRegistrationWithCapturedHeaders(session, email) {
        console.log(`📧 [Context #${this.jobId}] Yakalanan header'lar ile kayıt başlatılıyor...`);
        
        try {
            if (!this.xsrfToken) {
                console.log(`🔄 [Context #${this.jobId}] XSRF Token alınıyor...`);
                const xsrfResult = await this.captureRealHeaders();
                if (!xsrfResult.success || !this.xsrfToken) {
                    throw new Error('XSRF Token alınamadı');
                }
            }

            console.log(`📨 [Context #${this.jobId}] Kayıt isteği gönderiliyor...`);

            const registerResponse = await this.makeApiRequest(
                'https://oauth.hepsiburada.com/api/authenticate/createregisterrequest',
                {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'content-type': 'application/json',
                        'x-xsrf-token': this.xsrfToken,
                        'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB'
                    },
                    body: JSON.stringify({ email: email })
                }
            );

            if (registerResponse.success && registerResponse.status === 200) {
                let registerBody;
                try {
                    registerBody = JSON.parse(registerResponse.body);
                } catch (e) {
                    throw new Error('Kayıt response parse hatası');
                }

                if (registerBody && registerBody.success) {
                    console.log(`✅ [Context #${this.jobId}] KAYIT İSTEĞİ BAŞARILI!`);
                    const referenceId = registerBody.data?.referenceId;

                    console.log(`⏳ [Context #${this.jobId}] OTP KODU BEKLENİYOR (15 saniye)...`);
                    await new Promise(resolve => setTimeout(resolve, 15000));

                    console.log(`📱 [Context #${this.jobId}] OTP kodu alınıyor...`);
                    const otpCode = await session.getOtpCode(email);
                    
                    if (otpCode) {
                        console.log(`✅ [Context #${this.jobId}] OTP KODU HAZIR:`, otpCode);
                        
                        console.log(`📨 [Context #${this.jobId}] OTP doğrulama gönderiliyor...`);
                        
                        const otpVerifyResponse = await this.makeApiRequest(
                            'https://oauth.hepsiburada.com/api/account/ValidateTwoFactorEmailOtp',
                            {
                                method: 'POST',
                                headers: {
                                    'accept': 'application/json, text/plain, */*',
                                    'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                                    'content-type': 'application/json',
                                    'x-xsrf-token': this.xsrfToken,
                                    'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB'
                                },
                                body: JSON.stringify({
                                    otpReference: referenceId,
                                    otpCode: otpCode
                                })
                            }
                        );

                        if (otpVerifyResponse.success && otpVerifyResponse.status === 200) {
                            let otpVerifyBody;
                            try {
                                otpVerifyBody = JSON.parse(otpVerifyResponse.body);
                            } catch (e) {
                                throw new Error('OTP response parse hatası');
                            }

                            if (otpVerifyBody && otpVerifyBody.success) {
                                console.log(`✅ [Context #${this.jobId}] OTP DOĞRULAMA BAŞARILI!`);
                                const requestId = otpVerifyBody.data?.requestId || otpVerifyBody.requestId;

                                console.log(`🔄 [Context #${this.jobId}] Yeni XSRF Token alınıyor...`);
                                const newXsrfResponse = await this.makeApiRequest(
                                    'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                                    {
                                        method: 'GET',
                                        headers: {
                                            'accept': 'application/json, text/plain, */*',
                                            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                                        }
                                    }
                                );

                                let newXsrfToken = this.xsrfToken;
                                if (newXsrfResponse.success && newXsrfResponse.body) {
                                    try {
                                        const newXsrfData = JSON.parse(newXsrfResponse.body);
                                        if (newXsrfData && newXsrfData.xsrfToken) {
                                            newXsrfToken = newXsrfData.xsrfToken;
                                            console.log(`✅ [Context #${this.jobId}] Yeni XSRF Token alındı`);
                                        }
                                    } catch (e) {
                                        console.log(`⚠️ [Context #${this.jobId}] Yeni XSRF Token parse hatası, eskisi kullanılıyor`);
                                    }
                                }

                                console.log(`📨 [Context #${this.jobId}] Kayıt tamamlama gönderiliyor...`);
                                
                                const completeResponse = await this.makeApiRequest(
                                    'https://oauth.hepsiburada.com/api/authenticate/register',
                                    {
                                        method: 'POST',
                                        headers: {
                                            'accept': 'application/json, text/plain, */*',
                                            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                                            'content-type': 'application/json',
                                            'x-xsrf-token': newXsrfToken,
                                            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB'
                                        },
                                        body: JSON.stringify({
                                            subscribeEmail: true,
                                            firstName: "Test",
                                            lastName: "User", 
                                            password: "TestPassword123!",
                                            subscribeSms: false,
                                            requestId: requestId
                                        })
                                    }
                                );

                                if (completeResponse.success && completeResponse.status === 200) {
                                    let completeBody;
                                    try {
                                        completeBody = JSON.parse(completeResponse.body);
                                    } catch (e) {
                                        throw new Error('Complete response parse hatası');
                                    }

                                    if (completeBody && completeBody.success) {
                                        console.log(`🎉 [Context #${this.jobId}] KAYIT BAŞARIYLA TAMAMLANDI!`);
                                        return { 
                                            success: true, 
                                            email: email,
                                            accessToken: completeBody.data?.accessToken,
                                            method: 'CONTEXT_API'
                                        };
                                    } else {
                                        console.log(`❌ [Context #${this.jobId}] Kayıt tamamlama başarısız`);
                                        return { success: false, error: 'Kayıt tamamlama başarısız' };
                                    }
                                } else {
                                    console.log(`❌ [Context #${this.jobId}] Kayıt tamamlama isteği başarısız`);
                                    return { success: false, error: 'Kayıt tamamlama isteği başarısız' };
                                }
                            } else {
                                console.log(`❌ [Context #${this.jobId}] OTP doğrulama başarısız`);
                                return { success: false, error: 'OTP doğrulama başarısız' };
                            }
                        } else {
                            console.log(`❌ [Context #${this.jobId}] OTP doğrulama isteği başarısız`);
                            return { success: false, error: 'OTP doğrulama isteği başarısız' };
                        }
                    } else {
                        return { success: false, error: 'OTP kodu alınamadı' };
                    }
                } else {
                    return { success: false, error: 'Kayıt isteği başarısız' };
                }
            } else {
                console.log(`❌ [Context #${this.jobId}] Kayıt isteği HTTP hatası: ${registerResponse.status}`);
                return { success: false, error: `Kayıt isteği HTTP hatası: ${registerResponse.status}` };
            }

        } catch (error) {
            console.log(`❌ [Context #${this.jobId}] Kayıt işlemi hatası:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

// 🎯 PARALEL CONTEXT YÖNETİCİSİ
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
            
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [Context #${job.id}] COOKIE BAŞARILI - CONTEXT API İLE ÜYELİK BAŞLATILIYOR...`);
                
                try {
                    const apiManager = new ContextApiManager(page, context, job.id);
                    const session = new HepsiburadaSession();
                    
                    cookieResult.cookies.forEach(cookie => {
                        session.cookies.set(cookie.name, {
                            name: cookie.name,
                            value: cookie.value,
                            domain: cookie.domain,
                            path: cookie.path
                        });
                    });

                    const email = session.generateEmail();
                    console.log(`📧 [Context #${job.id}] Email: ${email}`);

                    const registrationResult = await apiManager.performRegistrationWithCapturedHeaders(session, email);
                    
                    if (registrationResult.success) {
                        console.log(`🎉 [Context #${job.id}] CONTEXT API İLE ÜYELİK BAŞARILI: ${registrationResult.email}`);
                        cookieResult.registration = registrationResult;
                    } else {
                        console.log(`❌ [Context #${job.id}] CONTEXT API İLE ÜYELİK BAŞARISIZ: ${registrationResult.error}`);
                        cookieResult.registration = registrationResult;
                    }
                } catch (regError) {
                    console.log(`❌ [Context #${this.jobId}] CONTEXT API ÜYELİK HATASI: ${regError.message}`);
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
                    isolation: 'FULL_CONTEXT_ISOLATION',
                    method: 'CONTEXT_API_DIRECT'
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

// 🎯 MEMORY LEAK ÖNLEMİ - PERİYODİK TEMİZLİK
setInterval(() => {
    if (lastCookies.length > 20) {
        console.log('🧹 Eski cookie setleri temizleniyor...');
        lastCookies = lastCookies.slice(-10);
    }
    
    if (parallelCollector.completedJobs.length > 100) {
        console.log('🧹 Eski iş kayıtları temizleniyor...');
        parallelCollector.completedJobs = parallelCollector.completedJobs.slice(-50);
    }
    
    if (global.gc) {
        global.gc();
        console.log('🗑️ Manual garbage collection çalıştırıldı');
    }
}, 10 * 60 * 1000);

// 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ
function getAdvancedFingerprintScript() {
    return `
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(screen, 'width', { get: () => 1920 });
    Object.defineProperty(screen, 'height', { get: () => 1080 });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    
    // Canvas fingerprint spoofing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        if (contextType === '2d') {
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
    
    // WebGL spoofing
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === this.VENDOR) return 'Intel Inc.';
        if (parameter === this.RENDERER) return 'Intel Iris OpenGL Engine';
        if (parameter === this.VERSION) return 'WebGL 1.0 (OpenGL ES 2.0 Intel)';
        return originalGetParameter.call(this, parameter);
    };
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
        { width: 1600, height: 900 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

function createFingerprintConfig(fingerprintId) {
    const viewport = getRandomViewport();
    const userAgent = getRandomUserAgent();
    
    return {
        contextOptions: {
            viewport: viewport,
            userAgent: userAgent,
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'upgrade-insecure-requests': '1'
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
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=site-per-process',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding'
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
                        console.log(`🎉 CONTEXT API İLE ÜYELİK BAŞARILI: ${result.value.registration.email}`);
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
        console.log(`   Context API Üyelik Başarılı: ${successfulRegistrationCount}`);
        console.log(`   Toplam Cookie: ${currentSuccessfulSets.reduce((sum, set) => sum + set.cookies.length, 0)}`);
        
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
                auto_registration: CONFIG.AUTO_REGISTRATION,
                method: 'CONTEXT_API_DIRECT'
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
        service: 'PARALEL CONTEXT COOKIE COLLECTOR - CONTEXT API MODE',
        version: '2.0.0',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            auto_collect: CONFIG.AUTO_COLLECT_ENABLED
        },
        parallel_status: parallelCollector.getStatus(),
        collection_stats: collectionStats,
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + CONTEXT API üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/status': 'Sistem durumu'
        },
        mode: 'CONTEXT_API_DIRECT',
        last_collection: lastCollectionTime,
        successful_sets_count: lastCookies.filter(set => set.success).length
    });
});

app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT COOKIE TOPLAMA (CONTEXT API) ===`);
    try {
        const result = await getCookiesParallel();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/last-cookies', (req, res) => {
    if (lastCookies.length === 0) {
        return res.json({ error: 'Henüz cookie toplanmadı', last_collection: lastCollectionTime });
    }

    const successfulSets = lastCookies.filter(set => set.success);
    if (successfulSets.length === 0) {
        return res.json({ error: 'Başarılı cookie seti bulunamadı', last_collection: lastCollectionTime });
    }

    const result = {
        last_updated: lastCollectionTime ? lastCollectionTime.toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
        total_successful_sets: successfulSets.length,
        total_cookies: successfulSets.reduce((sum, set) => sum + set.cookies.length, 0),
        successful_registrations: successfulSets.filter(set => set.registration && set.registration.success).length,
        context_mode: 'CONTEXT_API_DIRECT',
        chrome_extension_compatible: true
    };
    
    successfulSets.forEach(set => {
        result[`context_${set.set_id}`] = {
            cookies_count: set.cookies.length,
            chrome_extension_cookies: set.chrome_extension_cookies,
            registration: set.registration,
            stats: set.stats,
            collection_time: set.collection_time,
            worker_info: set.worker_info
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
        chromeSets[`context_${set.set_id}`] = set.chrome_extension_cookies;
    });

    res.json({
        chrome_extension_format: true,
        context_mode: 'CONTEXT_API_DIRECT',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        total_cookies: successfulSets.reduce((sum, set) => sum + set.chrome_extension_cookies.length, 0),
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null
    });
});

app.get('/status', (req, res) => {
    res.json({
        system: 'running',
        parallel_status: parallelCollector.getStatus(),
        collection_stats: collectionStats,
        last_collection: lastCollectionTime,
        successful_sets: lastCookies.filter(set => set.success).length,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// 🎯 OTOMATİK CONTEXT TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA AKTİF (CONTEXT API)');
    
    setInterval(async () => {
        const shouldRun = lastCookies.length === 0 || 
                         (lastCollectionTime && (Date.now() - lastCollectionTime.getTime() > CONFIG.AUTO_COLLECT_INTERVAL));
        
        if (shouldRun) {
            console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT TOPLAMA (CONTEXT API) ===`);
            try {
                await getCookiesParallel();
            } catch (error) {
                console.log('❌ OTOMATİK TOPLAMA HATASI:', error.message);
            }
        }
    }, 60000);
}

// 🎯 GRACEFUL SHUTDOWN
process.on('SIGINT', async () => {
    console.log('\n🛑 Sistem kapatılıyor...');
    await parallelCollector.stopAll();
    if (activeBrowser) {
        await activeBrowser.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Sistem kapatılıyor...');
    await parallelCollector.stopAll();
    if (activeBrowser) {
        await activeBrowser.close();
    }
    process.exit(0);
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PARALEL CONTEXT COOKIE COLLECTOR - CONTEXT API MODE');
    console.log('='.repeat(60));
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log(`📍 Mod: ✅ CONTEXT API DIRECT (WORKER'SIZ)`);
    console.log(`📍 Auto Registration: ${CONFIG.AUTO_REGISTRATION ? '✅ AKTİF' : '❌ PASİF'}`);
    console.log(`📍 Auto Collect: ${CONFIG.AUTO_COLLECT_ENABLED ? '✅ AKTİF' : '❌ PASİF'}`);
    console.log('');
    console.log('🔗 ENDPOINTS:');
    console.log('   ├── GET  /              - Sistem bilgisi');
    console.log('   ├── GET  /collect       - Cookie toplama başlat');
    console.log('   ├── GET  /last-cookies  - Son cookie\'ler');
    console.log('   ├── GET  /chrome-cookies - Chrome formatında');
    console.log('   └── GET  /status        - Sistem durumu');
    console.log('');
    console.log('🎯 ÖZELLİKLER:');
    console.log('   ├── Context İçi API İstekleri: ✅ AKTİF');
    console.log('   ├── Gerçek Header Yakalama: ✅ AKTİF');
    console.log('   ├── Worker Bağımlılığı: ❌ YOK');
    console.log('   ├── Otomatik Cookie Gönderimi: ✅ AKTİF');
    console.log('   ├── Gelişmiş Fingerprint: ✅ AKTİF');
    console.log('   ├── Paralel İşlem: ✅ AKTİF');
    console.log('   └── Memory Management: ✅ AKTİF');
    console.log('='.repeat(60));
});

module.exports = app;
