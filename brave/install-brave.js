const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

console.log('🚀 BRAVE BROWSER KURULUMU BAŞLIYOR...');

function installBrave() {
    const platform = os.platform();
    
    console.log(`📍 İşletim Sistemi: ${platform}`);
    
    if (platform !== 'linux') {
        throw new Error(`Sadece Linux destekleniyor. Mevcut sistem: ${platform}`);
    }

    try {
        console.log('🐧 Linux sistemde BRAVE kuruluyor...');
        
        // Sistem güncelleme
        console.log('📦 Sistem güncelleniyor...');
        execSync('sudo apt update -y', { stdio: 'inherit' });
        
        // Gerekli araçları kur
        console.log('🔧 Gerekli araçlar kuruluyor...');
        execSync('sudo apt install -y curl wget apt-transport-https', { stdio: 'inherit' });
        
        // Brave GPG key ekle
        console.log('🔑 Brave GPG key ekleniyor...');
        execSync('sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg', { stdio: 'inherit' });
        
        // Brave repository ekle
        console.log('📚 Brave repository ekleniyor...');
        execSync('echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | sudo tee /etc/apt/sources.list.d/brave-browser-release.list', { stdio: 'inherit' });
        
        // Repository'yi güncelle
        console.log('🔄 Repository güncelleniyor...');
        execSync('sudo apt update -y', { stdio: 'inherit' });
        
        // Brave'i kur
        console.log('🦁 BRAVE browser kuruluyor...');
        execSync('sudo apt install -y brave-browser', { stdio: 'inherit' });
        
        console.log('✅ BRAVE Browser kurulumu tamamlandı!');
        
        // Brave path'ini kontrol et
        const bravePaths = [
            '/usr/bin/brave-browser',
            '/usr/bin/brave',
            '/snap/bin/brave'
        ];
        
        for (const path of bravePaths) {
            if (fs.existsSync(path)) {
                console.log(`📁 Brave bulundu: ${path}`);
                return path;
            }
        }
        
        throw new Error('Brave kuruldu ama path bulunamadı');
        
    } catch (error) {
        console.log('❌ BRAVE kurulumu BAŞARISIZ:', error.message);
        throw new Error('BRAVE kurulumu zorunlu! Chromium kullanılamaz.');
    }
}

// Kurulumu başlat
try {
    const bravePath = installBrave();
    console.log(`🎉 BRAVE başarıyla kuruldu: ${bravePath}`);
    console.log('🚀 Uygulama BRAVE ile çalışmaya hazır!');
} catch (error) {
    console.log('💥 KRİTİK HATA:', error.message);
    console.log('❌ BRAVE kurulamadığı için uygulama çalıştırılamaz!');
    process.exit(1);
}
