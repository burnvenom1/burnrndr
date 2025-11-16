// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - DIRECT CONTEXT MODE (SEKMESİZ)
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI İLE PARALEL CONTEXT'LER + OTOMATİK ÜYELİK
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
            
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [Context #${job.id}] COOKIE BAŞARILI - ÜYELİK BAŞLATILIYOR...`);
                
                try {
                    const registrationResult = await this.doRegistrationInContext(page, context, job.id, cookieResult.cookies);
                    
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

    // 🎯 CONTEXT İÇİ ÜYELİK - SAYFA NAVIGASYON HATASI ÇÖZÜMLÜ
    async doRegistrationInContext(page, context, jobId, cookies) {
        console.log(`📧 [Context #${jobId}] Context içi üyelik başlatılıyor...`);
        
        try {
            const session = new HepsiburadaSession();
            
            cookies.forEach(cookie => {
                session.cookies.set(cookie.name, {
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path
                });
            });

            // 🎯 SAYFA DESTROY HATASI ÇÖZÜMÜ - YENİ SAYFA AÇ
            let currentPage = page;
            let pageHeaders;
            
            try {
                pageHeaders = await currentPage.evaluate(() => {
                    return {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        languages: navigator.languages,
                        platform: navigator.platform
                    };
                });
            } catch (e) {
                console.log(`🔄 [Context #${jobId}] Sayfa yeniden oluşturuluyor...`);
                await currentPage.close();
                currentPage = await context.newPage();
                await currentPage.goto('https://www.hepsiburada.com', { waitUntil: 'domcontentloaded' });
                
                pageHeaders = await currentPage.evaluate(() => {
                    return {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        languages: navigator.languages,
                        platform: navigator.platform
                    };
                });
            }

            console.log(`🖥️ [Context #${jobId}] Context fingerprint: ${pageHeaders.userAgent.substring(0, 50)}...`);

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

            const email = session.generateEmail();
            console.log(`📧 [Context #${jobId}] Email: ${email}`);

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
                const bodyData = typeof xsrfResponse.body === 'string' ? JSON.parse(xsrfResponse.body) : xsrfResponse.body;
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
            const registerBody = typeof registerResponse.body === 'string' ? JSON.parse(registerResponse.body) : registerResponse.body;
            
            if (registerResponse.headers && registerResponse.headers['set-cookie']) {
                session.parseAndStoreCookies(registerResponse.headers['set-cookie']);
            }

            if (registerResponse.status === 200 && registerBody && registerBody.success) {
                console.log(`✅ [Context #${jobId}] KAYIT İSTEĞİ BAŞARILI!`);
                const referenceId = registerBody.data?.referenceId;

                console.log(`⏳ [Context #${jobId}] OTP KODU BEKLENİYOR (15 saniye)...`);
                await new Promise(resolve => setTimeout(resolve, 15000));

                console.log(`📱 [Context #${jobId}] OTP kodu alınıyor...`);
                const otpCode = await session.getOtpCode(email);
                
                if (otpCode) {
                    console.log(`✅ [Context #${jobId}] OTP KODU HAZIR:`, otpCode);
                    
                    // 🎯 OTP KODUNU GÖNDERME VE KAYIT TAMAMLAMA
                    console.log(`🔄 [Context #${jobId}] 2. XSRF Token alınıyor...`);
                    const xsrfResponse2 = await session.sendWorkerRequest(xsrfRequestData);
                    let xsrfToken2 = null;
                    
                    if (xsrfResponse2.status === 200) {
                        const bodyData2 = typeof xsrfResponse2.body === 'string' ? JSON.parse(xsrfResponse2.body) : xsrfResponse2.body;
                        if (bodyData2 && bodyData2.xsrfToken) {
                            xsrfToken2 = bodyData2.xsrfToken;
                            console.log(`✅ [Context #${jobId}] 2. XSRF TOKEN ALINDI`);
                            
                            if (xsrfResponse2.headers && xsrfResponse2.headers['set-cookie']) {
                                session.parseAndStoreCookies(xsrfResponse2.headers['set-cookie']);
                            }
                        }
                    }

                    if (!xsrfToken2) {
                        throw new Error('2. XSRF Token alınamadı');
                    }

                    console.log(`📨 [Context #${jobId}] OTP doğrulama gönderiliyor...`);
                    
                    const otpVerifyHeaders = {
                        ...session.baseHeaders,
                        'content-type': 'application/json',
                        'x-xsrf-token': xsrfToken2,
                        'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                        'cookie': session.getCookieHeader()
                    };

                    const otpVerifyData = {
                        targetUrl: 'https://oauth.hepsiburada.com/api/account/ValidateTwoFactorEmailOtp',
                        method: 'POST',
                        headers: otpVerifyHeaders,
                        body: JSON.stringify({
                            otpReference: referenceId,
                            otpCode: otpCode
                        })
                    };

                    const otpVerifyResponse = await session.sendWorkerRequest(otpVerifyData);
                    const otpVerifyBody = typeof otpVerifyResponse.body === 'string' ? JSON.parse(otpVerifyResponse.body) : otpVerifyResponse.body;
                    
                    if (otpVerifyResponse.headers && otpVerifyResponse.headers['set-cookie']) {
                        session.parseAndStoreCookies(otpVerifyResponse.headers['set-cookie']);
                    }

                    if (otpVerifyResponse.status === 200 && otpVerifyBody && otpVerifyBody.success) {
                        console.log(`✅ [Context #${jobId}] OTP DOĞRULAMA BAŞARILI!`);
                        const requestId = otpVerifyBody.data?.requestId || otpVerifyBody.requestId;

                        console.log(`🔄 [Context #${jobId}] 3. XSRF Token alınıyor...`);
                        const xsrfResponse3 = await session.sendWorkerRequest(xsrfRequestData);
                        let xsrfToken3 = null;
                        
                        if (xsrfResponse3.status === 200) {
                            const bodyData3 = typeof xsrfResponse3.body === 'string' ? JSON.parse(xsrfResponse3.body) : xsrfResponse3.body;
                            if (bodyData3 && bodyData3.xsrfToken) {
                                xsrfToken3 = bodyData3.xsrfToken;
                                console.log(`✅ [Context #${jobId}] 3. XSRF TOKEN ALINDI`);
                                
                                if (xsrfResponse3.headers && xsrfResponse3.headers['set-cookie']) {
                                    session.parseAndStoreCookies(xsrfResponse3.headers['set-cookie']);
                                }
                            }
                        }

                        if (!xsrfToken3) {
                            throw new Error('3. XSRF Token alınamadı');
                        }

                        console.log(`📨 [Context #${jobId}] Kayıt tamamlama gönderiliyor...`);
                        
                        const completeHeaders = {
                            ...session.baseHeaders,
                            'content-type': 'application/json',
                            'x-xsrf-token': xsrfToken3,
                            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                            'cookie': session.getCookieHeader()
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
                                requestId: requestId
                            })
                        };

                        const completeResponse = await session.sendWorkerRequest(completeData);
                        const completeBody = typeof completeResponse.body === 'string' ? JSON.parse(completeResponse.body) : completeResponse.body;
                        
                        if (completeResponse.headers && completeResponse.headers['set-cookie']) {
                            session.parseAndStoreCookies(completeResponse.headers['set-cookie']);
                        }

                        if (completeResponse.status === 200 && completeBody && completeBody.success) {
                            console.log(`🎉 [Context #${jobId}] KAYIT BAŞARIYLA TAMAMLANDI!`);
                            return { 
                                success: true, 
                                email: email,
                                accessToken: completeBody.data?.accessToken
                            };
                        } else {
                            console.log(`❌ [Context #${jobId}] Kayıt tamamlama başarısız`);
                            return { success: false, error: 'Kayıt tamamlama başarısız' };
                        }
                    } else {
                        console.log(`❌ [Context #${jobId}] OTP doğrulama başarısız`);
                        return { success: false, error: 'OTP doğrulama başarısız' };
                    }
                } else {
                    return { success: false, error: 'OTP kodu alınamadı' };
                }
            } else {
                return { success: false, error: 'Kayıt isteği başarısız' };
            }

        } catch (error) {
            console.log(`❌ [Context #${jobId}] Üyelik hatası:`, error.message);
            return { success: false, error: error.message };
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
    // Eski cookie setlerini temizle
    if (lastCookies.length > 20) {
        console.log('🧹 Eski cookie setleri temizleniyor...');
        lastCookies = lastCookies.slice(-10); // Son 10 set tut
    }
    
    // Tamamlanmış işleri temizle (100'den fazlaysa)
    if (parallelCollector.completedJobs.length > 100) {
        console.log('🧹 Eski iş kayıtları temizleniyor...');
        parallelCollector.completedJobs = parallelCollector.completedJobs.slice(-50);
    }
    
    // Manuel garbage collection (opsiyonel - --expose-gc ile başlatıldıysa)
    if (global.gc) {
        global.gc();
        console.log('🗑️ Manual garbage collection çalıştırıldı');
    }
}, 10 * 60 * 1000); // 10 dakikada bir temizlik

