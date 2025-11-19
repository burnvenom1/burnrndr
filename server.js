// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - COOKIE TOPLAMA ÖNCELİKLİ
// 🎯 ÖNCE COOKIE TOPLA, SONRA HEADER KONTROL ET
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
    NETWORK_CAPTURE_TIMEOUT: 45000 // Cookie toplama + header yakalama için toplam süre
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

// 🎯 COOKIE TOPLAMA ÖNCELİKLİ HEADER YAKALAMA SİSTEMİ
class CookieFirstHeaderCapture {
    constructor(page, jobId) {
        this.page = page;
        this.jobId = jobId;
        this.capturedHeaders = null;
        this.isCaptured = false;
        this.allRequests = [];
        this.matchingRequests = [];
        this.cookieCollectionComplete = false;
        this.fingerprintFound = false;
    }

    async setupInterception() {
        console.log(`🎯 [Context #${this.jobId}] COOKIE TOPLAMA + NETWORK İZLEME BAŞLATILDI...`);
        
        await this.page.route('**/*', (route, request) => {
            const url = request.url();
            const method = request.method();
            const headers = request.headers();
            
            // Tüm istekleri kaydet
            const requestInfo = {
                url: url,
                method: method,
                headers: { ...headers },
                timestamp: new Date().toISOString(),
                hasFingerprint: !!headers['fingerprint'],
                domain: this.extractDomain(url)
            };
            
            this.allRequests.push(requestInfo);
            
            // Fingerprint içeren istekleri yakala
            if (headers['fingerprint'] && !this.matchingRequests.some(req => req.url === url)) {
                console.log(`🔍 [Context #${this.jobId}] FINGERPRINT YAKALANDI: ${url}`);
                this.matchingRequests.push(requestInfo);
                this.fingerprintFound = true;
                
                // İlk fingerprint'i ana header olarak kaydet
                if (!this.isCaptured) {
                    this.capturedHeaders = { ...headers };
                    this.isCaptured = true;
                    console.log(`📡 [Context #${this.jobId}] ANA HEADER KAYDEDİLDİ`);
                }
            }
            
            route.continue();
        });

        console.log(`✅ [Context #${this.jobId}] Network interception hazır, cookie toplama başlıyor...`);
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    // Cookie toplama tamamlandığında çağrılır
    setCookieCollectionComplete() {
        this.cookieCollectionComplete = true;
        console.log(`✅ [Context #${this.jobId}] COOKIE TOPLAMA TAMAMLANDI - HEADER ANALİZİ BAŞLIYOR`);
    }

    // Tüm network trafiğini analiz et
    analyzeCapturedHeaders() {
        console.log(`\n📊 [Context #${this.jobId}] === NETWORK TRAFİĞİ ANALİZİ ===`);
        console.log(`📊 [Context #${this.jobId}] Toplam istek sayısı: ${this.allRequests.length}`);
        
        // Fingerprint içeren istekleri göster
        const fingerprintRequests = this.allRequests.filter(req => req.hasFingerprint);
        console.log(`📊 [Context #${this.jobId}] Fingerprint içeren istekler: ${fingerprintRequests.length}`);
        
        if (fingerprintRequests.length > 0) {
            fingerprintRequests.forEach((req, index) => {
                console.log(`\n🔍 [Context #${this.jobId}] FINGERPRINT İSTEK #${index + 1}:`);
                console.log(`   🌐 URL: ${req.url}`);
                console.log(`   📡 Method: ${req.method}`);
                console.log(`   🔐 Fingerprint: ${req.headers['fingerprint']}`);
                console.log(`   ⏰ Zaman: ${req.timestamp}`);
            });
        }

        // Domain istatistikleri
        const domainStats = {};
        this.allRequests.forEach(req => {
            domainStats[req.domain] = (domainStats[req.domain] || 0) + 1;
        });

        console.log(`\n🌐 [Context #${this.jobId}] DOMAIN İSTATİSTİKLERİ:`);
        Object.entries(domainStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .forEach(([domain, count]) => {
                console.log(`   ${domain}: ${count} istek`);
            });

        // Önemli endpoint'ler
        const importantRequests = this.allRequests.filter(req => 
            req.url.includes('/features') || 
            req.url.includes('/api/') ||
            req.url.includes('oauth.') ||
            req.hasFingerprint
        );

        console.log(`\n🎯 [Context #${this.jobId}] ÖNEMLİ İSTEKLER: ${importantRequests.length}`);
        importantRequests.forEach(req => {
            const fingerprintInfo = req.hasFingerprint ? '🔐 FINGERPRINT' : '📡 NORMAL';
            console.log(`   ${req.method} ${req.url} - ${fingerprintInfo}`);
        });

        return {
            total_requests: this.allRequests.length,
            fingerprint_requests: fingerprintRequests.length,
            domains: Object.keys(domainStats).length,
            important_requests: importantRequests.length
        };
    }

    async waitForHeadersAndCookies(timeout = CONFIG.NETWORK_CAPTURE_TIMEOUT) {
        console.log(`⏳ [Context #${this.jobId}] Cookie toplama ve header yakalama bekleniyor (${timeout/1000}s)...`);
        
        const startTime = Date.now();
        let lastLogTime = startTime;
        
        while (Date.now() - startTime < timeout) {
            // Cookie toplama tamamlandıysa ve fingerprint bulunduysa
            if (this.cookieCollectionComplete && this.fingerprintFound) {
                console.log(`✅ [Context #${this.jobId}] HEM COOKIE HEM FINGERPRINT HAZIR!`);
                const analysis = this.analyzeCapturedHeaders();
                
                if (this.capturedHeaders && this.capturedHeaders['fingerprint']) {
                    console.log(`🎉 [Context #${this.jobId}] BAŞARILI! HEADERLAR ALINDI`);
                    return {
                        headers: this.capturedHeaders,
                        analysis: analysis,
                        all_requests: this.allRequests,
                        fingerprint_requests: this.matchingRequests
                    };
                }
            }
            
            // Cookie toplama tamamlandı ama fingerprint yoksa
            if (this.cookieCollectionComplete && !this.fingerprintFound) {
                console.log(`🔍 [Context #${this.jobId}] Cookie tamamlandı, fingerprint aranıyor...`);
                
                // Alternatif fingerprint ara
                const alternativeFingerprint = this.findAlternativeFingerprint();
                if (alternativeFingerprint) {
                    console.log(`✅ [Context #${this.jobId}] ALTERNATİF FINGERPRINT BULUNDU`);
                    const analysis = this.analyzeCapturedHeaders();
                    
                    return {
                        headers: { fingerprint: alternativeFingerprint },
                        analysis: analysis,
                        all_requests: this.allRequests,
                        fingerprint_requests: this.matchingRequests,
                        alternative_used: true
                    };
                }
                
                // 5 saniye daha bekle
                if (Date.now() - startTime < timeout - 5000) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                
                // Zaman doldu
                console.log(`❌ [Context #${this.jobId}] FINGERPRINT BULUNAMADI`);
                this.analyzeCapturedHeaders();
                return null;
            }
            
            // Her 10 saniyede bir durum log'u
            if (Date.now() - lastLogTime > 10000) {
                console.log(`⏳ [Context #${this.jobId}] Beklemede... Cookies: ${this.cookieCollectionComplete ? 'TAMAM' : 'DEVAM'}, Fingerprint: ${this.fingerprintFound ? 'BULUNDU' : 'ARANIYOR'}`);
                lastLogTime = Date.now();
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`❌ [Context #${this.jobId}] Zaman aşımı - Cookie: ${this.cookieCollectionComplete}, Fingerprint: ${this.fingerprintFound}`);
        this.analyzeCapturedHeaders();
        return null;
    }

    async captureWithCookiePriority() {
        // ÖNCE interception'ı başlat
        await this.setupInterception();
        
        console.log(`🌐 [Context #${this.jobId}] Sayfaya gidiliyor (Cookie toplama öncelikli)...`);
        
        try {
            // Sayfa yükleme olaylarını dinle
            this.page.on('load', () => {
                console.log(`📄 [Context #${this.jobId}] Sayfa yüklendi: ${this.page.url()}`);
            });

            this.page.on('domcontentloaded', () => {
                console.log(`📄 [Context #${this.jobId}] DOM content loaded`);
            });

            await this.page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            console.log(`✅ [Context #${this.jobId}] Sayfa yükleme tamamlandı, cookie toplama devam ediyor...`);
            
        } catch (error) {
            console.log(`⚠️ [Context #${this.jobId}] Navigation hatası: ${error.message}`);
        }

        // Cookie toplama bitene kadar bekle, sonra header'ları al
        const result = await this.waitForHeadersAndCookies();
        
        if (!result || !result.headers || !result.headers.fingerprint) {
            throw new Error(`COOKIE TOPLAMA TAMAMLANDI ANCAK FINGERPRINT YAKALANAMADI - Context #${this.jobId} BAŞARISIZ`);
        }
        
        console.log(`🎉 [Context #${this.jobId}] TAM BAŞARI! COOKIE VE HEADER HAZIR!`);
        return result.headers;
    }

    // Alternatif fingerprint bulma
    findAlternativeFingerprint() {
        console.log(`🔍 [Context #${this.jobId}] Alternatif fingerprint aranıyor...`);
        
        // Tüm isteklerde fingerprint ara
        for (const request of this.allRequests) {
            if (request.headers['fingerprint']) {
                console.log(`✅ [Context #${this.jobId}] Alternatif fingerprint bulundu: ${request.url}`);
                return request.headers['fingerprint'];
            }
            
            // Diğer olası header isimlerini kontrol et
            const fingerprintHeaders = [
                'fingerprint', 'x-fingerprint', 'client-fingerprint', 
                'device-fingerprint', 'x-device-fingerprint', 'x-client-fingerprint'
            ];
            
            for (const headerName of fingerprintHeaders) {
                if (request.headers[headerName]) {
                    console.log(`✅ [Context #${this.jobId}] ${headerName} bulundu: ${request.headers[headerName]}`);
                    return request.headers[headerName];
                }
            }
        }
        
        console.log(`❌ [Context #${this.jobId}] Hiçbir istekte fingerprint bulunamadı`);
        return null;
    }
}

// 🎯 HEPŞİBURADA ÜYELİK SİSTEMİ - SADECE GERÇEK HEADER
class HepsiburadaSession {
    constructor() {
        this.cookies = new Map();
        this.xsrfToken = null;
        this.capturedHeaders = null;
    }

    setCapturedHeaders(headers) {
        if (!headers || Object.keys(headers).length === 0 || !headers['fingerprint']) {
            throw new Error('GERÇEK FINGERPRINT YAKALANAMADI - Manuel oluşturma YOK');
        }
        
        this.capturedHeaders = headers;
        console.log('📡 GERÇEK HEADERLAR KAYDEDİLDİ:');
        
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
            "jy1c7eh2@mailpwr.com", "jy1kb68h@mailpwr.com", "jz6qk02m@mailpwr.com",
            "jz6ta9hn@mailpwr.com", "jz72a572@mailpwr.com", "jz74ndyw@mailpwr.com",
            "jz76sw1m@mailpwr.com", "manunasodun3@mimimail.me", "manun1kinyz3@mimimail.me",
            "manupefovuz3@mimimail.me", "manup0lutuj2@mimimail.me", "manusyk1taw2@mimimail.me",
            "manutinajyl3@mimimail.me", "manut0sepem3@mimimail.me", "lozydozajid2@10mail.xyz",
            "hiwemubadom2@10mail.xyz", "mobeliv1myn3@10mail.xyz", "mymib0sejyz2@10mail.xyz",
            "bohel1meken3@10mail.xyz", "b0togovojev2@10mail.xyz", "guv1s0f0tak2@10mail.xyz"
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
            throw new Error('GERÇEK HEADER BULUNAMADI - Önce header yakalanmalı');
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

        console.log(`📤 ${method} ${url}`);
        console.log(`🔐 KULLANILAN GERÇEK FINGERPRINT: ${headers['fingerprint']}`);

        const requestData = {
            targetUrl: url,
            method: method,
            headers: headers
        };

        if (body) {
            requestData.body = JSON.stringify(body);
        }
        
        const response = await this.sendWorkerRequest(requestData);
        
        if (response.headers && response.headers['set-cookie']) {
            this.parseAndStoreCookies(response.headers['set-cookie']);
        }

        return response;
    }
}

// 🎯 PARALEL CONTEXT YÖNETİCİSİ - COOKIE ÖNCELİKLİ
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
            
            // CONTEXT'i oluşturur OLUŞTURMAZ fingerprint script'i ekle
            await context.addInitScript(job.fingerprintConfig.fingerprintScript);
            await context.clearCookies();

            page = await context.newPage();
            
            console.log(`📡 [Context #${job.id}] COOKIE ÖNCELİKLİ HEADER YAKALAMA BAŞLATILIYOR...`);
            
            // ÖNCE cookie toplamayı başlat
            const headerCapture = new CookieFirstHeaderCapture(page, job.id);
            const cookiePromise = this.waitForCookies(context, job.id).then(cookieResult => {
                console.log(`✅ [Context #${job.id}] COOKIE TOPLAMA TAMAMLANDI - Header analizi başlatılıyor`);
                headerCapture.setCookieCollectionComplete();
                return cookieResult;
            });
            
            // Aynı anda header yakalamayı başlat
            const headerPromise = headerCapture.captureWithCookiePriority();
            
            // İkisini de bekle
            const [cookieResult, capturedHeaders] = await Promise.all([cookiePromise, headerPromise]);
            
            console.log(`🎉 [Context #${job.id}] HEM COOKIE HEM HEADER BAŞARIYLA ALINDI!`);
            
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [Context #${job.id}] GERÇEK HEADER İLE ÜYELİK BAŞLATILIYOR...`);
                
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
                success: cookieResult.success,
                cookies: cookieResult.cookies,
                chrome_extension_cookies: convertToChromeExtensionFormat(cookieResult.cookies),
                stats: cookieResult.stats,
                attempts: cookieResult.attempts,
                registration: cookieResult.registration,
                captured_headers: capturedHeaders,
                fingerprint: capturedHeaders['fingerprint'],
                headers_source: 'COOKIE_SONRASI_YAKALANDI',
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
        console.log(`📧 [Context #${jobId}] GERÇEK HEADER İLE ÜYELİK BAŞLATILIYOR...`);
        
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

// 🎯 FINGERPRINT SPOOFING FONKSİYONLARI
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

function getAdvancedFingerprintScript() {
    return `
    ${getCanvasFingerprintScript()}
    ${getWebGLFingerprintScript()}
    
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
                header_capture: 'COOKIE_SONRASI_YAKALAMA'
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
        service: 'PARALEL CONTEXT - COOKIE ÖNCELİKLİ HEADER YAKALAMA',
        config: {
            parallel_contexts: CONFIG.PARALLEL_CONTEXTS,
            auto_registration: CONFIG.AUTO_REGISTRATION,
            min_cookies: CONFIG.MIN_COOKIE_COUNT,
            header_capture: 'COOKIE_SONRASI_YAKALAMA'
        },
        parallel_status: parallelCollector.getStatus(),
        endpoints: {
            '/collect': `${CONFIG.PARALLEL_CONTEXTS} paralel context ile cookie topla + üyelik`,
            '/last-cookies': 'Son cookie\'leri göster',
            '/chrome-cookies': 'Chrome formatında cookie\'ler',
            '/status': 'Sistem durumu'
        },
        mode: 'COOKIE_ÖNCELİKLİ',
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
        context_mode: 'COOKIE_ÖNCELİKLİ',
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
        context_mode: 'COOKIE_ÖNCELİKLİ',
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
        fingerprint_guarantee: 'COOKIE_SONRASI_YAKALAMA',
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
    console.log('\n🚀 PARALEL CONTEXT - COOKIE ÖNCELİKLİ HEADER YAKALAMA');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Paralel Context: ${CONFIG.PARALLEL_CONTEXTS}`);
    console.log('🎯 ÇALIŞMA PRENSİBİ:');
    console.log('   1. 📡 ÖNCE cookie toplama başlat');
    console.log('   2. 🍪 Cookie toplama tamamlanana kadar TÜM network\'ü dinle');
    console.log('   3. 🔍 Cookie tamamlandığında tüm yakalanan header\'ları analiz et');
    console.log('   4. ✅ En uygun fingerprint\'i seç ve kullan');
    console.log('🔐 GARANTİ: Tüm fingerprint\'ler GERÇEK ve YAKALANMIŞ');
});
