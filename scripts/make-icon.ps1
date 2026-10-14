# Buat assets/icon.ico (multi-ukuran) dari assets/icon.jpg.
# Dijalankan ulang bila ikon aplikasi diganti. Tanpa dependensi tambahan
# (pakai System.Drawing bawaan .NET). ICO dipakai winres (build.rs) untuk
# ikon exe + installer Inno Setup.
# Cara pakai (dari root repo):
#   powershell -ExecutionPolicy Bypass -File scripts/make-icon.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Src = "$Root\assets\icon.jpg"
$Dst = "$Root\assets\icon.ico"
if (-not (Test-Path $Src)) { throw "Sumber ikon tidak ada: $Src" }

Add-Type -AssemblyName System.Drawing
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$orig = [System.Drawing.Bitmap]::FromFile($Src)
$entries = @()
try {
    foreach ($s in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap($orig, $s, $s)
        try {
            $ms = New-Object System.IO.MemoryStream
            $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
            $entries += [pscustomobject]@{ Size = $s; Data = $ms.ToArray() }
            $ms.Dispose()
        } finally { $bmp.Dispose() }
    }
} finally { $orig.Dispose() }

$fs = [System.IO.File]::Create($Dst)
$w = New-Object System.IO.BinaryWriter($fs)
try {
    $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$entries.Count)
    $offset = 6 + 16 * $entries.Count
    foreach ($e in $entries) {
        $b = if ($e.Size -ge 256) { 0 } else { $e.Size }
        $w.Write([byte]$b); $w.Write([byte]$b)   # width, height (0 = 256)
        $w.Write([byte]0)                          # palette
        $w.Write([byte]0)                          # reserved
        $w.Write([uint16]1)                        # planes
        $w.Write([uint16]32)                       # bitcount
        $w.Write([uint32]$e.Data.Length)           # bytes
        $w.Write([uint32]$offset)                  # offset
        $offset += $e.Data.Length
    }
    foreach ($e in $entries) { $w.Write($e.Data) }
} finally { $w.Dispose(); $fs.Dispose() }

$ico = New-Object System.Drawing.Icon($Dst)  # validasi: gagal = file rusak
$ico.Dispose()
Write-Host ">> ikon: $Dst ($((Get-Item $Dst).Length) bytes, $($entries.Count) ukuran)" -ForegroundColor Green
