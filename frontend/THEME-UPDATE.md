# Tema Güncelleme Rehberi

## Yeni Tema Renkleri (VSCode/Cursor benzeri)

- **Arka plan ana rengi**: `#1E1E1E`
- **Panel/Sidebar rengi**: `#222426` veya `#25272A`
- **Kenar/Çizgi tonları**: `#2D2F33`
- **Yazı ana rengi**: `#FFFFFF`
- **İkincil yazı rengi**: `#A5A5A5`
- **Accent/Vurgu rengi**: `#3EA6FF`

## Renk Değişiklikleri

### Eski → Yeni
- `#007acc` → `#3EA6FF` (accent/primary)
- `#14b8dc` → `#3EA6FF`
- `#252526` → `#25272A` (panel/card)
- `#3e3e42` → `#2D2F33` (border)
- `#3c3c3c` → `#2D2F33` (input background)
- `#454545` → `#2D2F33` (input border)
- `text-gray-400` → `text-[#A5A5A5]` (text-secondary)
- `#005a9e` → `#2B8FE6` (hover states)

## Güncellenen Dosyalar

✅ `tailwind.config.js` - Tema renkleri eklendi
✅ `src/index.css` - CSS değişkenleri güncellendi
✅ `src/App.css` - Global stiller güncellendi
✅ `src/components/Layout.js` - Renkler güncellendi
✅ `src/pages/Login.js` - Renkler güncellendi
✅ `src/pages/Dashboard.js` - Renkler güncellendi

## Kalan Dosyalar (Manuel Güncelleme Gerekebilir)

Aşağıdaki dosyalarda da aynı renk değişikliklerini uygulayın:
- `src/pages/Register.js`
- `src/pages/Reservations.js`
- `src/pages/Calendar.js`
- `src/pages/CariAccounts.js`
- `src/pages/ExtraSales.js`
- `src/pages/Reports.js`
- `src/pages/Settings.js`
- `src/pages/AdminCustomers.js`
- `src/pages/AdminNewCustomer.js`
- `src/pages/AdminEditCustomer.js`
- `src/pages/CompanyProfile.js`
- `src/pages/TourTypes.js`
- `src/pages/PaymentTypes.js`
- `src/components/CurrencyConverter.js`

## Toplu Değiştirme Komutları

Tüm dosyalarda toplu değiştirme için:

```bash
# PowerShell'de (app/frontend/src klasöründe)
Get-ChildItem -Recurse -Include *.js,*.jsx,*.ts,*.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace '#007acc', '#3EA6FF' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '#252526', '#25272A' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '#3e3e42', '#2D2F33' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '#3c3c3c', '#2D2F33' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '#454545', '#2D2F33' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace 'text-gray-400', 'text-[#A5A5A5]' | Set-Content $_.FullName
}
```








