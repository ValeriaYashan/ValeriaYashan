from PIL import Image, ImageDraw, ImageFont
import os

# Configuracion
OUTPUT_DIR = "public/images"
FOTO = "public/images/foto-valeria-busto.png"
W, H = 1200, 630
VERDE = (45, 106, 79)
VERDE_OSCURO = (30, 70, 52)
BLANCO = (255, 255, 255)
BLANCO_SUAVE = (220, 240, 230)

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
        "titulo": "Gestion de proyectos\ncon metodologia real",
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

    # Foto centrada, ocupa toda la altura
    foto = foto_img.copy()
    foto_h = H
    foto_w = int(foto.width * (foto_h / foto.height))
    foto = foto.resize((foto_w, foto_h), Image.LANCZOS)

    # Centrar foto horizontalmente
    x_foto = (W - foto_w) // 2
    img.paste(foto, (x_foto, 0))

    # Degradado oscuro sobre toda la imagen de abajo hacia arriba
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    for i in range(H):
        alpha = int(210 * (i / H) ** 0.6)
        overlay_draw.line([(0, i), (W, i)], fill=(20, 60, 40, alpha))
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay)
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Tipografias
    try:
        font_eyebrow = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)
        font_titulo = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 62)
        font_subtitulo = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 30)
        font_dominio = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
    except:
        font_eyebrow = ImageFont.load_default()
        font_titulo = ImageFont.load_default()
        font_subtitulo = ImageFont.load_default()
        font_dominio = ImageFont.load_default()

    # Texto en la parte inferior
    x = 60
    y = H - 310

    # Eyebrow
    draw.text((x, y), config["eyebrow"], font=font_eyebrow, fill=BLANCO_SUAVE)
    y += 40

    # Linea decorativa
    draw.rectangle([(x, y), (x + 60, y + 4)], fill=BLANCO)
    y += 24

    # Titulo multilinea
    for linea in config["titulo"].split("\n"):
        draw.text((x, y), linea, font=font_titulo, fill=BLANCO)
        y += 75

    y += 14

    # Subtitulo
    draw.text((x, y), config["subtitulo"], font=font_subtitulo, fill=BLANCO_SUAVE)

    # Dominio bien abajo separado del subtitulo
    draw.text((x, H - 38), "valeriayashan.com.ar", font=font_dominio, fill=BLANCO_SUAVE)

    # Guardar
    ruta = os.path.join(OUTPUT_DIR, config["archivo"])
    img.save(ruta, "JPEG", quality=92)
    print(f"Generada: {ruta}")

# Cargar foto
foto_img = Image.open(FOTO).convert("RGB")

for config in IMAGENES:
    generar(config, foto_img)

print("Listo. 3 imagenes generadas en public/images/")