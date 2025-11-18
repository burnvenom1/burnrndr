// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - DIRECT CONTEXT MODE (SEKMESİZ)
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI + GERÇEK HEADER YAKALAMA
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

// 🎯 GELİŞMİŞ HEADER YAKALAMA SİSTEMİ
class AdvancedHeaderCapture {
    constructor(page, jobId) {
        this.page = page;
        this.jobId = jobId;
        this.capturedHeaders = null;
        this.isCaptured = false;
    }

    async setupInterception() {
        console.log(`🎯 [Context #${this.jobId}] Request interception aktif ediliyor...`);
        
        // Tüm request'leri yakalamak için route'u değiştir
        await this.page.route('**/*', (route, request) => {
            const url = request.url();
            
            // Sadece features endpoint'ini yakala
            if (url.includes('/api/features') && url.includes('clientId=SPA') && !this.isCaptured) {
                console.log(`📡 [Context #${this.jobId}] HEDEF URL YAKALANDI: ${url}`);
                
                const headers = request.headers();
                this.capturedHeaders = { ...headers };
                this.isCaptured = true;
                
                console.log(`📋 [Context #${this.jobId}] ${Object.keys(this.capturedHeaders).length} header yakalandı:`);
                Object.keys(this.capturedHeaders).forEach(key => {
                    const value = this.capturedHeaders[key];
                    console.log(`   🎯 ${key}: ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`);
                });
            }
            
            // Request'i normal şekilde devam ettir
            route.continue();
        });
    }

    async waitForHeaders(timeout = 30000) {
        console.log(`⏳ [Context #${this.jobId}] Header yakalama bekleniyor (${timeout}ms)...`);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.isCaptured) {
                console.log(`✅ [Context #${this.jobId}] Header başarıyla yakalandı!`);
                return this.capturedHeaders;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`❌ [Context #${this.jobId}] Header yakalama zaman aşımına uğradı`);
        return {};
    }

    async captureWithNavigation() {
        await this.setupInterception();
        
        // Navigation'dan önce interception'ı kur
        console.log(`🌐 [Context #${this.jobId}] Sayfaya gidiliyor...`);
        await this.page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        return await this.waitForHeaders();
    }
}

// 🎯 HEPŞİBURADA ÜYELİK SİSTEMİ - GERÇEK HEADER YAKALAMA
class HepsiburadaSession {
    constructor() {
        this.cookies = new Map();
        this.xsrfToken = null;
        this.capturedHeaders = null;
    }

    setCapturedHeaders(headers) {
        this.capturedHeaders = headers;
        console.log('📡 Yakalanan headerlar sessiona kaydedildi');
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
            "jy1c7eh2@mailpwr.com", "jy1kb68h@mailpwr.com", "jz6qk02m@mailpwr.com",
            "jz6ta9hn@mailpwr.com", "jz72a572@mailpwr.com", "jz74ndyw@mailpwr.com",
            "jz76sw1m@mailpwr.com", "manunasodun3@mimimail.me", "manun1kinyz3@mimimail.me",
            "manupefovuz3@mimimail.me", "manup0lutuj2@mimimail.me", "manusyk1taw2@mimimail.me",
            "manutinajyl3@mimimail.me", "manut0sepem3@mimimail.me", "lozydozajid2@10mail.xyz",
            "hiwemubadom2@10mail.xyz", "mobeliv1myn3@10mail.xyz", "mymib0sejyz2@10mail.xyz",
            "bohel1meken3@10mail.xyz", "b0togovojev2@10mail.xyz", "guv1s0f0tak2@10mail.xyz",
            "ahmcemzni@10mail.org", "ahmcffaeh@10mail.org", "ahmcfwpfd@10mail.org",
            "ahmcgaohd@10mail.org", "ahmcgiwye@10mail.org", "ahmcgoyfv@10mail.org",
            "ahmchfabm@10mail.org", "ahbzmfiun@yomail.info", "ahbzmxpoh@yomail.info",
            "ahbznddyb@yomail.info", "ahbznefnq@yomail.info", "ahbzognth@yomail.info",
            "ahbzoofgb@yomail.info", "ahbzoznkl@yomail.info", "jwjavzvej@emltmp.com",
            "iycfyzvej@emltmp.com", "aymjdawej@emltmp.com", "hcfuhawej@emltmp.com",
            "ztotqawej@emltmp.com", "bekxwawej@emltmp.com", "axhbbbwej@emltmp.com",
            "rhhzbqmgi@emlpro.com", "vcfdhqmgi@emlpro.com", "utcpmqmgi@emlpro.com",
            "hqnjtqmgi@emlpro.com", "qvkpyqmgi@emlpro.com", "jdawermgi@emlpro.com",
            "khhonrmgi@emlpro.com", "qwxugbxai@emlhub.com", "fejqjbxai@emlhub.com",
            "fjkwmbxai@emlhub.com", "tgyspbxai@emlhub.com", "pzbesbxai@emlhub.com",
            "qqkqubxai@emlhub.com", "tnglxbxai@emlhub.com", "04dndf7ps8@spymail.one",
            "04dndhs6fc@spymail.one", "04dndn5tw4@spymail.one", "04dndsn43c@spymail.one",
            "04dndz9z90@spymail.one", "04dne23ncg@spymail.one", "04dnebnewg@spymail.one"
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

    generateRealisticHeaders(cookies = []) {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ];
        
        const chromeVersion = Math.floor(Math.random() * 10) + 115;
        
        return {
            'authority': 'oauth.hepsiburada.com',
            'method': 'GET',
            'path': '/api/features?clientId=SPA',
            'scheme': 'https',
            'accept': 'application/json, text/plain, */*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
            'fingerprint': this.generateFingerprint(),
            'origin': 'https://giris.hepsiburada.com',
            'referer': 'https://giris.hepsiburada.com/',
            'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'x-xsrf-token': this.generateXsrfToken()
        };
    }

