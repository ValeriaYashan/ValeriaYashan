# valeriayashan.com.ar

Sitio web profesional de Valeria Yashan — Project Manager certificada (PMP®), autora, consultora y docente especializada en gestión de proyectos e inteligencia artificial aplicada.

---

## Descripción del proyecto

Web profesional construida con Astro y desplegada en Cloudflare Pages. Sirve como presencia digital principal, plataforma de difusión de libros, blog de contenidos y hub de recursos gratuitos descargables.

**Dominio:** https://valeriayashan.com.ar  
**Repositorio:** https://github.com/ValeriaYashan/ValeriaYashan  
**Deploy:** Cloudflare Pages — automático en cada push a `main`

---

## Stack técnico

| Tecnología | Uso |
|---|---|
| [Astro](https://astro.build/) | Framework principal — genera HTML estático |
| Markdown | Contenido del blog |
| CSS custom | Estilos sin frameworks externos |
| Cloudflare Pages | Hosting y CDN |
| GitHub | Versionado y trigger de deploy |
| Brevo (Sendinblue) | Formulario de suscripción a newsletter |
| Google Search Console | Indexación y SEO |

---

## Estructura de carpetas

```
valeriayashan/
├── public/
│   ├── favicon.svg              # Favicon con V verde #2D6A4F
│   ├── robots.txt               # Configuración para buscadores
│   ├── images/
│   │   └── og-default.jpg       # Imagen Open Graph (1200x630px)
│   └── recursos/
│       └── glosario-pmbok.pdf   # Recursos descargables
│
├── src/
│   ├── components/
│   │   ├── Header.astro         # Navegación principal sticky
│   │   ├── Footer.astro         # Footer con links y copyright
│   │   └── ArticleCard.astro    # Card de artículo en el listado del blog
│   │
│   ├── content/
│   │   └── blog/
│   │       ├── por-que-los-project-managers-necesitan-entender-ia.md
│   │       └── 5-tareas-ia-pm.md
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro     # Layout base con Header, Footer y meta tags
│   │   └── BlogPostLayout.astro # Layout para artículos individuales del blog
│   │
│   ├── pages/
│   │   ├── index.astro          # Home
│   │   ├── libro.astro          # Página de libros publicados
│   │   ├── recursos.astro       # Recursos gratuitos descargables
│   │   ├── contacto.astro       # Página de contacto
│   │   ├── 404.astro            # Página de error personalizada
│   │   └── blog/
│   │       ├── index.astro      # Listado del blog
│   │       └── [...slug].astro  # Template de artículo individual
│   │
│   ├── styles/
│   │   └── global.css           # Variables, reset, tipografía y componentes globales
│   │
│   └── content.config.ts        # Configuración de Content Collections de Astro
│
├── astro.config.mjs             # Configuración de Astro + sitemap
├── package.json
└── README.md
```

---

## Sistema visual y marca

### Paleta de colores

| Variable | Valor | Uso |
|---|---|---|
| `--color-accent` | `#2D6A4F` | Verde principal — botones, links, acentos |
| `--color-bg` | `#FAFAF8` | Fondo principal |
| `--color-surface` | `#F2F1EE` | Fondo de secciones alternadas y cards |
| `--color-text` | `#1A1A1A` | Texto principal |
| `--color-muted` | `#6B6B6B` | Texto secundario |
| `--color-border` | `#E0DFDB` | Bordes y separadores |

### Tipografías

| Variable | Fuente | Uso |
|---|---|---|
| `--font-display` | Fraunces (Google Fonts) | Títulos h1, h2, h3 |
| `--font-body` | Inter (Google Fonts) | Cuerpo de texto, navegación |

### Componentes de diseño

- `.mark-accent` — línea verde izquierda, usada en headers de sección
- `.btn-primary` — botón verde sólido
- `.btn-outline` — botón con borde verde
- `.btn-amazon` — botón naranja #FF9900 para links de Amazon
- `.container` — contenedor centrado, max-width 720px
- `.container--wide` — contenedor wide, max-width 1000px

---

## Páginas del sitio

### `/` — Home
Página principal con hero, sección sobre mí, grilla de libros publicados y preview del blog.

### `/libro`
Página de libros publicados. Incluye:
- PM MOM (gestión de proyectos aplicada a la maternidad)
- Dirección de Proyectos: Guía de Preparación para la Certificación (PMP®)
- Links directos a Amazon
- Material complementario en Notion
- Preguntas frecuentes

**URL crítica:** Esta página puede estar impresa en QR físico. Nunca eliminar ni cambiar la ruta `/libro`.

### `/blog`
Listado de artículos ordenados por fecha (más reciente primero). Los artículos se cargan automáticamente desde `src/content/blog/`.

### `/blog/[slug]`
Template de artículo individual. Incluye banner de suscripción a newsletter al final de cada artículo.

### `/recursos`
Página de recursos gratuitos descargables, organizados en tres categorías:
- Para lectores del libro
- IA aplicada a proyectos
- Para quienes buscan certificarse

Incluye formulario de suscripción a newsletter (Brevo).

### `/contacto`
Datos de contacto: LinkedIn y email hola@valeriayashan.com.ar

### `/404`
Página de error personalizada con links al home, blog y recursos.

---

## Cómo publicar un artículo nuevo

1. Crear un archivo `.md` en `src/content/blog/` con nombre en minúsculas y guiones:

```
src/content/blog/nombre-del-articulo.md
```

2. Agregar el frontmatter obligatorio:

```markdown
---
title: "Título del artículo"
description: "Descripción breve para SEO (máximo 160 caracteres)."
pubDate: "2026-06-13"
category: "IA"
tags: ["IA", "Project Management", "Productividad"]
---

Contenido del artículo en Markdown.
```

3. Categorías disponibles: `IA`, `Project Management`, `Productividad`, `Educación`, `Libros`, `Tecnología`

4. Publicar:

```bash
cd C:\Users\rootless\Desktop\valeriayashan
git add .
git commit -m "Agrega artículo: nombre-del-articulo"
git push
```

---

## Cómo agregar un recurso descargable

1. Copiar el archivo a `public/recursos/` con nombre en minúsculas y guiones:

```
public/recursos/nombre-del-recurso.pdf
```

2. El link en `src/pages/recursos.astro` ya apunta a `/recursos/nombre-del-recurso.pdf` — verificar que el nombre coincida exactamente.

3. Publicar:

```bash
cd C:\Users\rootless\Desktop\valeriayashan
git add .
git commit -m "Agrega recurso: nombre-del-recurso"
git push
```

---

## Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Servidor local (http://localhost:4321)
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

**Importante:** Siempre ejecutar desde la carpeta del proyecto:
```bash
cd C:\Users\rootless\Desktop\valeriayashan
```

---

## Deploy

El deploy es automático. Cada `git push` a la rama `main` dispara un nuevo build en Cloudflare Pages.

**Configuración de Cloudflare Pages:**
- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Branch de producción: `main`

**Para verificar el estado del deploy:**
https://dash.cloudflare.com → Workers & Pages → valeriayashan

---

## SEO y analytics

- **Sitemap:** `https://valeriayashan.com.ar/sitemap-index.xml` — generado automáticamente por `@astrojs/sitemap`
- **robots.txt:** `https://valeriayashan.com.ar/robots.txt`
- **Google Search Console:** verificado con registro DNS TXT en Cloudflare
- **Open Graph:** imagen `public/images/og-default.jpg` (1200x630px) configurada en `BaseLayout.astro`
- **Canonical URLs:** configuradas automáticamente en `BaseLayout.astro`

---

## Email

- **Dirección:** hola@valeriayashan.com.ar
- **Configuración:** Cloudflare Email Routing → reenvía a valeriayashan@gmail.com

---

## Newsletter

- **Plataforma:** Brevo (plan gratuito)
- **Lista:** Suscriptores Web
- **Formulario embed:** integrado en `/recursos` y al final de cada artículo del blog

---

## Recursos pendientes de subir

Copiar a `public/recursos/` con estos nombres exactos:

```
checklist-cierre-proyecto.pdf
acta-constitucion.pdf
prompts-ia-pm.pdf
ia-fases-proyecto.pdf
registro-riesgos.xlsx
mapa-mental-pmbok.pdf
checklist-pmp.pdf
```

---

## Decisiones técnicas

**¿Por qué Astro?**
Genera HTML estático — máxima velocidad, sin base de datos, compatible con Cloudflare Pages en el plan gratuito. El blog en Markdown permite publicar sin interfaz de administración.

**¿Por qué Cloudflare Pages?**
Gratis para sitios estáticos, CDN global, deploy automático desde GitHub, gestión de dominio y DNS en el mismo panel.

**¿Por qué sin framework CSS?**
El diseño es simple y estable. Un sistema de variables CSS custom es suficiente y evita dependencias innecesarias que compliquen el mantenimiento.

**¿Por qué Brevo para newsletter?**
Plan gratuito hasta 300 emails/día, formulario embed sin backend, interfaz en español.

---

## Contacto del proyecto

**Valeria Yashan**  
hola@valeriayashan.com.ar  
https://www.linkedin.com/in/valeriayashan  
https://valeriayashan.com.ar
