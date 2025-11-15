// 🎯 GELİŞMİŞ FINGERPRINT SPOOFING FONKSİYONLARI
function getCanvasFingerprintScript() {
    return `
    // Canvas fingerprint spoofing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        if (contextType === '2d') {
            const originalGetImageData = context.getImageData;
            context.getImageData = function(...args) {
                const imageData = originalGetImageData.apply(this, args);
                // Add slight noise to canvas fingerprint
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] = imageData.data[i] + Math.floor(Math.random() * 3) - 1;
                    imageData.data[i + 1] = imageData.data[i + 1] + Math.floor(Math.random() * 3) - 1;
                    imageData.data[i + 2] = imageData.data[i + 2] + Math.floor(Math.random() * 3) - 1;
                }
                return imageData;
            };
        }
        return context;
    };
    `;
}

function getWebGLFingerprintScript() {
    return `
    // WebGL fingerprint spoofing
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
            const context = originalGetContext.call(this, contextType, ...args);
            if (context) {
                const originalGetParameter = context.getParameter;
                context.getParameter = function(parameter) {
                    // Spoof WebGL parameters
                    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
                        return 'Google Inc. (NVIDIA)';
                    }
                    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
                        return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)';
                    }
                    return originalGetParameter.call(this, parameter);
                };
            }
            return context;
        }
        return originalGetContext.call(this, contextType, ...args);
    };
    `;
}

function getAudioContextFingerprintScript() {
    return `
    // AudioContext fingerprint spoofing
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (originalAudioContext) {
        window.AudioContext = function() {
            const context = new originalAudioContext();
            const originalCreateOscillator = context.createOscillator;
            context.createOscillator = function() {
                const oscillator = originalCreateOscillator.call(this);
                // Modify oscillator properties slightly
                const originalFrequency = oscillator.frequency;
                Object.defineProperty(oscillator.frequency, 'value', {
                    get: function() {
                        return originalFrequency.value + (Math.random() * 0.1 - 0.05);
                    }
                });
                return oscillator;
            };
            return context;
        };
        window.webkitAudioContext = window.AudioContext;
    }
    `;
}

function getFontFingerprintScript() {
    return `
    // Font fingerprint spoofing
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = function(text) {
        const result = originalMeasureText.call(this, text);
        // Slightly modify text measurements
        Object.defineProperty(result, 'width', {
            get: function() {
                return originalMeasureText.call(this, text).width + (Math.random() * 2 - 1);
            }
        });
        return result;
    };
    `;
}

function getTimezoneLocaleScript() {
    return `
    // Timezone ve locale spoofing
    const originalTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
        return -180; // UTC+3 for Turkey
    };
    
    Object.defineProperty(Intl, 'DateTimeFormat', {
        value: function(locales, options) {
            return new Intl.DateTimeFormat('tr-TR', options);
        }
    });
    `;
}

function getHardwareConcurrencyScript() {
    return `
    // Hardware concurrency spoofing
    Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: function() {
            return 8;
        }
    });
    
    Object.defineProperty(navigator, 'deviceMemory', {
        get: function() {
            return 8;
        }
    });
    `;
}

function getScreenResolutionScript() {
    return `
    // Screen resolution spoofing
    Object.defineProperty(screen, 'width', {
        get: function() {
            return 1920;
        }
    });
    
    Object.defineProperty(screen, 'height', {
        get: function() {
            return 1080;
        }
    });
    
    Object.defineProperty(screen, 'availWidth', {
        get: function() {
            return 1920;
        }
    });
    
    Object.defineProperty(screen, 'availHeight', {
        get: function() {
            return 1040;
        }
    });
    
    Object.defineProperty(screen, 'colorDepth', {
        get: function() {
            return 24;
        }
    });
    
    Object.defineProperty(screen, 'pixelDepth', {
        get: function() {
            return 24;
        }
    });
    `;
}

