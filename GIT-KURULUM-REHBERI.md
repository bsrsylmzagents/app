# 🔧 Git Kurulum Rehberi

## Git Kurulu Değil - Hızlı Çözüm

### Yöntem 1: Git'i İndir ve Kur (Önerilen)

1. **Git'i İndir:**
   - https://git-scm.com/download/win adresine gidin
   - "Download for Windows" butonuna tıklayın
   - İndirilen `.exe` dosyasını çalıştırın

2. **Kurulum Sırasında:**
   - **"Add Git to PATH"** seçeneğini işaretleyin (ÖNEMLİ!)
   - Diğer ayarları varsayılan olarak bırakabilirsiniz
   - "Next" → "Next" → "Install" → "Finish"

3. **Kurulum Sonrası:**
   - PowerShell'i **kapatıp yeniden açın**
   - Şu komutu çalıştırın:
   ```powershell
   git --version
   ```
   - `git version 2.x.x` gibi bir çıktı görmelisiniz

---

### Yöntem 2: Winget ile Kur (Hızlı)

PowerShell'i **Yönetici olarak** açın ve şu komutu çalıştırın:

```powershell
winget install --id Git.Git -e --source winget
```

Kurulum sonrası PowerShell'i yeniden başlatın.

---

### Yöntem 3: Chocolatey ile Kur

Eğer Chocolatey kuruluysa:

```powershell
choco install git -y
```

---

## Kurulum Sonrası Kontrol

1. **PowerShell'i yeniden açın** (kritik!)

2. Git versiyonunu kontrol edin:
   ```powershell
   git --version
   ```

3. Git konfigürasyonu yapın (ilk kez kullanıyorsanız):
   ```powershell
   git config --global user.name "Adınız Soyadınız"
   git config --global user.email "email@example.com"
   ```

---

## Git Kurulu Ama PATH'te Değil

Eğer Git kurulu ama komut çalışmıyorsa:

### Çözüm 1: PATH'e Manuel Ekle

1. Git'in kurulu olduğu klasörü bulun:
   - Genellikle: `C:\Program Files\Git\cmd\`
   - Veya: `C:\Program Files (x86)\Git\cmd\`

2. Windows'ta:
   - `Win + R` → `sysdm.cpl` → Enter
   - "Advanced" sekmesi → "Environment Variables"
   - "System variables" altında "Path" seçin → "Edit"
   - "New" → Git'in `cmd` klasörünün yolunu ekleyin
   - Örnek: `C:\Program Files\Git\cmd`
   - "OK" → "OK" → "OK"

3. PowerShell'i yeniden başlatın

### Çözüm 2: Tam Yol ile Kullan

Geçici olarak tam yol ile kullanabilirsiniz:

```powershell
& "C:\Program Files\Git\cmd\git.exe" status
& "C:\Program Files\Git\cmd\git.exe" push origin main
```

---

## Hızlı Test

Git kurulumunu test etmek için:

```powershell
# PowerShell'i yeniden açtıktan sonra
cd "C:\Users\bsr\Desktop\Yeni klasör (2)"
git --version
git status
```

**Beklenen Çıktı:**
```
git version 2.42.0.windows.2
On branch main
Your branch is ahead of 'origin/main' by 3 commits.
nothing to commit, working tree clean
```

---

## Sorun Giderme

### "git: command not found" Hatası

1. Git'in kurulu olduğundan emin olun
2. PowerShell'i **tamamen kapatıp yeniden açın**
3. PATH değişkenini kontrol edin:
   ```powershell
   $env:PATH -split ';' | Select-String "git"
   ```

### Git Kurulu Ama Çalışmıyor

1. Git'in tam yolunu bulun:
   ```powershell
   Get-ChildItem -Path "C:\Program Files" -Filter "git.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
   ```

2. Bulunan yolu PATH'e ekleyin (yukarıdaki Çözüm 1)

### PowerShell Execution Policy Hatası

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Git Kurulumu Tamamlandıktan Sonra

1. Proje klasörüne gidin:
   ```powershell
   cd "C:\Users\bsr\Desktop\Yeni klasör (2)"
   ```

2. Git durumunu kontrol edin:
   ```powershell
   git status
   ```

3. Push yapın:
   ```powershell
   git push origin main
   ```

---

## 📞 Yardım

Eğer hala sorun yaşıyorsanız:

1. Git'in kurulu olup olmadığını kontrol edin:
   ```powershell
   Get-Command git -ErrorAction SilentlyContinue
   ```

2. Git'in tam yolunu bulun:
   ```powershell
   (Get-Command git -ErrorAction SilentlyContinue).Source
   ```

3. Bu bilgileri paylaşın, daha spesifik yardım sağlanabilir.



