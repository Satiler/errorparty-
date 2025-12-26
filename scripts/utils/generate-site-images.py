#!/usr/bin/env python3
"""
Генератор изображений для ErrorParty
Создает header.png (баннер) и logo.png (логотип)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Настройки
OUTPUT_DIR = "frontend/public"
HEADER_SIZE = (1200, 300)
LOGO_SIZE = (512, 512)

# Цветовая схема ErrorParty (музыкальный сервис)
PRIMARY_COLOR = (147, 51, 234)      # Фиолетовый (Purple-600)
SECONDARY_COLOR = (236, 72, 153)    # Розовый (Pink-500)
ACCENT_COLOR = (59, 130, 246)       # Синий (Blue-500)
BG_DARK = (17, 24, 39)              # Темный фон (Gray-900)
BG_GRADIENT_START = (30, 41, 59)    # Slate-800
BG_GRADIENT_END = (17, 24, 39)      # Gray-900
TEXT_COLOR = (255, 255, 255)        # Белый

def create_gradient(draw, width, height, start_color, end_color):
    """Создает вертикальный градиент"""
    for y in range(height):
        ratio = y / height
        r = int(start_color[0] * (1 - ratio) + end_color[0] * ratio)
        g = int(start_color[1] * (1 - ratio) + end_color[1] * ratio)
        b = int(start_color[2] * (1 - ratio) + end_color[2] * ratio)
        draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))

def draw_music_wave(draw, x, y, width, height, color, points=20):
    """Рисует музыкальную волну"""
    import math
    wave_points = []
    for i in range(points):
        x_pos = x + (width * i / points)
        y_pos = y + height / 2 + math.sin(i * 0.5) * height / 3
        wave_points.append((x_pos, y_pos))
    
    if len(wave_points) > 1:
        draw.line(wave_points, fill=color, width=4)

def create_header():
    """Создает header.png - баннер для шапки сайта"""
    print("🎨 Создание header.png...")
    
    # Создаем изображение
    img = Image.new('RGB', HEADER_SIZE, BG_DARK)
    draw = ImageDraw.Draw(img)
    
    # Градиентный фон
    create_gradient(draw, HEADER_SIZE[0], HEADER_SIZE[1], BG_GRADIENT_START, BG_GRADIENT_END)
    
    # Музыкальные волны на фоне
    draw_music_wave(draw, 50, 80, 400, 80, PRIMARY_COLOR + (100,))
    draw_music_wave(draw, 200, 150, 500, 60, SECONDARY_COLOR + (80,))
    draw_music_wave(draw, 400, 100, 600, 100, ACCENT_COLOR + (60,))
    
    # Рисуем стилизованный логотип с иконкой музыки
    center_x = HEADER_SIZE[0] // 2
    center_y = HEADER_SIZE[1] // 2
    
    # Музыкальная нота (круг + палочка)
    note_x = center_x - 200
    note_y = center_y
    draw.ellipse([note_x - 30, note_y - 20, note_x - 10, note_y], fill=PRIMARY_COLOR)
    draw.rectangle([note_x - 10, note_y - 60, note_x - 5, note_y - 20], fill=PRIMARY_COLOR)
    draw.ellipse([note_x - 15, note_y - 65, note_x, note_y - 55], fill=SECONDARY_COLOR)
    
    # Пытаемся загрузить шрифт
    try:
        # Для Windows
        font_large = ImageFont.truetype("C:/Windows/Fonts/Arial.ttf", 80)
        font_small = ImageFont.truetype("C:/Windows/Fonts/Arial.ttf", 32)
    except:
        try:
            # Для Linux
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        except:
            # Дефолтный шрифт
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
    
    # Текст "ERROR PARTY"
    text = "ERROR PARTY"
    bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_x = center_x - text_width // 2 + 50
    
    # Тень для текста
    draw.text((text_x + 3, center_y - 35), text, fill=(0, 0, 0), font=font_large)
    
    # Основной текст с градиентом (имитация через разные буквы)
    draw.text((text_x, center_y - 38), text, fill=PRIMARY_COLOR, font=font_large)
    
    # Подзаголовок
    subtitle = "Your Music Universe"
    bbox_sub = draw.textbbox((0, 0), subtitle, font=font_small)
    sub_width = bbox_sub[2] - bbox_sub[0]
    sub_x = center_x - sub_width // 2 + 50
    draw.text((sub_x, center_y + 35), subtitle, fill=SECONDARY_COLOR, font=font_small)
    
    # Декоративные элементы - точки
    for i in range(10):
        x = 100 + i * 100
        y = 40 if i % 2 == 0 else 260
        draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=ACCENT_COLOR)
    
    # Сохраняем
    output_path = os.path.join(OUTPUT_DIR, "header.png")
    img.save(output_path, 'PNG')
    print(f"   ✅ Сохранено: {output_path}")

def create_logo():
    """Создает logo.png - квадратный логотип"""
    print("🎨 Создание logo.png...")
    
    # Создаем изображение
    img = Image.new('RGBA', LOGO_SIZE, (0, 0, 0, 0))  # Прозрачный фон
    draw = ImageDraw.Draw(img)
    
    center = LOGO_SIZE[0] // 2
    
    # Круглый фон с градиентом (имитация)
    for i in range(200, 0, -2):
        ratio = i / 200
        r = int(BG_GRADIENT_START[0] * ratio + PRIMARY_COLOR[0] * (1 - ratio))
        g = int(BG_GRADIENT_START[1] * ratio + PRIMARY_COLOR[1] * (1 - ratio))
        b = int(BG_GRADIENT_START[2] * ratio + PRIMARY_COLOR[2] * (1 - ratio))
        draw.ellipse([center - i, center - i, center + i, center + i], 
                     fill=(r, g, b, 255))
    
    # Большая музыкальная нота в центре
    note_size = 180
    note_x = center
    note_y = center + 30
    
    # Тело ноты (круг)
    draw.ellipse([note_x - note_size//2, note_y - note_size//4, 
                  note_x - note_size//6, note_y + note_size//4], 
                 fill=TEXT_COLOR)
    
    # Штиль (палочка)
    draw.rectangle([note_x - note_size//6, note_y - note_size, 
                    note_x - note_size//8, note_y - note_size//4], 
                   fill=TEXT_COLOR)
    
    # Флаг ноты (волнистый)
    flag_points = [
        (note_x - note_size//8, note_y - note_size),
        (note_x + note_size//6, note_y - note_size + 20),
        (note_x + note_size//5, note_y - note_size + 50),
        (note_x - note_size//8, note_y - note_size + 60)
    ]
    draw.polygon(flag_points, fill=SECONDARY_COLOR)
    
    # Дополнительная нота (меньше)
    note2_x = note_x + note_size//3
    note2_y = note_y - 20
    draw.ellipse([note2_x - 25, note2_y - 15, note2_x - 5, note2_y + 5], 
                 fill=TEXT_COLOR)
    draw.rectangle([note2_x - 5, note2_y - 60, note2_x, note2_y - 15], 
                   fill=TEXT_COLOR)
    
    # Акцентные круги вокруг
    draw.ellipse([center - 220, center - 220, center - 180, center - 180], 
                 fill=ACCENT_COLOR)
    draw.ellipse([center + 180, center + 180, center + 220, center + 220], 
                 fill=SECONDARY_COLOR)
    draw.ellipse([center + 180, center - 220, center + 220, center - 180], 
                 fill=PRIMARY_COLOR)
    
    # Текст "EP" в углу (Error Party)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/Arial.ttf", 60)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        except:
            font = ImageFont.load_default()
    
    draw.text((center - 30, center - 180), "EP", fill=TEXT_COLOR, font=font)
    
    # Сохраняем
    output_path = os.path.join(OUTPUT_DIR, "logo.png")
    img.save(output_path, 'PNG')
    print(f"   ✅ Сохранено: {output_path}")

def main():
    print("═" * 60)
    print("   ГЕНЕРАТОР ИЗОБРАЖЕНИЙ ERROR PARTY")
    print("═" * 60)
    print()
    
    # Создаем директорию если нет
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Генерируем изображения
    create_header()
    create_logo()
    
    print()
    print("═" * 60)
    print("   ✨ ГОТОВО!")
    print("═" * 60)
    print()
    print("Изображения созданы:")
    print(f"  📸 {OUTPUT_DIR}/header.png ({HEADER_SIZE[0]}x{HEADER_SIZE[1]})")
    print(f"  📸 {OUTPUT_DIR}/logo.png ({LOGO_SIZE[0]}x{LOGO_SIZE[1]})")
    print()
    print("Доступны по адресам:")
    print("  🌐 https://errorparty.ru/header.png")
    print("  🌐 https://errorparty.ru/logo.png")
    print()

if __name__ == "__main__":
    main()
