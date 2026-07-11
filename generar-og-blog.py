from PIL import Image, ImageDraw, ImageFont
import os
import re

# Configuracion
BLOG_DIR = "src/content/blog"
OUTPUT_DIR = "public/images/blog"
W, H = 1200, 630
VERDE = (45, 106, 79)
BLANCO = (255, 255, 255)
BLANCO_SUAVE = (220, 240, 230)

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Tipografias
try:
    font_eyebrow = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
    font_titulo = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 54)
    font_titulo_chico = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 42)
    font_dominio = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
except:
    font_eyebrow = ImageFont.load_default()
    font_titulo = ImageFont.load_default()
    font_titulo_chico = ImageFont.load_default()
    font_dominio = ImageFont.load_default()


def extraer_titulo(ruta_md):
    with open(ruta_md, "r", encoding="utf-8") as f:
        contenido = f.read()
    match = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', contenido, re.MULTILINE)
    if match:
        return match.group(1).strip().strip('"').strip("'")
    return None


def wrap_texto(texto, font, draw, max_width):
    palabras = texto.split()
    lineas = []
    linea_actual = ""
    for palabra in palabras:
        prueba = (linea_actual + " " + palabra).strip()
        bbox = draw.textbbox((0, 0), prueba, font=font)
        if bbox[2] <= max_width:
            linea_actual = prueba
        else:
            if linea_actual:
                lineas.append(linea_actual)
            linea_actual = palabra
    if linea_actual:
        lineas.append(linea_actual)
    return lineas


def generar_og(slug, titulo):
    img = Image.new("RGB", (W, H), VERDE)
    draw = ImageDraw.Draw(img)

    # Patron de fondo sutil
    for i in range(0, H, 40):
        draw.line([(0, i), (W, i)], fill=(40, 95, 70), width=1)

    # Degradado oscuro inferior
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    for i in range(H // 2, H):
        alpha = int(160 * ((i - H // 2) / (H // 2)) ** 0.7)
        ov_draw.line([(0, i), (W, i)], fill=(15, 45, 30, alpha))
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay)
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    x = 70
    max_w = W - x - 70

    # Eyebrow
    draw.text((x, 52), "VALERIA YASHAN · PMP®", font=font_eyebrow, fill=BLANCO_SUAVE)
    draw.rectangle([(x, 90), (x + 50, 94)], fill=BLANCO)

    # Titulo
    font_usar = font_titulo if len(titulo) < 60 else font_titulo_chico
    lineas = wrap_texto(titulo, font_usar, draw, max_w)

    alto_linea = 65 if font_usar == font_titulo else 52
    alto_total = len(lineas) * alto_linea
    y_titulo = (H - alto_total) // 2 - 20

    for linea in lineas:
        draw.text((x, y_titulo), linea, font=font_usar, fill=BLANCO)
        y_titulo += alto_linea

    # Dominio
    draw.text((x, H - 44), "valeriayashan.com.ar", font=font_dominio, fill=BLANCO_SUAVE)

    ruta = os.path.join(OUTPUT_DIR, f"{slug}.jpg")
    img.save(ruta, "JPEG", quality=92)
    return f"{slug}.jpg"


# Procesar todos los .md del blog
archivos = [f for f in os.listdir(BLOG_DIR) if f.endswith(".md")]
generadas = 0
omitidas = 0

for archivo in sorted(archivos):
    slug = archivo.replace(".md", "")
    ruta_md = os.path.join(BLOG_DIR, archivo)
    ruta_imagen = os.path.join(OUTPUT_DIR, f"{slug}.jpg")

    if os.path.exists(ruta_imagen):
        print(f"Ya existe: {slug}.jpg — omitido")
        omitidas += 1
        continue

    titulo = extraer_titulo(ruta_md)
    if not titulo:
        print(f"Sin titulo: {archivo} — omitido")
        omitidas += 1
        continue

    nombre = generar_og(slug, titulo)
    print(f"Generada:  {nombre}  <- {titulo[:60]}")
    generadas += 1

print(f"\nListo. {generadas} imagenes generadas, {omitidas} omitidas.")
print(f"Guardadas en: {OUTPUT_DIR}")
