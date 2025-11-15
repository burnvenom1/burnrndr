// 🚀 OPTİMİZE EDİLMİŞ PLAYWRIGHT - CHROME EXTENSION UYUMLU COOKIE FORMATI
// 🎯 GELİŞMİŞ FINGERPRINT KORUMASI İLE PARALEL SEKMELER + OTOMATİK ÜYELİK
const express = require('express');
const { chromium } = require('playwright');
const os = require('os');
const app = express();

// Import modules
const { HepsiburadaSession, hepsiburadaKayit, sendCookiesToWebhook } = require('./uyelik.js');
const { createFingerprintConfig, convertToChromeExtensionFormat } = require('./fingerprint.js');

// ⚙️ AYARLAR - KOLAYCA DEĞİŞTİRİLEBİLİR
const CONFIG = {
    // PARALEL İŞLEM AYARLARI
    PARALLEL_TABS: 4, // AYNI ANDA ÇALIŞACAK SEKME SAYISI
    MAX_CONCURRENT_JOBS: 12, // MAKSİMUM İŞ SAYISI
    
    // OTOMATİK TOPLAMA AYARLARI
    AUTO_COLLECT_ENABLED: true,
    AUTO_COLLECT_INTERVAL: 2 * 60 * 1000, // 2 DAKİKA
    FINGERPRINT_COUNT: 6, // 6 FARKLI FINGERPRINT
    
    // BEKLEME AYARLARI
    WAIT_BETWEEN_FINGERPRINTS: 1000, // 1-3 saniye arası
    MAX_HBUS_ATTEMPTS: 6,
    PAGE_LOAD_TIMEOUT: 30000, // 30 saniyeye düşürüldü
    
    // DİĞER AYARLARI
    INITIAL_COLLECTION_DELAY: 5000, // 5 saniye
    MIN_COOKIE_COUNT: 7, // 🎯 EN AZ 7 COOKIE GEREKLİ
    
    // FINGERPRINT AYARLARI
    CANVAS_NOISE_ENABLED: true,
    WEBGL_NOISE_ENABLED: true,
    AUDIO_CONTEXT_NOISE_ENABLED: true,
    FONT_FINGERPRINT_ENABLED: true,
    
    // 🆕 HEPŞİBURADA KAYIT AYARLARI
    AUTO_REGISTRATION: true, // 🎉 OTOMATİK ÜYELİK AKTİF!
    REGISTRATION_DELAY: 0 // 🚀 BEKLEME YOK - HEMEN BAŞLA
};

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
        
        while (this.jobQueue.length > 0 && this.activeWorkers.size < CONFIG.PARALLEL_TABS) {
            const job = this.jobQueue.shift();
            if (!job) continue;
            
            this.executeJob(job);
            
            // PARALEL İŞLEMLER ARASI KÜÇÜK BEKLEME
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isRunning = false;
    }
    
    // İŞİ ÇALIŞTIR
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
            
            // YENİ İŞ İŞLE
            this.processQueue();
            
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
            
            this.activeWorkers.delete(job.id);
            job.reject(error);
            
            console.log(`❌ PARALEL İŞ #${job.id} HATA: ${error.message}`);
            
            // YENİ İŞ İŞLE
            this.processQueue();
        }
    }
    
    // WORKER ÇALIŞTIR
    async runWorker(job) {
        let context;
        let page;
        
        try {
            // 🎯 TAM İZOLASYON - HER WORKER İÇİN YENİ CONTEXT
            context = await this.browser.newContext(job.fingerprintConfig.contextOptions);
            
            // 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ EKLE
            await context.addInitScript(job.fingerprintConfig.fingerprintScript);
            
            page = await context.newPage();
            
            // 🎯 COOKIE'LERİ TEMİZLE
            await context.clearCookies();

            // 🎯 HEPSIBURADA'YA GİT
            console.log(`🌐 [İş #${job.id}] Hepsiburada'ya gidiliyor...`);
            await page.goto('https://www.hepsiburada.com/uyelik/yeni-uye?ReturnUrl=https%3A%2F%2Fwww.hepsiburada.com%2F', {
                waitUntil: 'networkidle',
                timeout: CONFIG.PAGE_LOAD_TIMEOUT
            });

            console.log(`✅ [İş #${job.id}] Sayfa yüklendi, cookie bekleniyor...`);
            
            // 🎯 COOKIE BEKLEME DÖNGÜSÜ
            const cookieResult = await this.waitForCookies(page, context, job.id);
            
            // 🎯 EĞER COOKIE BAŞARILIYSA, AYNI SEKME İLE HEMEN ÜYELİK YAP!
            if (cookieResult.success && CONFIG.AUTO_REGISTRATION) {
                console.log(`🎯 [İş #${job.id}] COOKIE BAŞARILI - AYNI SEKME İLE ÜYELİK BAŞLATILIYOR...`);
                
                try {
                    // 🎯 SEKME HEADER'LARINI AL
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
            // 🎯 GÜVENLİ TEMİZLİK - HER WORKER KENDİ CONTEXT'İNİ KAPATSIN
            if (page) {
                try {
                    await page.close();
                } catch (e) {
                    console.log(`⚠️ [İş #${job.id}] Sayfa kapatma hatası:`, e.message);
                }
            }
            
            if (context) {
                try {
                    await context.close();
                    console.log(`🧹 [İş #${job.id}] Context temizlendi (Üyelik tamamlandı)`);
                } catch (e) {
                    console.log(`⚠️ [İş #${job.id}] Context kapatma hatası:`, e.message);
                }
            }
        }
    }

    // 🎯 WORKER İLE ÜYELİK YAPAN FONKSİYON - SEKME HEADER'LARI + COOKIE YÖNETİMİ
    async doRegistrationWithWorker(page, context, jobId, cookies, pageHeaders) {
        console.log(`📧 [İş #${jobId}] Worker ile üyelik başlatılıyor...`);
        
        try {
            // 🎯 SESSION OLUŞTUR
            const session = new HepsiburadaSession();
            
            // 🎯 COOKIE'LERİ SESSION'A YÜKLE (SEKMEDEN GELEN)
            cookies.forEach(cookie => {
                session.cookies.set(cookie.name, {
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path
                });
            });
            
            // 🎯 BASE HEADER'LARI AYARLA (SEKMEDEN GELEN HEADER'LAR)
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

            console.log(`🖥️ [İş #${jobId}] Sekme bilgileri: ${pageHeaders.userAgent.substring(0, 50)}...`);

            // 🎯 EMAIL OLUŞTUR
            const email = session.generateEmail();
            console.log(`📧 [İş #${jobId}] Email: ${email}`);

            // 🎯 1. XSRF TOKEN AL - WORKER İLE
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
                    
                    // 🎯 YENİ COOKIE'LERİ KAYDET (WORKER'DAN GELEN)
                    if (xsrfResponse.headers && xsrfResponse.headers['set-cookie']) {
                        session.parseAndStoreCookies(xsrfResponse.headers['set-cookie']);
                        console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
                    }
                }
            }

            if (!session.xsrfToken) {
                throw new Error('XSRF Token alınamadı');
            }

            // 🎯 2. KAYIT İSTEĞİ GÖNDER - WORKER İLE
            console.log(`\n📨 [İş #${jobId}] Kayıt isteği gönderiliyor...`);

            const registerHeaders = {
                ...session.baseHeaders,
                'content-type': 'application/json',
                'x-xsrf-token': session.xsrfToken,
                'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                'cookie': session.getCookieHeader()
            };

            console.log(`   🍪 [İş #${jobId}] Cookie Header:`, session.getCookieHeader());

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
            
            // 🎯 YENİ COOKIE'LERİ GÜNCELLE (WORKER'DAN GELEN)
            if (registerResponse.headers && registerResponse.headers['set-cookie']) {
                session.parseAndStoreCookies(registerResponse.headers['set-cookie']);
                console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
            }

            if (registerResponse.status === 200 && registerBody && registerBody.success) {
                console.log(`✅ [İş #${jobId}] KAYIT İSTEĞİ BAŞARILI!`);
                const referenceId = registerBody.data?.referenceId;
                console.log(`🔖 [İş #${jobId}] ReferenceId:`, referenceId);

                // 🎯 3. OTP KODU BEKLE VE AL
                console.log(`\n⏳ [İş #${jobId}] OTP KODU BEKLENİYOR (15 saniye)...`);
                await page.waitForTimeout(15000);

                console.log(`📱 [İş #${jobId}] OTP kodu alınıyor...`);
                const otpCode = await session.getOtpCode(email);
                
                if (otpCode) {
                    console.log(`✅ [İş #${jobId}] OTP KODU HAZIR:`, otpCode);

                    // 🎯 4. 2. XSRF TOKEN AL - WORKER İLE
                    console.log(`\n🔄 [İş #${jobId}] 2. XSRF TOKEN ALINIYOR...`);
                    
                    const xsrfResponse2 = await session.sendWorkerRequest(xsrfRequestData);
                    
                    if (xsrfResponse2.status === 200) {
                        const bodyData2 = typeof xsrfResponse2.body === 'string' 
                            ? JSON.parse(xsrfResponse2.body) 
                            : xsrfResponse2.body;
                        
                        if (bodyData2 && bodyData2.xsrfToken) {
                            const xsrfToken2 = bodyData2.xsrfToken;
                            console.log(`✅ [İş #${jobId}] 2. XSRF TOKEN ALINDI`);

                            // 🎯 YENİ COOKIE'LERİ GÜNCELLE (WORKER'DAN GELEN)
                            if (xsrfResponse2.headers && xsrfResponse2.headers['set-cookie']) {
                                session.parseAndStoreCookies(xsrfResponse2.headers['set-cookie']);
                                console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
                            }

                            // 🎯 5. OTP DOĞRULAMA - WORKER İLE
                            console.log(`\n📨 [İş #${jobId}] OTP DOĞRULAMA GÖNDERİLİYOR...`);
                            
                            const otpVerifyHeaders = {
                                ...session.baseHeaders,
                                'content-type': 'application/json',
                                'x-xsrf-token': xsrfToken2,
                                'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                                'cookie': session.getCookieHeader()
                            };

                            console.log(`   🍪 [İş #${jobId}] Cookie Header:`, session.getCookieHeader());
                            
                            const otpVerifyData = {
                                targetUrl: 'https://oauth.hepsiburada.com/api/account/ValidateTwoFactorEmailOtp',
                                method: 'POST',
                                headers: otpVerifyHeaders,
                                body: JSON.stringify({
                                    otpReference: referenceId,
                                    otpCode: otpCode
                                })
                            };
                            
                            console.log(`📨 [İş #${jobId}] OTP doğrulama gönderiliyor...`);
                            const otpVerifyResponse = await session.sendWorkerRequest(otpVerifyData);
                            console.log(`📨 [İş #${jobId}] OTP Verify Response Status:`, otpVerifyResponse.status);
                            
                            const otpVerifyBody = typeof otpVerifyResponse.body === 'string'
                                ? JSON.parse(otpVerifyResponse.body)
                                : otpVerifyResponse.body;
                            
                            // 🎯 YENİ COOKIE'LERİ GÜNCELLE (WORKER'DAN GELEN)
                            if (otpVerifyResponse.headers && otpVerifyResponse.headers['set-cookie']) {
                                session.parseAndStoreCookies(otpVerifyResponse.headers['set-cookie']);
                                console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
                            }

                            let requestId = null;
                            if (otpVerifyBody && otpVerifyBody.success) {
                                requestId = otpVerifyBody.requestId || 
                                           (otpVerifyBody.data && otpVerifyBody.data.requestId);
                                
                                console.log(`✅ [İş #${jobId}] OTP DOĞRULAMA BAŞARILI!`);
                                console.log(`🔖 [İş #${jobId}] RequestId:`, requestId);

                                if (!requestId) {
                                    console.log(`⚠️ [İş #${jobId}] RequestId bulunamadı`);
                                }

                                // 🎯 6. 3. XSRF TOKEN AL - WORKER İLE
                                console.log(`\n🔄 [İş #${jobId}] 3. XSRF TOKEN ALINIYOR...`);
                                
                                const xsrfResponse3 = await session.sendWorkerRequest(xsrfRequestData);
                                
                                if (xsrfResponse3.status === 200) {
                                    const bodyData3 = typeof xsrfResponse3.body === 'string' 
                                        ? JSON.parse(xsrfResponse3.body) 
                                        : xsrfResponse3.body;
                                    
                                    if (bodyData3 && bodyData3.xsrfToken) {
                                        const xsrfToken3 = bodyData3.xsrfToken;
                                        console.log(`✅ [İş #${jobId}] 3. XSRF TOKEN ALINDI`);

                                        // 🎯 YENİ COOKIE'LERİ GÜNCELLE (WORKER'DAN GELEN)
                                        if (xsrfResponse3.headers && xsrfResponse3.headers['set-cookie']) {
                                            session.parseAndStoreCookies(xsrfResponse3.headers['set-cookie']);
                                            console.log(`   🔄 Cookie sayısı: ${session.cookies.size}`);
                                        }

                                        // 🎯 7. KAYIT TAMAMLAMA - WORKER İLE
                                        console.log(`\n📨 [İş #${jobId}] KAYIT TAMAMLAMA GÖNDERİLİYOR...`);
                                        
                                        const completeHeaders = {
                                            ...session.baseHeaders,
                                            'content-type': 'application/json',
                                            'x-xsrf-token': xsrfToken3,
                                            'app-key': 'AF7F2A37-CC4B-4F1C-87FD-FF3642F67ECB',
                                            'cookie': session.getCookieHeader()
                                        };

                                        console.log(`   🍪 [İş #${jobId}] Cookie Header:`, session.getCookieHeader());
                                        console.log(`   🔑 [İş #${jobId}] RequestId:`, requestId);
                                        
                                        const completeData = {
                                            targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/register',
                                            method: 'POST',
                                            headers: completeHeaders,
                                            body: JSON.stringify({
                                                subscribeEmail: true,
                                                firstName: "Test",
                                                lastName: "User", 
                                                password: "TestPassword123",
                                                subscribeSms: true,
                                                requestId: requestId
                                            })
                                        };
                                        
                                        console.log(`📨 [İş #${jobId}] Kayıt tamamlama gönderiliyor...`);
                                        const completeResponse = await session.sendWorkerRequest(completeData);
                                        console.log(`📨 [İş #${jobId}] Complete Response Status:`, completeResponse.status);
                                        
                                        const completeBody = typeof completeResponse.body === 'string'
                                            ? JSON.parse(completeResponse.body)
                                            : completeResponse.body;
                                        
                                        if (completeResponse.status === 200 && completeBody && completeBody.success) {
                                            console.log(`🎉 🎉 🎉 [İş #${jobId}] KAYIT BAŞARILI! 🎉 🎉 🎉`);
                                            console.log(`📧 [İş #${jobId}] Email:`, email);
                                            console.log(`🔑 [İş #${jobId}] Access Token:`, completeBody.data?.accessToken?.substring(0, 20) + '...');
                                            return { success: true, email: email };
                                        } else {
                                            console.log(`❌ [İş #${jobId}] Kayıt tamamlama başarısız`);
                                            return { success: false, error: 'Kayıt tamamlama başarısız' };
                                        }
                                    }
                                }
                            } else {
                                console.log(`❌ [İş #${jobId}] OTP doğrulama başarısız`);
                                return { success: false, error: 'OTP doğrulama başarısız' };
                            }
                        }
                    }
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
        
        return { success: false, error: 'Üyelik işlemi tamamlanamadı' };
    }
    
    // COOKIE BEKLEME DÖNGÜSÜ
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
    
    // BROWSER AYARLA
    async setBrowser(browserInstance) {
        this.browser = browserInstance;
    }
    
    // DURUM KONTROLÜ
    getStatus() {
        return {
            activeWorkers: this.activeWorkers.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs.length,
            maxParallel: CONFIG.PARALLEL_TABS
        };
    }
    
    // TÜM İŞLERİ DURDUR
    async stopAll() {
        this.jobQueue = [];
        
        // AKTİF İŞLERİ DURDUR
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

// SON ALINAN COOKIE'LERİ SAKLA
let lastCookies = [];
let lastCollectionTime = null;
let collectionStats = {
    total_runs: 0,
    successful_runs: 0,
    parallel_jobs_completed: 0,
    registration_success: 0,
    registration_failed: 0
};

// 🎯 GERÇEK ZAMANLI MEMORY TAKİBİ
let currentMemory = { node: 0, total: 0, updated: '' };

// 🎯 BROWSER INSTANCE TRACKING
let activeBrowser = null;
let isShuttingDown = false;

// 🎯 RENDER STABİLİTE - UNCAUGHT EXCEPTION HANDLER
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

// 🎯 RENDER STABİLİTE - UNHANDLED REJECTION HANDLER
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

// 🎯 RENDER STABİLİTE - SIGTERM HANDLER (RENDER DOSTU)
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

// 🎯 PARALEL COOKIE TOPLAMA FONKSİYONU
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
        
        // BROWSER AYARLARI
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
        
        // 🎯 PARALEL COLLECTOR'A BROWSER'I AYARLA
        await parallelCollector.setBrowser(browser);
        
        console.log(`✅ Browser başlatıldı - ${CONFIG.PARALLEL_TABS} paralel sekme hazır`);
        
        // 🎯 TÜM FINGERPRINT'LERİ PARALEL İŞ OLARAK EKLE
        const jobPromises = [];
        
        for (let i = 1; i <= CONFIG.PARALLEL_TABS; i++) {
            const fingerprintConfig = createFingerprintConfig(i);
            console.log(`📦 Paralel iş #${i} kuyruğa eklendi`);
            const jobPromise = parallelCollector.addJob(fingerprintConfig);
            jobPromises.push(jobPromise);
        }
        
        // 🎯 TÜM İŞLERİN TAMAMLANMASINI BEKLE
        console.log(`⏳ ${CONFIG.PARALLEL_TABS} paralel işin tamamlanması bekleniyor...`);
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
                    console.log(`✅ PARALEL İŞ #${result.value.jobId}: BAŞARILI - ${result.value.cookies.length} cookie`);
                    
                    // 🎯 ÜYELİK İSTATİSTİKLERİ
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
        
        // 🎯 İSTATİSTİKLER
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
        
        // 🎯 SON COOKIE'LERİ GÜNCELLE
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

// ✅ CHROME EXTENSION UYUMLU SET FORMATI
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

// 🎯 YENİ ENDPOINT: SADECE CHROME EXTENSION FORMATI
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
        advanced_fingerprint_enabled = true,
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

// 🎯 PARALEL DURUM ENDPOINT'İ
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

// 🆕 YENİ ENDPOINT: MANUEL ÜYELİK
app.get('/register', async (req, res) => {
    try {
        if (lastCookies.length === 0) {
            return res.json({ error: 'Önce cookie toplayın (/collect)' });
        }
        
        const successfulSets = lastCookies.filter(set => set.success);
        if (successfulSets.length === 0) {
            return res.json({ error: 'Başarılı cookie seti yok' });
        }
        
        const targetSet = successfulSets[0];
        console.log(`🎯 Manuel üyelik için set #${targetSet.set_id} kullanılıyor (${targetSet.cookies.length} cookie)`);
        
        const session = new HepsiburadaSession();
        const result = await hepsiburadaKayit(
            targetSet.cookies,
            targetSet.worker_info?.userAgent,
            'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Windows'
        );
        
        res.json(result);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 🆕 YENİ ENDPOINT: OTOMATİK ÜYELİK AYARI
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

// PARALEL COOKIE TOPLAMA
app.get('/collect', async (req, res) => {
    console.log(`\n=== ${CONFIG.PARALLEL_TABS} PARALEL SEKMELİ COOKIE TOPLAMA + OTOMATİK ÜYELİK ===`);
    const result = await getCookiesParallel();
    
    if (result.overall_success && process.env.WEBHOOK_URL && result.cookie_sets) {
        for (const set of result.cookie_sets) {
            await sendCookiesToWebhook(set.cookies, `PARALEL_FINGERPRINT_SET_${set.set_id}`);
        }
    }
    
    res.json(result);
});

// 🎯 GÜNCELLENMİŞ HEALTH CHECK
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

// İSTATİSTİKLER
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

// 🎯 OTOMATİK MEMORY GÜNCELLEME
setInterval(() => {
    const nodeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    currentMemory = {
        node: nodeMB,
        total: nodeMB + 80 + (lastCookies.length * 30),
        updated: new Date().toLocaleTimeString('tr-TR')
    };
}, 5000);

// 🎯 RENDER STABİLİTE - OTOMATİK COOKIE TOPLAMA (PARALEL)
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

// SUNUCU BAŞLATMA
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
    console.log('🔄 İşlem Akışı: 🌐 Sekme Aç → 🍪 Cookie Topla → ✅ Cookie Bul → 📧 ÜYELİK Yap → 🧹 Sekme Kapat');
    console.log('🛡️ RENDER STABİLİTE ÖNLEMLERİ: AKTİF');
    
    if (CONFIG.AUTO_COLLECT_ENABLED) {
        console.log(`⏰ ${CONFIG.AUTO_COLLECT_INTERVAL / 60000} dakikada bir otomatik ${CONFIG.PARALLEL_TABS} paralel sekme + üyelik`);
    }
    
    console.log('====================================\n');
});
