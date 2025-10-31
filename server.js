// PLAYWRIGHT CHROMIUM PATH BUL
function findChromiumPath() {
    const fs = require('fs');
    const path = require('path');
    
    const basePath = '/opt/render/.cache/ms-playwright';
    console.log('🔍 Chromium path aranıyor...');
    
    if (!fs.existsSync(basePath)) {
        console.log('❌ Playwright cache dizini yok:', basePath);
        return null;
    }
    
    try {
        const items = fs.readdirSync(basePath);
        console.log('📁 Mevcut dizinler:', items);
        
        for (const item of items) {
            const itemPath = path.join(basePath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory() && item.includes('chromium')) {
                console.log(`🔍 ${item} inceleniyor...`);
                
                // Dizin içindeki tüm dosyaları recursive listele
                function listFiles(dir, prefix = '') {
                    try {
                        const files = fs.readdirSync(dir);
                        for (const file of files) {
                            const filePath = path.join(dir, file);
                            const fileStat = fs.statSync(filePath);
                            
                            if (fileStat.isDirectory()) {
                                console.log(`${prefix}📁 ${file}/`);
                                listFiles(filePath, prefix + '  ');
                            } else {
                                console.log(`${prefix}📄 ${file}`);
                                // Executable dosyaları kontrol et
                                if (file === 'chrome' || file === 'headless_shell' || file.endsWith('.exe')) {
                                    console.log(`🎯 POTANSİYEL EXECUTABLE: ${filePath}`);
                                }
                            }
                        }
                    } catch (e) {}
                }
                
                listFiles(itemPath);
            }
        }
    } catch (error) {
        console.log('❌ Dizin okuma hatası:', error.message);
    }
    
    return null;
}

// İlk çalıştırmada path kontrolü yap
setTimeout(() => {
    console.log('🕵️ Chromium path kontrolü yapılıyor...');
    findChromiumPath();
}, 1000);
