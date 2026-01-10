# Build Standalone Debug APK (works without Metro)
# This bundles JS into the APK

Write-Host "Building Standalone APK (works without Metro)..." -ForegroundColor Green

# Step 1: Create assets directory if it doesn't exist
$assetsDir = "android/app/src/main/assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
    Write-Host "Created assets directory" -ForegroundColor Yellow
}

# Step 2: Bundle JavaScript
Write-Host "`nBundling JavaScript..." -ForegroundColor Yellow
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "$assetsDir/index.android.bundle" --assets-dest android/app/src/main/res

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Bundle failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Build Debug APK (with bundled JS)
Write-Host "`nBuilding Debug APK..." -ForegroundColor Yellow
cd android
.\gradlew assembleDebug
cd ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Standalone APK built successfully!" -ForegroundColor Green
    Write-Host "Location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
    Write-Host "`nThis APK works WITHOUT Metro bundler!" -ForegroundColor Green
    Write-Host "Install with: adb install -r android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
}





