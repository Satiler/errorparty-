# PowerShell script to generate PWA icons from a source image
# Requires ImageMagick: choco install imagemagick

$SOURCE_IMAGE = "icon-source.png"
$OUTPUT_DIR = "icons"

# Check if source image exists
if (-not (Test-Path $SOURCE_IMAGE)) {
    Write-Host "❌ Error: $SOURCE_IMAGE not found!" -ForegroundColor Red
    Write-Host "Please place your source icon (512x512 or larger) as icon-source.png"
    exit 1
}

# Create output directory
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# Sizes to generate
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)

Write-Host "🎨 Generating PWA icons..." -ForegroundColor Cyan

foreach ($size in $sizes) {
    $outputFile = "$OUTPUT_DIR\icon-${size}x${size}.png"
    Write-Host "  Creating ${size}x${size}..." -ForegroundColor Gray
    magick convert $SOURCE_IMAGE -resize "${size}x${size}" $outputFile
}

# Generate badge
Write-Host "  Creating badge 72x72..." -ForegroundColor Gray
magick convert $SOURCE_IMAGE -resize "72x72" "$OUTPUT_DIR\badge-72x72.png"

# Generate shortcut icons
Write-Host "  Creating shortcut icons..." -ForegroundColor Gray
magick convert $SOURCE_IMAGE -resize "96x96" "$OUTPUT_DIR\shortcut-quests.png"
magick convert $SOURCE_IMAGE -resize "96x96" "$OUTPUT_DIR\shortcut-profile.png"
magick convert $SOURCE_IMAGE -resize "96x96" "$OUTPUT_DIR\shortcut-memes.png"

Write-Host ""
Write-Host "✅ PWA icons generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Files created in $OUTPUT_DIR/:" -ForegroundColor Cyan
Get-ChildItem $OUTPUT_DIR | Format-Table Name, Length -AutoSize
