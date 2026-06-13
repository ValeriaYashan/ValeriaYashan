# CONTINUIDAD — valeriayashan.com.ar
**Fecha:** 13 de junio de 2026  
**Estado:** Sitio completo y publicado en producción

---

# 1. RESUMEN EJECUTIVO

Sitio web profesional de Valeria Yashan (PMP®, autora, consultora, docente) construido desde cero en una sola sesión. Está publicado en producción, indexado en Google y con todas las mejoras técnicas y de conversión aplicadas.

**Stack:** Astro 6.4 + Markdown + Cloudflare Pages + GitHub  
**Dominio:** https://valeriayashan.com.ar  
**Repo:** https://github.com/ValeriaYashan/ValeriaYashan  
**Carpeta local:** `C:\Users\rootless\Desktop\valeriayashan`

---

# 2. RESUMEN TÉCNICO COMPLETO

## Páginas publicadas

| Ruta | Archivo | Estado |
|---|---|---|
| `/` | `src/pages/index.astro` | ✅ Publicado |
| `/libro` | `src/pages/libro.astro` | ✅ Publicado |
| `/blog` | `src/pages/blog/index.astro` | ✅ Publicado |
| `/blog/[slug]` | `src/pages/blog/[...slug].astro` | ✅ Publicado |
| `/recursos` | `src/pages/recursos.astro` | ✅ Publicado |
| `/contacto` | `src/pages/contacto.astro` | ✅ Publicado |
| `/404` | `src/pages/404.astro` | ✅ Publicado |

## Artículos del blog

| Archivo | Título | Fecha |
|---|---|---|
| `por-que-los-project-managers-necesitan-entender-ia.md` | Por qué los project managers necesitan entender IA (aunque no sean técnicos) | 2026-06-10 |
| `5-tareas-ia-pm.md` | 5 tareas de PM que podés delegar a IA hoy (y 3 que nunca deberías) | 2026-06-13 |

## Libros publicados en /libro y en home

| Libro | Amazon |
|---|---|
| PM MOM | https://www.amazon.com/gp/product/B0H34V2L3S |
| Dirección de Proyectos: Guía de Preparación para la Certificación | https://www.amazon.com/dp/B0H34Y8KJ7?binding=paperback&ref=dbs_dp_rwt_sb_pc_tpbk |

## Recursos descargables

| Archivo | Estado |
|---|---|
| `public/recursos/glosario-pmbok.pdf` | ✅ Subido |
| `public/recursos/checklist-cierre-proyecto.pdf` | ⏳ Pendiente |
| `public/recursos/acta-constitucion.pdf` | ⏳ Pendiente |
| `public/recursos/prompts-ia-pm.pdf` | ⏳ Pendiente |
| `public/recursos/ia-fases-proyecto.pdf` | ⏳ Pendiente |
| `public/recursos/registro-riesgos.xlsx` | ⏳ Pendiente |
| `public/recursos/mapa-mental-pmbok.pdf` | ⏳ Pendiente |
| `public/recursos/checklist-pmp.pdf` | ⏳ Pendiente |

## Sistema visual

```css
--color-accent:  #2D6A4F  /* verde principal */
--color-bg:      #FAFAF8  /* fondo */
--color-surface: #F2F1EE  /* fondo alt */
--color-text:    #1A1A1A
--color-muted:   #6B6B6B
--color-border:  #E0DFDB
--font-display:  Fraunces (Google Fonts)
--font-body:     Inter (Google Fonts)
```

## SEO y técnico

- ✅ Sitemap: `@astrojs/sitemap` instalado, enviado a Google Search Console
- ✅ Google Search Console verificado con registro DNS TXT en Cloudflare
- ✅ Open Graph: `public/images/og-default.jpg` (1200x630 con foto de Valeria)
- ✅ Meta tags en `BaseLayout.astro`: title, description, og:*, twitter:*
- ✅ `public/robots.txt` configurado con sitemap
- ✅ Always Use HTTPS activado en Cloudflare
- ✅ Sitio indexado en Google (`site:valeriayashan.com.ar` muestra resultados)

## Newsletter

- **Plataforma:** Brevo (plan gratuito)
- **Lista:** Suscriptores Web
- **Embed URL:** `https://a55096c1.sibforms.com/v2/serve/MUIFANq7Ejc7HcoQmak19v6LMCBF30dP4TIiNoM1t8h5eSbTtWQ4IfCj01uDg_8U55RsoMLNJS274dzOcW6sbYvfoBK6khQpZNNSUbra8acptq7niSl1gKxXuiLk8lOdtUH57JL4P-QCQjP2XiLqgZY5ki-bFDfXT9W4nYXUiJZgi30UOuLj8-5mdyiWfQA9v6o0zlm6hHMrx78WMg==`
- **Ubicaciones:** al final de cada artículo del blog (BlogPostLayout) y en /recursos

## Email

