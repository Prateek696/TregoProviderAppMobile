# Android Build Fix Guide - Windows Path Length Issue

## Problem
Build fails with error: "Filename longer than 260 characters"

## Solution Options

### Option 1: Move Project to Shorter Path (EASIEST)

1. Close all terminals and IDEs
2. Move project from:
   `C:\Users\ARYAN\Desktop\TREGO PROVIDER\TregoProviderAppMobile`
   
   To a shorter path like:
   `C:\Projects\TregoProviderAppMobile`
   or
   `C:\Dev\TregoProviderAppMobile`

3. Open new terminal in the new location
4. Run: `npm install` (if needed)
5. Run: `npm run android`

### Option 2: Enable Long Path Support in Windows (REQUIRES ADMIN)

1. Open PowerShell as Administrator
2. Run this command:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
3. Restart your computer
4. Try building again: `npm run android`

### Option 3: Build Only for Specific Architecture (QUICK FIX)

Edit `android/gradle.properties` and change:
```
reactNativeArchitectures=arm64-v8a
```

This will only build for 64-bit ARM (most modern phones), avoiding the problematic armeabi-v7a build.








