// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - EN BAŞTAN HEADER YAKALAMA
// 🎯 NETWORK CAPTURE EN BAŞTAN AKTİF, FINGERPRINT KAÇIRILMAZ
const express = require('express');
const { chromium } = require('playwright');
const app = express();

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    PARALLEL_CONTEXTS: 4,
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000,
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 25000,
    MIN_COOKIE_COUNT: 7,
    AUTO_REGISTRATION: true,
    TARGET_URL: 'https://oauth.hepsiburada.com/api/features?clientId=SPA'
};

// 🎯 RANDOM TÜRK İSİM ÜRETİCİ
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

// 🎯 NETWORK YAKALAMA SİSTEMİ - EN BAŞTAN AKTİF
class NetworkCapture {
    constructor(page, jobId) {
        this.page = page;
        this.jobId = jobId;
        this.allRequests = [];
        this.capturedHeaders = null;
        this.hasFingerprint = false;
    }

    async startCapture() {
        console.log(`📡 [Context #${this.jobId}] NETWORK CAPTURE EN BAŞTAN AKTİF!...`);
        
        await this.page.route('**/*', (route, request) => {
            const url = request.url();
            const method = request.method();
            const headers = request.headers();
            
            const requestInfo = {
                url: url,
                method: method,
                headers: { ...headers },
                timestamp: new Date().toISOString(),
                hasFingerprint: !!headers['fingerprint'],
                domain: this.extractDomain(url)
            };
            
            // 📍 TÜM İSTEKLERİ KAYDET
            this.allRequests.push(requestInfo);
            
            // 🎯 HEDEF URL'yi yakala
            if (url === CONFIG.TARGET_URL && headers['fingerprint'] && !this.capturedHeaders) {
                console.log(`🎯 [Context #${this.jobId}] HEDEF URL YAKALANDI: ${url}`);
                
                // XSRF TOKEN ve COOKIE DIŞINDAKİ tüm header'ları al
                this.capturedHeaders = this.extractHeadersWithoutXsrfAndCookies(headers);
                this.hasFingerprint = true;
                
                console.log(`✅ [Context #${this.jobId}] HEADERLAR ALINDI (XSRF ve Cookie hariç):`);
                Object.keys(this.capturedHeaders).forEach(key => {
                    if (key === 'fingerprint') {
                        console.log(`   🔐 FINGERPRINT: ${this.capturedHeaders[key]}`);
                    } else {
                        console.log(`   📋 ${key}: ${this.capturedHeaders[key]}`);
                    }
                });
            }
            
            route.continue();
        });

        console.log(`✅ [Context #${this.jobId}] Network capture EN BAŞTAN aktif edildi`);
    }

