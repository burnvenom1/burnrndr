// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - DIRECT CONTEXT MODE (SEKMESİZ)
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI + SCRAPINGANT İLE KAYIT TAMAMLAMA
// 🔥 SADECE SON KAYIT İSTEĞİ SCRAPINGANT ÜZERİNDEN (browser=false)

const express = require('express');
const { chromium } = require('playwright');
const axios = require('axios');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    PARALLEL_CONTEXTS: 1,
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000,
    MIN_COOKIE_COUNT: 7,
    AUTO_REGISTRATION: true,
    SCRAPINGANT_API_KEY: 'c1b8d72bc98d4bc98453dd5624673f52'
};

// 🎯 SCRAPINGANT CLIENT - SADECE KAYIT TAMAMLAMA İÇİN (browser=false)
class ScrapingAntClient {
    constructor() {
        this.apiKey = CONFIG.SCRAPINGANT_API_KEY;
        this.baseUrl = 'https://api.scrapingant.com/v2/general';
    }

    async post(url, data, headers = {}) {
        try {
            // browser=false parametresi eklendi
            const encodedUrl = encodeURIComponent(url);
            const requestUrl = `${this.baseUrl}?url=${encodedUrl}&x-api-key=${this.apiKey}&browser=false`;
            
            console.log(`📡 [ScrapingAnt] POST isteği: ${url}`);
            console.log(`   API Key: ${this.apiKey.substring(0, 10)}...`);
            console.log(`   Browser: false (sadece HTTP isteği)`);
            
            const response = await axios({
                method: 'POST',
                url: requestUrl,
                data: JSON.stringify(data),
                headers: {
                    'Ant-Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout: 30000
            });
            
            console.log(`✅ [ScrapingAnt] Başarılı: ${response.status}`);
            
            return {
                success: true,
                status: response.status,
                data: response.data,
                headers: response.headers
            };
        } catch (error) {
            console.log(`❌ [ScrapingAnt] Hata:`, error.message);
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Data:`, JSON.stringify(error.response.data).substring(0, 200));
            }
            return {
                success: false,
                error: error.message,
                status: error.response?.status || 500,
                data: error.response?.data
            };
        }
    }
}

// 🎯 RANDOM TÜRK İSİM ÜRETİCİ - TEK LİSTEDEN 2 KERE SEÇİM
class TurkishNameGenerator {
    static getRandomNames() {
        const names = [
            "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "İsmail", 
            "Yusuf", "Ömer", "Ramazan", "Muhammed", "Süleyman", "Halil", "Osman", "Fatih",
            "Emre", "Can", "Burak", "Serkan", "Murat", "Kemal", "Orhan", "Cemal", "Selim",
            "Cengiz", "Volkan", "Uğur", "Barış", "Onur", "Mert", "Tolga", "Erhan", "Sercan",
            "Ayşe", "Fatma", "Emine", "Hatice", "Zeynep", "Elif", "Meryem", "Şerife", "Zehra",
            "Sultan", "Hanife", "Havva", "Rabia", "Hacer", "Yasemin", "Esra", "Seda",
            "Gamze", "Derya", "Pınar", "Burcu", "Cansu", "Ebru", "Gizem", "Aslı", "Sibel"
        ];
        
        const firstName = names[Math.floor(Math.random() * names.length)];
        let lastName;
        do {
            lastName = names[Math.floor(Math.random() * names.length)];
        } while (lastName === firstName);
        
        return { firstName, lastName };
    }
}

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
                    const registrationResult = await this.doRegistrationInContext(
                        page, 
                        context, 
                        job.id, 
                        cookieResult.cookies, 
                        job.fingerprintConfig
                    );
                    
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

    // 🎯 CONTEXT İÇİ ÜYELİK - SADECE SON KAYIT SCRAPINGANT İLE
    async doRegistrationInContext(page, context, jobId, collectedCookies, fingerprintConfig) {
        console.log(`📧 [Context #${jobId}] ÜYELİK BAŞLATILIYOR...`);
        
        try {
            const session = new HepsiburadaSession();
            
            collectedCookies.forEach(cookie => {
                session.cookies.set(cookie.name, {
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path
                });
            });

            console.log(`🍪 [Context #${jobId}] ${collectedCookies.length} cookie alındı`);

            const userAgent = fingerprintConfig.contextOptions.userAgent;
            const extraHeaders = fingerprintConfig.contextOptions.extraHTTPHeaders;
            
            console.log(`🖥️ [Context #${jobId}] Context fingerprint kullanılıyor: ${userAgent.substring(0, 50)}...`);

            session.baseHeaders = {
                'accept': 'application/json, text/plain, */*',
                'accept-language': extraHeaders['accept-language'] || 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'accept-encoding': 'gzip, deflate, br',
                'cache-control': 'no-cache',
                'connection': 'keep-alive',
                'origin': 'https://giris.hepsiburada.com',
                'referer': 'https://giris.hepsiburada.com/',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors', 
                'sec-fetch-site': 'same-site',
                'user-agent': userAgent,
                'sec-ch-ua': extraHeaders['sec-ch-ua'] || '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
                'sec-ch-ua-mobile': extraHeaders['sec-ch-ua-mobile'] || '?0',
                'sec-ch-ua-platform': extraHeaders['sec-ch-ua-platform'] || '"Windows"'
            };

            const email = session.generateEmail();
            console.log(`📧 [Context #${jobId}] Email: ${email}`);

            // 🎯 1. XSRF Token al (Worker üzerinden)
            console.log(`🔄 [Context #${jobId}] 1. XSRF Token alınıyor (Worker)...`);
            
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
                    console.log(`✅ [Context #${jobId}] 1. XSRF TOKEN ALINDI`);
                    
                    if (xsrfResponse.headers && xsrfResponse.headers['set-cookie']) {
                        session.parseAndStoreCookies(xsrfResponse.headers['set-cookie']);
                    }
                }
            }

            if (!session.xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            // 🎯 2. Kayıt isteği (Worker üzerinden)
            console.log(`📨 [Context #${jobId}] Kayıt isteği gönderiliyor (Worker)...`);

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
                    console.log(`✅ [Context #${jobId}] OTP KODU HAZIR: ${otpCode}`);
                    
                    // 🎯 3. OTP doğrulama öncesi 2. XSRF Token (Worker üzerinden)
                    console.log(`🔄 [Context #${jobId}] 2. XSRF Token alınıyor (Worker)...`);
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

                    // 🎯 4. OTP doğrulama (Worker üzerinden)
                    console.log(`📨 [Context #${jobId}] OTP doğrulama gönderiliyor (Worker)...`);
                    
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

                        // 🎯 5. 3. XSRF Token (Worker üzerinden)
                        console.log(`🔄 [Context #${jobId}] 3. XSRF Token alınıyor (Worker)...`);
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

                        // 🎯 RANDOM İSİMLERİ AL
                        const { firstName, lastName } = TurkishNameGenerator.getRandomNames();
                        console.log(`👤 [Context #${jobId}] İsim: ${firstName} ${lastName}`);

                        // 🔥🔥🔥 6. SON KAYIT TAMAMLAMA - SCRAPINGANT İLE (browser=false) 🔥🔥🔥
                        console.log(`📡 [Context #${jobId}] KAYIT TAMAMLAMA (SCRAPINGANT API) GÖNDERİLİYOR...`);
                        console.log(`   URL: https://oauth.hepsiburada.com/api/authenticate/register`);
                        console.log(`   Parametreler: browser=false`);
                        console.log(`   Cookie: ${session.getCookieHeader().substring(0, 80)}...`);
                        
                        const scrapingAnt = new ScrapingAntClient();
                        
                        const completeHeaders = {
                            'accept': session.baseHeaders['accept'],
                            'accept-language': session.baseHeaders['accept-language'],
                            'content-type': 'application/json',
                            'x-xsrf-token': xsrfToken3,
                            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                            'cookie': session.getCookieHeader(),
                            'user-agent': userAgent,
                            'origin': 'https://giris.hepsiburada.com',
                            'referer': 'https://giris.hepsiburada.com/'
                        };

                        const completeResponse = await scrapingAnt.post(
                            'https://oauth.hepsiburada.com/api/authenticate/register',
                            {
                                subscribeEmail: true,
                                firstName: firstName,
                                lastName: lastName,
                                password: "Hepsiburada1",
                                subscribeSms: false,
                                requestId: requestId
                            },
                            completeHeaders
                        );
                        
                        if (completeResponse.success && completeResponse.status === 200 && completeResponse.data && completeResponse.data.success) {
                            console.log(`🎉 [Context #${jobId}] KAYIT BAŞARIYLA TAMAMLANDI! (ScrapingAnt ile)`);
                            return { 
                                success: true, 
                                email: email,
                                firstName: firstName,
                                lastName: lastName,
                                accessToken: completeResponse.data?.data?.accessToken,
                                via: 'SCRAPINGANT'
                            };
                        } else {
                            console.log(`❌ [Context #${jobId}] Kayıt tamamlama başarısız:`, completeResponse.error || completeResponse.data);
                            return { success: false, error: 'Kayıt tamamlama başarısız', via: 'SCRAPINGANT', details: completeResponse };
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

// 🎯 GELİŞMİŞ FINGERPRINT SPOOFING FONKSİYONLARI
function getCanvasFingerprintScript() {
    return `
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
    };`;
}

function getWebGLFingerprintScript() {
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
                    return originalGetParameter.call(this, parameter);
                };
            }
            return context;
        }
        return originalGetContext.call(this, contextType, ...args);
    };`;
}

function getAudioContextFingerprintScript() {
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
    }`;
}

function getFontFingerprintScript() {
    return `
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function(text) {
        const result = originalMeasureText.call(this, text);
        if (result && typeof result.width === 'number') {
            result.width = result.width * (1 + (Math.random() * 0.02 - 0.01));
        }
        return result;
    };`;
}

function getTimezoneLocaleScript() {
    return `
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() { return -180; };
    
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
    };`;
}

function getHardwareConcurrencyScript() {
    return `
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => [4, 6, 8, 12, 16][Math.floor(Math.random() * 5)],
        configurable: true
    });
    Object.defineProperty(navigator, 'deviceMemory', {
        get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
        configurable: true
    });`;
}

function getScreenResolutionScript() {
    return `
    Object.defineProperty(screen, 'width', {
        get: () => [1920, 1366, 1536, 1440, 1600][Math.floor(Math.random() * 5)],
        configurable: true
    });
    Object.defineProperty(screen, 'height', {
        get: () => [1080, 768, 864, 900, 1024][Math.floor(Math.random() * 5)],
        configurable: true
    });
    Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });`;
}

function getAdvancedFingerprintScript() {
    return `
    ${getCanvasFingerprintScript()}
    ${getWebGLFingerprintScript()}
    ${getAudioContextFingerprintScript()}
    ${getFontFingerprintScript()}
    ${getTimezoneLocaleScript()}
    ${getHardwareConcurrencyScript()}
    ${getScreenResolutionScript()}
    
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    `;
}

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
                        console.log(`🎉 ÜYELİK BAŞARILI: ${result.value.registration.email} (${result.value.registration.via || 'WORKER'})`);
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
        console.log(`   Son Kayıt İsteği: SCRAPINGANT API ile (browser=false)`);
        
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
                final_registration_via: 'SCRAPINGANT_API',
                scrapingant_browser: false
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
        service: 'PARALEL CONTEXT COOKIE COLLECTOR - SCRAPINGANT ENTEGRASYONLU',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            final_registration_via: 'SCRAPINGANT_API',
            scrapingant_browser: false
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + üyelik (son kayıt ScrapingAnt ile)`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/scrapingant-status': 'ScrapingAnt API durumu'
        },
        mode: 'SEKMESİZ_DIRECT_CONTEXT_WITH_SCRAPINGANT',
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
        context_mode: 'SEKMESİZ_DIRECT_CONTEXT_WITH_SCRAPINGANT',
        chrome_extension_compatible: true,
        final_registration_via: 'SCRAPINGANT_API'
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
        context_mode: 'SEKMESİZ_DIRECT_CONTEXT_WITH_SCRAPINGANT',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null
    });
});

app.get('/scrapingant-status', (req, res) => {
    res.json({
        service: 'ScrapingAnt API',
        status: 'configured',
        api_key: CONFIG.SCRAPINGANT_API_KEY.substring(0, 10) + '...',
        browser_param: false,
        usage: 'SADECE son kayıt tamamlama işlemi için kullanılır',
        endpoints_used: [
            'POST https://oauth.hepsiburada.com/api/authenticate/register?browser=false'
        ]
    });
});

// 🎯 OTOMATİK CONTEXT TOPLAMA
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA AKTİF');
    console.log(`🔄 Otomatik toplama: ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir`);
    console.log(`🔥 Son kayıt isteği SCRAPINGANT API ile gönderilecek (browser=false)`);
    
    let isAutoCollectRunning = false;
    
    const autoCollect = async () => {
        if (isAutoCollectRunning) {
            console.log('⏳ Otomatik toplama zaten çalışıyor, atlanıyor...');
            return;
        }
        
        try {
            isAutoCollectRunning = true;
            console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT TOPLAMA ===`);
            await getCookiesParallel();
        } catch (error) {
            console.log('❌ Otomatik toplama hatası:', error.message);
        } finally {
            isAutoCollectRunning = false;
        }
    };

    setTimeout(autoCollect, 10000);
    setInterval(autoCollect, CONFIG.AUTO_COLLECT_INTERVAL);
}

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 PARALEL CONTEXT COOKIE COLLECTOR - SCRAPINGANT ENTEGRASYONLU');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log(`📍 Mod: SEKMESİZ DIRECT CONTEXT + SCRAPINGANT`);
    console.log(`📍 /collect - ${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla`);
    console.log(`🔥 SCRAPINGANT KULLANIMI: SADECE son kayıt tamamlama (POST /api/authenticate/register)`);
    console.log(`🔑 API Key: ${CONFIG.SCRAPINGANT_API_KEY.substring(0, 10)}...`);
    console.log(`🖥️ browser parametresi: false`);
    console.log('\n🔒 GELİŞMİŞ FINGERPRINT ÖZELLİKLERİ:');
    console.log('   ├── Canvas Spoofing: ✅ AKTİF');
    console.log('   ├── WebGL Spoofing: ✅ AKTİF'); 
    console.log('   ├── AudioContext Spoofing: ✅ AKTİF');
    console.log('   ├── Font Spoofing: ✅ AKTİF');
    console.log('   ├── Timezone Spoofing: ✅ AKTİF');
    console.log('   └── Hardware Spoofing: ✅ AKTİF');
    console.log('\n📡 İSTEK AKIŞI:');
    console.log('   1. XSRF Token alma (Worker)');
    console.log('   2. Kayıt isteği (Worker)');
    console.log('   3. 2. XSRF Token (Worker)');
    console.log('   4. OTP doğrulama (Worker)');
    console.log('   5. 3. XSRF Token (Worker)');
    console.log('   6. 🔥 KAYIT TAMAMLAMA (ScrapingAnt - browser=false)');
    console.log('\n🍪 Cookie\'ler ScrapingAnt isteğine header olarak ekleniyor!\n');
});
