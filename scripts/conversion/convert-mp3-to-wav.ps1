# PowerShell script to convert MP3 to WAV using Windows Media Player
# Just copies MP3 files to voces folder for now - conversion requires FFmpeg

Write-Host "Copying voice files to voces folder..." -ForegroundColor Cyan

# Create voces folder if it doesn't exist
$vocesPath = "voces"
if (-not (Test-Path $vocesPath)) {
    New-Item -ItemType Directory -Path $vocesPath | Out-Null
}

# List of files to copy (update paths as needed)
$sourceFiles = @(
    "andrew.mp3",
    "jimmy.mp3", 
    "katey.wav",
    "shann.mp3",
    "tony.wav",
    "yorkshire.mp3"
)

Write-Host "`nLooking for voice files..." -ForegroundColor Yellow

foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $vocesPath -Force
        Write-Host "[OK] Copied: $file" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n[SUCCESS] Files copied to voces folder!" -ForegroundColor Green
Write-Host "`nNext step: Restart the TTS server (start-python-tts.bat)" -ForegroundColor Cyan

pause

