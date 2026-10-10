/* Genera data/casos-publicos.js (casos genéricos) a partir de los casos reales de EGCI.
   Uso:  node scripts/build-casos-publicos.js <ruta a casos-egci.js> <ruta de salida casos-publicos.js>
   Conserva la estructura (fases, tareas, dependencias, riesgos) que es el valor didáctico y reemplaza nombres propios,
   organismos y marcas. REVISAR el resultado a mano antes de publicar: ningún reemplazo automático es infalible.
   Orden: correr primero calibrar-costos.js sobre casos-egci.js y después este script (el costo diario pasa tal cual). */
const fs = require("fs"), vm = require("vm");
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("Uso: node build-casos-publicos.js <casos-egci.js> <salida.js>"); process.exit(1); }
const sandbox = { window: {} }; sandbox.window.window = sandbox.window;
vm.runInNewContext(fs.readFileSync(src, "utf8"), sandbox);
const casos = JSON.parse(JSON.stringify(sandbox.window.PLANIFICADOR_CASOS));

const REPL = [
  [/VacaEnergía|FinCo Pymes|FinCo|LogiRed Distribuidora|LogiRed|Conurba Logística|Conurba|Metalúrgica Rivero Hnos\.|Rivero Hnos\./g, "la empresa"],
  // organismos: primero las construcciones con preposición o artículo, para no generar "de el" ni "Aprobación el ..."
  [/\(ENARGAS\)/g, "(ente regulador)"], [/\(BCRA\)/g, "(banco central)"],
  [/Aprobación ENARGAS/g, "Aprobación del ente regulador"], [/Aprobación BCRA/g, "Aprobación del banco central"],
  [/ante ENARGAS/g, "ante el ente regulador"], [/ante BCRA/g, "ante el banco central"],
  [/de ENARGAS/g, "del ente regulador"], [/normativo BCRA/g, "normativo del banco central"],
  [/(^|, )ENARGAS/g, "$1Ente regulador"], [/(^|, )BCRA/g, "$1Banco central"], [/ENARGAS/g, "ente regulador"], [/BCRA/g, "banco central"],
  [/\(MP, MODO, Naranja X\)/g, "(3 billeteras digitales)"],
  [/ERP SAP/g, "ERP"], [/SAP/g, "ERP actual"],
  [/Municipio de Pilar/g, "Municipio"], [/ERP Odoo/g, "ERP"], [/Odoo/g, "ERP"]
];
const clean = (v) => typeof v === "string" ? REPL.reduce((s, [re, to]) => s.replace(re, to), v)
  : Array.isArray(v) ? v.map(clean) : (v && typeof v === "object") ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v;

const META = {
  vacaenergia: ["Caso A — Monitoreo industrial (SCADA, Energía)", "Sistema de monitoreo industrial"],
  finco: ["Caso B — App de pagos (Fintech)", "App de pagos para pymes"],
  logired: ["Caso C — Optimización de rutas (Logística)", "Optimización de rutas de reparto"],
  conurba: ["Caso D — Centro de distribución (Construcción)", "Centro de distribución"],
  rivero: ["Caso E — Implementación de ERP (Industria)", "Implementación de ERP en una pyme industrial"]
};
const res = {};
for (const id of Object.keys(casos)) {
  const c = clean(casos[id]);
  c.label = META[id][0]; c.title = META[id][1];
  c.startNote = "Caso de ejemplo genérico. Fecha de inicio editable.";
  res[id] = c;
}
const js = "/* Casos GENÉRICOS (versión pública). Generado con scripts/build-casos-publicos.js. Revisar antes de publicar. */\n" +
  "window.PLANIFICADOR_CASOS = " + JSON.stringify(res, null, 2) + ";\n" +
  "window.PLANIFICADOR_CASOS_META = { version: 1, audience: \"publica\" };\n";
fs.writeFileSync(out, js);
console.log("OK:", Object.keys(res).length, "casos →", out);
