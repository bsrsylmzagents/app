# NPM Install Sorunu Çözümü

## Sorun
npm install komutu dönüp duruyor ve frontend başlatılamıyor.

## Çözüm Adımları

1. **package-lock.json silindi** ✓
2. **npm cache temizleme** (PowerShell execution policy hatası nedeniyle manuel yapılmalı):
   ```powershell
   npm cache clean --force
   ```

3. **node_modules silme ve yeniden yükleme**:
   ```powershell
   cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"
   Remove-Item -Recurse -Force node_modules
   npm install
   ```

4. **Alternatif: npm yerine yarn kullanma**:
   ```powershell
   npm install -g yarn
   yarn install
   ```

## Notlar
- PowerShell execution policy hatası alıyorsanız, komutları CMD'de çalıştırın veya execution policy'yi değiştirin:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```


