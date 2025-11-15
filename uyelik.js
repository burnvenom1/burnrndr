// 🎯 HEPŞİBURADA ÜYELİK SİSTEMİ
// 🚀 SEKME HEADER'LARI + WORKER + COOKIE YÖNETİMİ
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
                    console.log(`      🍪 Cookie güncellendi: ${name.trim()}`);
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
            "lnmwhbvvf@emltmp.com", "bshuzcvvf@emltmp.com", "hsfsqxcug@emltmp.com",
            "nqywhdnoh@emlhub.com", "048370crsm@freeml.net", "04837v1h98@freeml.net",
            "04838e039m@freeml.net", "04839mk808@freeml.net", "0483aa1zj4@freeml.net",
            "jy1c7eh2@mailpwr.com", "jy1kb68h@mailpwr.com", "jz6qk02m@mailpwr.com"
        ];
        
        const randomPart2 = Math.random().toString(36).substring(2, 6);
        const randomPart = Math.random().toString(36).substring(2, 6);
        const randomIndex = Math.floor(Math.random() * baseTemplates.length);
        const baseEmail = baseTemplates[randomIndex];
        const parts = baseEmail.split("@");
        const username = parts[0];
        const domain = parts[1];
        
        const formattedEmail = username + '.' + randomPart.substring(0, 3) + '@' + randomPart2.substring(0, 3) + '.' + domain;
        
        return formattedEmail;
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
}

// 🎯 ANA ÜYELİK FONKSİYONU - SADECE API İSTEKLERİ YAPAR
async function hepsiburadaKayit(cookies, userAgent, language, platform) {
    const session = new HepsiburadaSession();
    
    try {
        console.log('🚀 ====================================');
        console.log('🚀 HEPŞİBURADA - MANUEL ÜYELİK');
        console.log('🚀 ====================================\n');

        // 🎯 COOKIE'LERİ SESSION'A YÜKLE
        console.log('1️⃣  COOKIE\'LER YÜKLENİYOR...');
        cookies.forEach(cookie => {
            session.cookies.set(cookie.name, {
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path
            });
        });
        console.log(`🍪 ${cookies.length} cookie session'a yüklendi`);

        // 🎯 BASE HEADER'LARI AYARLA
        session.baseHeaders = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': language || 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'accept-encoding': 'gzip, deflate, br',
            'cache-control': 'no-cache',
            'connection': 'keep-alive',
            'origin': 'https://giris.hepsiburada.com',
            'referer': 'https://giris.hepsiburada.com/',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors', 
            'sec-fetch-site': 'same-site',
            'user-agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': `"${platform || 'Windows'}"`
        };

        // 🎯 EMAIL OLUŞTUR
        console.log('\n2️⃣  EMAIL OLUŞTURULUYOR...');
        const email = session.generateEmail();
        console.log('📧 Email:', email);

        // 🎯 XSRF TOKEN AL
        console.log('\n3️⃣  XSRF TOKEN ALINIYOR...');
        
        const xsrfHeaders = {
            ...session.baseHeaders,
            'cookie': session.getCookieHeader()
        };

        const xsrfRequestData = {
            targetUrl: 'https://oauth.hepsiburada.com/api/authenticate/xsrf-token',
            method: 'GET',
            headers: xsrfHeaders
        };

        console.log('📨 Worker\'a XSRF isteği gönderiliyor...');
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
        console.log('\n4️⃣  KAYIT İSTEĞİ GÖNDERİLİYOR...');

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

        console.log('📨 Worker\'a kayıt isteği gönderiliyor...');
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

            // 🎯 OTP KODU BEKLE VE AL
            console.log('\n5️⃣  OTP KODU BEKLENİYOR (15 saniye)...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            console.log('📱 OTP kodu alınıyor...');
            const otpCode = await session.getOtpCode(email);
            
            if (otpCode) {
                console.log('✅ OTP KODU HAZIR:', otpCode);
                return { success: true, email: email, otp: otpCode };
            } else {
                console.log('❌ OTP kodu alınamadı');
                return { success: false, error: 'OTP kodu alınamadı' };
            }
        } else {
            console.log('❌ Kayıt isteği başarısız');
            return { success: false, error: 'Kayıt isteği başarısız' };
        }

    } catch (error) {
        console.log('\n💥 HATA OLUŞTU!');
        console.log('📢 Hata Mesajı:', error.message);
        return { success: false, error: error.message };
    }
}

// WEBHOOK FONKSİYONU
async function sendCookiesToWebhook(cookies, source) {
    try {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (webhookUrl) {
            const axios = require('axios');
            const payload = {
                cookies: cookies,
                count: cookies.length,
                timestamp: new Date().toISOString(),
                source: source
            };
            await axios.post(webhookUrl, payload, { timeout: 10000 });
            console.log('📤 Cookie\'ler webhooka gönderildi');
            return true;
        }
        return false;
    } catch (error) {
        console.log('❌ Webhook gönderilemedi:', error.message);
        return false;
    }
}

module.exports = {
    HepsiburadaSession,
    hepsiburadaKayit,
    sendCookiesToWebhook
};
