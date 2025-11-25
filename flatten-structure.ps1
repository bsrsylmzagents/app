# PowerShell Script to Flatten Project Structure
# Moves frontend and backend from app/ to root, then cleans up nested folders

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project Structure Flattening Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory (project root)
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow
Write-Host ""

# Define paths
$appFrontendPath = Join-Path $projectRoot "app\frontend"
$appBackendPath = Join-Path $projectRoot "app\backend"
$appCursorRulesPath = Join-Path $projectRoot "app\.cursorrules"
$appFolderPath = Join-Path $projectRoot "app"

$frontendTempPath = Join-Path $projectRoot "frontend-temp"
$backendTempPath = Join-Path $projectRoot "backend-temp"
$rootFrontendPath = Join-Path $projectRoot "frontend"
$rootBackendPath = Join-Path $projectRoot "backend"
$rootCursorRulesPath = Join-Path $projectRoot ".cursorrules"

# Step 1: Verify paths exist
Write-Host "Step 1: Verifying paths..." -ForegroundColor Cyan

if (-not (Test-Path $appFrontendPath)) {
    Write-Host "ERROR: Frontend folder not found at: $appFrontendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $appBackendPath)) {
    Write-Host "ERROR: Backend folder not found at: $appBackendPath" -ForegroundColor Red
    exit 1
}

# Verify frontend has package.json
$frontendPackageJson = Join-Path $appFrontendPath "package.json"
if (-not (Test-Path $frontendPackageJson)) {
    Write-Host "ERROR: Frontend package.json not found. This might not be the correct frontend folder." -ForegroundColor Red
    exit 1
}

# Verify backend has server.py
$backendServerPy = Join-Path $appBackendPath "server.py"
if (-not (Test-Path $backendServerPy)) {
    Write-Host "ERROR: Backend server.py not found. This might not be the correct backend folder." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Frontend folder verified (has package.json)" -ForegroundColor Green
Write-Host "✓ Backend folder verified (has server.py)" -ForegroundColor Green
Write-Host ""

# Step 2: Check if root folders already exist
Write-Host "Step 2: Checking for existing root folders..." -ForegroundColor Cyan

if (Test-Path $rootFrontendPath) {
    Write-Host "WARNING: Root 'frontend' folder already exists!" -ForegroundColor Yellow
    Write-Host "  It will be overwritten by the move operation." -ForegroundColor Yellow
    $overwrite = Read-Host "Continue? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

if (Test-Path $rootBackendPath) {
    Write-Host "WARNING: Root 'backend' folder already exists!" -ForegroundColor Yellow
    Write-Host "  It will be overwritten by the move operation." -ForegroundColor Yellow
    $overwrite = Read-Host "Continue? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# Step 3: Move frontend to temp location
Write-Host "Step 3: Moving frontend to temporary location..." -ForegroundColor Cyan
try {
    if (Test-Path $frontendTempPath) {
        Remove-Item -Path $frontendTempPath -Recurse -Force
    }
    Move-Item -Path $appFrontendPath -Destination $frontendTempPath -Force
    Write-Host "✓ Frontend moved to: $frontendTempPath" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to move frontend: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Move backend to temp location
Write-Host "Step 4: Moving backend to temporary location..." -ForegroundColor Cyan
try {
    if (Test-Path $backendTempPath) {
        Remove-Item -Path $backendTempPath -Recurse -Force
    }
    Move-Item -Path $appBackendPath -Destination $backendTempPath -Force
    Write-Host "✓ Backend moved to: $backendTempPath" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to move backend: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Move .cursorrules to root if it exists
Write-Host "Step 5: Moving .cursorrules to root..." -ForegroundColor Cyan
if (Test-Path $appCursorRulesPath) {
    if (-not (Test-Path $rootCursorRulesPath)) {
        Move-Item -Path $appCursorRulesPath -Destination $rootCursorRulesPath -Force
        Write-Host "✓ .cursorrules moved to root" -ForegroundColor Green
    } else {
        Write-Host "⚠ .cursorrules already exists at root, skipping move" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ .cursorrules not found in app folder, skipping" -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Delete the app folder (cleanup)
Write-Host "Step 6: Cleaning up nested app folder..." -ForegroundColor Cyan
if (Test-Path $appFolderPath) {
    try {
        Remove-Item -Path $appFolderPath -Recurse -Force
        Write-Host "✓ Nested app folder deleted" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Could not fully delete app folder: $_" -ForegroundColor Yellow
        Write-Host "  You may need to manually delete: $appFolderPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ App folder not found (may have been already deleted)" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Rename temp folders to final names
Write-Host "Step 7: Finalizing folder names..." -ForegroundColor Cyan

if (Test-Path $rootFrontendPath) {
    Remove-Item -Path $rootFrontendPath -Recurse -Force
}
Rename-Item -Path $frontendTempPath -NewName "frontend" -Force
Write-Host "✓ frontend-temp renamed to frontend" -ForegroundColor Green

if (Test-Path $rootBackendPath) {
    Remove-Item -Path $rootBackendPath -Recurse -Force
}
Rename-Item -Path $backendTempPath -NewName "backend" -Force
Write-Host "✓ backend-temp renamed to backend" -ForegroundColor Green

Write-Host ""

# Final verification
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Final Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $rootFrontendPath) {
    Write-Host "✓ Root frontend folder exists" -ForegroundColor Green
} else {
    Write-Host "✗ Root frontend folder missing!" -ForegroundColor Red
}

if (Test-Path $rootBackendPath) {
    Write-Host "✓ Root backend folder exists" -ForegroundColor Green
} else {
    Write-Host "✗ Root backend folder missing!" -ForegroundColor Red
}

if (Test-Path $appFolderPath) {
    Write-Host "⚠ App folder still exists (may need manual cleanup)" -ForegroundColor Yellow
} else {
    Write-Host "✓ App folder successfully removed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Operation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "New structure:" -ForegroundColor Yellow
Write-Host "  ./frontend/" -ForegroundColor White
Write-Host "  ./backend/" -ForegroundColor White
Write-Host "  ./.cursorrules" -ForegroundColor White
Write-Host "  ./.git/" -ForegroundColor White
Write-Host "  ./.gitignore" -ForegroundColor White
Write-Host ""

