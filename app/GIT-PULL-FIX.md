# Git Pull Sorunu Çözümü

## Sorun: "error: invalid path 'nul'"

Bu hata Windows'ta git'in "nul" dosyasını (Windows null device) algılamasından kaynaklanır.

## Çözüm Adımları

### 1. Git Config Düzeltmeleri (Yapıldı)
```bash
git config core.quotepath false
git config core.ignorecase true
git config core.precomposeunicode false
```

### 2. Alternatif Pull Yöntemi

Eğer hala "nul" hatası alıyorsanız:

```bash
# Mevcut değişiklikleri kaydet
git stash

# Force pull (dikkatli kullanın - yerel değişiklikleri kaybedebilir)
git fetch origin main
git reset --hard origin/main

# Stash'ten değişiklikleri geri yükle
git stash pop
```

### 3. Manuel Merge (Önerilen)

```bash
# Remote değişiklikleri al
git fetch origin main

# Sadece belirli dosyaları merge et
git checkout origin/main -- <dosya-yolu>

# Veya tüm değişiklikleri görmek için
git diff origin/main
```

### 4. Repository'yi Temizle (Son Çare)

```bash
# .git klasörünü yedekle
# Sonra temiz bir clone yap
cd ..
git clone https://github.com/bsrsylmzagents/app.git app-new
# Sonra dosyalarınızı yeni klasöre kopyalayın
```

## Notlar

- "nul" hatası genellikle Windows'ta batch dosyalarında `>nul` kullanımından kaynaklanır
- Bu dosyalar genellikle .gitignore'da olmalıdır
- Eğer sorun devam ederse, GitHub repository'de "nul" adında bir dosya olabilir


