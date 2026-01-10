# Build Release APK with bundled JavaScript
# This APK will work without Metro bundler

Write-Host "Building Release APK..." -ForegroundColor Green

# Step 1: Bundle JavaScript
Write-Host "`nStep 1: Bundling JavaScript..." -ForegroundColor Yellow
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Step 2: Build Release APK
Write-Host "`nStep 2: Building Release APK..." -ForegroundColor Yellow
cd android
.\gradlew assembleRelease
cd ..

# Step 3: Show location
Write-Host "`n✅ Release APK built successfully!" -ForegroundColor Green
Write-Host "Location: android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Cyan
Write-Host "`nYou can install this APK on any device - it works without Metro bundler!" -ForegroundColor Green