    // XSRF token ve cookie'ler DIŞINDAKİ header'ları al
    extractHeadersWithoutXsrfAndCookies(headers) {
        const excludedHeaders = [
            'cookie',
            'x-xsrf-token', 
            'xsrf-token',
            'x-csrf-token',
            'csrf-token',
            'set-cookie'
        ];
        
        const filteredHeaders = {};
        
        Object.keys(headers).forEach(key => {
            const lowerKey = key.toLowerCase();
            
            // Sadece excluded header'ları atla
            if (!excludedHeaders.some(excluded => lowerKey.includes(excluded))) {
                filteredHeaders[key] = headers[key];
            }
        });
        
        console.log(`🔧 [Context #${this.jobId}] Header filtrelendi:`);
        console.log(`   📤 Alınan: ${Object.keys(filteredHeaders).join(', ')}`);
        console.log(`   🚫 Atlanan: ${excludedHeaders.join(', ')}`);
        
        return filteredHeaders;
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    // Yakalanan header'ları getir
    getCapturedHeaders() {
        if (this.capturedHeaders && this.capturedHeaders['fingerprint']) {
            console.log(`✅ [Context #${this.jobId}] BAŞARILI! FINGERPRINT İLE HEADERLAR HAZIR`);
            return this.capturedHeaders;
        }
        
        console.log(`❌ [Context #${this.jobId}] Fingerprint içeren header bulunamadı`);
        return null;
    }

    // Tüm network trafiğini analiz et
    analyzeNetwork() {
        console.log(`\n📊 [Context #${this.jobId}] === NETWORK ANALİZİ ===`);
        console.log(`📊 Toplam istek: ${this.allRequests.length}`);
        console.log(`📊 GET istekleri: ${this.allRequests.filter(r => r.method === 'GET').length}`);
        console.log(`📊 POST istekleri: ${this.allRequests.filter(r => r.method === 'POST').length}`);
        console.log(`📊 Fingerprint içeren istekler: ${this.allRequests.filter(r => r.hasFingerprint).length}`);
        
        // Fingerprint içeren istekleri göster
        const fingerprintReqs = this.allRequests.filter(r => r.hasFingerprint);
        console.log(`📊 Fingerprint istekleri: ${fingerprintReqs.length}`);
        fingerprintReqs.forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.method} ${req.url}`);
        });
        
        // Hedef URL isteklerini göster
        const targetReqs = this.allRequests.filter(r => r.url.includes(CONFIG.TARGET_URL));
        console.log(`📊 Hedef URL istekleri: ${targetReqs.length}`);
        targetReqs.forEach((req, index) => {
            const fpInfo = req.hasFingerprint ? '🔐 FINGERPRINT' : '❌ FINGERPRINT_YOK';
            console.log(`   ${index + 1}. ${req.method} ${req.url} - ${fpInfo}`);
        });
        
        return {
            total_requests: this.allRequests.length,
            get_requests: this.allRequests.filter(r => r.method === 'GET').length,
            post_requests: this.allRequests.filter(r => r.method === 'POST').length,
            fingerprint_requests: fingerprintReqs.length,
            target_requests: targetReqs.length,
            has_captured_headers: !!(this.capturedHeaders && this.capturedHeaders['fingerprint'])
        };
    }
}

// 🎯 HEPŞİBURADA ÜYELİK SİSTEMİ - FİLTRELENMİŞ HEADER İLE
class HepsiburadaSession {
    constructor() {
        this.cookies = new Map();
        this.xsrfToken = null;
        this.capturedHeaders = null;
    }

    setCapturedHeaders(headers) {
        if (!headers || Object.keys(headers).length === 0 || !headers['fingerprint']) {
            throw new Error('FINGERPRINT BULUNAMADI - Header alınamadı');
        }
        
        this.capturedHeaders = headers;
        console.log('📡 FİLTRELENMİŞ HEADERLAR KAYDEDİLDİ (XSRF ve Cookie hariç):');
        
        Object.keys(headers).forEach(key => {
            if (key === 'fingerprint') {
                console.log(`   🔐 GERÇEK FINGERPRINT: ${headers[key]}`);
            } else {
                console.log(`   📋 ${key}: ${headers[key]}`);
            }
        });
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
            "lnmwhbvvf@emltmp.com", "bshuzcvvf@emltmp.com", "hsfsqxcug@emltmp.com",
            "nqywhdnoh@emlhub.com", "048370crsm@freeml.net", "04837v1h98@freeml.net",
            "04838e039m@freeml.net", "04839mk808@freeml.net", "0483aa1zj4@freeml.net",
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

    async sendRequestWithCapturedHeaders(url, method = 'GET', body = null) {
        if (!this.capturedHeaders) {
            throw new Error('FİLTRELENMİŞ HEADER BULUNAMADI');
        }

        // 🔥 ÖNEMLİ: Kendi cookie'lerimizi ve XSRF token'ımızı kullanıyoruz
        const headers = {
            ...this.capturedHeaders,  // Fingerprint, user-agent, vs.
            'cookie': this.getCookieHeader(),  // 🔥 KENDİ COOKIE'LERİMİZ
            'content-type': 'application/json'
        };

        // XSRF token ekle (eğer varsa)
        if (this.xsrfToken) {
            headers['x-xsrf-token'] = this.xsrfToken;
        }

        // App-key ekle (gerekiyorsa)
        if (url.includes('/api/authenticate/') || url.includes('/api/account/')) {
            headers['app-key'] = 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB';
        }

        console.log(`📤 ${method} ${url}`);
        console.log(`🔐 KULLANILAN FINGERPRINT: ${this.capturedHeaders['fingerprint']}`);
        console.log(`🍪 KULLANILAN COOKIE SAYISI: ${Array.from(this.cookies.values()).length}`);
        console.log(`🔑 XSRF TOKEN: ${this.xsrfToken ? 'VAR' : 'YOK'}`);

        const requestData = {
            targetUrl: url,
            method: method,
            headers: headers
        };

        if (body) {
            requestData.body = JSON.stringify(body);
        }
        
        const response = await this.sendWorkerRequest(requestData);
        
        // Gelen cookie'leri kaydet
        if (response.headers && response.headers['set-cookie']) {
            this.parseAndStoreCookies(response.headers['set-cookie']);
        }

        return response;
    }
}

// 🎯 PARALEL CONTEXT YÖNETİCİSİ - EN BAŞTAN HEADER YAKALAMA
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
            
            console.log(`📡 [Context #${job.id}] NETWORK CAPTURE EN BAŞTAN BAŞLATILIYOR...`);
            
            // 🔥 EN BAŞTAN NETWORK CAPTURE AKTİF
            const networkCapture = new NetworkCapture(page, job.id);
            await networkCapture.startCapture();
            
            console.log(`🌐 [Context #${job.id}] Sayfaya gidiliyor (Network aktif)...`);
            
            // Sayfaya git (network zaten aktif)
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            console.log(`✅ [Context #${job.id}] Sayfa yüklendi, cookie toplama başlıyor...`);
            
            // Cookie toplamayı bekle
            const cookieResult = await this.waitForCookies(context, job.id);
            
            if (cookieResult.success) {
                console.log(`🎉 [Context #${job.id}] COOKIE TOPLAMA BAŞARILI! HEADERLAR KONTROL EDİLİYOR...`);
                
                // Header'ları al (zaten yakalanmış olabilir)
                const capturedHeaders = networkCapture.getCapturedHeaders();
                const networkAnalysis = networkCapture.analyzeNetwork();
                
                if (!capturedHeaders) {
                    throw new Error('Cookie toplama öncesi veya sırasında fingerprint içeren header bulunamadı');
                }
                
                console.log(`✅ [Context #${job.id}] FİLTRELENMİŞ HEADERLAR ALINDI!`);
                
                if (CONFIG.AUTO_REGISTRATION) {
                    console.log(`🎯 [Context #${job.id}] FİLTRELENMİŞ HEADER İLE ÜYELİK BAŞLATILIYOR...`);
                    
                    try {
                        const registrationResult = await this.doRegistrationInContext(
                            job.id, 
                            cookieResult.cookies, 
                            capturedHeaders
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
                    success: true,
                    cookies: cookieResult.cookies,
                    chrome_extension_cookies: convertToChromeExtensionFormat(cookieResult.cookies),
                    stats: cookieResult.stats,
                    attempts: cookieResult.attempts,
                    registration: cookieResult.registration,
                    captured_headers: capturedHeaders,
                    fingerprint: capturedHeaders['fingerprint'],
                    headers_source: 'EN_BAŞTAN_YAKALANDI',
                    network_analysis: networkAnalysis,
                    worker_info: {
                        userAgent: job.fingerprintConfig.contextOptions.userAgent.substring(0, 40) + '...',
                        viewport: job.fingerprintConfig.contextOptions.viewport,
                        isolation: 'FULL_CONTEXT_ISOLATION'
                    }
                };
                
            } else {
                console.log(`❌ [Context #${job.id}] Cookie toplama başarısız`);
                return {
                    jobId: job.id,
                    success: false,
                    error: 'Cookie toplama başarısız',
                    cookies: cookieResult.cookies,
                    stats: cookieResult.stats,
                    attempts: cookieResult.attempts
                };
            }
            
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
            
            console.log(`⏳ [Context #${jobId}] Cookie bekleniyor... (${attempts}/${maxAttempts}) - ${allCookies.length} cookie`);
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

    async doRegistrationInContext(jobId, collectedCookies, capturedHeaders) {
        console.log(`📧 [Context #${jobId}] FİLTRELENMİŞ HEADER İLE ÜYELİK BAŞLATILIYOR...`);
        
        try {
            const session = new HepsiburadaSession();
            
            session.setCapturedHeaders(capturedHeaders);
            
            collectedCookies.forEach(cookie => {
                session.cookies.set(cookie.name, {
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path
                });
            });

            console.log(`🍪 [Context #${jobId}] ${collectedCookies.length} cookie alındı`);
            console.log(`🔐 [Context #${jobId}] GERÇEK FINGERPRINT: ${capturedHeaders['fingerprint']}`);

            const email = session.generateEmail();
            console.log(`📧 [Context #${jobId}] Email: ${email}`);

            const beklemeSuresi = Math.random() * 4000 + 1000;
            console.log(`⏳ [Context #${jobId}] İlk istek öncesi ${Math.round(beklemeSuresi/1000)}s bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, beklemeSuresi));

            console.log(`🔄 [Context #${jobId}] XSRF Token alınıyor...`);
            
            const xsrfResponse = await session.sendRequestWithCapturedHeaders(
                'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                'GET'
            );
                
            if (xsrfResponse.status === 200) {
                const bodyData = typeof xsrfResponse.body === 'string' ? JSON.parse(xsrfResponse.body) : xsrfResponse.body;
                if (bodyData && bodyData.xsrfToken) {
                    session.xsrfToken = bodyData.xsrfToken;
                    console.log(`✅ [Context #${jobId}] XSRF TOKEN ALINDI`);
                }
            }

            if (!session.xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            console.log(`📨 [Context #${jobId}] Kayıt isteği gönderiliyor...`);

            const registerResponse = await session.sendRequestWithCapturedHeaders(
                'https://oauth.hepsiburada.com/api/authenticate/createregisterrequest',
                'POST',
                { email: email }
            );

            const registerBody = typeof registerResponse.body === 'string' ? JSON.parse(registerResponse.body) : registerResponse.body;
            
            if (registerResponse.status === 200 && registerBody && registerBody.success) {
                console.log(`✅ [Context #${jobId}] KAYIT İSTEĞİ BAŞARILI!`);
                const referenceId = registerBody.data?.referenceId;

                console.log(`⏳ [Context #${jobId}] OTP KODU BEKLENİYOR (15 saniye)...`);
                await new Promise(resolve => setTimeout(resolve, 15000));

                console.log(`📱 [Context #${jobId}] OTP kodu alınıyor...`);
                const otpCode = await session.getOtpCode(email);
                
                if (otpCode) {
                    console.log(`✅ [Context #${jobId}] OTP KODU HAZIR:`, otpCode);
                    
                    console.log(`🔄 [Context #${jobId}] 2. XSRF Token alınıyor...`);
                    const xsrfResponse2 = await session.sendRequestWithCapturedHeaders(
                        'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                        'GET'
                    );
                    
                    let xsrfToken2 = null;
                    if (xsrfResponse2.status === 200) {
                        const bodyData2 = typeof xsrfResponse2.body === 'string' ? JSON.parse(xsrfResponse2.body) : xsrfResponse2.body;
                        if (bodyData2 && bodyData2.xsrfToken) {
                            xsrfToken2 = bodyData2.xsrfToken;
                            session.xsrfToken = xsrfToken2;
                            console.log(`✅ [Context #${jobId}] 2. XSRF TOKEN ALINDI`);
                        }
                    }

                    if (!xsrfToken2) {
                        throw new Error('2. XSRF Token alınamadı');
                    }

                    console.log(`📨 [Context #${jobId}] OTP doğrulama gönderiliyor...`);
                    
                    const otpVerifyResponse = await session.sendRequestWithCapturedHeaders(
                        'https://oauth.hepsiburada.com/api/account/ValidateTwoFactorEmailOtp',
                        'POST',
                        {
                            otpReference: referenceId,
                            otpCode: otpCode
                        }
                    );

                    const otpVerifyBody = typeof otpVerifyResponse.body === 'string' ? JSON.parse(otpVerifyResponse.body) : otpVerifyResponse.body;

                    if (otpVerifyResponse.status === 200 && otpVerifyBody && otpVerifyBody.success) {
                        console.log(`✅ [Context #${jobId}] OTP DOĞRULAMA BAŞARILI!`);
                        const requestId = otpVerifyBody.data?.requestId || otpVerifyBody.requestId;

                        console.log(`🔄 [Context #${jobId}] 3. XSRF Token alınıyor...`);
                        const xsrfResponse3 = await session.sendRequestWithCapturedHeaders(
                            'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
                            'GET'
                        );
                        
                        let xsrfToken3 = null;
                        if (xsrfResponse3.status === 200) {
                            const bodyData3 = typeof xsrfResponse3.body === 'string' ? JSON.parse(xsrfResponse3.body) : xsrfResponse3.body;
                            if (bodyData3 && bodyData3.xsrfToken) {
                                xsrfToken3 = bodyData3.xsrfToken;
                                session.xsrfToken = xsrfToken3;
                                console.log(`✅ [Context #${jobId}] 3. XSRF TOKEN ALINDI`);
                            }
                        }

                        if (!xsrfToken3) {
                            throw new Error('3. XSRF Token alınamadı');
                        }

                        const { firstName, lastName } = TurkishNameGenerator.getRandomNames();
                        console.log(`👤 [Context #${jobId}] İsim: ${firstName} ${lastName}`);

                        console.log(`📨 [Context #${jobId}] Kayıt tamamlama gönderiliyor...`);
                        
                        const completeResponse = await session.sendRequestWithCapturedHeaders(
                            'https://oauth.hepsiburada.com/api/authenticate/register',
                            'POST',
                            {
                                subscribeEmail: true,
                                firstName: firstName,
                                lastName: lastName,
                                password: "Hepsiburada1",
                                subscribeSms: false,
                                requestId: requestId
                            }
                        );

                        const completeBody = typeof completeResponse.body === 'string' ? JSON.parse(completeResponse.body) : completeResponse.body;

                        if (completeResponse.status === 200 && completeBody && completeBody.success) {
                            console.log(`🎉 [Context #${jobId}] KAYIT BAŞARIYLA TAMAMLANDI!`);
                            return { 
                                success: true, 
                                email: email,
                                firstName: firstName,
                                lastName: lastName,
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

// 🎯 DİĞER FONKSİYONLAR
function getAdvancedFingerprintScript() {
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
    };
    
    const originalGetContextWebGL = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
            const context = originalGetContextWebGL.call(this, contextType, ...args);
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
        return originalGetContextWebGL.call(this, contextType, ...args);
    };
    
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
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

const parallelCollector = new ParallelContextCollector();

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

async function getCookiesParallel() {
    let browser;
    const allResults = [];
    const currentSuccessfulSets = [];
    
    try {
        console.log(`🚀 ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT BAŞLATILIYOR...`);
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
                        captured_headers: result.value.captured_headers,
                        fingerprint: result.value.fingerprint,
                        headers_source: result.value.headers_source,
                        collection_time: new Date(),
                        worker_info: result.value.worker_info
                    };
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ CONTEXT #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie - Fingerprint: ${result.value.fingerprint}`);
                    
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
        console.log(`   Gerçek Fingerprint: ${successfulCount}`);
        
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
            fingerprint_stats: {
                captured: successfulCount,
                failed: allResults.length - successfulCount
            },
            cookie_sets: currentSuccessfulSets,
            parallel_config: {
                parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
                isolation: 'FULL_CONTEXT_ISOLATION',
                auto_registration: CONFIG.AUTO_REGISTRATION,
                header_capture: 'EN_BAŞTAN_YAKALAMA'
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

// 🎯 EXPRESS ROUTES
app.get('/', (req, res) => {
    res.json({
        service: 'PARALEL CONTEXT - EN BAŞTAN HEADER YAKALAMA',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            header_capture: 'EN_BAŞTAN_YAKALAMA',
            target_url: CONFIG.TARGET_URL
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/status': 'Sistem durumu'
        },
        mode: 'EN_BAŞTAN_HEADER_YAKALAMA',
        last_collection: lastCollectionTime,
        successful_sets_count: lastCookies.filter(set => set.success).length
    });
});

app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT ÇALIŞTIRILIYOR ===`);
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
        fingerprint_guarantee: 'TÜMÜ_GERÇEK_FINGERPRINT',
        context_mode: 'EN_BAŞTAN_HEADER_YAKALAMA',
        chrome_extension_compatible: true
    };
    
    successfulSets.forEach(set => {
        result[`context${set.set_id}`] = {
            cookies: set.chrome_extension_cookies,
            registration: set.registration,
            stats: set.stats,
            captured_headers: set.captured_headers,
            fingerprint: set.fingerprint,
            headers_source: set.headers_source,
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
        context_mode: 'EN_BAŞTAN_HEADER_YAKALAMA',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        fingerprint_guarantee: 'TÜMÜ_GERÇEK_FINGERPRINT',
        last_updated: lastCollectionTime ? lastCollectionTime.toISOString() : null
    });
});

app.get('/status', (req, res) => {
    res.json({
        system_status: 'RUNNING',
        parallel_collector: parallelCollector.getStatus(),
        collection_stats: collectionStats,
        config: CONFIG,
        last_collection: lastCollectionTime,
        fingerprint_guarantee: 'EN_BAŞTAN_YAKALAMA',
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// 🎯 OTOMATİK COLLECTION
if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT AKTİF');
    console.log(`🔄 Otomatik toplama: ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir`);
    
    let isAutoCollectRunning = false;
    
    const autoCollect = async () => {
        if (isAutoCollectRunning) {
            console.log('⏳ Otomatik toplama zaten çalışıyor, atlanıyor...');
            return;
        }
        
        try {
            isAutoCollectRunning = true;
            console.log(`\n🕒 === OTOMATİK ${CONFIG.PARALLEL_CONTEXTS} PARALEL CONTEXT ===`);
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

// 🧹 BELLEK TEMİZLEME
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

// 🚀 SERVER BAŞLATMA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 PARALEL CONTEXT - EN BAŞTAN HEADER YAKALAMA');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log('🎯 ÇALIŞMA PRENSİBİ:');
    console.log('   1. 📡 EN BAŞTAN network capture aktif');
    console.log('   2. 🌐 Sayfa yükleme (tüm istekler yakalanır)');
    console.log('   3. 🍪 Cookie toplama beklenir');
    console.log('   4. ✅ Cookie başarılı ise, ZATEN YAKALANMIŞ headerlar kullanılır');
    console.log('   5. 🔧 XSRF ve Cookie DIŞINDAKİ headerlar alınır');
    console.log('   6. 🔥 Kendi cookie ve XSRF tokenımız kullanılır');
    console.log('🔐 GARANTİ: Fingerprint KAÇIRILMAZ - EN BAŞTAN YAKALANIR');
});
