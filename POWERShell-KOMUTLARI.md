# PowerShell Komutları - Local Kurulum

## 1. Frontend .env Dosyası Oluştur/Düzelt

```powershell
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"

# .env dosyasını oluştur veya güncelle
@"
REACT_APP_BACKEND_URL=http://localhost:8000
WDS_SOCKET_PORT=3000
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
"@ | Out-File -FilePath .env -Encoding utf8

# Kontrol et
Get-Content .env
```

## 2. Backend .env Dosyası Oluştur/Düzelt

```powershell
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\backend"

# .env dosyasını oluştur veya güncelle
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=travel_agency_db
JWT_SECRET_KEY=
CORS_ORIGINS=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8

# Kontrol et
Get-Content .env
```

## 3. Frontend .env'i Production'dan Local'e Çevir

```powershell
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"

# Mevcut .env'i oku ve değiştir
(Get-Content .env) -replace 'REACT_APP_BACKEND_URL=.*', 'REACT_APP_BACKEND_URL=http://localhost:8000' | Set-Content .env

# Kontrol et
Get-Content .env
```

## 4. Backend Başlatma

```powershell
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\backend"

# Virtual environment aktif et
.\venv\Scripts\Activate.ps1

# Backend'i başlat
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

## 5. Admin Hesabı Oluşturma

```powershell
# Backend çalıştıktan sonra (10-15 saniye bekleyin)
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/init-admin" -Method Post -ContentType "application/json"
```

## 6. Frontend Başlatma

```powershell
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app\frontend"

# Frontend'i başlat
npm start
```

## Tümünü Tek Seferde (PowerShell Script)

```powershell
# Proje dizinine git
cd "C:\Users\bsr2\Desktop\Yeni klasör\app\app"

# Frontend .env
@"
REACT_APP_BACKEND_URL=http://localhost:8000
WDS_SOCKET_PORT=3000
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
"@ | Out-File -FilePath "frontend\.env" -Encoding utf8

# Backend .env
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=travel_agency_db
JWT_SECRET_KEY=
CORS_ORIGINS=http://localhost:3000
"@ | Out-File -FilePath "backend\.env" -Encoding utf8

Write-Host "✓ .env dosyaları oluşturuldu!" -ForegroundColor Green
Write-Host ""
Write-Host "Şimdi backend ve frontend'i başlatın:" -ForegroundColor Yellow
Write-Host "  Backend:  cd backend && .\venv\Scripts\python.exe -m uvicorn server:app --reload --port 8000"
Write-Host "  Frontend: cd frontend && npm start"
```