// 🎯 GELİŞMİŞ FINGERPRINT SCRİPT'İ BİRLEŞTİR
function getAdvancedFingerprintScript() {
    return `
    // Fingerprint spoofing scripts
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = originalGetContext.call(this, contextType, ...args);
        return context;
    };

    // WebDriver masking
    Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => false,
        configurable: true,
    });

    // Chrome runtime manipulation
    window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: { InstallState: {}, RunningState: {}, getDetails: () => {}, getIsInstalled: () => {} }
    };

    // Platform spoofing
    Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
    });

    // Languages spoofing
    Object.defineProperty(navigator, 'languages', {
        get: () => ['tr-TR', 'tr', 'en-US', 'en'],
    });

    // Connection spoofing
    Object.defineProperty(navigator, 'connection', {
        get: () => ({
            effectiveType: '4g',
            rtt: 100,
            downlink: 5,
            saveData: false
        }),
        configurable: true
    });

    // Plugin spoofing
    Object.defineProperty(navigator, 'plugins', {
        get: () => [
            {
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format'
            },
            {
                name: 'Chrome PDF Viewer',
                filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                description: 'Portable Document Format'
            },
            {
                name: 'Native Client',
                filename: 'internal-nacl-plugin',
                description: 'Native Client Executable'
            }
        ]
    });

    // MimeType spoofing
    Object.defineProperty(navigator, 'mimeTypes', {
        get: () => [
            {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format'
            }
        ]
    });

    // User agent spoofing reinforcement
    const originalUserAgent = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent').get;
    Object.defineProperty(Navigator.prototype, 'userAgent', {
        get: function() {
            return originalUserAgent.call(this);
        }
    });

    // Additional protection
    Object.defineProperty(navigator, 'permissions', {
        get: function() {
            return {
                query: function() {
                    return Promise.resolve({ state: 'denied' });
                }
            };
        }
    });

    ${getCanvasFingerprintScript()}
    ${getWebGLFingerprintScript()}
    ${getAudioContextFingerprintScript()}
    ${getFontFingerprintScript()}
    ${getTimezoneLocaleScript()}
    ${getHardwareConcurrencyScript()}
    ${getScreenResolutionScript()}
    `;
}

// RASTGELE USER AGENT ÜRET
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

// RASTGELE VIEWPORT ÜRET
function getRandomViewport() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
}

// RASTGELE DİL AYARLARI
function getRandomLanguage() {
    const languages = [
        'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'tr-TR,tr;q=0.9,en;q=0.8',
        'en-US,en;q=0.9,tr;q=0.8',
        'tr,en;q=0.9,en-US;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
}

// 🎯 FINGERPRINT KONFİGÜRASYONU OLUŞTUR
function createFingerprintConfig(fingerprintId) {
    return {
        contextOptions: {
            viewport: getRandomViewport(),
            userAgent: getRandomUserAgent(),
            extraHTTPHeaders: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': getRandomLanguage(),
                'sec-ch-ua': `"Not_A Brand";v="8", "Chromium";v="${Math.floor(Math.random() * 10) + 115}", "Google Chrome";v="${Math.floor(Math.random() * 10) + 115}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        },
        fingerprintScript: getAdvancedFingerprintScript()
    };
}

// 🎯 CHROME EXTENSION COOKIE FORMATI DÖNÜŞTÜRÜCÜ
function convertToChromeExtensionFormat(cookies) {
    return cookies.map(cookie => {
        const chromeCookie = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            sameSite: convertSameSiteForChrome(cookie.sameSite),
            expirationDate: convertExpiresToChromeFormat(cookie.expires),
            url: generateUrlForCookie(cookie)
        };
        
        delete chromeCookie.expires;
        return chromeCookie;
    });
}

function convertSameSiteForChrome(sameSite) {
    if (!sameSite) return 'no_restriction';
    const mapping = {
        'Lax': 'lax',
        'Strict': 'strict',
        'None': 'no_restriction'
    };
    return mapping[sameSite] || 'no_restriction';
}

function convertExpiresToChromeFormat(expires) {
    if (!expires) {
        return Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
    }
    const expiresDate = new Date(expires * 1000 || expires);
    return Math.floor(expiresDate.getTime() / 1000);
}

function generateUrlForCookie(cookie) {
    const protocol = cookie.secure ? 'https://' : 'http://';
    let domain = cookie.domain;
    if (domain.startsWith('.')) {
        domain = 'www' + domain;
    }
    return protocol + domain + (cookie.path || '/');
}

module.exports = {
    getAdvancedFingerprintScript,
    createFingerprintConfig,
    convertToChromeExtensionFormat,
    getRandomUserAgent,
    getRandomViewport,
    getRandomLanguage
};