    generateFingerprint() {
        const chars = 'abcdef0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }

    generateXsrfToken() {
        return 'CfDJ8' + Math.random().toString(36).substring(2, 40) + Math.random().toString(36).substring(2, 30);
    }

    async sendRequestWithCapturedHeaders(url, method = 'GET', body = null) {
        if (!this.capturedHeaders) {
            throw new Error('Yakalanmış header bulunamadı');
        }

        const headers = {
            ...this.capturedHeaders,
            'cookie': this.getCookieHeader()
        };

        if (body && method !== 'GET') {
            headers['content-type'] = 'application/json';
        }

        if (this.xsrfToken) {
            headers['x-xsrf-token'] = this.xsrfToken;
        }

        if (url.includes('/api/authenticate/') || url.includes('/api/account/')) {
            headers['app-key'] = 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB';
        }

        const requestData = {
            targetUrl: url,
            method: method,
            headers: headers
        };

        if (body) {
            requestData.body = JSON.stringify(body);
        }

        console.log(`📤 ${method} ${url}`);
        
        const response = await this.sendWorkerRequest(requestData);
        
        if (response.headers && response.headers['set-cookie']) {
            this.parseAndStoreCookies(response.headers['set-cookie']);
        }

        return response;
    }
}

// 🎯 PARALEL CONTEXT YÖNETİCİSİ - HEADER YAKALAMA ÖZELLİĞİ
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

    async captureNetworkHeaders(page, jobId) {
        const headerCapture = new AdvancedHeaderCapture(page, jobId);
        
        try {
            const capturedHeaders = await headerCapture.captureWithNavigation();
            
            if (Object.keys(capturedHeaders).length > 0) {
                console.log(`🎉 [Context #${jobId}] BAŞARILI: ${Object.keys(capturedHeaders).length} header yakalandı`);
                
                // Önemli header'ları kontrol et
                const importantHeaders = [
                    'user-agent', 'accept', 'accept-language', 
                    'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
                    'cookie', 'x-xsrf-token', 'fingerprint'
                ];
                
                importantHeaders.forEach(header => {
                    if (capturedHeaders[header]) {
                        console.log(`   🔍 ${header}: ${capturedHeaders[header].substring(0, 80)}...`);
                    }
                });
                
                return capturedHeaders;
            } else {
                console.log(`⚠️ [Context #${jobId}] Header yakalanamadı, fallback yöntem deneniyor...`);
                return await this.fallbackHeaderCapture(page, jobId);
            }
            
        } catch (error) {
            console.log(`❌ [Context #${jobId}] Header yakalama hatası: ${error.message}`);
            return {};
        }
    }

