# Winisland

[English](README.md) | **Türkçe**

Winisland, Windows için Dynamic Island etkileşim modelinden ilham alan kompakt ve şeffaf bir masaüstü aracıdır. Ekran kenarına sabitlenen bileşen, etkileşimde genişler; boşta kaldığında küçülür. Saat, medya, verimlilik ve sistem kontrollerini kalıcı görev çubuğu alanı kaplamadan sunar.

---

## Genel bakış

Winisland hafif bir always-on-top katman olarak çalışır. Hover, tıklama ve sürükleme hareketleriyle kullanılır. Modüller tek tek açılıp kapatılabilir. Arayüz **Türkçe** ve **İngilizce** dillerini destekler.

| Modül | Açıklama |
|-------|----------|
| **Saat** | Canlı saat, tarih ve hava durumu |
| **Medya** | Windows medya oturumlarından çalan içerik (Spotify, tarayıcı vb.); oynatma kontrolleri |
| **Zamanlayıcı** | Geri sayım ve süre dolunca bildirim |
| **Notlar** | Hızlı notlar; kopyala ve yapıştır desteği |
| **Ses & Bluetooth** | Çıkış/giriş cihazı, ses seviyesi, eşleşmiş Bluetooth cihazları |
| **Takvim** | Günlük plan ve etkinlikler |
| **Gemini** | İsteğe bağlı yapay zeka sohbeti (API anahtarı gerekir) |
| **Ayarlar** | Modül anahtarları, dil, çoklu monitör, başlangıç seçenekleri |

Bileşen varsayılan olarak üst ortada konumlanır. **Üst**, **alt**, **sol** veya **sağ** ekran kenarına sürüklenip yapıştırılabilir. Sol ve sağ konumlarda dikey compact düzen kullanılır.

---

## Gereksinimler

| | |
|---|---|
| **İşletim sistemi** | Windows 10 / 11 (64 bit) |
| **Hazır sürüm** | Ek bağımlılık gerekmez |
| **Kaynaktan derleme** | [Node.js](https://nodejs.org/) 18+ (LTS önerilir) |

---

## Kurulum

### Hazır yürütülebilir dosya

1. [Releases](https://github.com/onurgnll/dynwin/releases) sayfasından en güncel sürümü indirin.
2. **Winisland Setup … .exe** dosyasını çalıştırın (masaüstü kısayolu içeren standart kurulum).
3. Uygulamayı başlatın. Sistem tepsisine ikon eklenir; çıkmak için sağ tık → **Çıkış**.

İlk çalıştırmada bileşen birincil ekranın üst ortasında görünür.

### Kaynaktan çalıştırma

```bash
git clone https://github.com/onurgnll/dynwin.git
cd dynwin
npm install
npm start
```

Günlük çıktılı geliştirme modu:

```bash
npm run dev
```

---

## Kullanım

### Genel

| Eylem | Sonuç |
|-------|--------|
| Bileşenin üzerine gelmek | Aktif modülü genişletir |
| İmleci uzaklaştırmak | Kısa gecikme sonrası küçültür |
| Gövdeye tıklamak | Etkin modüller arasında geçiş |
| Alt noktalar / ayarlar simgesi | Doğrudan modül seçimi |
| Sürüklemek | Ekran kenarına yapıştırma |

---

## Dağıtım paketi oluşturma

```bash
npm install
npm run build
```

Çıktı dizini: `dist/`

| Dosya | Tür |
|-------|-----|
| `Winisland Setup 1.0.0.exe` | NSIS kurulum |

Kurulum paketi:

```bash
npm run build:installer
```

---

## Teknik özet

- **Çalışma ortamı:** Şeffaf çerçevesiz pencerelerle Electron
- **Medya:** `windows-media-sessions` üzerinden Windows Media Session API
- **Depolama:** Notlar, takvim ve ayarlar için yerel kalıcılık (`%APPDATA%`)
- **Yerelleştirme:** İngilizce (`en`), Türkçe (`tr`)

---

## Lisans

MIT Lisansı. Ayrıntılar için depo lisans koşullarına bakın.

---

**Geliştirici:** [github.com/onurgnll](https://github.com/onurgnll)