// 🎯 GERÇEKÇİ FINGERPRINT ÇEŞİTLENDİRME FONKSİYONLARI
function getRandomHardwareConcurrency() {
    const weights = [
        { value: 2, weight: 0.05 },   // %5 - Eski cihazlar
        { value: 4, weight: 0.35 },   // %35 - Orta seviye
        { value: 6, weight: 0.25 },   // %25 - İyi seviye  
        { value: 8, weight: 0.20 },   // %20 - Üst seviye
        { value: 12, weight: 0.10 },  // %10 - İş istasyonu
        { value: 16, weight: 0.05 }   // %5 - Gaming/Workstation
    ];
    return getWeightedRandom(weights);
}

function getRandomDeviceMemory() {
    const weights = [
        { value: 2, weight: 0.10 },   // %10 - Düşük RAM
        { value: 4, weight: 0.25 },   // %25 - Temel kullanım
        { value: 8, weight: 0.40 },   // %40 - Standart
        { value: 16, weight: 0.20 },  // %20 - İyi
        { value: 32, weight: 0.05 }   // %5 - Üst seviye
    ];
    return getWeightedRandom(weights);
}

function getRandomColorDepth() {
    return [24, 30, 32][Math.floor(Math.random() * 3)];
}

function getRandomTimezone() {
    // Türkiye ve çevre ülkeler için gerçekçi timezone'lar
    const timezones = [
        -180, // Türkiye (UTC+3)
        -120, // Yunanistan, Bulgaristan (UTC+2) 
        -60,  // Orta Avrupa (UTC+1)
        0,    // UK, Portekiz (UTC+0)
        60,   // Rusya (UTC+1)
        120,  // Rusya (UTC+2)
        180   // Rusya (UTC+3)
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
}

function getRandomWebGLVendor() {
    const vendors = [
        { name: 'Intel Inc.', weight: 0.35 },
        { name: 'NVIDIA Corporation', weight: 0.25 },
        { name: 'Advanced Micro Devices, Inc.', weight: 0.20 },
        { name: 'Google Inc.', weight: 0.10 },
        { name: 'Mesa/X.org', weight: 0.05 },
        { name: 'VMware, Inc.', weight: 0.03 },
        { name: 'Microsoft Corporation', weight: 0.02 }
    ];
    return getWeightedRandom(vendors);
}

function getRandomWebGLRenderer() {
    const renderers = [
        { name: 'Intel(R) UHD Graphics 630', weight: 0.15 },
        { name: 'Intel(R) HD Graphics 620', weight: 0.12 },
        { name: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)', weight: 0.10 },
        { name: 'NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2', weight: 0.08 },
        { name: 'NVIDIA GeForce RTX 2060 Direct3D11 vs_5_0 ps_5_0', weight: 0.07 },
        { name: 'AMD Radeon(TM) RX 460 Graphics', weight: 0.06 },
        { name: 'AMD Radeon RX 580 Series', weight: 0.05 },
        { name: 'Google SwiftShader', weight: 0.05 },
        { name: 'Mesa DRI Intel(R) HD Graphics 630 (Kaby Lake GT2)', weight: 0.04 },
        { name: 'Intel(R) Iris(R) Xe Graphics', weight: 0.04 },
        { name: 'NVIDIA GeForce GTX 1650 SUPER/PCIe/SSE2', weight: 0.04 },
        { name: 'AMD Radeon Graphics', weight: 0.03 },
        { name: 'Intel(R) HD Graphics 520', weight: 0.03 },
        { name: 'NVIDIA GeForce GTX 1050 Ti/PCIe/SSE2', weight: 0.03 },
        { name: 'AMD Radeon R7 Graphics', weight: 0.02 },
        { name: 'VMware SVGA 3D', weight: 0.02 },
        { name: 'Microsoft Basic Render Driver', weight: 0.01 }
    ];
    return getWeightedRandom(renderers);
}

function getRandomUserAgent() {
    const userAgents = [
        // Chrome - Windows (En yaygın)
        { 
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            weight: 0.25
        },
        {
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            weight: 0.15
        },
        {
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            weight: 0.10
        },
        // Firefox - Windows
        {
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            weight: 0.12
        },
        {
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            weight: 0.08
        },
        // Chrome - macOS
        {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            weight: 0.08
        },
        {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            weight: 0.05
        },
        // Safari - macOS
        {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            weight: 0.07
        },
        {
            ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
            weight: 0.05
        },
        // Edge - Windows
        {
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            weight: 0.03
        },
        {
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
            weight: 0.02
        }
    ];
    return getWeightedRandom(userAgents).ua;
}

function getRandomViewport() {
    const viewports = [
        // Masaüstü - En yaygın
        { width: 1920, height: 1080, weight: 0.35 },
        { width: 1366, height: 768, weight: 0.20 },
        { width: 1536, height: 864, weight: 0.15 },
        { width: 1440, height: 900, weight: 0.08 },
        { width: 1280, height: 720, weight: 0.05 },
        { width: 1600, height: 900, weight: 0.05 },
        // Dikey monitörler
        { width: 1080, height: 1920, weight: 0.03 },
        { width: 900, height: 1440, weight: 0.02 },
        // 4K ve yüksek çözünürlük
        { width: 2560, height: 1440, weight: 0.04 },
        { width: 3840, height: 2160, weight: 0.02 },
        // Ultra-wide
        { width: 3440, height: 1440, weight: 0.01 }
    ];
    return getWeightedRandom(viewports);
}

function getRandomLanguage() {
    const languages = [
        { code: 'tr-TR', weight: 0.60 },    // Türkiye
        { code: 'en-US', weight: 0.15 },    // Amerika
        { code: 'en-GB', weight: 0.08 },    // İngiltere
        { code: 'de-DE', weight: 0.05 },    // Almanya
        { code: 'fr-FR', weight: 0.04 },    // Fransa
        { code: 'ru-RU', weight: 0.03 },    // Rusya
        { code: 'ar-SA', weight: 0.02 },    // Arapça
        { code: 'es-ES', weight: 0.02 },    // İspanya
        { code: 'it-IT', weight: 0.01 }     // İtalya
    ];
    return getWeightedRandom(languages).code;
}

function getRandomPlatform() {
    const platforms = [
        { platform: 'Win32', weight: 0.75 },    // Windows
        { platform: 'MacIntel', weight: 0.15 }, // macOS
        { platform: 'Linux x86_64', weight: 0.08 }, // Linux
        { platform: 'X11', weight: 0.02 }       // Diğer Unix
    ];
    return getWeightedRandom(platforms).platform;
}

function getRandomConnection() {
    const connections = [
        { 
            type: '4g', 
            rtt: 50, 
            downlink: 10, 
            saveData: false,
            weight: 0.45 
        },
        { 
            type: 'wifi', 
            rtt: 30, 
            downlink: 25, 
            saveData: false,
            weight: 0.35 
        },
        { 
            type: '3g', 
            rtt: 150, 
            downlink: 3, 
            saveData: false,
            weight: 0.10 
        },
        { 
            type: '2g', 
            rtt: 300, 
            downlink: 0.5, 
            saveData: true,
            weight: 0.05 
        },
        { 
            type: 'slow-2g', 
            rtt: 600, 
            downlink: 0.05, 
            saveData: true,
            weight: 0.03 
        },
        { 
            type: '5g', 
            rtt: 20, 
            downlink: 50, 
            saveData: false,
            weight: 0.02 
        }
    ];
    return getWeightedRandom(connections);
}

function getRandomScreenResolution() {
    const resolutions = [
        { width: 1920, height: 1080, weight: 0.35 },
        { width: 1366, height: 768, weight: 0.20 },
        { width: 1536, height: 864, weight: 0.12 },
        { width: 1440, height: 900, weight: 0.08 },
        { width: 1280, height: 720, weight: 0.06 },
        { width: 1600, height: 900, weight: 0.05 },
        { width: 2560, height: 1440, weight: 0.04 },
        { width: 1024, height: 768, weight: 0.03 },
        { width: 3840, height: 2160, weight: 0.02 },
        { width: 800, height: 600, weight: 0.02 },
        { width: 3440, height: 1440, weight: 0.01 },
        { width: 5120, height: 2880, weight: 0.01 }
    ];
    return getWeightedRandom(resolutions);
}

// 🎯 AĞIRLIKLI RASTGELE SEÇİM FONKSİYONU
function getWeightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) {
            return item.value !== undefined ? item.value : item;
        }
    }
    
    return items[0].value !== undefined ? items[0].value : items[0];
}