    // 🎯 FALLBACK HEADER YAKALAMA YÖNTEMİ
    async fallbackHeaderCapture(page, jobId) {
        console.log(`🔄 [Context #${jobId}] Fallback header yakalama başlatılıyor...`);
        
        try {
            // Sayfa yüklendikten sonra API isteği tetikle
            await page.evaluate(() => {
                fetch('https://oauth.hepsiburada.com/api/features?clientId=SPA', {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json, text/plain, */*',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-site'
                    }
                }).catch(() => {}); // Hataları görmezden gel
            });
            
            // API isteğini bekleyerek yakala
            const response = await page.waitForResponse(response => 
                response.url().includes('/api/features') && 
                response.url().includes('clientId=SPA'),
                { timeout: 10000 }
            );
            
            const request = response.request();
            const headers = request.headers();
            
            console.log(`✅ [Context #${jobId}] Fallback ile header yakalandı`);
            return headers;
            
        } catch (error) {
            console.log(`❌ [Context #${jobId}] Fallback de başarısız: ${error.message}`);
            
            // Manuel header oluştur
            const session = new HepsiburadaSession();
            return session.generateRealisticHeaders();
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
            
            console.log(`📡 [Context #${job.id}] GELİŞMİŞ HEADER YAKALAMA BAŞLATILIYOR...`);
            const capturedHeaders = await this.captureNetworkHeaders(page, job.id);
            
            console.log(`🌐 [Context #${job.id}] Sayfa yüklendi, cookie bekleniyor...`);
            const cookieResult = await this.waitForCookies(context, job.id);
            
            // Header yakalanamazsa manuel oluştur
            const session = new HepsiburadaSession();
            const finalHeaders = Object.keys(capturedHeaders).length > 0 ? 
                capturedHeaders : 
                session.generateRealisticHeaders(cookieResult.cookies || []);
            
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [Context #${job.id}] COOKIE BAŞARILI - HEADER İLE ÜYELİK BAŞLATILIYOR...`);
                
                try {
                    const registrationResult = await this.doRegistrationInContext(
                        job.id, 
                        cookieResult.cookies, 
                        finalHeaders
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
                captured_headers: finalHeaders,
                headers_source: Object.keys(capturedHeaders).length > 0 ? 'CAPTURED' : 'GENERATED',
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

    async doRegistrationInContext(jobId, collectedCookies, capturedHeaders) {
        console.log(`📧 [Context #${jobId}] YAKALANAN HEADER'LAR İLE ÜYELİK BAŞLATILIYOR...`);
        
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
            console.log(`📡 [Context #${jobId}] ${Object.keys(capturedHeaders).length} header kullanılıyor`);
            console.log(`🔧 [Context #${jobId}] Header kaynağı: ${capturedHeaders.headers_source || 'DIRECT'}`);

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
                        captured_headers: result.value.captured_headers,
                        headers_source: result.value.headers_source,
                        collection_time: new Date(),
                        worker_info: result.value.worker_info
                    };
                    currentSuccessfulSets.push(successfulSet);
                    console.log(`✅ CONTEXT #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie (Header: ${result.value.headers_source})`);
                    
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
        const capturedHeadersCount = currentSuccessfulSets.filter(set => set.headers_source === 'CAPTURED').length;
        
        console.log('\n📊 === PARALEL CONTEXT İSTATİSTİKLER ===');
        console.log(`   Toplam Context: ${allResults.length}`);
        console.log(`   Başarılı Context: ${successfulCount}`);
        console.log(`   Üyelik Başarılı: ${successfulRegistrationCount}`);
        console.log(`   Header Yakalama: ${capturedHeadersCount}`);
        console.log(`   Manuel Header: ${successfulCount - capturedHeadersCount}`);
        
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
            header_capture_stats: {
                captured: capturedHeadersCount,
                generated: successfulCount - capturedHeadersCount
            },
            cookie_sets: currentSuccessfulSets,
            parallel_config: {
                parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
                isolation: 'FULL_CONTEXT_ISOLATION',
                auto_registration: CONFIG.AUTO_REGISTRATION,
                header_capture: true
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

app.get('/', (req, res) => {
    res.json({
        service: 'PARALEL CONTEXT COOKIE COLLECTOR - SEKMESİZ MOD + GELİŞMİŞ HEADER YAKALAMA',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            header_capture: true
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/status': 'Sistem durumu'
        },
        mode: 'SEKMESİZ_DIRECT_CONTEXT_WITH_ADVANCED_HEADER_CAPTURE',
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
        header_capture_stats: {
            captured: successfulSets.filter(set => set.headers_source === 'CAPTURED').length,
            generated: successfulSets.filter(set => set.headers_source === 'GENERATED').length
        },
        context_mode: 'SEKMESİZ_DIRECT_CONTEXT_WITH_ADVANCED_HEADER_CAPTURE',
        chrome_extension_compatible: true,
        header_capture: true
    };
    
    successfulSets.forEach(set => {
        result[`context${set.set_id}`] = {
            cookies: set.chrome_extension_cookies,
            registration: set.registration,
            stats: set.stats,
            captured_headers: set.captured_headers,
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
        context_mode: 'SEKMESİZ_DIRECT_CONTEXT_WITH_ADVANCED_HEADER_CAPTURE',
        sets: chromeSets,
        total_contexts: successfulSets.length,
        header_capture: true,
        header_stats: {
            captured: successfulSets.filter(set => set.headers_source === 'CAPTURED').length,
            generated: successfulSets.filter(set => set.headers_source === 'GENERATED').length
        },
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
        header_capture_stats: lastCookies.length > 0 ? {
            captured: lastCookies.filter(set => set.headers_source === 'CAPTURED').length,
            generated: lastCookies.filter(set => set.headers_source === 'GENERATED').length
        } : { captured: 0, generated: 0 },
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
    });
});

if (CONFIG.AUTO_COLLECT_ENABLED) {
    console.log('⏰ PARALEL OTOMATİK CONTEXT COOKIE TOPLAMA AKTİF');
    console.log(`🔄 Otomatik toplama: ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir`);
    
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 PARALEL CONTEXT COOKIE COLLECTOR - GELİŞMİŞ HEADER YAKALAMA');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log('🎯 ÇALIŞMA SIRASI:');
    console.log('   1. 📡 Route interception ile network dinleme');
    console.log('   2. 🌐 Siteye git ve header yakala');
    console.log('   3. 🔄 Fallback: Manuel header oluştur');
    console.log('   4. 🍪 Cookie al');
    console.log('   5. 📧 Header + Cookie ile üyelik başlat');
    console.log('🎯 HEADER YAKALAMA STRATEJİLERİ:');
    console.log('   - Route Interception (Öncelikli)');
    console.log('   - Response Waiting (Fallback)');
    console.log('   - Manuel Generation (Son çare)');
});
