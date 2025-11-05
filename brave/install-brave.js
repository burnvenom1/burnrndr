const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

console.log('🚀 Brave Browser Kurulumu Başlıyor...');

function installBrave() {
    const platform = os.platform();
    
    try {
        if (platform === 'linux') {
            console.log('🐧 Linux sistemde Brave kuruluyor...');
            
            // Brave'i indir ve kur
            execSync('sudo apt update', { stdio: 'inherit' });
            execSync('sudo apt install -y curl', { stdio: 'inherit' });
            
            // Brave repository ekle
            execSync('sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg', { stdio: 'inherit' });
            
            execSync('echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | sudo tee /etc/apt/sources.list.d/brave-browser-release.list', { stdio: 'inherit' });
            
            execSync('sudo apt update', { stdio: 'inherit' });
            execSync('sudo apt install -y brave-browser', { stdio: 'inherit' });
            
            console.log('✅ Brave Browser kurulumu tamamlandı!');
            
            // Brave path'ini kontrol et
            const bravePath = '/usr/bin/brave-browser';
            if (fs.existsSync(bravePath)) {
                console.log(`📁 Brave path: ${bravePath}`);
                return bravePath;
            } else {
                console.log('❌ Brave kurulumu başarısız, Chromium kullanılacak');
                return null;
            }
            
        } else if (platform === 'darwin') {
            console.log('🍎 macOS sistemde Brave kurulumu desteklenmiyor');
            return null;
        } else if (platform === 'win32') {
            console.log('🪟 Windows sistemde Brave kurulumu desteklenmiyor');
            return null;
        }
    } catch (error) {
        console.log('❌ Brave kurulum hatası:', error.message);
        console.log('🔄 Chromium kullanılacak');
        return null;
    }
}

// Kurulumu başlat
const bravePath = installBrave();

// Brave path'ini environment variable olarak kaydet
if (bravePath) {
    console.log(`🎯 Brave başarıyla kuruldu: ${bravePath}`);
} else {
    console.log('ℹ️ Brave kurulamadı, Chromium kullanılacak');
}