// 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ BİRLEŞTİR - GERÇEKÇİ VERSİYON
function getAdvancedFingerprintScript() {
    const hardwareConcurrency = getRandomHardwareConcurrency();
    const deviceMemory = getRandomDeviceMemory();
    const colorDepth = getRandomColorDepth();
    const timezone = getRandomTimezone();
    const webglRenderer = getRandomWebGLRenderer();
    const webglVendor = getRandomWebGLVendor();
    const language = getRandomLanguage();
    const platform = getRandomPlatform();
    const connection = getRandomConnection();
    const screenRes = getRandomScreenResolution();
    
    return `
    // 🎯 GERÇEKÇİ FINGERPRINT SPOOFING
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

    // Chrome runtime manipülasyonu
    window.chrome = {
        runtime: {
            id: '${Math.random().toString(36).substring(2, 15)}',
            getManifest: () => ({ version: '${Math.floor(Math.random() * 5) + 1}.0.${Math.floor(Math.random() * 1000)}' })
        },
        loadTimes: () => ({
            firstPaintTime: ${Date.now() - Math.floor(Math.random() * 5000)},
            requestTime: ${Date.now() - Math.floor(Math.random() * 10000)},
            finishDocumentLoadTime: ${Date.now() - Math.floor(Math.random() * 3000)},
            finishLoadTime: ${Date.now() - Math.floor(Math.random() * 2000)}
        }),
        csi: () => ({
            onloadT: ${Date.now() - Math.floor(Math.random() * 5000)},
            startE: ${Date.now() - Math.floor(Math.random() * 10000)},
            pageT: ${Math.floor(Math.random() * 2000) + 500}
        }),
        app: {
            InstallState: { DISABLED: 'disabled', INSTALLED: 'installed' },
            RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run' },
            getDetails: () => null,
            getIsInstalled: () => false
        }
    };

    // Permissions manipülasyonu
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );

    // Plugins manipülasyonu
    Object.defineProperty(navigator, 'plugins', {
        get: () => {
            const plugins = [];
            const commonPlugins = [
                'Chrome PDF Viewer',
                'Chrome PDF Plugin',
                'Native Client',
                'Microsoft Edge PDF Viewer',
                'WebKit built-in PDF'
            ];
            const pluginCount = Math.floor(Math.random() * 3) + 1; // 1-3 plugin
            for (let i = 0; i < pluginCount; i++) {
                plugins.push({
                    name: commonPlugins[Math.floor(Math.random() * commonPlugins.length)],
                    filename: 'internal-pdf-viewer',
                    description: 'Portable Document Format',
                    version: '${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}'
                });
            }
            return plugins;
        },
    });

    // Languages manipülasyonu
    Object.defineProperty(navigator, 'languages', {
        get: () => {
            const baseLang = '${language}';
            const langs = [baseLang];
            if (baseLang.startsWith('tr')) {
                langs.push('tr', 'en-US', 'en');
            } else if (baseLang.startsWith('en')) {
                langs.push('en', baseLang.includes('US') ? 'en-GB' : 'en-US');
            } else {
                langs.push(baseLang.split('-')[0], 'en-US', 'en');
            }
            return langs;
        },
    });

    // Platform manipülasyonu
    Object.defineProperty(navigator, 'platform', {
        get: () => '${platform}',
        configurable: true
    });

    // Hardware concurrency manipülasyonu
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => ${hardwareConcurrency},
        configurable: true
    });

    // Device memory manipülasyonu
    Object.defineProperty(navigator, 'deviceMemory', {
        get: () => ${deviceMemory},
        configurable: true
    });

    // Timezone manipülasyonu
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() { 
        return ${timezone}; 
    };

    // WebGL Vendor manipülasyonu
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
            const context = originalGetContext.call(this, contextType, ...args);
            if (context) {
                const originalGetParameter = context.getParameter;
                context.getParameter = function(parameter) {
                    if (parameter === context.VENDOR) return '${webglVendor}';
                    if (parameter === context.RENDERER) return '${webglRenderer}';
                    if (parameter === context.VERSION) return 'WebGL 1.0 (OpenGL ES 2.0)';
                    if (parameter === context.SHADING_LANGUAGE_VERSION) return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0)';
                    return originalGetParameter.call(this, parameter);
                };
                
                // WebGL canvas fingerprint varyasyonu
                const originalToDataURL = this.toDataURL;
                this.toDataURL = function(...args) {
                    const dataURL = originalToDataURL.apply(this, args);
                    return dataURL;
                };
            }
            return context;
        }
        return originalGetContext.call(this, contextType, ...args);
    };

    // Screen resolution manipülasyonu
    Object.defineProperty(screen, 'width', {
        get: () => ${screenRes.width},
        configurable: true
    });

    Object.defineProperty(screen, 'height', {
        get: () => ${screenRes.height},
        configurable: true
    });

    Object.defineProperty(screen, 'colorDepth', {
        get: () => ${colorDepth},
        configurable: true
    });

    Object.defineProperty(screen, 'pixelDepth', {
        get: () => ${colorDepth},
        configurable: true
    });

    // Timezone locale manipülasyonu
    const originalToLocaleString = Date.prototype.toLocaleString;
    const originalToLocaleDateString = Date.prototype.toLocaleDateString;
    const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
    
    Date.prototype.toLocaleString = function(locales, options) {
        return originalToLocaleString.call(this, '${language}', options);
    };
    
    Date.prototype.toLocaleDateString = function(locales, options) {
        return originalToLocaleDateString.call(this, '${language}', options);
    };
    
    Date.prototype.toLocaleTimeString = function(locales, options) {
        return originalToLocaleTimeString.call(this, '${language}', options);
    };

    // Canvas fingerprint varyasyonu
    const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalCanvasGetContext.call(this, contextType, ...args);
        if (contextType === '2d') {
            const originalGetImageData = context.getImageData;
            context.getImageData = function(...args) {
                const imageData = originalGetImageData.apply(this, args);
                // Pixel varyasyonu - çok küçük değişiklikler
                for (let i = 0; i < 10; i += 4) {
                    imageData.data[i] = Math.min(255, imageData.data[i] + (Math.random() * 0.5 - 0.25));
                }
                return imageData;
            };
            
            // Canvas toDataURL varyasyonu
            const originalToDataURL = this.toDataURL;
            this.toDataURL = function(...args) {
                return originalToDataURL.apply(this, args);
            };
        }
        return context;
    };

    // Font fingerprint varyasyonu
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function(text) {
        const result = originalMeasureText.call(this, text);
        if (result && typeof result.width === 'number') {
            // Çok küçük varyasyon (%0.1-0.3)
            result.width = result.width * (1 + (Math.random() * 0.002 - 0.001));
        }
        return result;
    };

    // AudioContext fingerprint varyasyonu
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
                            // Çok küçük varyasyonlar
                            for (let i = 0; i < 5; i++) {
                                channelData[i] += (Math.random() * 0.00001 - 0.000005);
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

    // Connection manipülasyonu
    Object.defineProperty(navigator, 'connection', {
        get: () => ({
            effectiveType: '${connection.type}',
            rtt: ${connection.rtt},
            downlink: ${connection.downlink},
            saveData: ${connection.saveData}
        }),
        configurable: true
    });

    // Max touch points manipülasyonu
    Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => ${platform === 'Win32' ? 0 : (platform === 'MacIntel' ? 5 : 0)},
        configurable: true
    });

    // Outer dimensions manipülasyonu
    Object.defineProperty(window, 'outerWidth', {
        get: () => window.innerWidth + ${Math.floor(Math.random() * 50) + 50},
        configurable: true
    });
    
    Object.defineProperty(window, 'outerHeight', {
        get: () => window.innerHeight + ${Math.floor(Math.random() * 100) + 100},
        configurable: true
    };

    // User agent manipülasyonu
    Object.defineProperty(navigator, 'userAgent', {
        get: () => '${getRandomUserAgent()}',
        configurable: true
    };

    // Console debug'ı disable et
    const originalDebug = console.debug;
    console.debug = () => {};

    // Performance timing varyasyonu
    const originalNow = performance.now;
    performance.now = function() {
        return originalNow.call(this) + (Math.random() * 2 - 1);
    };

    // Math.random seed varyasyonu (çok hafif)
    const originalRandom = Math.random;
    Math.random = function() {
        return originalRandom.call(this) * (1 + (Math.random() * 0.0000001 - 0.00000005));
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
function createFingerprintConfig(fingerprintId) {
    const viewport = getRandomViewport();
    const userAgent = getRandomUserAgent();
    const language = getRandomLanguage();
    
    return {
        contextOptions: {
            viewport: viewport,
            userAgent: userAgent,
            locale: language,
            timezoneId: 'Europe/Istanbul',
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': `${language},${language.split('-')[0]};q=0.9,en-US;q=0.8,en;q=0.7`,
                'accept-encoding': 'gzip, deflate, br',
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': `"${getRandomPlatform()}"`,
                'upgrade-insecure-requests': '1',
                'cache-control': 'max-age=0'
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
        service: 'PARALEL CONTEXT COOKIE COLLECTOR - SEKMESİZ MOD',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler'
        },
        mode: 'SEKMESİZ_DIRECT_CONTEXT',
        last_collection: lastCollectionTime,
        successful_sets_count: lastCookies.filter(set => set.success).length
    });
});

app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT COOKIE TOPLAMA ===`);
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
        context_mode: 'SEKMESİZ_DIRECT_CONTEXT',
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
        context_mode: 'SEKMESİZ_DIRECT_CONTEXT',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null
    });
});

