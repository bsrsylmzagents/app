# 🚀 Manuel Git Push Rehberi

## Adım Adım Push İşlemi

### 1. Git Durumunu Kontrol Et

PowerShell veya CMD'de proje klasörüne gidin ve şu komutu çalıştırın:

```powershell
cd "C:\Users\bsr\Desktop\Yeni klasör (2)"
git status
```

**Beklenen Çıktı:**
- `Your branch is ahead of 'origin/main' by X commits` mesajını görmelisiniz
- `nothing to commit, working tree clean` olmalı

---

### 2. Remote Repository'yi Kontrol Et

```powershell
git remote -v
```

**Beklenen Çıktı:**
```
origin  https://github.com/bsrsylmzagents/app.git (fetch)
origin  https://github.com/bsrsylmzagents/app.git (push)
```

---

### 3. Son Commit'leri Görüntüle

```powershell
git log --oneline -5
```

**Beklenen Çıktı:**
```
241b079 Feat: OAuth callback GET endpoint eklendi - Test endpoint eklendi
319578e Fix: OAuth callback handler eklendi - app/ nested klasör yapısı tekrar temizlendi
aa64de5 Fix: Security ve bug düzeltmeleri - Proje yapısı düzleştirildi
...
```

---

### 4. Push İşlemini Başlat

```powershell
git push origin main
```

**İlk Push'ta:**
- GitHub authentication penceresi açılacak
- GitHub kullanıcı adı ve şifrenizi girin
- Veya Personal Access Token (PAT) kullanın

**Başarılı Push Çıktısı:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Delta compression using up to X threads
Compressing objects: 100% (X/X), done.
Writing objects: 100% (X/X), X.XX KiB | X.XX MiB/s, done.
Total X (delta X), reused X (delta X), pack-reused X
To https://github.com/bsrsylmzagents/app.git
   abc1234..def5678  main -> main
```

---

## 🔐 Authentication Sorunları

### Sorun 1: Authentication Penceresi Açılmıyor

**Çözüm A: Personal Access Token (PAT) Kullan**

1. GitHub'a giriş yapın: https://github.com
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. "Generate new token (classic)" tıklayın
4. Token adı: `TourCast-Push-Token`
5. Süre: `90 days` (veya istediğiniz süre)
6. İzinler: `repo` (tüm repo izinleri) işaretleyin
7. "Generate token" tıklayın
8. **Token'ı kopyalayın** (bir daha gösterilmeyecek!)

**Token ile Push:**
```powershell
git push https://<TOKEN>@github.com/bsrsylmzagents/app.git main
```

Veya token'ı URL'e gömün:
```powershell
git remote set-url origin https://<TOKEN>@github.com/bsrsylmzagents/app.git
git push origin main
```

---

### Sorun 2: "Authentication failed" Hatası

**Çözüm: Git Credential Manager'ı Temizle**

```powershell
# Windows Credential Manager'dan GitHub'ı sil
git credential-manager-core erase
# Veya
cmdkey /list | Select-String "github"
cmdkey /delete:git:https://github.com
```

Sonra tekrar push deneyin.

---

### Sorun 3: "Permission denied" Hatası

**Çözüm: SSH Key Kullan**

1. SSH key oluştur:
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Public key'i GitHub'a ekle:
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - Public key içeriğini yapıştır

3. Remote URL'i SSH'a çevir:
```powershell
git remote set-url origin git@github.com:bsrsylmzagents/app.git
git push origin main
```

---

## 📋 Hızlı Komut Listesi

```powershell
# 1. Durum kontrolü
git status

# 2. Commit'leri görüntüle
git log --oneline -5

# 3. Push (HTTPS - authentication penceresi açılır)
git push origin main

# 4. Push (Token ile - authentication penceresi açılmaz)
git push https://<TOKEN>@github.com/bsrsylmzagents/app.git main

# 5. Push (SSH ile - key kullanır)
git push git@github.com:bsrsylmzagents/app.git main
```

---

## ✅ Push Sonrası Kontrol

Push başarılı olduktan sonra:

```powershell
# Remote'daki son commit'leri görüntüle
git fetch origin
git log origin/main --oneline -5

# Local ve remote'u karşılaştır
git status
```

**Beklenen Çıktı:**
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 🆘 Hata Mesajları ve Çözümleri

### "Updates were rejected because the remote contains work"
**Çözüm:**
```powershell
git pull origin main --rebase
git push origin main
```

### "Failed to push some refs"
**Çözüm:**
```powershell
git fetch origin
git merge origin/main
git push origin main
```

### "Repository not found"
**Çözüm:**
- Repository adını kontrol edin
- GitHub'da repository'nin var olduğundan emin olun
- Erişim izinlerinizi kontrol edin

---

## 📞 Yardım

Eğer hala sorun yaşıyorsanız:

1. Hata mesajının tamamını kopyalayın
2. `git status` çıktısını paylaşın
3. `git log --oneline -5` çıktısını paylaşın

Bu bilgilerle daha spesifik yardım sağlanabilir.

