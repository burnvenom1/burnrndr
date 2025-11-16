// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - HEADER YAKALAMA + WORKER KAYIT
// 🎯 COOKIE → WORKERSIZ GET → HEADER YAKALAMA → WORKER ÜYELİK
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

// 🎯 CONTEXT İÇİ HEADER YAKALAMA YÖNETİCİSİ
class ContextHeaderCapturer {
    constructor(page, context, jobId) {
        this.page = page;
        this.context = context;
        this.jobId = jobId;
        this.capturedHeaders = null;
    }

    // 🎯 COOKIE'LERDEN SONRA WORKERSIZ GET AT VE HEADER YAKALA
    async captureHeadersAfterCookies() {
        console.log(`🎯 [Context #${this.jobId}] Cookie'ler tamam, workersız GET atılıyor...`);
        
        return new Promise((resolve, reject) => {
            let headersCaptured = false;
            let timeoutId;

            // 🎯 NETWORK TRAFİĞİNİ DİNLE - HEADER'LARI YAKALA
            const requestHandler = async (request) => {
                const url = request.url();
                
                if (url.includes('/api/features?clientId=SPA') && !headersCaptured) {
                    headersCaptured = true;
                    clearTimeout(timeoutId);
                    
                    try {
                        const headers = request.headers();
                        console.log(`✅ [Context #${this.jobId}] HEADER'LAR YAKALANDI!`);
                        
                        // 🎯 YAKALANAN HEADER'LARI KAYDET
                        this.capturedHeaders = {
                            'accept': headers['accept'],
                            'accept-encoding': headers['accept-encoding'],
                            'accept-language': headers['accept-language'],
                            'cookie': headers['cookie'],
                            'fingerprint': headers['fingerprint'],
                            'origin': headers['origin'],
                            'priority': headers['priority'],
                            'referer': headers['referer'],
                            'sec-ch-ua': headers['sec-ch-ua'],
                            'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'],
                            'sec-ch-ua-platform': headers['sec-ch-ua-platform'],
                            'sec-fetch-dest': headers['sec-fetch-dest'],
                            'sec-fetch-mode': headers['sec-fetch-mode'],
                            'sec-fetch-site': headers['sec-fetch-site'],
                            'user-agent': headers['user-agent'],
                            'x-xsrf-token': headers['x-xsrf-token']
                        };

                        console.log(`🔑 [Context #${this.jobId}] FINGERPRINT: ${headers['fingerprint']}`);
                        console.log(`🆔 [Context #${this.jobId}] XSRF-TOKEN: ${headers['x-xsrf-token']?.substring(0, 30)}...`);
                        console.log(`🍪 [Context #${this.jobId}] COOKIE COUNT: ${headers['cookie'] ? headers['cookie'].split(';').length : 0}`);

                        this.page.off('request', requestHandler);
                        
                        resolve({
                            success: true,
                            headers: this.capturedHeaders,
                            fingerprint: headers['fingerprint'],
                            xsrfToken: headers['x-xsrf-token']
                        });

                    } catch (error) {
                        this.page.off('request', requestHandler);
                        reject(error);
                    }
                }
            };

            // 🎯 REQUEST'LERİ DİNLEMEYİ BAŞLAT
            this.page.on('request', requestHandler);

            // 🎯 GİRİŞ SAYFASINA GİT - FEATURES ENDPOINT'İ OTOMATİK ÇAĞRILACAK
            this.page.goto('https://giris.hepsiburada.com/', { 
                waitUntil: 'networkidle',
                timeout: 15000
            }).catch((error) => {
                console.log(`❌ [Context #${this.jobId}] Giriş sayfası hatası: ${error.message}`);
            });

            // 🎯 TIMEOUT AYARLA
            timeoutId = setTimeout(() => {
                if (!headersCaptured) {
                    this.page.off('request', requestHandler);
                    reject(new Error('Header yakalama timeout - Features endpoint çağrılmadı'));
                }
            }, 15000);
        });
    }

    // 🎯 YAKALANAN HEADER'LARI WORKER İÇİN HAZIRLA
    getHeadersForWorker() {
        if (!this.capturedHeaders) {
            throw new Error('Header\'lar henüz yakalanmadı!');
        }

        return {
            'accept': this.capturedHeaders['accept'] || 'application/json, text/plain, */*',
            'accept-language': this.capturedHeaders['accept-language'] || 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'accept-encoding': this.capturedHeaders['accept-encoding'] || 'gzip, deflate, br, zstd',
            'user-agent': this.capturedHeaders['user-agent'],
            'content-type': 'application/json',
            'fingerprint': this.capturedHeaders['fingerprint'],
            'x-xsrf-token': this.capturedHeaders['x-xsrf-token'],
            'sec-ch-ua': this.capturedHeaders['sec-ch-ua'],
            'sec-ch-ua-mobile': this.capturedHeaders['sec-ch-ua-mobile'],
            'sec-ch-ua-platform': this.capturedHeaders['sec-ch-ua-platform'],
            'origin': this.capturedHeaders['origin'] || 'https://giris.hepsiburada.com',
            'referer': this.capturedHeaders['referer'] || 'https://giris.hepsiburada.com/',
            'sec-fetch-dest': this.capturedHeaders['sec-fetch-dest'],
            'sec-fetch-mode': this.capturedHeaders['sec-fetch-mode'],
            'sec-fetch-site': this.capturedHeaders['sec-fetch-site'],
            'priority': this.capturedHeaders['priority'],
            'cookie': this.capturedHeaders['cookie']
        };
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
            
            // 🎯 HEADER_RESULT'U TANIMLA
            let headerResult = null;
            
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [Context #${job.id}] COOKIE BAŞARILI - HEADER YAKALAMA BAŞLATILIYOR...`);
                
                try {
                    // 🎯 HEADER YAKALAYICIYI BAŞLAT
                    const headerCapturer = new ContextHeaderCapturer(page, context, job.id);
                    
                    // 🎯 COOKIE'LERDEN SONRA HEADER YAKALA
                    headerResult = await headerCapturer.captureHeadersAfterCookies();
                    
                    if (headerResult && headerResult.success) {
                        console.log(`✅ [Context #${job.id}] HEADER'LAR YAKALANDI - WORKER İLE KAYIT BAŞLATILIYOR...`);
                        
                        const session = new HepsiburadaSession();
                        
                        // 🎯 COOKIE'LERİ SESSION'A YÜKLE
                        cookieResult.cookies.forEach(cookie => {
                            session.cookies.set(cookie.name, {
                                name: cookie.name,
                                value: cookie.value,
                                domain: cookie.domain,
                                path: cookie.path
                            });
                        });

                        // 🎯 YAKALANAN HEADER'LARI SESSION'A YÜKLE
                        session.baseHeaders = headerCapturer.getHeadersForWorker();
                        session.xsrfToken = headerResult.xsrfToken;
                        session.fingerprint = headerResult.fingerprint;

                        const email = session.generateEmail();
                        console.log(`📧 [Context #${job.id}] Email: ${email}`);

                        // 🎯 WORKER İLE KAYIT İŞLEMLERİ
                        const registrationResult = await this.doRegistrationWithWorker(session, email, job.id);
                        
                        if (registrationResult.success) {
                            console.log(`🎉 [Context #${job.id}] WORKER İLE ÜYELİK BAŞARILI: ${registrationResult.email}`);
                            cookieResult.registration = registrationResult;
                        } else {
                            console.log(`❌ [Context #${job.id}] WORKER İLE ÜYELİK BAŞARISIZ: ${registrationResult.error}`);
                            cookieResult.registration = registrationResult;
                        }
                    } else {
                        console.log(`❌ [Context #${job.id}] Header yakalama başarısız`);
                        cookieResult.registration = { success: false, error: 'Header yakalama başarısız' };
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
                captured_headers: headerResult ? {
                    fingerprint: headerResult.fingerprint,
                    xsrf_token: headerResult.xsrfToken,
                    user_agent: headerResult.headers['user-agent']
                } : null,
                worker_info: {
                    userAgent: job.fingerprintConfig.contextOptions.userAgent.substring(0, 40) + '...',
                    viewport: job.fingerprintConfig.contextOptions.viewport,
                    isolation: 'FULL_CONTEXT_ISOLATION',
                    method: 'COOKIE → HEADER_YAKALAMA → WORKER_KAYIT'
                }
            };
            
        } catch (error) {
            console.log(`❌ [Context #${job.id}] Genel hata: ${error.message}`);
            throw error;
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

    // 🎯 WORKER İLE KAYIT İŞLEMLERİ
    async doRegistrationWithWorker(session, email, jobId) {
        console.log(`📧 [Context #${jobId}] Worker ile kayıt başlatılıyor...`);
        
        try {
            // 🎯 XSRF TOKEN KONTROLÜ
            if (!session.xsrfToken) {
                console.log(`🔄 [Context #${jobId}] XSRF Token alınıyor...`);
                
                const xsrfRequestData = {
                    targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                    method: 'GET',
                    headers: session.baseHeaders
                };

                const xsrfResponse = await session.sendWorkerRequest(xsrfRequestData);
                
                if (xsrfResponse.status === 200) {
                    const bodyData = typeof xsrfResponse.body === 'string' ? JSON.parse(xsrfResponse.body) : xsrfResponse.body;
                    if (bodyData && bodyData.xsrfToken) {
                        session.xsrfToken = bodyData.xsrfToken;
                        session.baseHeaders['x-xsrf-token'] = bodyData.xsrfToken;
                        console.log(`✅ [Context #${jobId}] XSRF TOKEN ALINDI`);
                        
                        if (xsrfResponse.headers && xsrfResponse.headers['set-cookie']) {
                            session.parseAndStoreCookies(xsrfResponse.headers['set-cookie']);
                        }
                    }
                }
            }

            if (!session.xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            // 🎯 KAYIT İSTEĞİ
            console.log(`📨 [Context #${jobId}] Kayıt isteği gönderiliyor...`);

            const registerData = {
                targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/createregisterrequest',
                method: 'POST',
                headers: session.baseHeaders,
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
                    
                    // 🎯 2. XSRF TOKEN AL
                    console.log(`🔄 [Context #${jobId}] 2. XSRF Token alınıyor...`);
                    
                    const xsrfRequestData = {
                        targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                        method: 'GET',
                        headers: session.baseHeaders
                    };

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

                    // 🎯 OTP DOĞRULAMA
                    console.log(`📨 [Context #${jobId}] OTP doğrulama gönderiliyor...`);
                    
                    const otpVerifyHeaders = {
                        ...session.baseHeaders,
                        'x-xsrf-token': xsrfToken2
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

                        // 🎯 3. XSRF TOKEN AL
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

                        // 🎯 KAYIT TAMAMLAMA
                        console.log(`📨 [Context #${jobId}] Kayıt tamamlama gönderiliyor...`);
                        
                        const completeHeaders = {
                            ...session.baseHeaders,
                            'x-xsrf-token': xsrfToken3
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
            console.log(`❌ [Context #${jobId}] Worker kayıt hatası:`, error.message);
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
                        captured_headers: result.value.captured_headers,
                        collection_time: new Date(),
                        worker_info: result.value.worker_info
                    };
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ CONTEXT #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie`);
                    
                    if (result.value.registration && result.value.registration.success) {
                        collectionStats.registration_success++;
                        console.log(`🎉 WORKER İLE ÜYELİK BAŞARILI: ${result.value.registration.email}`);
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
        console.log(`   Worker Üyelik Başarılı: ${successfulRegistrationCount}`);
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
                method: 'COOKIE → HEADER_YAKALAMA → WORKER_KAYIT'
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
        service: 'PARALEL CONTEXT COOKIE COLLECTOR - HEADER YAKALAMA + WORKER',
        version: '4.0.0',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            auto_collect: CONFIG.AUTO_COLLECT_ENABLED
        },
        parallel_status: parallelCollector.getStatus(),
        collection_stats: collectionStats,
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla → HEADER YAKALAMA → WORKER üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/status': 'Sistem durumu'
        },
        mode: 'COOKIE → HEADER_YAKALAMA → WORKER_KAYIT',
        last_collection: lastCollectionTime,
        successful_sets_count: lastCookies.filter(set => set.success).length
    });
});

app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT COOKIE TOPLAMA ===`);
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
        context_mode: 'COOKIE → HEADER_YAKALAMA → WORKER_KAYIT',
        chrome_extension_compatible: true
    };
    
    successfulSets.forEach(set => {
        result[`context_${set.set_id}`] = {
            cookies_count: set.cookies.length,
            chrome_extension_cookies: set.chrome_extension_cookies,
            registration: set.registration,
            captured_headers: set.captured_headers,
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
        context_mode: 'COOKIE → HEADER_YAKALAMA → WORKER_KAYIT',
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
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA AKTİF');
    
    setInterval(async () => {
        const shouldRun = lastCookies.length === 0 || 
                         (lastCollectionTime && (Date.now() - lastCollectionTime.getTime() > CONFIG.AUTO_COLLECT_INTERVAL));
        
        if (shouldRun) {
            console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT TOPLAMA ===`);
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
    console.log('\n' + '='.repeat(70));
    console.log('🚀 PARALEL CONTEXT COOKIE COLLECTOR - HEADER YAKALAMA + WORKER');
    console.log('='.repeat(70));
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log(`📍 Mod: ✅ COOKIE → HEADER_YAKALAMA → WORKER_KAYIT`);
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
    console.log('🎯 ÇALIŞMA SIRASI:');
    console.log('   1. ✅ Cookie topla');
    console.log('   2. ✅ Workersız GET at → Header yakala');
    console.log('   3. ✅ Worker ile üyelik yap');
    console.log('='.repeat(70));
});

module.exports = app;