// 🎯 OTOMATİK CONTEXT TOPLAMA - LASTCOOKIE KONTROLLÜ
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA AKTİF');
    
    setInterval(async () => {
        // 🎯 LASTCOOKIE KONTROLÜ - BOŞSA HEMEN ÇALIŞ, DOLUYSA ZAMANLAMA İLE
        const shouldRun = lastCookies.length === 0 || 
                         (lastCollectionTime && (Date.now() - lastCollectionTime.getTime() > CONFIG.AUTO_COLLECT_INTERVAL));
        
        if (shouldRun) {
            console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT TOPLAMA ===`);
            await getCookiesParallel();
        }
    }, 60000); // Her 1 dakikada bir kontrol
}

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 PARALEL CONTEXT COOKIE COLLECTOR - SEKMESİZ MOD');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log(`📍 Mod: ✅ SEKMESİZ DIRECT CONTEXT`);
    console.log(`📍 /collect - ${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla`);
    console.log('🔒 GELİŞMİŞ FINGERPRINT ÖZELLİKLERİ:');
    console.log('   ├── Canvas Spoofing: ✅ AKTİF');
    console.log('   ├── WebGL Spoofing: ✅ AKTİF'); 
    console.log('   ├── AudioContext Spoofing: ✅ AKTİF');
    console.log('   ├── Font Spoofing: ✅ AKTİF');
    console.log('   ├── Timezone Spoofing: ✅ AKTİF');
    console.log('   └── Hardware Spoofing: ✅ AKTİF');
});
