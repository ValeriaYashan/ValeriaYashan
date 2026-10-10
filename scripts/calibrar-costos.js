/* Calibra el costo diario de cada tarea para que el BAC (suma de duración x costo diario) coincida con el presupuesto
   del acta de constitución de cada caso. Distribuye el presupuesto en proporción a (duración x tarifa didáctica del recurso).
   Uso:  node scripts/calibrar-costos.js <casos-egci.js>   (reescribe el archivo; luego correr build-casos-publicos.js)
   La tarifa didáctica es la misma tabla de defaultDailyCost() de app.js. Es una distribución didáctica, no una estimación ascendente. */
const fs = require("fs"), vm = require("vm");
const file = process.argv[2]; if (!file) { console.error("Uso: node calibrar-costos.js <casos-egci.js>"); process.exit(1); }
const src = fs.readFileSync(file, "utf8");
const sb = { window: {} }; sb.window.window = sb.window; vm.runInNewContext(src, sb);
const casos = sb.window.PLANIFICADOR_CASOS;
function rate(res) {
  if (!res) return 300; const r = res.toLowerCase();
  if (/^pm\b/.test(r)) return 280; if (r.indexOf("proveedor") >= 0) return 750; if (r.indexOf("constructora") >= 0) return 1500;
  if (r.indexOf("gerente") >= 0) return 550; if (r.indexOf("director") >= 0) return 600; if (r.indexOf("contador") >= 0) return 500;
  if (r.indexOf("equipo dev") >= 0) return 850; return 400;
}
const dc = {};
for (const id of Object.keys(casos)) {
  const c = casos[id], budget = parseInt(String(c.charter.budget).replace(/[^\d]/g, ""), 10);
  if (!budget) throw new Error("Presupuesto ilegible en " + id);
  const w = c.tasks.reduce((s, t) => s + t.dur * rate(t.resource), 0), k = budget / w;
  dc[id] = {}; let sum = 0;
  c.tasks.forEach(t => { dc[id][t.id] = Math.round(rate(t.resource) * k); sum += t.dur * dc[id][t.id]; });
  const big = c.tasks.reduce((a, b) => (b.dur > a.dur ? b : a));          // el residuo se absorbe en la tarea más larga
  dc[id][big.id] = Math.round((dc[id][big.id] + (budget - sum) / big.dur) * 10000) / 10000;
  console.log(id, "presupuesto", budget, "factor", k.toFixed(3));
}
let cur = null, n = 0;
const out = src.split("\n").map(line => {
  const m = line.match(/^    (\w+): \{\s*$/); if (m && casos[m[1]]) cur = m[1];
  const t = line.match(/^(\s*T\("([\d.]+)",.*?,\s*(?:null|\d+))(?:,\s*[\d.]+)?\)(,?)\s*$/);
  if (cur && t && dc[cur][t[2]] !== undefined) { n++; return t[1] + ", " + dc[cur][t[2]] + ")" + t[3]; }
  return line;
}).join("\n").replace("function T(id, name, dur, preds, pct, resource, crashCostPerDay) {\n    return { id: id, name: name, dur: dur, preds: preds, pct: pct, resource: resource, crashCostPerDay: crashCostPerDay };",
  "function T(id, name, dur, preds, pct, resource, crashCostPerDay, dailyCost) {\n    return { id: id, name: name, dur: dur, preds: preds, pct: pct, resource: resource, crashCostPerDay: crashCostPerDay, dailyCost: dailyCost };")
 .replace("Tarea: T(id, nombre, duración en días hábiles, predecesoras, % avance, recurso, costo de aceleración por día | null)",
  "Tarea: T(id, nombre, duración en días hábiles, predecesoras, % avance, recurso, costo de aceleración por día | null, costo diario)\n   Costo diario: calibrado con scripts/calibrar-costos.js para que el BAC sea igual al presupuesto del acta de constitución.");
fs.writeFileSync(file, out); console.log("tareas actualizadas:", n);
