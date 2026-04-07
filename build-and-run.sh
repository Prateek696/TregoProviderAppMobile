#!/bin/bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20

echo "Bundling JS..."
npx react-native bundle \
  --platform android \
  --dev true \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

echo "Building APK..."
cd android && ./gradlew assembleDebug --quiet && cd ..

echo "Installing (keeping app data)..."
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "Launching app..."
adb shell am start -n com.tregoproviderapp/.MainActivity
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001

echo "Done!"
