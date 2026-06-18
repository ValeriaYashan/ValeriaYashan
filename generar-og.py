from PIL import Image, ImageDraw, ImageFont
import os

# Configuracion
OUTPUT_DIR = "public/images"
FOTO = "public/images/foto-valeria-busto.png"
W, H = 1200, 630
VERDE = (45, 106, 79)       # #2D6A4F
VERDE_OSCURO = (30, 70, 52) # sombra suave
BLANCO = (255, 255, 255)
BLANCO_SUAVE = (220, 240, 230)

# Imagenes a generar
IMAGENES = [
    {
        "archivo": "og-default.jpg",
        "eyebrow": "VALERIA YASHAN · PMP®",
        "titulo": "Project Management\ne IA Aplicada",
        "subtitulo": "Consultora · Autora · Docente",
    },
    {
        "archivo": "og-pm.jpg",
        "eyebrow": "PROJECT MANAGEMENT",
        "titulo": "Gestión de proyectos\ncon metodología real",
        "subtitulo": "Valeria Yashan · PMP® #1613335",
    },
    {
        "archivo": "og-ia.jpg",
        "eyebrow": "IA APLICADA A NEGOCIOS",
        "titulo": "Inteligencia artificial\npara equipos y empresas",
        "subtitulo": "Valeria Yashan · Consultora en IA",
    },
]

def generar(config, foto_img):
    img = Image.new("RGB", (W, H), VERDE)
    draw = ImageDraw.Draw(img)

    # Franja lateral derecha mas oscura
    draw.rectangle([(750, 0), (W, H)], fill=VERDE_OSCURO)

    # Foto (recortada y pegada a la derecha)
    foto = foto_img.copy()
    foto_h = H
    foto_w = int(foto.width * (foto_h / foto.height))
    foto = foto.resize((foto_w, foto_h), Image.LANCZOS)
    # Centrar horizontalmente en la mitad derecha
    x_foto = W - foto_w + int((foto_w - 450) / 2)
    if x_foto < 700:
        x_foto = 700
    img.paste(foto, (x_foto, 0))

    # Linea decorativa vertical
    draw.rectangle([(700, 0), (706, H)], fill=(255, 255, 255, 80))

    # Textos
    try:
        font_eyebrow = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
        font_titulo = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 58)
        font_subtitulo = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 28)
        font_dominio = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
    except:
        font_eyebrow = ImageFont.load_default()
        font_titulo = ImageFont.load_default()
        font_subtitulo = ImageFont.load_default()
        font_dominio = ImageFont.load_default()

    x = 60
    y = 160

    # Eyebrow
    draw.text((x, y), config["eyebrow"], font=font_eyebrow, fill=BLANCO_SUAVE)
    y += 45

    # Linea decorativa
    draw.rectangle([(x, y), (x + 60, y + 4)], fill=BLANCO)
    y += 30

    # Titulo (multilinea)
    for linea in config["titulo"].split("\n"):
        draw.text((x, y), linea, font=font_titulo, fill=BLANCO)
        y += 72

    y += 20

    # Subtitulo
    draw.text((x, y), config["subtitulo"], font=font_subtitulo, fill=BLANCO_SUAVE)

    # Dominio abajo a la izquierda
    draw.text((x, H - 55), "valeriayashan.com.ar", font=font_dominio, fill=BLANCO_SUAVE)

    # Guardar
    ruta = os.path.join(OUTPUT_DIR, config["archivo"])
    img.save(ruta, "JPEG", quality=92)
    print(f"Generada: {ruta}")

# Cargar foto una sola vez
foto_img = Image.open(FOTO).convert("RGB")

for config in IMAGENES:
    generar(config, foto_img)

print("Listo. 3 imagenes generadas en public/images/")