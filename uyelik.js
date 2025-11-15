// 🎯 COOKIE TOPLAMA + ÜYELİK ENTEGRE SİSTEMİ
const { chromium } = require('playwright');

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
            "lnmwhbvvf@emltmp.com", "bshuzcvvf@emltmp.com", "hsfsqxcug@emltmp.com"
        ];
        
        const randomPart2 = Math.random().toString(36).substring(2, 6);
        const randomPart = Math.random().toString(36).substring(2, 6);
        const randomIndex = Math.floor(Math.random() * baseTemplates.length);
        const baseEmail = baseTemplates[randomIndex];
        const parts = baseEmail.split("@");
        const username = parts[0];
        const domain = parts[1];
        
        return username + '.' + randomPart.substring(0, 3) + '@' + randomPart2.substring(0, 3) + '.' + domain;
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

    // 🎯 COOKIE ARRAY'İNDEN SESSION BAŞLAT
    initializeFromCookies(cookies) {
        this.cookies.clear();
        cookies.forEach(cookie => {
            this.cookies.set(cookie.name, {
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path
            });
        });
        console.log(`🎯 ${cookies.length} cookie session'a yüklendi`);
    }
}

// 🎯 ANA ENTEGRE FONKSİYON - COOKIE TOPLAR, ÜYELİK YAPAR, COOKIE TOPLAMA DEVAM EDER
async function cookieVeUyelikEntegre() {
    let browser;
    let context;
    let page;
    const session = new HepsiburadaSession();
    
    try {
        console.log('🚀 ====================================');
        console.log('🚀 COOKIE TOPLAMA + ÜYELİK ENTEGRE SİSTEM');
        console.log('🚀 ====================================\n');

        // 🎯 1. ADIM: BROWSER'I BAŞLAT
        console.log('1️⃣  BROWSER BAŞLATILIYOR...');
        browser = await chromium.launch({ 
            headless: false,
            args: ['--disable-blink-features=AutomationControlled']
        });

        context = await browser.newContext();
        page = await context.newPage();

        // 🎯 2. ADIM: COOKIE TOPLAMA
        console.log('\n2️⃣  COOKIE TOPLANIYOR...');
        
        await page.goto('https://www.hepsiburada.com', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        // 🎯 İNSAN DAVRANIŞI SİMÜLASYONU
        await page.mouse.move(200, 150, { steps: 3 });
        await page.waitForTimeout(200);

        try {
            const logo = await page.$('.logo, a[href*="/"]');
            if (logo) {
                await logo.click({ delay: 80 });
                await page.waitForTimeout(600);
            }
        } catch (e) {}

        try {
            const randomElement = await page.$('button, a, .btn');
            if (randomElement) {
                await randomElement.click({ delay: 80 });
                await page.waitForTimeout(600);
            }
        } catch (e) {}

        console.log('⏳ 3 saniye bekleniyor...');
        await page.waitForTimeout(3000);

        // 🎯 COOKIE'LERİ AL
        let allCookies = await context.cookies();
        console.log(`✅ ${allCookies.length} COOKIE TOPLANDI!`);

        // 🎯 COOKIE'LERİ SESSION'A YÜKLE
        session.initializeFromCookies(allCookies);

        // 🎯 3. ADIM: ÜYELİK İŞLEMİ (AYNI SEKMEDE)
        console.log('\n3️⃣  ÜYELİK İŞLEMİ BAŞLATILIYOR...');

        // 🎯 TARAYICI HEADER'LARINI AL
        const pageHeaders = await page.evaluate(() => {
            return {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform
            };
        });

        // 🎯 BASE HEADER'LARI AYARLA
        session.baseHeaders = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
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

        // 🎯 EMAIL OLUŞTUR
        console.log('📧 EMAIL OLUŞTURULUYOR...');
        const email = session.generateEmail();
        console.log('📧 Email:', email);

        // 🎯 XSRF TOKEN AL
        console.log('🔑 XSRF TOKEN ALINIYOR...');
        
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
        console.log('📡 XSRF Response Status:', xsrfResponse.status);
        
        if (xsrfResponse.status === 200) {
            const bodyData = typeof xsrfResponse.body === 'string' 
                ? JSON.parse(xsrfResponse.body) 
                : xsrfResponse.body;
            
            if (bodyData && bodyData.xsrfToken) {
                session.xsrfToken = bodyData.xsrfToken;
                console.log('✅ XSRF TOKEN ALINDI');
                
                if (xsrfResponse.headers && xsrfResponse.headers['set-cookie']) {
                    session.parseAndStoreCookies(xsrfResponse.headers['set-cookie']);
                }
            }
        }

        if (!session.xsrfToken) {
            throw new Error('XSRF Token alınamadı');
        }

        // 🎯 KAYIT İSTEĞİ GÖNDER
        console.log('📝 KAYIT İSTEĞİ GÖNDERİLİYOR...');

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
        console.log('📨 Register Response Status:', registerResponse.status);
        
        const registerBody = typeof registerResponse.body === 'string'
            ? JSON.parse(registerResponse.body)
            : registerResponse.body;
        
        if (registerResponse.headers && registerResponse.headers['set-cookie']) {
            session.parseAndStoreCookies(registerResponse.headers['set-cookie']);
        }

        if (registerResponse.status === 200 && registerBody && registerBody.success) {
            console.log('✅ KAYIT İSTEĞİ BAŞARILI!');
            const referenceId = registerBody.data?.referenceId;
            console.log('🔖 ReferenceId:', referenceId);

            // 🎯 OTP KODU BEKLE
            console.log('⏳ OTP KODU BEKLENİYOR (15 saniye)...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            console.log('📱 OTP kodu alınıyor...');
            const otpCode = await session.getOtpCode(email);
            
            if (otpCode) {
                console.log('✅ OTP KODU HAZIR:', otpCode);

                // 🎯 2. XSRF TOKEN AL
                console.log('🔑 2. XSRF TOKEN ALINIYOR...');
                
                const xsrfResponse2 = await session.sendWorkerRequest(xsrfRequestData);
                
                if (xsrfResponse2.status === 200) {
                    const bodyData2 = typeof xsrfResponse2.body === 'string' 
                        ? JSON.parse(xsrfResponse2.body) 
                        : xsrfResponse2.body;
                    
                    if (bodyData2 && bodyData2.xsrfToken) {
                        const xsrfToken2 = bodyData2.xsrfToken;
                        console.log('✅ 2. XSRF TOKEN ALINDI');

                        if (xsrfResponse2.headers && xsrfResponse2.headers['set-cookie']) {
                            session.parseAndStoreCookies(xsrfResponse2.headers['set-cookie']);
                        }

                        // 🎯 OTP DOĞRULAMA
                        console.log('✅ OTP DOĞRULAMA GÖNDERİLİYOR...');
                        
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
                        console.log('📨 OTP Verify Response Status:', otpVerifyResponse.status);
                        
                        const otpVerifyBody = typeof otpVerifyResponse.body === 'string'
                            ? JSON.parse(otpVerifyResponse.body)
                            : otpVerifyResponse.body;
                        
                        if (otpVerifyResponse.headers && otpVerifyResponse.headers['set-cookie']) {
                            session.parseAndStoreCookies(otpVerifyResponse.headers['set-cookie']);
                        }

                        let requestId = null;
                        if (otpVerifyBody && otpVerifyBody.success) {
                            requestId = otpVerifyBody.requestId || 
                                       (otpVerifyBody.data && otpVerifyBody.data.requestId);
                            
                            console.log('✅ OTP DOĞRULAMA BAŞARILI!');
                            console.log('🔖 RequestId:', requestId);

                            if (!requestId) {
                                console.log('⚠️ RequestId bulunamadı');
                            }
                        } else {
                            console.log('❌ OTP doğrulama başarısız');
                            // Üyelik başarısız olsa bile cookie toplamaya devam
                        }

                        // 🎯 3. XSRF TOKEN AL
                        console.log('🔑 3. XSRF TOKEN ALINIYOR...');
                        
                        const xsrfResponse3 = await session.sendWorkerRequest(xsrfRequestData);
                        
                        if (xsrfResponse3.status === 200) {
                            const bodyData3 = typeof xsrfResponse3.body === 'string' 
                                ? JSON.parse(xsrfResponse3.body) 
                                : xsrfResponse3.body;
                            
                            if (bodyData3 && bodyData3.xsrfToken) {
                                const xsrfToken3 = bodyData3.xsrfToken;
                                console.log('✅ 3. XSRF TOKEN ALINDI');

                                if (xsrfResponse3.headers && xsrfResponse3.headers['set-cookie']) {
                                    session.parseAndStoreCookies(xsrfResponse3.headers['set-cookie']);
                                }

                                // 🎯 KAYIT TAMAMLAMA
                                console.log('🎉 KAYIT TAMAMLAMA GÖNDERİLİYOR...');
                                
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
                                        password: "TestPassword123",
                                        subscribeSms: true,
                                        requestId: requestId
                                    })
                                };
                                
                                const completeResponse = await session.sendWorkerRequest(completeData);
                                console.log('📨 Complete Response Status:', completeResponse.status);
                                
                                const completeBody = typeof completeResponse.body === 'string'
                                    ? JSON.parse(completeResponse.body)
                                    : completeResponse.body;
                                
                                if (completeResponse.status === 200 && completeBody && completeBody.success) {
                                    console.log('🎉 🎉 🎉 KAYIT BAŞARILI! 🎉 🎉 🎉');
                                    console.log('📧 Email:', email);
                                    console.log('🔑 Access Token:', completeBody.data?.accessToken?.substring(0, 20) + '...');
                                } else {
                                    console.log('❌ Kayıt tamamlama başarısız');
                                }
                            }
                        }
                    }
                }
            } else {
                console.log('❌ OTP kodu alınamadı');
            }
        } else {
            console.log('❌ Kayıt isteği başarısız');
        }

        // 🎯 4. ADIM: COOKIE TOPLAMA DEVAM (AYNI SEKMEDE)
        console.log('\n4️⃣  COOKIE TOPLAMA İŞİNE DEVAM EDİLİYOR...');
        
        // 🎯 YENİ SAYFA AÇ VEYA MEVCUT SAYFAYI KULLAN
        await page.goto('https://www.hepsiburada.com', {
            waitUntil: 'networkidle',
            timeout: 15000
        });

        console.log('⏳ 5 saniye bekleniyor...');
        await page.waitForTimeout(5000);

        // 🎯 SON COOKIE'LERİ AL
        const finalCookies = await context.cookies();
        console.log(`✅ SON DURUM: ${finalCookies.length} COOKIE`);

        return {
            success: true,
            email: email,
            initial_cookies: allCookies.length,
            final_cookies: finalCookies.length,
            cookies: finalCookies,
            message: 'Cookie toplama + Üyelik + Cookie toplama tamamlandı'
        };

    } catch (error) {
        console.log('\n💥 HATA OLUŞTU!');
        console.log('📢 Hata Mesajı:', error.message);
        return { 
            success: false, 
            error: error.message,
            message: 'İşlem hataya uğradı'
        };
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🔚 Browser kapatıldı');
        }
    }
}

// 🎯 FONKSİYONU DIŞARI AÇ
module.exports = { cookieVeUyelikEntegre, HepsiburadaSession };

// 🎯 TEK BAŞINA ÇALIŞTIRMA
if (require.main === module) {
    cookieVeUyelikEntegre().then(result => {
        console.log('\n🎯 FİNAL SONUÇ:', result);
    });
}
