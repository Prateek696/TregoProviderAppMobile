# Enable Windows Long Paths
# This script must be run as Administrator

Write-Host "Enabling Windows Long Paths..." -ForegroundColor Green

try {
    # Enable long paths in registry
    New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
                     -Name "LongPathsEnabled" `
                     -Value 1 `
                     -PropertyType DWORD `
                     -Force | Out-Null
    
    Write-Host "✓ Long paths enabled successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: You need to restart your computer for this change to take effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restart, run: npx react-native run-android" -ForegroundColor Cyan
    
} catch {
    Write-Host "✗ Failed to enable long paths." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you are running PowerShell as Administrator!" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
