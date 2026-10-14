# Build rilis + paket portable + installer Inno Setup untuk FolderScope.
#
# Cara pakai (dari root repo):
#   powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1 -SkipBuild   # exe sudah dibuild
#
# Hasil di dist/:
#   - FolderScope-<versi>-portable.zip  (selalu dibuat, tanpa dependensi tambahan)
#   - FolderScope-Setup-<versi>.exe     (hanya bila Inno Setup / ISCC tersedia)

param([switch]$SkipBuild)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Version = (Select-String '^version\s*=\s*"([^"]+)"' "$Root\Cargo.toml").Matches.Groups[1].Value
if ([string]::IsNullOrWhiteSpace($Version)) { throw "Versi tidak terbaca dari Cargo.toml" }
Write-Host "FolderScope v$Version" -ForegroundColor Cyan

if (-not $SkipBuild) {
    Write-Host ">> cargo build --release ..." -ForegroundColor Yellow
    cargo build --release
}

$Exe = "$Root\target\release\folderscope.exe"
if (-not (Test-Path $Exe)) { throw "Binary tidak ditemukan: $Exe" }

$Dist = "$Root\dist"
New-Item -ItemType Directory -Force -Path $Dist | Out-Null

$Zip = "$Dist\FolderScope-$Version-portable.zip"
if (Test-Path $Zip) { Remove-Item $Zip -Force }
Compress-Archive -Path $Exe -DestinationPath $Zip
Write-Host ">> portable: $Zip" -ForegroundColor Green

$cmd = Get-Command iscc -ErrorAction SilentlyContinue
$iscc = $null
if ($cmd) { $iscc = $cmd.Source }
if (-not $iscc) {
    $cands = @(
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe")
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    if ($cands) { $iscc = "$cands" }
}

if ($iscc) {
    Write-Host ">> ISCC: $iscc ..." -ForegroundColor Yellow
    & $iscc "$Root\installer.iss"
    Write-Host ">> installer selesai, lihat folder dist/" -ForegroundColor Green
} else {
    Write-Host ">> ISCC tidak ditemukan, installer .exe dilewati." -ForegroundColor Yellow
    Write-Host "   Install Inno Setup 6: winget install JRSoftware.InnoSetup" -ForegroundColor Yellow
    Write-Host "   Lalu jalankan ulang skrip ini dengan -SkipBuild." -ForegroundColor Yellow
}