- **Dirección:** hola@valeriayashan.com.ar
- **Configuración:** Cloudflare Email Routing → reenvía a valeriayashan@gmail.com

---

# 3. CONTEXTO PARA NUEVO CHAT

```
Soy Valeria Yashan — Project Manager certificada (PMP®), autora, consultora y docente.
Tengo un sitio web profesional en https://valeriayashan.com.ar construido con Astro + Cloudflare Pages.

ESTADO ACTUAL:
- Sitio completo y publicado en producción
- Repo: https://github.com/ValeriaYashan/ValeriaYashan
- Carpeta local: C:\Users\rootless\Desktop\valeriayashan
- Sistema operativo: Windows

PÁGINAS: / /libro /blog /recursos /contacto /404
LIBROS: PM MOM y Dirección de Proyectos (ambos en /libro con botones Amazon)
BLOG: 2 artículos publicados
RECURSOS: glosario-pmbok.pdf subido, 7 PDFs pendientes
NEWSLETTER: Brevo activo en /recursos y al final de cada artículo
SEO: Sitemap enviado, Google Search Console verificado, Open Graph activo

INSTRUCCIÓN CRÍTICA:
- Siempre pasarme comandos PowerShell completos empezando con: cd C:\Users\rootless\Desktop\valeriayashan
- La URL /libro nunca debe eliminarse ni renombrarse (está en QR impreso)
- Los links de Astro deben ir en una sola línea (no multilínea) para evitar que se rendericen como texto

PENDIENTES:
1. Subir 7 recursos a public/recursos/ (checklist-cierre-proyecto.pdf, acta-constitucion.pdf, prompts-ia-pm.pdf, ia-fases-proyecto.pdf, registro-riesgos.xlsx, mapa-mental-pmbok.pdf, checklist-pmp.pdf)
2. Tercer artículo del blog
3. Página /sobre-mi
4. Testimonios
```

---

# 4. INSTRUCCIONES CRÍTICAS

| Regla | Detalle |
|---|---|
| Comandos PowerShell | Siempre incluir `cd C:\Users\rootless\Desktop\valeriayashan` al inicio |
| URL /libro | Nunca eliminar ni renombrar — está impresa en QR físico |
| Links en Astro | Siempre en una sola línea — multilínea se renderiza como texto plano |
| Slugs del blog | Nombre del archivo .md en minúsculas con guiones — sin espacios ni caracteres especiales |
| Variables CSS | Usar `--color-accent`, `--color-surface`, `--color-muted`, `--color-border` (no `--color-verde`) |
| Botones Amazon | Clase `btn-amazon` con `#FF9900` — definida en cada componente, no en global.css |
| Deploy | `git add . → git commit -m "mensaje" → git push` desde la carpeta del proyecto |

---

# 5. WORKFLOW OPERATIVO

```
1. Editar en VS Code (abrir con: cd carpeta → code .)
2. Verificar en local: npm run dev → http://localhost:4321
3. Build: npm run build
4. Publicar: git add . → git commit -m "mensaje" → git push
5. Cloudflare Pages despliega automático en 1-2 minutos
```

---

# 6. PRÓXIMOS PASOS RECOMENDADOS

**Prioridad alta:**
1. Subir los 7 recursos pendientes a `public/recursos/` — los botones "Descargar" ya están en la página pero apuntan a archivos que no existen
2. Tercer artículo del blog — cada artículo mejora el SEO

**Prioridad media:**
3. Página `/sobre-mi` dedicada con foto, trayectoria y diferenciadores
4. Testimonios de lectores o alumnos en la home
5. Configurar envío desde hola@valeriayashan.com.ar en Gmail

**Prioridad baja:**
6. Portada de los libros como imagen en los cards
7. Página de recursos para PM MOM (separada de Dirección de Proyectos)
8. Integración con Google Analytics

---

Continúa el proyecto en un nuevo chat utilizando el bloque siguiente.

## BLOQUE PARA NUEVO CHAT

Copiá y pegá esto al inicio del próximo chat:

---

Soy Valeria Yashan — PMP®, autora, consultora y docente. Tengo mi sitio web en https://valeriayashan.com.ar construido con Astro + Cloudflare Pages + GitHub.

Carpeta local: `C:\Users\rootless\Desktop\valeriayashan`  
Repo: https://github.com/ValeriaYashan/ValeriaYashan  
SO: Windows

El sitio está completo y publicado. Páginas: / /libro /blog /recursos /contacto /404. Dos libros con botones Amazon. Blog con 2 artículos. Newsletter Brevo activo. Sitemap en Google Search Console. Open Graph con mi foto.

**Reglas obligatorias:**
- Siempre pasarme comandos PowerShell completos empezando con `cd C:\Users\rootless\Desktop\valeriayashan`
- La URL /libro nunca se elimina (QR impreso)
- Links en Astro siempre en una sola línea

**Pendientes:**
1. Subir 7 PDFs a public/recursos/
2. Tercer artículo del blog
3. Página /sobre-mi
4. Testimonios
