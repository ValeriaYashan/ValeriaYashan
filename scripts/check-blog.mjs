#!/usr/bin/env node
/**
 * check-blog.mjs — validación previa al build de valeriayashan.com.ar
 *
 *   npm run check            errores y avisos (falla solo con errores)
 *   npm run check -- --strict   los avisos también hacen fallar
 *
 * ERROR  = rompe el build o se ve roto en producción → corta
 * AVISO  = calidad SEO → se reporta, no corta (salvo --strict)
 *
 * Sin dependencias. Node >= 22.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ      = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BLOG      = join(RAIZ, 'src', 'content', 'blog');
const IMAGENES  = join(RAIZ, 'public', 'images', 'blog');
const PAGINAS   = join(RAIZ, 'src', 'pages');

// Las cuatro en uso al 24/07/2026. Una categoría nueva no rompe nada (el schema
// acepta cualquier string) pero crea un chip nuevo en el filtro de /blog.
const CATEGORIAS = ['Project Management', 'IA', 'Herramientas', 'Certificación PMP®'];
const OBLIGATORIOS = ['title', 'description', 'pubDate', 'category', 'tags'];
const ESTRICTO = process.argv.includes('--strict');

const c = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[90m', b: '\x1b[1m', x: '\x1b[0m' };

/* ── rutas reales del sitio, leídas de src/pages ───────────────────── */
function rutasDelSitio() {
  const rutas = new Set(['/']);
  let archivos = [];
  try { archivos = readdirSync(PAGINAS, { recursive: true, withFileTypes: true }); }
  catch { return null; }                       // entorno raro: no validar rutas
  for (const e of archivos) {
    if (!e.isFile() || !e.name.endsWith('.astro')) continue;
    const rel = relative(PAGINAS, join(e.parentPath ?? e.path, e.name)).split(sep).join('/');
    if (rel.includes('[')) continue;           // rutas dinámicas: se validan aparte
    rutas.add('/' + rel.replace(/\.astro$/, '').replace(/\/?index$/, ''));
  }
  rutas.delete('/404');
  return rutas;
}

/* ── frontmatter ───────────────────────────────────────────────────── */
function partir(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { fm: m[1], cuerpo: m[2] } : null;
}
const campo = (fm, k) => {
  const m = fm.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["'](.*)["']$/, '$1');
};

/* ── validación ────────────────────────────────────────────────────── */
const rutas = rutasDelSitio();
const archivos = readdirSync(BLOG).filter(f => f.endsWith('.md')).sort();
const slugs = new Set(archivos.map(f => f.slice(0, -3)));
const errores = [];
const avisos  = [];
let conBom = 0;

for (const archivo of archivos) {
  const slug = archivo.slice(0, -3);
  const bruto = readFileSync(join(BLOG, archivo));
  const bom = bruto[0] === 0xEF && bruto[1] === 0xBB && bruto[2] === 0xBF;
  if (bom) conBom++;
  const texto = bruto.toString('utf8').replace(/^\uFEFF/, '');

  const E = m => errores.push([slug, m]);
  const A = m => avisos.push([slug, m]);

  const partes = partir(texto);
  if (!partes) { E('sin frontmatter válido — el build corta acá'); continue; }
  const { fm, cuerpo } = partes;

  for (const k of OBLIGATORIOS) if (campo(fm, k) === null) E(`falta el campo obligatorio "${k}"`);

  const title = campo(fm, 'title');
  if (title !== null && title.length > 60) A(`title de ${title.length} caracteres (máx. 60) — Google lo trunca`);

  const desc = campo(fm, 'description');
  if (desc !== null && (desc.length < 150 || desc.length > 160)) A(`description de ${desc.length} caracteres (rango 150-160)`);

  const fecha = campo(fm, 'pubDate');
  if (fecha !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) E(`pubDate "${fecha}" — debe ser AAAA-MM-DD entre comillas`);

  const cat = campo(fm, 'category');
  if (cat !== null && !CATEGORIAS.includes(cat)) {
    const variante = CATEGORIAS.find(x => x.toLowerCase() === cat.toLowerCase());
    if (variante) E(`category "${cat}" — typo de "${variante}". Duplica el chip en /blog`);
    else A(`category "${cat}" es nueva — agrega un chip al filtro de /blog. Si es intencional, sumala a CATEGORIAS en scripts/check-blog.mjs`);
  }

  const tags = campo(fm, 'tags');
  if (tags !== null && !/^\[.*\S.*\]$/.test(tags)) E('tags debe ser un array con al menos un elemento');

  if (campo(fm, 'slug') !== null) A('tiene campo "slug": no está en el schema, Zod lo descarta. Lo define el nombre del archivo');

  const img = campo(fm, 'image');
  if (img !== null) {
    if (!img.startsWith('/images/blog/')) E(`image "${img}" — debe empezar con /images/blog/`);
    else if (!existsSync(join(IMAGENES, img.replace('/images/blog/', '')))) E(`image apunta a un archivo que no existe: ${img}`);
  }

  if (/^\s*#\s+\S/m.test(cuerpo.split('\n').slice(0, 3).join('\n')))
    E('el cuerpo arranca con un H1 — el layout ya lo renderiza desde title');

  // links internos
  let internos = 0;
  for (const m of cuerpo.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const destino = (m[1].split('#')[0].replace(/\/$/, '')) || '/';
    if (destino.startsWith('/blog/')) {
      const d = destino.slice(6);
      if (!slugs.has(d)) E(`link a un artículo que no existe: /blog/${d}`);
      else internos++;
    } else if (destino.startsWith('/pmp/')) {
      internos++;                                     // rutas de QR, siempre válidas
    } else if (rutas && !rutas.has(destino)) {
      E(`link a una ruta que no existe: ${destino}`);
    } else internos++;
  }
  if (internos < 2) A(`solo ${internos} link${internos === 1 ? '' : 's'} interno${internos === 1 ? '' : 's'} (mínimo 2)`);
}

/* ── salida ────────────────────────────────────────────────────────── */
const linea = (color, etiqueta, lista) => {
  if (!lista.length) return;
  console.log(`\n${color}${c.b}${etiqueta} (${lista.length})${c.x}`);
  let previo = null;
  for (const [slug, msg] of lista) {
    if (slug !== previo) { console.log(`${c.d}  ${slug}${c.x}`); previo = slug; }
    console.log(`${color}    · ${msg}${c.x}`);
  }
};

console.log(`\n${c.b}check-blog${c.x} — ${archivos.length} artículos${ESTRICTO ? ' · modo estricto' : ''}`);
linea(c.r, 'ERRORES — rompen el build o se ven rotos', errores);
linea(c.y, 'AVISOS — calidad SEO', avisos);

if (conBom) console.log(`\n${c.d}  ${conBom} archivos con BOM. Astro los tolera; cualquier script que los edite debe preservarlo.${c.x}`);

const falla = errores.length || (ESTRICTO && avisos.length);
console.log(
  falla
    ? `\n${c.r}${c.b}✗ ${errores.length} errores · ${avisos.length} avisos${c.x}\n`
    : `\n${c.g}${c.b}✓ sin errores${c.x}${avisos.length ? c.y + ` · ${avisos.length} avisos` + c.x : ''}\n`
);
process.exit(falla ? 1 : 0);
