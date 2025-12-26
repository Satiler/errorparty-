#!/bin/bash
# Script to generate PWA icons from a source image

# Требуется ImageMagick: sudo apt-get install imagemagick
# Или на Windows: choco install imagemagick

SOURCE_IMAGE="icon-source.png"
OUTPUT_DIR="icons"

# Проверка наличия исходного изображения
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: $SOURCE_IMAGE not found!"
    echo "Please place your source icon (512x512 or larger) as icon-source.png"
    exit 1
fi

# Создание директории
mkdir -p "$OUTPUT_DIR"

# Размеры для генерации
sizes=(72 96 128 144 152 192 384 512)

echo "🎨 Generating PWA icons..."

for size in "${sizes[@]}"; do
    output_file="$OUTPUT_DIR/icon-${size}x${size}.png"
    echo "  Creating ${size}x${size}..."
    convert "$SOURCE_IMAGE" -resize ${size}x${size} "$output_file"
done

# Генерация badge
echo "  Creating badge 72x72..."
convert "$SOURCE_IMAGE" -resize 72x72 "$OUTPUT_DIR/badge-72x72.png"

# Генерация shortcut иконок
echo "  Creating shortcut icons..."
convert "$SOURCE_IMAGE" -resize 96x96 "$OUTPUT_DIR/shortcut-quests.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$OUTPUT_DIR/shortcut-profile.png"
convert "$SOURCE_IMAGE" -resize 96x96 "$OUTPUT_DIR/shortcut-memes.png"

echo "✅ PWA icons generated successfully!"
echo ""
echo "Files created in $OUTPUT_DIR/:"
ls -lh "$OUTPUT_DIR/"
