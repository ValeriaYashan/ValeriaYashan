/* Planificador TI — Valeria Yashan · valeriayashan.com.ar
   JavaScript vanilla, sin frameworks. Datos de casos en data/casos-*.js, feriados en data/feriados.js. */
(function () {
  "use strict";

  /* ===================== CONFIGURACIÓN (completar lo que falta) ===================== */
  var CONFIG = {
    APP_ID: "planificador-ti-valeriayashan",
    SCHEMA_VERSION: 3,        // 3: dependencias tipadas, tres puntos, problemas y acciones, riesgos con valor monetario y solicitudes de cambio
    STORAGE_KEY_VERSION: 2,   // la clave de guardado local sigue en v2 para no perder el progreso ya guardado en los navegadores
    SITE_URL: "https://valeriayashan.com.ar",
    PRESENTATION_URL: "/herramientas/planificador-ti/",
    LEAD_ENABLED: false, SUBSCRIBE_URL: "/herramientas/planificador-ti/suscribirse/",
    CONTACT_URL: "/contacto",
    TRAINING_URL: "/capacitaciones",
    WHATSAPP_URL: "", // FALTA: enlace de WhatsApp del sitio (ej. https://wa.me/54911XXXXXXXX?text=...). Vacío = el botón no se muestra.
    ATTRIBUTION: "Herramienta de Valeria Yashan · valeriayashan.com.ar",
    LEAD_TITLE: "¿Te sirvió el planificador?",
    // FALTA confirmar: qué recibe exactamente la persona y con qué frecuencia. Texto provisorio, sin promesas de frecuencia.
    LEAD_TEXT: "Suscribite y recibí en tu correo plantillas y herramientas de gestión de proyectos como esta, junto con artículos sobre PM aplicado e inteligencia artificial.",
    XLSX_LOCAL: "vendor/xlsx.full.min.js",
    XLSX_CDN: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    MAX_FILE_BYTES: 2 * 1024 * 1024,
    MAX_TASKS: 300,
    AUTOSAVE_MS: 1200,       // espera tras el último cambio antes de guardar solo en este navegador
    CUTOFF_FRACTION: 0.6     // fecha de corte sugerida del EVM: 60% del plazo planificado
  };

  var CASOS = window.PLANIFICADOR_CASOS || {};
  var META = window.PLANIFICADOR_CASOS_META || { audience: "publica" };
  var EGCI = META.audience === "alumnos-egci"; // versión para alumnos del Máster: habilita índice TI-00, DOC-xx y PDF por entrega
  var FERIADOS = window.PLANIFICADOR_FERIADOS || {};

  /* ===================== utilidades ===================== */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtInt(n) { return Math.round(n).toLocaleString("es-AR"); }
  function usd(n) { return "USD " + fmtInt(n); }
  function track(name, params) { try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) { /* sin medición */ } }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };
  var ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  function isISO(s) {
    if (typeof s !== "string" || !ISO_RE.test(s)) return false;
    var p = s.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2], 12);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }
  function dateToISO(d) {
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function isoToDate(s) { var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
  function daysBetween(a, b) {
    if (!a || !b) return null;
    return Math.round((isoToDate(b) - isoToDate(a)) / 86400000);
  }
  function rowH() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--row-h"));
    return isFinite(v) && v > 0 ? v : 30;
  }

  /* ===================== definiciones de los documentos de gestión ===================== */
  var CHARTER_FIELDS = [
    { key: "objective", label: "Objetivo SMART (a completar por el alumno)", full: true, ph: "Escribí el objetivo SMART del proyecto..." },
    { key: "sponsor", label: "Patrocinador (sponsor)" }, { key: "budget", label: "Presupuesto autorizado" }, { key: "duration", label: "Duración estimada" },
    { key: "contingency", label: "Reserva de contingencia (opcional): riesgos conocidos, dentro de la línea base", full: true, ph: "Monto y criterio, ligado a riesgos identificados del registro. Si no hay reserva aprobada, indicalo." },
    { key: "mgmtReserve", label: "Reserva de gestión (opcional): riesgos desconocidos, fuera de la línea base, la autoriza la dirección", full: true, ph: "Monto y quién autoriza su uso. No se asigna a un riesgo puntual. Si no hay, indicalo." },
    { key: "deliverable", label: "Entregable principal", full: true }, { key: "scopeIn", label: "Alcance — dentro", full: true },
    { key: "scopeOut", label: "Alcance — fuera (a completar)", full: true, ph: "¿Qué queda explícitamente fuera del alcance?" },
    { key: "constraints", label: "Restricciones", full: true }, { key: "stakeholders", label: "Partes interesadas clave", full: true }
  ];
  var STK_KEYS = ["id", "name", "role", "power", "interest", "engNow", "engDesired", "strategy"];
  var LEVELS3 = ["Alto", "Medio", "Bajo"];
  var ENG_LEVELS = ["Desconocedor", "Reticente", "Neutral", "Partidario", "Líder"];
  var TEAM_FIELDS = [
    { key: "values", label: "Valores y principios de trabajo del equipo", full: true },
    { key: "agreements", label: "Acuerdos de trabajo (horarios, disponibilidad, tiempos de respuesta)", full: true },
    { key: "meetings", label: "Reuniones del proyecto (cuáles, frecuencia, duración, participantes y objetivo)", full: true, rows: 4 },
    { key: "channels", label: "Canales y herramientas de comunicación del equipo" },
    { key: "decisions", label: "Cómo toma decisiones el equipo" },
    { key: "conflicts", label: "Cómo se resuelven los conflictos y cuándo se escalan", full: true }
  ];
  var PLAN_FIELDS = [
    { key: "scope", label: "Gestión del alcance" }, { key: "schedule", label: "Gestión del cronograma" },
    { key: "cost", label: "Gestión de costos (incluye cómo se administra la reserva de contingencia)" }, { key: "quality", label: "Gestión de la calidad" },
    { key: "resources", label: "Gestión de los recursos" }, { key: "communications", label: "Gestión de las comunicaciones" },
    { key: "risk", label: "Gestión de los riesgos" }, { key: "stakeholders", label: "Gestión de los interesados" },
    { key: "procurement", label: "Gestión de las adquisiciones" }, { key: "change", label: "Control de cambios (quién aprueba, umbrales, proceso)" }
  ];
  var CR_FIELDS = [
    { key: "title", label: "Título de la solicitud", rows: 1 }, { key: "requester", label: "Solicitante", rows: 1 },
    { key: "description", label: "Descripción del cambio solicitado", full: true }, { key: "justification", label: "Justificación", full: true },
    { key: "impactScope", label: "Impacto en el alcance" }, { key: "impactSchedule", label: "Impacto en el cronograma" },
    { key: "impactCost", label: "Impacto en el costo (USD)" }, { key: "impactRisk", label: "Impacto en los riesgos y la calidad" },
    { key: "alternatives", label: "Alternativas consideradas", full: true }, { key: "recommendation", label: "Recomendación del director del proyecto", full: true },
    { key: "decision", label: "Decisión (aprobada, rechazada o diferida) y quién decide", full: true }
  ];
  function objByName(n) { return n === "team" ? teamCharter : (n === "plan" ? mgmtPlan : changeRequest); }
  function renderFieldGrid(objName, fields) {
    var obj = objByName(objName);
    return '<div class="charterGrid">' + fields.map(function (f) {
      var id = "f_" + objName + "_" + f.key;
      return '<div class="charterField' + (f.full ? " full" : "") + '"><label for="' + id + '">' + esc(f.label) + '</label><textarea id="' + id + '" rows="' + (f.rows || 3) + '" data-change="objField" data-obj="' + objName + '" data-key="' + f.key + '" data-fid="' + objName + ":" + f.key + '">' + esc(obj[f.key] || "") + "</textarea></div>";
    }).join("") + "</div>";
  }
  function filledCount(obj, fields) { return fields.filter(function (f) { return String((obj || {})[f.key] || "").trim(); }).length; }

  /* ===================== estado ===================== */
  var DAY_PX = 6;
  var currentProjectId = "";
  var tasks = [], phases = [];
  var ORIGINAL_DURS = {}, originalProjectEnd = 0, originalSchedule = {};
  var nearThreshold = 5, baselines = [], cutoffDay = 65, acActual = null;
  var risks = [], raciAssignments = {}, raciPeople = [];
  var charter = {}, comms = [], changeLog = [], decisionLog = [], lessons = "";
  var stakeholders = [], teamCharter = {}, mgmtPlan = {}, changeRequest = {};
  var issues = [], crList = [];
  var autosaveTimer = 0, autosaveFailed = false, lastSavedAt = "";
  var history = [], future = [];
  var holidays = [], holidayCountry = "AR", holidayYear = 0;
  var isDirty = false;
  var actualStart = "", actualFinish = "", plannedFinishOverride = "";
  var scenarios = [], activeScenario = 0;
  var panelsOn = {};
  var ftTaskId = "", ftPct = 25;
  var drag = null;
  var renderQueued = false;
  var firstRender = true;
  var leadShownThisSession = false;

  function cloneTasks(list) { return list.map(function (t) { var c = Object.assign({}, t); c.preds = t.preds.slice(); c.extraResources = (t.extraResources || []).slice(); if (t.deps) c.deps = clone(t.deps); return c; }); }
  function clonePhases(list) { return list.map(function (ph) { return { id: ph.id, name: ph.name, children: ph.children.slice() }; }); }
  function taskById(id) { for (var i = 0; i < tasks.length; i++) if (tasks[i].id === id) return tasks[i]; return null; }
  function startDateValue() { return $("startDate").value || "2026-01-05"; }

  /* ===================== calendario hábil (con caché) ===================== */
  var cal = { sig: "", days: [], cursor: null, hset: null };
  function calSig() { return startDateValue() + "|" + holidays.join(","); }
  function ensureCal(n) {
    var sig = calSig();
    if (cal.sig !== sig) {
      cal = { sig: sig, days: [], cursor: null, hset: new Set(holidays) };
      var d = isoToDate(isISO(startDateValue()) ? startDateValue() : "2026-01-05");
      while (!isWork(d)) d.setDate(d.getDate() + 1);
      cal.days.push(dateToISO(d));
      cal.cursor = d;
    }
    while (cal.days.length <= n) {
      var c = new Date(cal.cursor.getTime());
      do { c.setDate(c.getDate() + 1); } while (!isWork(c));
      cal.cursor = c;
      cal.days.push(dateToISO(c));
    }
  }
  function isWork(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !cal.hset.has(dateToISO(d)); }
  function workdayISO(off) { off = Math.max(0, Math.round(off)); ensureCal(off); return cal.days[off]; }
  function dayOffsetFromDate(iso) {
    ensureCal(0);
    if (iso <= cal.days[0]) return 0;
    var guard = 0;
    while (cal.days[cal.days.length - 1] < iso && guard++ < 6000) ensureCal(cal.days.length);
    var lo = 0, hi = cal.days.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (cal.days[mid] <= iso) lo = mid; else hi = mid - 1; }
    return lo;
  }
  function startISO(t) { return workdayISO(t._es); }
  // El fin se muestra como el ÚLTIMO día hábil de la tarea (el motor guarda el fin como límite exclusivo).
  function finishISO(t) { return t.dur === 0 ? workdayISO(t._es) : workdayISO(t._ef - 1); }
  function plannedFinishDate() { return plannedFinishOverride || workdayISO(Math.max(0, originalProjectEnd - 1)); }

  /* ===================== cronograma (CPM) ===================== */
  function detectCycle(list) {
    var byId = {}; list.forEach(function (t) { byId[t.id] = t; });
    var indeg = {}, succ = {};
    list.forEach(function (t) { indeg[t.id] = 0; succ[t.id] = []; });
    list.forEach(function (t) { t.preds.forEach(function (p) { if (byId[p]) { indeg[t.id]++; succ[p].push(t.id); } }); });
    var queue = list.filter(function (t) { return indeg[t.id] === 0; }).map(function (t) { return t.id; });
    var seen = new Set();
    while (queue.length) {
      var id = queue.shift(); seen.add(id);
      succ[id].forEach(function (s) { indeg[s]--; if (indeg[s] === 0) queue.push(s); });
    }
    return list.filter(function (t) { return !seen.has(t.id); }).map(function (t) { return t.id; });
  }
  /* ---- dependencias tipadas: FC (fin-comienzo, por defecto), CC (comienzo-comienzo), FF (fin-fin), CF (comienzo-fin), con desfase en días ---- */
  var DEP_ES = { FS: "FC", SS: "CC", FF: "FF", SF: "CF" };
  var DEP_FROM = { FC: "FS", CC: "SS", FF: "FF", CF: "SF", FS: "FS", SS: "SS", SF: "SF" };
  function depOf(t, p) { var d = t.deps && t.deps[p]; return d ? { type: d.type, lag: d.lag || 0 } : { type: "FS", lag: 0 }; }
  function predLabel(t, p) {
    var d = depOf(t, p);
    if (d.type === "FS" && !d.lag) return p;
    return p + DEP_ES[d.type] + (d.lag ? (d.lag > 0 ? "+" : "") + d.lag : "");
  }
  function predsText(t) { return t.preds.map(function (p) { return predLabel(t, p); }).join(", "); }
  // Lee "1.1.2, 1.2.1CC+2, 1.3FF-1": ID de la tarea, tipo opcional (FC, CC, FF, CF) y desfase opcional en días.
  function parsePredSpec(text, selfId, list) {
    var out = { preds: [], deps: {}, error: "" }, ids = {};
    list.forEach(function (x) { ids[x.id] = true; });
    var toks = String(text || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    for (var i = 0; i < toks.length; i++) {
      var tok = toks[i], id = tok, type = "FS", lag = 0;
      if (!ids[tok]) {
        var m = tok.match(/^(.*?)\s*(FC|CC|FF|CF|FS|SS|SF)?\s*([+\-]\s*\d+)?$/i);
        if (!m || !m[1] || !ids[m[1].trim()]) { out.error = 'No entiendo "' + tok + '". Escribí el ID de la tarea y, si hace falta, el tipo (FC, CC, FF o CF) y el desfase en días, por ejemplo 1.2.3CC+2. IDs disponibles: ' + list.map(function (x) { return x.id; }).slice(0, 12).join(", ") + "…"; return out; }
        id = m[1].trim();
        if (m[2]) type = DEP_FROM[m[2].toUpperCase()];
        if (m[3]) lag = parseInt(m[3].replace(/\s/g, ""), 10);
      }
      if (id === selfId) { out.error = "Una tarea no puede depender de sí misma."; return out; }
      if (out.preds.indexOf(id) >= 0) { out.error = "La predecesora " + id + " está repetida."; return out; }
      if (Math.abs(lag) > 2000) { out.error = "El desfase de " + id + " tiene que estar entre -2000 y 2000 días."; return out; }
      out.preds.push(id);
      if (type !== "FS" || lag) out.deps[id] = { type: type, lag: lag };
    }
    return out;
  }
  function cleanDeps(t) {
    if (!t.deps || typeof t.deps !== "object") return undefined;
    var out = {}, any = false;
    Object.keys(t.deps).forEach(function (k) {
      var d = t.deps[k];
      if (t.preds.indexOf(k) >= 0 && d && DEP_ES[d.type] !== undefined && (d.type !== "FS" || d.lag)) { out[k] = { type: d.type, lag: isNum(d.lag) ? Math.round(d.lag) : 0 }; any = true; }
    });
    return any ? out : undefined;
  }
  function computeScheduleOn(list) {
    var byId = {}; list.forEach(function (t) { byId[t.id] = t; });
    var cyclic = detectCycle(list), cycSet = new Set(cyclic);
    list.forEach(function (t) { delete t._es; delete t._ef; delete t._ls; t._lf = undefined; });
    // Pasada hacia adelante: cada dependencia fija un piso para el inicio. FC: inicio >= fin de la predecesora + desfase (el solape del seguimiento rápido resta);
    // CC: inicio >= inicio de la predecesora + desfase; FF: fin >= fin de la predecesora + desfase; CF: fin >= inicio de la predecesora + desfase.
    function ES(t) {
      if (t._es !== undefined) return t._es;
      t._es = 0; // corta recursión ante datos inesperados
      var dep = 0;
      if (!cycSet.has(t.id) && t.preds.length) {
        var vals = [];
        t.preds.forEach(function (p) {
          var pt = byId[p]; if (!pt) return;
          var d = depOf(t, p);
          if (d.type === "SS") vals.push(ES(pt) + d.lag);
          else if (d.type === "FF") vals.push(EF(pt) + d.lag - t.dur);
          else if (d.type === "SF") vals.push(ES(pt) + d.lag - t.dur);
          else vals.push(EF(pt) + d.lag - (t.overlapDays || 0));
        });
        if (vals.length) dep = Math.max(0, Math.max.apply(null, vals));
      }
      t._es = dep + (t.levelDelay || 0);
      return t._es;
    }
    function EF(t) { ES(t); t._ef = t._es + t.dur; return t._ef; }
    list.forEach(EF);
    var projectEnd = list.length ? Math.max.apply(null, list.map(function (t) { return t._ef; })) : 0;
    var succ = {}; list.forEach(function (t) { succ[t.id] = []; });
    list.forEach(function (t) { t.preds.forEach(function (p) { if (succ[p] && !cycSet.has(t.id)) succ[p].push(t.id); }); });
    // Pasada hacia atrás: el fin más tardío de cada tarea es el menor de los límites que le imponen sus sucesoras, y nunca pasa del fin del proyecto.
    function LF(t) {
      if (t._lf !== undefined) return t._lf;
      var lf = projectEnd;
      succ[t.id].forEach(function (id) {
        var s = byId[id], d = depOf(s, t.id), v;
        if (d.type === "SS") v = LS(s) - d.lag + t.dur;
        else if (d.type === "FF") v = LF(s) - d.lag;
        else if (d.type === "SF") v = LF(s) - d.lag + t.dur;
        else v = LS(s) - d.lag + (s.overlapDays || 0); // si la sucesora está solapada (seguimiento rápido), el fin más tardío se adelanta ese solape
        if (v < lf) lf = v;
      });
      t._lf = lf;
      return lf;
    }
    function LS(t) { LF(t); t._ls = t._lf - t.dur; return t._ls; }
    list.forEach(LS);
    list.forEach(function (t) {
      t.slack = t._ls - t._es;
      t.cycleError = cycSet.has(t.id);
      t.critical = t.slack === 0 && !t.cycleError;
      t.near = !t.critical && t.slack <= nearThreshold;
    });
    return { byId: byId, projectEnd: projectEnd, cyclic: cyclic };
  }
  function computeSchedule(list) { return computeScheduleOn(list); }

  /* ===================== costos: una única fuente de verdad (EVM + informe final) ===================== */
  function defaultDailyCost(resource) {
    // Tarifa didáctica por tipo de recurso. Solo se usa en las tareas que no traen costo diario propio (las agregadas por la persona).
    // Los casos precargados traen su costo diario calibrado al presupuesto del acta de constitución (scripts/calibrar-costos.js).
    if (!resource) return 300;
    var r = resource.toLowerCase();
    if (/^pm\b/.test(r)) return 280;
    if (r.indexOf("proveedor") >= 0) return 750;
    if (r.indexOf("constructora") >= 0) return 1500;
    if (r.indexOf("gerente") >= 0) return 550;
    if (r.indexOf("director") >= 0) return 600;
    if (r.indexOf("contador") >= 0) return 500;
    if (r.indexOf("equipo dev") >= 0) return 850;
    return 400;
  }
  function getDailyCost(t) { return (t.dailyCost !== undefined && t.dailyCost !== null) ? t.dailyCost : defaultDailyCost(t.resource); }
  function crashCost() {
    var c = 0;
    tasks.forEach(function (t) {
      var orig = ORIGINAL_DURS[t.id];
      if (orig === undefined) return;
      var red = Math.max(0, orig - t.dur);
      if (red > 0 && t.crashCostPerDay) c += red * t.crashCostPerDay;
    });
    return c;
  }
  function getPlannedRef() {
    if (baselines.length) {
      var bl = baselines[baselines.length - 1], map = {};
      Object.keys(bl.byId).forEach(function (id) { var b = bl.byId[id]; map[id] = { es: b.es, ef: b.ef, dur: b.ef - b.es }; });
      return { schedule: map, projectEnd: bl.projectEnd, label: bl.name };
    }
    return { schedule: originalSchedule, projectEnd: originalProjectEnd, label: "Plan original" };
  }
  // Toma el primer importe del texto ("USD 480.000", "usd 1.850.000 (con reserva de 90.000)"), no todos los dígitos pegados.
  function parseBudget(txt) {
    var m = String(txt || "").match(/\d{1,3}(?:[.,]\d{3})+|\d+/);
    if (!m) return null;
    var n = parseInt(m[0].replace(/[.,]/g, ""), 10);
    return isNaN(n) || n <= 0 ? null : n;
  }
  function targetBudget() { var ab = parseBudget(charter.budget); return ab === null ? null : ab + approvedCostImpact(); }
  function suggestedCutoff() { return Math.max(1, Math.round(originalProjectEnd * CONFIG.CUTOFF_FRACTION)); }
  // Escala los costos diarios de todas las tareas para que el BAC coincida con el presupuesto del acta; el residuo se absorbe en la tarea más larga.
  function recalibrateCosts() {
    var ab = targetBudget();
    if (ab === null) { notify("El acta no tiene un presupuesto numérico: completá \"Presupuesto autorizado\" en el acta de constitución."); return; }
    var m = computeEVM();
    if (!(m.BAC > 0)) { notify("No hay costos para recalibrar: el BAC es 0."); return; }
    pushHistory();
    var k = ab / m.BAC, planned = m.planned, sum = 0, big = null, bigDur = -1;
    tasks.forEach(function (t) {
      var pRef = planned.schedule[t.id] || { dur: t.dur }, dc = Math.round(getDailyCost(t) * k * 10000) / 10000;
      t.dailyCost = dc; sum += pRef.dur * dc;
      if (pRef.dur > bigDur) { bigDur = pRef.dur; big = t; }
    });
    if (big && bigDur > 0) big.dailyCost = Math.round((big.dailyCost + (ab - sum) / bigDur) * 10000) / 10000;
    render();
    notify("Costos diarios recalibrados: el BAC ahora coincide con el presupuesto del acta (" + usd(ab) + ").");
  }
  function budgetNote(m) {
    var a0 = parseBudget(charter.budget), appr = approvedCostImpact(), ab = a0 === null ? null : a0 + appr;
    if (ab === null) return "Los costos diarios son editables en la tabla de abajo: el acta de constitución no trae un presupuesto numérico para comparar con el BAC.";
    var diff = Math.round(m.BAC - ab);
    return "Presupuesto autorizado en el acta de constitución: " + usd(a0) + ". " + (appr ? "Los cambios aprobados con impacto en el costo suman " + usd(appr) + ", por lo que la línea base de costos vigente es " + usd(ab) + ". " : "") + (Math.abs(diff) <= 1
      ? "El BAC coincide con ese presupuesto: los costos diarios de este caso se distribuyeron en proporción a la duración y al tipo de recurso de cada tarea (distribución didáctica, no una estimación ascendente). El BAC es la línea base de costos: incluye la reserva de contingencia si está dentro de ella y excluye siempre la reserva de gestión (presupuesto del proyecto = línea base de costos + reserva de gestión)."
      : "El BAC (" + usd(m.BAC) + ") difiere en " + usd(Math.abs(diff)) + " del presupuesto del acta " + (diff > 0 ? "por encima" : "por debajo") + ": cambiaste duraciones, costos o tareas (las tareas nuevas usan una tarifa didáctica). Revisá el BAC, actualizá el acta con una solicitud de cambio o recalibrá los costos diarios con el botón \"Recalibrar costos al presupuesto del acta\".") +
      " Podés editar los costos diarios en la tabla de abajo.";
  }
  // La fecha de corte tiene que caer dentro del plazo planificado; si no, el VP ya es el 100% del BAC (o 0%) y el EVM no sirve para un informe de estado de un período.
  function cutoffWarning(m) {
    var end = m.planned.projectEnd;
    if (cutoffDay >= end) return '<p class="banner" role="status" style="border:1px solid var(--gantt-near)">La fecha de corte (' + esc(workdayISO(cutoffDay)) + ") cae después del fin planificado (" + esc(workdayISO(Math.max(0, end - 1))) + "): el VP ya es el 100% del BAC y el EVM deja de servir para un informe de estado de un período. Elegí una fecha dentro del proyecto.</p>";
    if (cutoffDay <= 0) return '<p class="banner" role="status" style="border:1px solid var(--gantt-near)">La fecha de corte es el inicio del proyecto: el VP es 0 y no hay período que evaluar. Elegí una fecha posterior.</p>';
    return "";
  }
  function computeEVM() {
    computeSchedule(tasks);
    var planned = getPlannedRef();
    var BAC = 0, PV = 0, EV = 0, perTask = [];
    tasks.forEach(function (t) {
      var dc = getDailyCost(t);
      var pRef = planned.schedule[t.id] || { es: t._es, ef: t._ef, dur: t.dur };
      var budget = pRef.dur * dc;
      BAC += budget;
      PV += Math.max(0, Math.min(cutoffDay - pRef.es, pRef.dur)) * dc;
      var ev = (t.pct / 100) * budget;
      EV += ev;
      perTask.push({ t: t, budget: budget, ev: ev, dc: dc });
    });
    var anyTaskAc = tasks.some(function (t) { return t.acTask !== null && t.acTask !== undefined; });
    var AC, acEstimated = false;
    if (anyTaskAc) {
      AC = perTask.reduce(function (s, p) { return s + ((p.t.acTask !== null && p.t.acTask !== undefined) ? p.t.acTask : p.ev); }, 0);
    } else if (acActual !== null) {
      AC = acActual;
    } else { AC = EV; acEstimated = true; }
    var CPI = AC > 0 ? EV / AC : (EV > 0 ? Infinity : 1);
    var SPI = PV > 0 ? EV / PV : (EV > 0 ? Infinity : 1);
    var EAC = (CPI > 0 && isFinite(CPI)) ? BAC / CPI : BAC;
    return { BAC: BAC, PV: PV, EV: EV, AC: AC, CPI: CPI, SPI: SPI, EAC: EAC, VAC: BAC - EAC, CV: EV - AC, SV: EV - PV,
      planned: planned, perTask: perTask, anyTaskAc: anyTaskAc, acEstimated: acEstimated };
  }

  /* ===================== deshacer / rehacer ===================== */
  function metaState() {
    return { holidays: holidays.slice(), holidayCountry: holidayCountry, holidayYear: holidayYear, startDate: $("startDate").value,
      actualStart: actualStart, actualFinish: actualFinish, plannedFinishOverride: plannedFinishOverride };
  }
  function fullSnapshotStr() {
    return JSON.stringify({ tasks: cloneTasks(tasks), phases: clonePhases(phases), baselines: baselines, risks: risks,
      raciAssignments: raciAssignments, raciPeople: raciPeople, charter: charter, comms: comms, changeLog: changeLog,
      decisionLog: decisionLog, lessons: lessons, cutoffDay: cutoffDay, acActual: acActual, nearThreshold: nearThreshold, meta: metaState(),
      stakeholders: stakeholders, teamCharter: teamCharter, mgmtPlan: mgmtPlan, changeRequest: changeRequest, issues: issues, crList: crList });
  }
  function pushHistory() {
    history.push(fullSnapshotStr());
    if (history.length > 60) history.shift();
    future = [];
    setDirty(true);
  }
  function restoreFromStr(str) {
    var s = JSON.parse(str);
    tasks = s.tasks; phases = s.phases; baselines = s.baselines || []; risks = s.risks || [];
    raciAssignments = s.raciAssignments || {}; raciPeople = s.raciPeople || [];
    charter = s.charter || {}; comms = s.comms || []; changeLog = s.changeLog || []; decisionLog = s.decisionLog || [];
    lessons = s.lessons || ""; cutoffDay = s.cutoffDay; acActual = s.acActual; nearThreshold = s.nearThreshold;
    stakeholders = s.stakeholders || []; teamCharter = s.teamCharter || {}; mgmtPlan = s.mgmtPlan || {}; changeRequest = s.changeRequest || {};
    issues = s.issues || []; crList = s.crList || [];
    var m = s.meta || {};
    holidays = m.holidays || holidays; holidayCountry = m.holidayCountry || holidayCountry; holidayYear = m.holidayYear || holidayYear;
    if (m.startDate) $("startDate").value = m.startDate;
    actualStart = m.actualStart || ""; actualFinish = m.actualFinish || ""; plannedFinishOverride = m.plannedFinishOverride || "";
    $("nearThreshold").value = nearThreshold;
  }
  function undo() { if (!history.length) return; future.push(fullSnapshotStr()); restoreFromStr(history.pop()); setDirty(true); render(); }
  function redo() { if (!future.length) return; history.push(fullSnapshotStr()); restoreFromStr(future.pop()); setDirty(true); render(); }
  // Guardado automático: cada cambio programa un guardado en este navegador. isDirty = cambios todavía sin guardar en ningún lado.
  function setDirty(v) {
    isDirty = v;
    if (v) scheduleAutosave();
    paintSaveState();
  }
  function paintSaveState() {
    var el = $("dirtyIndicator");
    if (!el) return;
    var msg;
    if (autosaveFailed) msg = "No se pudo guardar solo: descargá la copia de seguridad";
    else if (isDirty) msg = "Guardando…";
    else msg = lastSavedAt ? "Guardado automáticamente a las " + lastSavedAt : "Sin cambios todavía";
    el.className = "dirty" + (isDirty || autosaveFailed ? "" : " clean");
    el.innerHTML = '<span class="dot" aria-hidden="true"></span>' + esc(msg);
  }
  function scheduleAutosave() {
    if (!currentProjectId) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosaveNow, CONFIG.AUTOSAVE_MS);
  }
  function autosaveNow() {
    clearTimeout(autosaveTimer); autosaveTimer = 0;
    if (!currentProjectId || !isDirty) return;
    var ok = store.set(storageKey(currentProjectId), JSON.stringify(serializeState()));
    autosaveFailed = !ok;
    if (ok) {
      store.set(lastCaseKey(), currentProjectId);
      var d = new Date(); lastSavedAt = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      isDirty = false;
    }
    paintSaveState();
  }
  function lastCaseKey() { return "ptTI.last." + META.audience; }

  /* ===================== diálogos y avisos propios (accesibles) ===================== */
  function notify(msg) {
    var c = $("toastBox");
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; c.appendChild(t);
    setTimeout(function () { t.remove(); }, 7000);
  }
  function openModal(box, onClose) {
    var ov = document.createElement("div"); ov.className = "dlgOverlay";
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    var opener = document.activeElement, openerFid = opener && opener.dataset ? opener.dataset.fid : "";
    ov.appendChild(box); document.body.appendChild(ov);
    function close(v) {
      document.removeEventListener("keydown", onKey, true);
      ov.remove();
      setTimeout(function () {
        var el = openerFid ? document.querySelector('[data-fid="' + openerFid.replace(/"/g, '\\"') + '"]') : null;
        el = el || opener;
        if (el && el.focus && document.body.contains(el)) el.focus();
      }, 20);
      if (onClose) onClose(v);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); close(null); return; }
      if (e.key !== "Tab") return;
      var f = box.querySelectorAll('a[href],button:not(:disabled),input:not([type=hidden]),select,textarea,iframe,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) close(null); });
    return close;
  }
  function askForm(title, fields, okLabel, validate) {
    return new Promise(function (resolve) {
      var form = document.createElement("form"); form.className = "dlgBox";
      form.setAttribute("aria-labelledby", "dlgTitle");
      var h = '<h2 id="dlgTitle">' + esc(title) + "</h2>";
      fields.forEach(function (f, i) {
        var id = "dlg_" + i;
        h += '<label for="' + id + '">' + esc(f.label) + "</label>";
        if (f.type === "select") {
          h += '<select id="' + id + '">' + f.options.map(function (o) { return '<option value="' + esc(o) + '"' + (o === f.value ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
        } else if (f.type === "textarea") {
          h += '<textarea id="' + id + '" rows="' + (f.rows || 4) + '">' + esc(f.value || "") + "</textarea>";
        } else {
          h += '<input id="' + id + '" type="' + (f.type || "text") + '" value="' + esc(f.value === undefined ? "" : f.value) + '"' + (f.min !== undefined ? ' min="' + f.min + '"' : "") + ">";
        }
        if (f.hint) h += "<small>" + esc(f.hint) + "</small>";
      });
      h += '<div class="dlgErr" id="dlgErr" role="alert"></div><div class="dlgBtns"><button type="button" class="dlgCancel">Cancelar</button><button type="submit" class="btn-primary">' + esc(okLabel || "Aceptar") + "</button></div>";
      form.innerHTML = h;
      var close = openModal(form, resolve);
      var first = form.querySelector("input,select,textarea"); if (first) first.focus();
      form.querySelector(".dlgCancel").addEventListener("click", function () { close(null); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var out = {}, err = "";
        fields.forEach(function (f, i) {
          var el = form.querySelector("#dlg_" + i), v = el.value;
          if (f.type === "number") v = v === "" ? NaN : parseInt(v, 10);
          out[f.key] = v;
          if (f.required && (v === "" || (typeof v === "number" && isNaN(v)))) err = err || "Completá: " + f.label + ".";
        });
        if (!err && validate) err = validate(out) || "";
        if (err) { form.querySelector("#dlgErr").textContent = err; return; }
        close(out);
      });
    });
  }
  function confirmBox(msg, okLabel) {
    return new Promise(function (resolve) {
      var box = document.createElement("div"); box.className = "dlgBox";
      box.setAttribute("aria-labelledby", "dlgMsg");
      box.innerHTML = '<p id="dlgMsg" style="margin:0 0 6px;line-height:1.5;">' + esc(msg) + '</p><div class="dlgBtns"><button type="button" class="dlgCancel">Cancelar</button><button type="button" class="btn-primary dlgOk">' + esc(okLabel || "Eliminar") + "</button></div>";
      var close = openModal(box, function (v) { resolve(v === true); });
      box.querySelector(".dlgCancel").addEventListener("click", function () { close(false); });
      box.querySelector(".dlgOk").addEventListener("click", function () { close(true); });
      box.querySelector(".dlgCancel").focus();
    });
  }

  /* ===================== carga de casos ===================== */
  function caseIds() { return Object.keys(CASOS); }
  function populateProjectSelect() {
    var sel = $("projectSelect"); sel.innerHTML = "";
    caseIds().forEach(function (id) {
      var o = document.createElement("option"); o.value = id; o.textContent = CASOS[id].label; sel.appendChild(o);
    });
  }
  function yearOf(iso) { return parseInt(iso.slice(0, 4), 10); }
  function applyHolidayPreset(country, years) {
    var loaded = [], missing = [], list = [];
    var set = FERIADOS[country];
    years.forEach(function (y) {
      if (set && set.anios && set.anios[y]) { list = list.concat(set.anios[y]); loaded.push(y); } else missing.push(y);
    });
    return { list: list, loaded: loaded, missing: missing };
  }
  function loadProject(id, silent) {
    var proj = CASOS[id];
    if (!proj) { notify("El caso no existe en esta versión de la herramienta."); return; }
    currentProjectId = id;
    $("startDate").value = proj.startDate;
    tasks = proj.tasks.map(function (t) {
      return Object.assign({}, clone(t), { overlapDays: 0, levelDelay: 0, notes: "", acTask: null, extraResources: [] });
    });
    phases = clonePhases(proj.phases);
    ORIGINAL_DURS = {}; tasks.forEach(function (t) { ORIGINAL_DURS[t.id] = t.dur; });
    holidayCountry = FERIADOS.AR ? "AR" : "__otro__";
    var y0 = yearOf(proj.startDate);
    holidayYear = y0;
    var preset = applyHolidayPreset(holidayCountry, [y0, y0 + 1, y0 + 2]);
    holidays = preset.list.slice().sort();
    var tmp = cloneTasks(tasks);
    originalProjectEnd = computeScheduleOn(tmp).projectEnd;
    originalSchedule = {};
    tmp.forEach(function (t) { originalSchedule[t.id] = { es: t._es, ef: t._ef, dur: t.dur }; });
    baselines = []; acActual = null; actualStart = ""; actualFinish = ""; plannedFinishOverride = "";
    cutoffDay = suggestedCutoff();
    risks = clone(proj.risks || []); raciAssignments = {}; raciPeople = [];
    risks.forEach(function (r) { if (r.type !== "Oportunidad") r.type = "Amenaza"; });
    stakeholders = []; teamCharter = {}; mgmtPlan = {}; changeRequest = {}; issues = []; crList = []; simResult = null;
    charter = clone(proj.charter || {});
    charter.contingency = charter.contingency || ""; charter.mgmtReserve = charter.mgmtReserve || "";
    comms = (charter.stakeholders || "").split(",").slice(0, 2).map(function (s, i) {
      return { id: "C" + (i + 1), stakeholder: s.trim(), info: i === 0 ? "Avance general del proyecto" : "Impacto en su área",
        freq: i === 0 ? "Semanal" : "Quincenal", channel: "Reunión / email", owner: "PM" };
    });
    changeLog = []; decisionLog = []; lessons = ""; history = []; future = [];
    scenarios = [{ name: "Plan original", snap: { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) } }];
    activeScenario = 0; ftTaskId = ""; lastSavedAt = ""; autosaveFailed = false; clearTimeout(autosaveTimer); setDirty(false);
    $("projectSelect").value = id;
    render();
  }

  /* ===================== render ===================== */
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(function () { renderQueued = false; render(); }, 0);
  }
  function focusId(el) { return el && el.dataset ? el.dataset.fid : ""; }
  function resourceOptionsList() {
    var all = ["PM"];
    tasks.forEach(function (t) { if (t.resource) all.push(t.resource); (t.extraResources || []).forEach(function (r) { all.push(r); }); });
    return Array.from(new Set(all));
  }
  function allResourcesOf(t) { return Array.from(new Set([t.resource].concat(t.extraResources || []).filter(Boolean))); }
  function leafTasks() { return tasks.filter(function (t) { return phases.some(function (ph) { return ph.children.indexOf(t.id) >= 0; }); }); }

  function render() {
    var active = document.activeElement, fid = focusId(active);
    var sel = (active && active.selectionStart !== undefined && active.tagName === "TEXTAREA") ? null : null; void sel;
    var res = computeSchedule(tasks), byId = res.byId, projectEnd = res.projectEnd, cyclic = res.cyclic;
    var RH = rowH();
    if (!holidayYear) holidayYear = yearOf(startDateValue());

    // ---- avisos ----
    var cb = $("cycleBanner");
    if (cyclic.length) {
      cb.textContent = "Dependencia circular: no se pudo calcular el cronograma de estas tareas por un ciclo en sus predecesoras: " + cyclic.join(", ") + '. Revisá la columna "Preced." de esas filas.';
      cb.className = "banner error";
    } else cb.className = "banner";
    cb.hidden = !cyclic.length;
    renderCalendarBanner(projectEnd);

    // ---- estado ----
    var delta = projectEnd - originalProjectEnd, cost = crashCost();
    var sh = "<span><b>Fin del proyecto:</b> día " + projectEnd + " (sem. " + Math.ceil(projectEnd / 5) + ") · último día hábil " + esc(workdayISO(Math.max(0, projectEnd - 1)));
    if (delta !== 0) sh += ' <span class="delta">' + (delta > 0 ? "+" : "") + delta + "d vs. plan original</span>";
    sh += "</span>";
    if (baselines.length) {
      var lb = baselines[baselines.length - 1], dv = projectEnd - lb.projectEnd;
      sh += "<span><b>Desvío del fin vs. " + esc(lb.name) + ':</b> <span class="' + (dv > 0 ? "delta" : "") + '">' + (dv > 0 ? "+" : "") + dv + "d</span></span>";
    }
    if (cost > 0) sh += '<span><b>Costo de aceleración:</b> <span class="cost">' + usd(cost) + "</span></span>";
    if (actualStart) { var d1 = daysBetween(startDateValue(), actualStart); sh += "<span><b>Inicio real:</b> " + esc(actualStart) + ' <span class="' + (d1 > 0 ? "delta" : "") + '">' + (d1 > 0 ? "+" : "") + d1 + "d vs. planificado</span></span>"; }
    if (actualFinish) { var d2 = daysBetween(plannedFinishDate(), actualFinish); sh += "<span><b>Fin real:</b> " + esc(actualFinish) + ' <span class="' + (d2 > 0 ? "delta" : "") + '">' + (d2 > 0 ? "+" : "") + d2 + "d vs. planificado</span></span>"; }
    $("status").innerHTML = sh;

    syncProjectDateInputs();
    $("projTitle").textContent = CASOS[currentProjectId] ? CASOS[currentProjectId].title : "";
    $("startNote").textContent = CASOS[currentProjectId] ? CASOS[currentProjectId].startNote || "" : "";
    renderFastTrackControls(byId);
    var adv = $("advancedTools");
    if (adv && (baselines.length || scenarios.length > 1 || tasks.some(function (t) { return t.overlapDays > 0; }))) adv.open = true;

    var totalDays = Math.max.apply(null, [projectEnd, originalProjectEnd].concat(baselines.map(function (b) { return b.projectEnd; }))) + 12;
    var totalWeeks = Math.ceil(totalDays / 5), chartWidth = totalWeeks * 5 * DAY_PX;
    var resOptions = resourceOptionsList();
    var activePhases = phases.filter(function (ph) { return ph.children.length > 0; });

    // ---- tabla ----
    var rows = "";
    activePhases.forEach(function (ph) {
      var kids = ph.children.map(function (id) { return byId[id]; }).filter(Boolean);
      if (!kids.length) return;
      var s = Math.min.apply(null, kids.map(function (k) { return k._es; })), e = Math.max.apply(null, kids.map(function (k) { return k._ef; }));
      rows += '<tr class="summary"><td class="wbs">' + esc(ph.id) + '</td><td class="name indent-1">' + esc(ph.name) + '</td><td class="res"></td><td class="dur">' + (e - s) + 'd</td><td class="dates">' + esc(workdayISO(s)) + '</td><td class="dates">' + esc(workdayISO(Math.max(0, e - 1))) + '</td><td class="pred"></td><td class="slack"></td><td class="pct"></td><td class="actcol"></td></tr>';
      kids.forEach(function (t) {
        var locked = ORIGINAL_DURS[t.id] !== undefined && !t.crashCostPerDay;
        var riskCount = risks.filter(function (rk) { return rk.taskId === t.id; }).length;
        var opts = resOptions.map(function (r) { return '<option value="' + esc(r) + '"' + (t.resource === r ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("") + '<option value="__new__">+ Nuevo recurso…</option>';
        if (resOptions.indexOf(t.resource) < 0 && t.resource) opts = '<option value="' + esc(t.resource) + '" selected>' + esc(t.resource) + "</option>" + opts;
        var nExtra = (t.extraResources || []).length;
        var id = esc(t.id);
        rows += '<tr class="leaf' + (t.critical ? " crit-row" : (t.near ? " near-row" : "")) + '" data-row="' + id + '">' +
          '<td class="wbs">' + id + "</td>" +
          '<td class="name indent-2">' + esc(t.name) + (riskCount ? '<span class="riskTag" title="' + riskCount + ' riesgo(s) asociado(s)" aria-label="' + riskCount + ' riesgo(s) asociado(s)">!</span>' : "") +
          '<button type="button" class="noteBtn" data-action="editNote" data-id="' + id + '" data-fid="note:' + id + '" aria-label="' + (t.notes ? "Editar nota" : "Agregar nota") + " de la tarea " + id + '">' + (t.notes ? "Nota" : "+ nota") + "</button></td>" +
          '<td class="res"><div class="resCell"><select class="cell-input resSelect" data-change="resource" data-id="' + id + '" data-fid="res:' + id + '" aria-label="Recurso principal de la tarea ' + id + '">' + opts + "</select>" +
          '<button type="button" class="more" data-action="extraRes" data-id="' + id + '" data-fid="more:' + id + '" aria-label="Recursos secundarios de la tarea ' + id + ' (' + nExtra + ')">+' + nExtra + "</button></div></td>" +
          '<td class="dur"><input class="cell-input durInput' + (locked ? " locked" : "") + '" type="number" min="0" max="2000" value="' + t.dur + '" data-change="dur" data-id="' + id + '" data-fid="dur:' + id + '" aria-label="Duración en días hábiles de la tarea ' + id + '"' + (locked ? ' title="No se puede acelerar: depende de un tercero"' : "") + "></td>" +
          '<td class="dates"><input type="date" class="cell-input dateInput" data-change="dateStart" data-id="' + id + '" data-fid="ds:' + id + '" value="' + esc(startISO(t)) + '" aria-label="Inicio de la tarea ' + id + '"></td>' +
          '<td class="dates"><input type="date" class="cell-input dateInput" data-change="dateFinish" data-id="' + id + '" data-fid="df:' + id + '" value="' + esc(finishISO(t)) + '" aria-label="Fin (último día hábil) de la tarea ' + id + '"></td>' +
          '<td class="pred"><input type="text" class="cell-input predInput" value="' + esc(predsText(t)) + '" placeholder="—" data-change="preds" data-id="' + id + '" data-fid="pr:' + id + '" aria-label="Predecesoras de la tarea ' + id + '. IDs separados por coma; tipo FC, CC, FF o CF y desfase opcionales, por ejemplo 1.2.1CC+2"></td>' +
          '<td class="slack">' + (t.dur === 0 ? "—" : (t.critical ? "0 (crítica)" : t.slack + "d")) + "</td>" +
          '<td class="pct"><input class="cell-input pctInput" type="number" min="0" max="100" value="' + t.pct + '" data-change="pct" data-id="' + id + '" data-fid="pct:' + id + '" aria-label="Porcentaje completado de la tarea ' + id + '"></td>' +
          '<td class="actcol"><button type="button" class="delBtn" data-action="deleteTask" data-id="' + id + '" data-fid="del:' + id + '" aria-label="Eliminar la tarea ' + id + '">✕</button></td></tr>';
      });
    });
    $("taskbody").innerHTML = rows;

    // ---- encabezado semanal ----
    var months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    var hh = "";
    for (var w = 0; w < totalWeeks; w++) {
      var iso = workdayISO(w * 5).split("-");
      hh += '<div class="wk" style="width:' + (5 * DAY_PX) + 'px">S' + (w + 1) + '<br><span style="font-size:8.5px">' + parseInt(iso[2], 10) + " " + months[parseInt(iso[1], 10) - 1] + "</span></div>";
    }
    var header = $("ganttHeader"); header.innerHTML = hh; header.style.width = chartWidth + "px";

    // ---- filas Gantt ----
    var body = $("ganttBody"); body.innerHTML = ""; body.style.width = chartWidth + "px";
    var grid = ""; for (var g = 0; g <= totalWeeks; g++) grid += '<div class="gridline" style="left:' + (g * 5 * DAY_PX) + 'px"></div>';
    var rowIndex = 0, rowCenterY = {};
    activePhases.forEach(function (ph) {
      var kids = ph.children.map(function (id) { return byId[id]; }).filter(Boolean);
      if (!kids.length) return;
      var s = Math.min.apply(null, kids.map(function (k) { return k._es; })), e = Math.max.apply(null, kids.map(function (k) { return k._ef; }));
      var rs = document.createElement("div"); rs.className = "ganttRow"; rs.style.width = chartWidth + "px"; rs.innerHTML = grid;
      var bs = document.createElement("div"); bs.className = "bar summary"; bs.style.left = (s * DAY_PX) + "px"; bs.style.width = Math.max((e - s) * DAY_PX, 4) + "px";
      bs.setAttribute("aria-hidden", "true"); rs.appendChild(bs); body.appendChild(rs); rowIndex++;
      kids.forEach(function (t) {
        var row = document.createElement("div"); row.className = "ganttRow"; row.style.width = chartWidth + "px"; row.innerHTML = grid;
        var cls = t.critical ? "critical" : (t.near ? "nearcrit" : "normal");
        var bar = document.createElement("div");
        if (t.dur === 0) { bar.className = "milestone " + cls; bar.style.left = (t._es * DAY_PX - 8) + "px"; }
        else { bar.className = "bar leafbar " + cls + (drag && drag.id === t.id ? " dragging" : ""); bar.style.left = (t._es * DAY_PX) + "px"; bar.style.width = Math.max(t.dur * DAY_PX, 4) + "px"; }
        bar.dataset.bar = t.id; bar.dataset.fid = "bar:" + t.id; bar.tabIndex = 0; bar.setAttribute("role", "button");
        var estado = t.critical ? "ruta crítica" : (t.near ? "casi crítica" : "con holgura");
        var label = (t.dur === 0 ? "Hito " : "Tarea ") + t.id + " " + t.name + ", del " + startISO(t) + " al " + finishISO(t) + ", " + estado + ", holgura " + t.slack + " días. Flechas izquierda y derecha: mover un día.";
        bar.setAttribute("aria-label", label); bar.title = t.name + " — arrastrá para mover (holgura " + t.slack + "d)";
        if (t.pct > 0 && t.dur > 0) { var f = document.createElement("div"); f.className = "fill"; f.style.width = t.pct + "%"; f.setAttribute("aria-hidden", "true"); bar.appendChild(f); }
        var rc = risks.filter(function (rk) { return rk.taskId === t.id; });
        if (rc.length) { var rb = document.createElement("div"); rb.className = "barrisk"; rb.textContent = "!"; rb.title = rc.map(function (r) { return r.desc; }).join(" · "); rb.setAttribute("aria-hidden", "true"); bar.appendChild(rb); }
        row.appendChild(bar);
        if (t.slack > 0) {
          var gh = document.createElement("div"); gh.className = "ghost" + (t.near ? " near" : ""); gh.style.left = (t._ef * DAY_PX) + "px"; gh.style.width = Math.max(t.slack * DAY_PX, 2) + "px"; gh.setAttribute("aria-hidden", "true"); row.appendChild(gh);
        }
        baselines.filter(function (bl) { return bl.visible && bl.byId[t.id]; }).forEach(function (bl, i) {
          var b = bl.byId[t.id], d = document.createElement("div"); d.className = "baseline";
          d.style.bottom = (3 + i * 4) + "px"; d.style.background = "var(--baseline-" + ((baselines.indexOf(bl) % 4) + 1) + ")";
          d.style.left = (b.es * DAY_PX) + "px"; d.style.width = Math.max((b.ef - b.es) * DAY_PX, 3) + "px"; d.title = bl.name; d.setAttribute("aria-hidden", "true"); row.appendChild(d);
        });
        if (drag && drag.id === t.id) {
          var lbl = document.createElement("div"); lbl.className = "draglabel"; lbl.style.left = (t._es * DAY_PX) + "px";
          var shift = (t.levelDelay || 0) - drag.startDelay; lbl.textContent = (shift >= 0 ? "+" : "") + shift + "d"; row.appendChild(lbl);
        }
        body.appendChild(row);
        rowCenterY[t.id] = rowIndex * RH + RH / 2; rowIndex++;
      });
    });
    var totalHeight = rowIndex * RH;
    var tl = document.createElement("div"); tl.className = "today-line"; tl.style.left = (cutoffDay * DAY_PX) + "px"; tl.style.height = totalHeight + "px"; tl.setAttribute("aria-hidden", "true");
    var tlab = document.createElement("div"); tlab.className = "today-label"; tlab.style.left = (cutoffDay * DAY_PX) + "px"; tlab.textContent = "CORTE"; tlab.setAttribute("aria-hidden", "true");
    body.appendChild(tl); body.appendChild(tlab);

    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("id", "depSvg"); svg.setAttribute("width", chartWidth); svg.setAttribute("height", totalHeight);
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    var defs = document.createElementNS(NS, "defs");
    [["arrowNorm", "var(--color-muted)"], ["arrowCrit", "var(--gantt-critical)"]].forEach(function (a) {
      var m = document.createElementNS(NS, "marker"); m.setAttribute("id", a[0]); m.setAttribute("markerWidth", "8"); m.setAttribute("markerHeight", "8");
      m.setAttribute("refX", "6"); m.setAttribute("refY", "3"); m.setAttribute("orient", "auto");
      var p = document.createElementNS(NS, "path"); p.setAttribute("d", "M0,0 L6,3 L0,6 Z"); p.setAttribute("style", "fill:" + a[1]); m.appendChild(p); defs.appendChild(m);
    });
    svg.appendChild(defs);
    tasks.forEach(function (t) {
      t.preds.forEach(function (pid) {
        var p = byId[pid]; if (!p) return;
        var dp = depOf(t, pid), x1 = (dp.type === "SS" || dp.type === "SF" ? p._es : p._ef) * DAY_PX, y1 = rowCenterY[p.id], x2 = (dp.type === "FF" || dp.type === "SF" ? t._ef : t._es) * DAY_PX, y2 = rowCenterY[t.id];
        if (y1 === undefined || y2 === undefined) return;
        var crit = p.critical && t.critical, midX = x1 + Math.max((x2 - x1) / 2, 8);
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", "M" + x1 + "," + y1 + " L" + midX + "," + y1 + " L" + midX + "," + y2 + " L" + (x2 - 1) + "," + y2);
        path.setAttribute("fill", "none"); path.setAttribute("style", "stroke:" + (crit ? "var(--gantt-critical)" : "var(--color-muted)"));
        path.setAttribute("stroke-width", crit ? "2" : "1.4"); path.setAttribute("marker-end", crit ? "url(#arrowCrit)" : "url(#arrowNorm)"); path.setAttribute("opacity", crit ? "0.9" : "0.55");
        svg.appendChild(path);
      });
    });
    body.appendChild(svg); body.style.height = totalHeight + "px";
    var critIds = tasks.filter(function (t) { return t.critical; }).map(function (t) { return t.id; });
    $("ganttSummary").textContent = "Diagrama de Gantt con " + leafTasks().length + " tareas. Fin del proyecto en el día " + projectEnd + ". Ruta crítica: " + (critIds.join(", ") || "sin tareas críticas") + ".";

    renderScenarioChips(); renderBaselineChips();
    Object.keys(PANELS).forEach(function (k) { if (panelsOn[k]) PANELS[k].render(); });

    if (fid) {
      var el = document.querySelector('[data-fid="' + fid.replace(/"/g, '\\"') + '"]');
      if (el && el !== document.activeElement) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    }
    if (firstRender) { firstRender = false; }
  }

  function renderCalendarBanner(projectEnd) {
    var b = $("calBanner");
    var start = startDateValue(), end = workdayISO(Math.max(0, projectEnd - 1));
    var y1 = yearOf(start), y2 = yearOf(end), have = new Set(holidays.map(function (h) { return yearOf(h); })), miss = [];
    for (var y = y1; y <= y2; y++) if (!have.has(y)) miss.push(y);
    if (miss.length) {
      b.textContent = "Calendario incompleto: el cronograma llega hasta " + end + " y no hay feriados cargados para " + miss.join(", ") + ". Falta el dato: lista oficial de feriados de cada año. Cargala en \"Feriados y calendario\"; hasta entonces esos años cuentan todos los días hábiles.";
      b.className = "banner"; b.hidden = false;
    } else { b.hidden = true; }
    $("holidayNote").textContent = "Feriados cargados: " + (holidays.length || "ninguno") + ". Verificalos con la fuente oficial antes de usar el cronograma.";
  }
  function syncProjectDateInputs() {
    var pf = $("plannedFinishInput"), as = $("actualStartInput"), af = $("actualFinishInput");
    if (document.activeElement !== pf) pf.value = plannedFinishDate();
    if (document.activeElement !== as) as.value = actualStart || "";
    if (document.activeElement !== af) af.value = actualFinish || "";
  }

  /* ---- seguimiento rápido (fast-track) elegible ---- */
  function renderFastTrackControls(byId) {
    var sel = $("ftSelect"), cands = leafTasks().filter(function (t) { return t.dur > 0 && t.preds.some(function (p) { return depOf(t, p).type === "FS"; }); });
    if (!cands.length) { sel.innerHTML = ""; $("ftBtn").disabled = true; return; }
    if (!ftTaskId || !cands.some(function (t) { return t.id === ftTaskId; })) {
      var pref = cands.filter(function (t) { return t.crashCostPerDay; })[0] || cands[0]; ftTaskId = pref.id;
    }
    sel.innerHTML = cands.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === ftTaskId ? " selected" : "") + ">" + esc(t.id + " " + t.name) + (t.overlapDays > 0 ? " (activo)" : "") + "</option>"; }).join("");
    var cur = taskById(ftTaskId); $("ftBtn").disabled = false;
    $("ftBtn").textContent = cur && cur.overlapDays > 0 ? "Revertir seguimiento rápido" : "Aplicar seguimiento rápido";
    $("ftPct").value = ftPct;
    var act = tasks.filter(function (t) { return t.overlapDays > 0; });
    var fb = $("ftBanner");
    if (act.length) {
      fb.textContent = "Seguimiento rápido (fast-track) activo en: " + act.map(function (t) { return t.id + " " + t.name + " (solapa " + t.overlapDays + "d con sus predecesoras)"; }).join("; ") + ". Mayor riesgo de retrabajo.";
      fb.hidden = false; fb.className = "banner";
    } else fb.hidden = true;
  }
  function toggleFastTrack() {
    var t = taskById(ftTaskId); if (!t) return;
    pushHistory();
    if (t.overlapDays > 0) t.overlapDays = 0;
    else {
      computeSchedule(tasks);
      var minPred = Math.min.apply(null, t.preds.filter(function (p) { return depOf(t, p).type === "FS"; }).map(function (p) { var x = taskById(p); return x ? x.dur : t.dur; }));
      t.overlapDays = Math.max(1, Math.min(Math.round(t.dur * ftPct / 100), minPred));
    }
    render();
  }

  /* ---- chips ---- */
  function renderScenarioChips() {
    $("scenarioChips").innerHTML = scenarios.map(function (sc, i) {
      return '<button type="button" class="chip" data-action="loadScenario" data-i="' + i + '" data-fid="sc:' + i + '" aria-pressed="' + (i === activeScenario) + '">' + esc(sc.name) + "</button>";
    }).join(" ");
  }
  function renderBaselineChips() {
    $("baselineChips").innerHTML = baselines.map(function (bl, i) {
      return '<span style="display:inline-flex;gap:2px"><button type="button" class="chip" style="border-color:var(--baseline-' + ((i % 4) + 1) + ')" data-action="toggleBaseline" data-i="' + i + '" data-fid="bl:' + i + '" aria-pressed="' + bl.visible + '" aria-label="Línea base ' + esc(bl.name) + ": " + (bl.visible ? "visible" : "oculta") + '">' + (bl.visible ? "Ver " : "Oculta ") + esc(bl.name) + '</button><button type="button" class="chip" data-action="deleteBaseline" data-i="' + i + '" data-fid="bld:' + i + '" aria-label="Eliminar línea base ' + esc(bl.name) + '">✕</button></span>';
    }).join(" ");
  }

  /* ---- paneles ---- */
  var PANELS = {
    holidays: { id: "holidaypanel", btn: "holidayToggleBtn", label: "feriados y calendario", render: renderHolidays },
    res: { id: "respanel", btn: "resToggleBtn", label: "vista de recursos", render: renderResourceView },
    evm: { id: "evmpanel", btn: "evmToggleBtn", label: "valor ganado (EVM)", render: renderEVM },
    rac: { id: "racipanel", btn: "raciToggleBtn", label: "matriz RACI", render: renderRACI },
    risk: { id: "riskpanel", btn: "riskToggleBtn", label: "registro de riesgos", render: renderRisks },
    charter: { id: "charterpanel", btn: "charterToggleBtn", label: "acta de constitución", render: renderCharter },
    stk: { id: "stkpanel", btn: "stkToggleBtn", label: "interesados y participación", render: renderStakeholders },
    plan: { id: "planpanel", btn: "planToggleBtn", label: "plan de gestión", render: renderPlan },
    team: { id: "teampanel", btn: "teamToggleBtn", label: "Team Charter", render: renderTeam },
    check: { id: "checkpanel", btn: "checkToggleBtn", label: "control de coherencia", render: renderChecks },
    comms: { id: "commspanel", btn: "commsToggleBtn", label: "plan de comunicaciones", render: renderComms },
    kanban: { id: "kanbanpanel", btn: "kanbanToggleBtn", label: "Kanban", render: renderKanban },
    close: { id: "closepanel", btn: "closeToggleBtn", label: "cierre del proyecto", render: renderCloseLogs },
    status: { id: "statuspanel", btn: "statusToggleBtn", label: "informe de estado semanal", render: renderStatusPanel },
    issues: { id: "issuespanel", btn: "issuesToggleBtn", label: "problemas y acciones", render: renderIssuesPanel },
    three: { id: "threepanel", btn: "threeToggleBtn", label: "estimación de tres puntos", render: renderThreePanel },
    reserves: { id: "reservespanel", btn: "reservesToggleBtn", label: "análisis de reservas (VME)", render: renderReservesPanel },
    changes: { id: "changespanel", btn: "changesToggleBtn", label: "control de cambios", render: renderChangesPanel }
  };
  function togglePanel(key) {
    var p = PANELS[key]; panelsOn[key] = !panelsOn[key];
    var on = panelsOn[key];
    $(p.id).className = "panel" + (on ? " show" : "");
    var b = $(p.btn); b.textContent = (on ? "Ocultar " : "Mostrar ") + p.label; b.setAttribute("aria-expanded", String(on));
    if (on) p.render();
  }

  function renderResourceView() {
    var res = computeSchedule(tasks), projectEnd = res.projectEnd;
    var totalWeeks = Math.ceil((Math.max(projectEnd, originalProjectEnd) + 12) / 5), chartWidth = totalWeeks * 5 * DAY_PX;
    var byRes = {};
    tasks.forEach(function (t) { allResourcesOf(t).forEach(function (r) { (byRes[r] = byRes[r] || []).push(t); }); });
    var names = "", bodyHtml = "";
    Object.keys(byRes).forEach(function (rn) {
      var list = byRes[rn].slice().sort(function (a, b) { return a._es - b._es; }), lanes = [], laneOf = {};
      list.forEach(function (t) {
        var li = lanes.findIndex(function (last) { return last <= t._es; });
        if (li === -1) { li = lanes.length; lanes.push(t._ef); } else lanes[li] = t._ef;
        laneOf[t.id] = li;
      });
      var over = lanes.length > 1, h = lanes.length * 20 + 8;
      names += '<div class="resrow" style="height:' + h + 'px">' + esc(rn) + (over ? '<span class="warn">Sobreasignado</span>' : "") + "</div>";
      bodyHtml += '<div class="resGanttRow" style="height:' + h + "px;width:" + chartWidth + 'px">' + list.map(function (t) {
        return '<div class="reslane-bar ' + (over ? "conflict" : "ok") + '" style="left:' + (t._es * DAY_PX) + "px;width:" + Math.max(t.dur * DAY_PX, 4) + "px;top:" + (4 + laneOf[t.id] * 20) + 'px" title="' + esc(t.name) + " (" + t.dur + 'd)">' + esc(t.id) + "</div>";
      }).join("") + "</div>";
    });
    $("resNames").innerHTML = names; $("resGanttBody").innerHTML = bodyHtml; $("resGanttBody").style.width = chartWidth + "px";
  }

  /* ---- EVM ---- */
  function renderEVM() {
    var m = computeEVM();
    var cd = $("cutoffDate"); if (document.activeElement !== cd) cd.value = workdayISO(cutoffDay);
    var ai = $("acInput"); if (document.activeElement !== ai) ai.value = acActual === null ? "" : Math.round(acActual);
    var idx = function (n) { return isFinite(n) ? n.toFixed(2) : "—"; };
    var card = function (v, l, warn) { return '<div class="evmCard' + (warn ? " warn" : "") + '"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>"; };
    var bar = function (label, v, mx, color) {
      var pct = mx > 0 ? Math.min(100, v / mx * 100) : 0;
      return '<div class="evmbarrow"><span class="lbl2">' + label + '</span><div class="evmbartrack" role="img" aria-label="' + label + ": " + usd(v) + '"><div class="evmbarfill" style="width:' + pct + "%;background:" + color + '"></div></div><span class="val">' + usd(v) + "</span></div>";
    };
    var html = '<p class="note" style="margin-top:0">VP y BAC se calculan contra <b>' + esc(m.planned.label) + "</b> (línea base fija: no cambia aunque muevas tareas). VE y CA reflejan el avance y el costo real. Esta misma función alimenta el informe final, por eso los números coinciden.</p>" +
      '<p class="note">' + budgetNote(m) + (m.acEstimated ? " Todavía no cargaste costo real: se usa CA = VE (CPI = 1) como estimación." : "") + "</p>" +
      cutoffWarning(m) +
      '<div class="evmActions">' +
      (targetBudget() !== null && Math.abs(Math.round(m.BAC - targetBudget())) > 1 ? '<button type="button" data-action="recalibrateCosts" data-fid="recal">Recalibrar costos al presupuesto del acta</button>' : "") +
      '<button type="button" data-action="useSuggestedCutoff" data-fid="cutsug">Usar el corte sugerido (' + Math.round(CONFIG.CUTOFF_FRACTION * 100) + '% del plazo)</button></div>' +
      '<div class="evmGrid">' +
      card(usd(m.BAC), "BAC — Presupuesto al cierre") + card(usd(m.PV), "VP — Valor planificado") + card(usd(m.EV), "VE — Valor ganado") +
      card(usd(m.AC), "CA — Costo real" + (m.anyTaskAc ? " (por tarea)" : (m.acEstimated ? " (estimado = VE)" : " (global)"))) +
      card(idx(m.CPI), "CPI — Índice de rendimiento de costos", m.CPI < 1) + card(idx(m.SPI), "SPI — Índice de rendimiento del cronograma", m.SPI < 1) +
      card(usd(m.CV), "CV — Variación del costo", m.CV < 0) + card(usd(m.SV), "SV — Variación del cronograma", m.SV < 0) +
      card(usd(m.EAC), "EAC — Estimación al cierre", m.EAC > m.BAC) + card(usd(m.VAC), "VAC — Variación al cierre", m.VAC < 0) + "</div>" +
      '<div class="evmbars">' + bar("VP", m.PV, m.BAC, "var(--color-muted)") + bar("VE", m.EV, m.BAC, "var(--gantt-normal)") + bar("CA", m.AC, m.BAC, "var(--gantt-near)") + "</div>" +
      '<p class="note">CPI y SPI menores que 1 indican sobrecosto o atraso. Si cargás costo real por tarea, el CA se calcula con esos datos (las tareas sin cargar usan su VE). Si no cargás ninguna, se usa el campo global.</p>' +
      '<h3 style="margin:16px 0 8px;font-size:13px">Costos por tarea</h3><table class="simpletable"><caption class="sr-only">Costo diario, presupuesto, valor ganado (VE) y costo real (CA) por tarea</caption><thead><tr><th scope="col">Tarea</th><th scope="col">Costo diario (supuesto)</th><th scope="col">Presupuesto</th><th scope="col">VE</th><th scope="col">Costo real (CA)</th></tr></thead><tbody>' +
      m.perTask.map(function (p) {
        var id = esc(p.t.id);
        return "<tr><td>" + id + " " + esc(p.t.name) + '</td><td><input type="number" class="cell-input" style="width:90px" min="0" value="' + Math.round(p.dc) + '" data-change="dailyCost" data-id="' + id + '" data-fid="dc:' + id + '" aria-label="Costo diario de la tarea ' + id + '"></td><td>' + usd(p.budget) + "</td><td>" + usd(p.ev) + '</td><td><input type="number" class="cell-input" style="width:100px" min="0" placeholder="—" value="' + (p.t.acTask !== null && p.t.acTask !== undefined ? p.t.acTask : "") + '" data-change="taskAc" data-id="' + id + '" data-fid="ac:' + id + '" aria-label="Costo real de la tarea ' + id + '"></td></tr>';
      }).join("") + "</tbody></table>";
    $("evmBody").innerHTML = html;
  }

  /* ---- RACI ---- */
  function ensureRaciPeople() { if (!raciPeople.length) raciPeople = Array.from(new Set(tasks.map(function (t) { return t.resource; }).filter(Boolean))); }
  function renderRACI() {
    ensureRaciPeople();
    var h = '<table class="raci"><caption class="sr-only">Matriz RACI por tarea y persona</caption><thead><tr><th scope="col" style="text-align:left">Tarea</th>' + raciPeople.map(function (p) { return '<th scope="col">' + esc(p) + "</th>"; }).join("") + '<th scope="col">Doble A</th></tr></thead><tbody>';
    leafTasks().forEach(function (t) {
      var row = raciAssignments[t.id] || {}, aCount = raciPeople.filter(function (p) { return row[p] === "A"; }).length;
      h += '<tr class="' + (aCount > 1 ? "doubleA" : "") + '"><td class="taskname">' + esc(t.id + " " + t.name) + "</td>";
      raciPeople.forEach(function (p, pi) {
        var v = row[p] || "";
        h += '<td class="racicell ' + v + '"><button type="button" data-action="cycleRaci" data-id="' + esc(t.id) + '" data-pi="' + pi + '" data-fid="raci:' + esc(t.id) + ":" + pi + '" aria-label="Tarea ' + esc(t.id) + ", " + esc(p) + ": " + (v || "sin rol") + '. Activar para cambiar.">' + (v || "·") + "</button></td>";
      });
      h += "<td>" + (aCount > 1 ? '<span class="doubleAwarn">' + aCount + " A</span>" : (aCount === 1 ? "OK" : "—")) + "</td></tr>";
    });
    h += '</tbody></table><p class="note">Cada clic rota: sin rol → R (Responsable de ejecutar) → A (Accountable: responsable final) → C (Consultado) → I (Informado). El PMBOK 8 pide una sola persona responsable final por actividad: las filas con más de una A se marcan en rojo.</p>';
    $("raciBody").innerHTML = h;
  }

  /* ---- riesgos ---- */
  var RISK_SCALE = { "Baja": 1, "Media": 2, "Alta": 3 };
  // Estrategias de respuesta (PMBOK): una amenaza se evita, mitiga, transfiere o acepta; una oportunidad se explota, mejora, comparte o acepta; ambas pueden escalarse.
  var RESP_THREAT = ["Evitar", "Mitigar", "Transferir", "Aceptar", "Escalar"];
  var RESP_OPP = ["Explotar", "Mejorar", "Compartir", "Aceptar", "Escalar"];
  function riskStrategy(r) {
    var first = String(r.response || "").trim().split(/[\s—–\-:.,]/)[0].toLowerCase();
    var list = r.type === "Oportunidad" ? RESP_OPP : RESP_THREAT;
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === first) return list[i];
    return "";
  }
  function riskScore(p, i) { return (RISK_SCALE[p] || 1) * (RISK_SCALE[i] || 1); }
  function riskClass(e) { return e <= 2 ? "g" : (e <= 4 ? "a" : "r"); }
  function renderRisks() {
    var h = '<table class="risktable"><caption class="sr-only">Registro de riesgos</caption><thead><tr><th scope="col">#</th><th scope="col">Riesgo</th><th scope="col">Tipo</th><th scope="col">Categoría</th><th scope="col">Prob.</th><th scope="col">Impacto</th><th scope="col">Puntaje (P×I)</th><th scope="col">Respuesta</th><th scope="col">Responsable del riesgo</th><th scope="col">Tarea vinculada</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>';
    risks.forEach(function (r) {
      var e = riskScore(r.prob, r.impact);
      var opts = '<option value="">—</option>' + tasks.map(function (t) { return '<option value="' + esc(t.id) + '"' + (r.taskId === t.id ? " selected" : "") + ">" + esc(t.id) + "</option>"; }).join("");
      h += "<tr><td>" + esc(r.id) + "</td><td>" + esc(r.desc) + "</td><td>" + esc(r.type || "Amenaza") + "</td><td>" + esc(r.category) + "</td><td>" + esc(r.prob) + "</td><td>" + esc(r.impact) + '</td><td><span class="expo ' + riskClass(e) + '">' + e + "</span></td><td>" + esc(r.response) + "</td><td>" + esc(r.owner) + '</td><td><select class="cell-input" data-change="riskTask" data-id="' + esc(r.id) + '" data-fid="rt:' + esc(r.id) + '" aria-label="Tarea vinculada al riesgo ' + esc(r.id) + '">' + opts + '</select></td><td><button type="button" class="delBtn" data-action="deleteRisk" data-id="' + esc(r.id) + '" data-fid="rd:' + esc(r.id) + '" aria-label="Eliminar el riesgo ' + esc(r.id) + '">✕</button></td></tr>';
    });
    h += '</tbody></table><p class="note">Un riesgo puede ser una amenaza (evitar, mitigar, transferir, aceptar, escalar) o una oportunidad (explotar, mejorar, compartir, aceptar, escalar). Empezá la respuesta por la estrategia elegida, por ejemplo "Mitigar — ...". Puntaje = probabilidad × impacto (escala 1 a 3 cada una), una ayuda para priorizar cada riesgo. No es la "exposición al riesgo" del proyecto, que en PMBOK es una medida agregada de todos los riesgos. Los riesgos vinculados a una tarea muestran un aviso sobre su barra en el Gantt.</p>';
    $("riskBody").innerHTML = h;
  }

  /* ---- charter ---- */
  function renderCharter() {
    var fields = CHARTER_FIELDS;
    $("charterBody").innerHTML = '<div class="charterGrid">' + fields.map(function (f) {
      return '<div class="charterField' + (f.full ? " full" : "") + '"><label for="ch_' + f.key + '">' + esc(f.label) + '</label><textarea id="ch_' + f.key + '" rows="' + (f.full ? 2 : 1) + '" data-change="charter" data-key="' + f.key + '" data-fid="ch:' + f.key + '" placeholder="' + esc(f.ph || "") + '">' + esc(charter[f.key] || "") + "</textarea></div>";
    }).join("") + "</div>";
  }

  /* ---- comunicaciones ---- */
  function renderComms() {
    $("commsBody").innerHTML = '<table class="simpletable"><caption class="sr-only">Plan de comunicaciones</caption><thead><tr><th scope="col">Parte interesada</th><th scope="col">Información</th><th scope="col">Frecuencia</th><th scope="col">Canal</th><th scope="col">Responsable</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' + comms.map(function (c) {
      return "<tr><td>" + esc(c.stakeholder) + "</td><td>" + esc(c.info) + "</td><td>" + esc(c.freq) + "</td><td>" + esc(c.channel) + "</td><td>" + esc(c.owner) + '</td><td><button type="button" class="delBtn" data-action="deleteComm" data-id="' + esc(c.id) + '" data-fid="cd:' + esc(c.id) + '" aria-label="Eliminar la fila de ' + esc(c.stakeholder) + '">✕</button></td></tr>';
    }).join("") + "</tbody></table>";
  }

  /* ---- interesados y matriz de participación ---- */
  function normName(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  function nameMatches(a, b) { a = normName(a); b = normName(b); return !!(a && b && (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0)); }
  function charterStakeholderList() {
    return String(charter.stakeholders || "").split(/[,;·]/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var m = s.match(/^(.*?)\s*\((.*?)\)\s*$/);
      return m ? { name: m[1].trim(), role: m[2].trim() } : { name: s, role: "" };
    });
  }
  function nextStkId() { var n = stakeholders.length + 1; while (stakeholders.some(function (x) { return x.id === "S" + n; })) n++; return "S" + n; }
  function renderStakeholders() {
    function sel(s, key, label, list) {
      var id = esc(s.id);
      return '<select class="cell-input" data-change="stkField" data-id="' + id + '" data-key="' + key + '" data-fid="stk:' + key + ":" + id + '" aria-label="' + label + " de " + esc(s.name || s.id) + '"><option value="">—</option>' +
        list.map(function (o) { return '<option value="' + esc(o) + '"' + (s[key] === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
    }
    function inp(s, key, label, w) {
      var id = esc(s.id);
      return '<input type="text" class="cell-input" style="width:' + w + '" value="' + esc(s[key] || "") + '" data-change="stkField" data-id="' + id + '" data-key="' + key + '" data-fid="stk:' + key + ":" + id + '" aria-label="' + label + " de " + esc(s.name || s.id) + '">';
    }
    var h = '<div class="evmActions"><button type="button" data-action="addStakeholder" data-fid="stk:add">Agregar interesado</button><button type="button" data-action="preloadStakeholders" data-fid="stk:pre">Precargar desde el acta de constitución</button></div>' +
      '<table class="simpletable"><caption class="sr-only">Registro de interesados</caption><thead><tr><th scope="col">Interesado</th><th scope="col">Rol e interés en el proyecto</th><th scope="col">Poder</th><th scope="col">Interés</th><th scope="col">Participación actual</th><th scope="col">Participación deseada</th><th scope="col">Estrategia de participación</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      (stakeholders.map(function (s) {
        return "<tr><td>" + inp(s, "name", "Nombre", "150px") + "</td><td>" + inp(s, "role", "Rol", "200px") + "</td><td>" + sel(s, "power", "Poder", LEVELS3) + "</td><td>" + sel(s, "interest", "Interés", LEVELS3) + "</td><td>" + sel(s, "engNow", "Participación actual", ENG_LEVELS) + "</td><td>" + sel(s, "engDesired", "Participación deseada", ENG_LEVELS) + "</td><td>" + inp(s, "strategy", "Estrategia", "220px") +
          '</td><td><button type="button" class="delBtn" data-action="deleteStakeholder" data-id="' + esc(s.id) + '" data-fid="stk:del:' + esc(s.id) + '" aria-label="Eliminar a ' + esc(s.name || s.id) + '">✕</button></td></tr>';
      }).join("") || '<tr><td colspan="8">Todavía no hay interesados. Usá "Precargar desde el acta de constitución" o agregalos de a uno.</td></tr>') + "</tbody></table>";
    h += '<h3 style="margin:18px 0 8px;font-size:13px">Matriz de participación</h3><table class="simpletable"><caption class="sr-only">Matriz de participación de los interesados: C es la participación actual y D la deseada</caption><thead><tr><th scope="col">Interesado</th>' +
      ENG_LEVELS.map(function (l) { return '<th scope="col">' + esc(l) + "</th>"; }).join("") + '<th scope="col">Brecha</th></tr></thead><tbody>' +
      (stakeholders.filter(function (s) { return s.engNow || s.engDesired; }).map(function (s) {
        var gap = (s.engNow && s.engDesired) ? ENG_LEVELS.indexOf(s.engDesired) - ENG_LEVELS.indexOf(s.engNow) : null;
        return "<tr><th scope=\"row\">" + esc(s.name) + "</th>" + ENG_LEVELS.map(function (l) {
          var c = s.engNow === l, d = s.engDesired === l, t = c && d ? "C y D" : (c ? "C" : (d ? "D" : ""));
          return '<td class="engcell' + (t ? " on" : "") + '">' + (t ? '<span aria-label="' + (c && d ? "actual y deseada" : (c ? "actual" : "deseada")) + '">' + t + "</span>" : "") + "</td>";
        }).join("") + "<td>" + (gap === null ? "—" : (gap === 0 ? "Sin brecha" : (gap > 0 ? "Hay que subir " + gap + " nivel(es)" : "Hay que bajar " + Math.abs(gap) + " nivel(es)"))) + "</td></tr>";
      }).join("") || '<tr><td colspan="7">Completá la participación actual y la deseada para ver la matriz.</td></tr>') + "</tbody></table>" +
      '<p class="note">C es la participación actual y D la deseada (Desconocedor, Reticente, Neutral, Partidario, Líder). Las estrategias de participación tienen que cerrar las brechas que muestra la matriz.</p>';
    $("stkBody").innerHTML = h;
  }
  function addStakeholder() {
    return askForm("Agregar interesado", [
      { key: "name", label: "Nombre o rol del interesado", value: "", required: true },
      { key: "role", label: "Rol e interés en el proyecto", value: "" }
    ], "Agregar").then(function (r) { if (!r) return; pushHistory(); stakeholders.push({ id: nextStkId(), name: r.name.trim(), role: r.role, power: "", interest: "", engNow: "", engDesired: "", strategy: "" }); render(); });
  }
  function preloadStakeholders() {
    var list = charterStakeholderList().filter(function (c) { return !stakeholders.some(function (s) { return nameMatches(s.name, c.name); }); });
    if (!list.length) { notify(charterStakeholderList().length ? "Todos los interesados del acta ya están en el registro." : "El acta no tiene partes interesadas para precargar."); return; }
    pushHistory();
    list.forEach(function (c) { stakeholders.push({ id: nextStkId(), name: c.name, role: c.role, power: "", interest: "", engNow: "", engDesired: "", strategy: "" }); });
    render();
    notify("Se agregaron " + list.length + " interesado(s) del acta. Completá poder, interés, participación y estrategia: eso es parte del análisis.");
  }

  /* ---- plan de gestión (versión 1) y Team Charter ---- */
  function renderPlan() {
    var n = filledCount(mgmtPlan, PLAN_FIELDS);
    $("planBody").innerHTML = '<p class="note" style="margin-top:0">Plan de gestión del proyecto, versión 1: cómo vas a gestionar cada área. ' + n + " de " + PLAN_FIELDS.length + " áreas completas.</p>" + renderFieldGrid("plan", PLAN_FIELDS);
  }
  function renderTeam() {
    var n = filledCount(teamCharter, TEAM_FIELDS);
    $("teamBody").innerHTML = '<p class="note" style="margin-top:0">Acuerdos del equipo del proyecto. ' + n + " de " + TEAM_FIELDS.length + " apartados completos.</p>" + renderFieldGrid("team", TEAM_FIELDS);
  }

  /* ---- control de coherencia: detecta faltantes y desajustes formales, no corrige ---- */
  function runChecks() {
    var out = [], m = computeEVM(), lt = leafTasks();
    function add(g, lvl, text) { out.push({ g: g, lvl: lvl, text: text }); }
    var G1 = 1, G2 = 2, G3 = 3;
    // --- inicio y planificación ---
    if (!String(charter.objective || "").trim()) add(G1, "miss", "El acta no tiene objetivo SMART.");
    else if (!/\d/.test(charter.objective)) add(G1, "warn", "El objetivo del acta no incluye ninguna cifra ni fecha: revisá que sea medible y tenga plazo.");
    else add(G1, "ok", "El acta tiene objetivo, con alguna cifra o fecha.");
    if (!String(charter.scopeIn || "").trim() || !String(charter.scopeOut || "").trim()) add(G1, "miss", "El alcance del acta está incompleto: tienen que figurar qué entra y qué queda fuera.");
    else add(G1, "ok", "El acta define qué entra y qué queda fuera del alcance.");
    // Las reservas son opcionales (PMBOK 8, Figura 2-25): su ausencia no es un faltante, solo se sugiere explicitarlas.
    var rc = String(charter.contingency || "").trim(), rg = String(charter.mgmtReserve || "").trim();
    if (!rc && !rg) add(G1, "warn", "El acta no menciona reservas. Son opcionales, pero conviene indicar si hay reserva de contingencia (riesgos conocidos, dentro de la línea base) y reserva de gestión (riesgos desconocidos, fuera de la línea base), o aclarar que no hay.");
    else {
      add(G1, "ok", "El acta se pronuncia sobre las reservas.");
      if (rc && rg && rc.toLowerCase() === rg.toLowerCase()) add(G1, "warn", "La reserva de contingencia y la de gestión tienen el mismo texto: son distintas en propósito y en quién autoriza su uso.");
      if (rc && !risks.length) add(G1, "warn", "Hay reserva de contingencia pero el registro de riesgos está vacío: la contingencia se asigna a riesgos conocidos e identificados.");
    }
    var ab = parseBudget(charter.budget), tb = targetBudget(), appr = approvedCostImpact();
    if (ab === null) add(G1, "warn", "El acta no tiene un presupuesto numérico para comparar con el BAC.");
    else if (Math.abs(Math.round(m.BAC - tb)) > 1) add(G1, "miss", "El BAC (" + usd(m.BAC) + ") difiere del presupuesto del acta" + (appr ? " más los cambios aprobados" : "") + " (" + usd(tb) + ") en " + usd(Math.abs(m.BAC - tb)) + ".");
    else add(G1, "ok", appr ? "El BAC coincide con el presupuesto del acta (" + usd(ab) + ") más los cambios aprobados (" + usd(appr) + ")." : "El BAC coincide con el presupuesto del acta (" + usd(ab) + ").");
    if (!stakeholders.length) add(G1, "miss", "El registro de interesados está vacío.");
    else {
      var faltan = charterStakeholderList().filter(function (c) { return !stakeholders.some(function (s) { return nameMatches(s.name, c.name); }); });
      if (faltan.length) add(G1, "warn", "Interesados del acta que no están en el registro: " + faltan.map(function (c) { return c.name; }).join(", ") + ".");
      else add(G1, "ok", "Todos los interesados del acta están en el registro.");
      var inc = stakeholders.filter(function (s) { return !(s.power && s.interest && s.engNow && s.engDesired && String(s.strategy || "").trim()); });
      if (inc.length) add(G1, "warn", inc.length + " interesado(s) sin poder, interés, participación actual, participación deseada o estrategia completos: " + inc.map(function (s) { return s.name || s.id; }).join(", ") + ".");
      else add(G1, "ok", "Los " + stakeholders.length + " interesados tienen el análisis completo.");
    }
    var np = filledCount(mgmtPlan, PLAN_FIELDS);
    if (np === 0) add(G1, "miss", "El plan de gestión (versión 1) está vacío.");
    else if (np < PLAN_FIELDS.length) add(G1, "warn", "El plan de gestión tiene " + np + " de " + PLAN_FIELDS.length + " áreas completas.");
    else add(G1, "ok", "El plan de gestión tiene sus " + PLAN_FIELDS.length + " áreas completas.");
    if (lt.length !== tasks.length) add(G1, "warn", (tasks.length - lt.length) + " tarea(s) no pertenecen a ninguna fase de la EDT.");
    else add(G1, "ok", "Todas las tareas están dentro de una fase: la EDT tiene tres niveles (proyecto, fase, tarea).");
    add(G1, "warn", "Revisá a mano que el alcance del acta se refleje en la EDT: la herramienta no puede juzgarlo.");
    // --- riesgos, comunicaciones, equipo ---
    var thr = risks.filter(function (r) { return r.type !== "Oportunidad"; }).length, opp = risks.length - thr;
    if (!risks.length) add(G2, "miss", "El registro de riesgos está vacío.");
    else {
      if (!opp) add(G2, "miss", "No hay ninguna oportunidad en el registro de riesgos (solo amenazas).");
      else if (!thr) add(G2, "miss", "No hay ninguna amenaza en el registro de riesgos (solo oportunidades).");
      else add(G2, "ok", "El registro tiene " + thr + " amenaza(s) y " + opp + " oportunidad(es).");
      var badResp = risks.filter(function (r) { return !riskStrategy(r); });
      if (badResp.length) add(G2, "warn", "La respuesta no empieza con una estrategia válida para su tipo en: " + badResp.map(function (r) { return r.id; }).join(", ") + ".");
      else add(G2, "ok", "Todas las respuestas empiezan con una estrategia válida para su tipo.");
      var noOwn = risks.filter(function (r) { return !String(r.owner || "").trim(); });
      if (noOwn.length) add(G2, "warn", "Riesgos sin responsable: " + noOwn.map(function (r) { return r.id; }).join(", ") + ".");
    }
    if (EGCI && rc) {
      var rd = reserveData();
      if (rd.cont !== null) {
        if (!rd.withData) add(G2, "warn", "Hay reserva de contingencia pero no cargaste probabilidad e impacto en USD de los riesgos: no se puede comparar con el VME.");
        else { var vv = reserveVerdict(rd.cont, rd.vmeAll); add(G2, vv.k === "ok" ? "ok" : "warn", "Contingencia declarada (" + usd(rd.cont) + ") contra el VME de las amenazas (" + usd(rd.vmeAll) + "): " + vv.t + "."); }
      }
    }
    ensureRaciPeople();
    var anyRaci = lt.some(function (t) { return raciPeople.some(function (p) { return (raciAssignments[t.id] || {})[p]; }); });
    if (!anyRaci) add(G2, "miss", "La matriz RACI está vacía.");
    else {
      var sinA = [], dobleA = [];
      lt.forEach(function (t) { var c = raciPeople.filter(function (p) { return (raciAssignments[t.id] || {})[p] === "A"; }).length; if (c === 0) sinA.push(t.id); else if (c > 1) dobleA.push(t.id); });
      if (dobleA.length) add(G2, "miss", "Actividades con más de una A en el RACI: " + dobleA.join(", ") + ".");
      if (sinA.length) add(G2, "warn", sinA.length + " actividad(es) sin A en el RACI: " + sinA.slice(0, 8).join(", ") + (sinA.length > 8 ? "…" : "") + ".");
      if (!dobleA.length && !sinA.length) add(G2, "ok", "Cada actividad del RACI tiene una sola A.");
    }
    if (!stakeholders.length) add(G2, "warn", "No se puede verificar que los interesados estén en el plan de comunicaciones: completá primero el registro de interesados.");
    else {
      var sinCom = stakeholders.filter(function (s) { return !comms.some(function (c) { return nameMatches(c.stakeholder, s.name); }); });
      if (sinCom.length) add(G2, "warn", "Interesados del registro que no aparecen en el plan de comunicaciones: " + sinCom.map(function (s) { return s.name; }).join(", ") + ".");
      else add(G2, "ok", "Todos los interesados del registro aparecen en el plan de comunicaciones.");
    }
    if (!String(teamCharter.meetings || "").trim()) add(G2, "miss", "El Team Charter no define las reuniones del proyecto.");
    var nt = filledCount(teamCharter, TEAM_FIELDS);
    if (nt === 0) add(G2, "miss", "El Team Charter está vacío.");
    else if (nt < TEAM_FIELDS.length) add(G2, "warn", "El Team Charter tiene " + nt + " de " + TEAM_FIELDS.length + " apartados completos.");
    else add(G2, "ok", "El Team Charter está completo.");
    // --- control y cierre ---
    var pe = m.planned.projectEnd;
    if (cutoffDay >= pe || cutoffDay <= 0) add(G3, "miss", "La fecha de corte del EVM cae fuera del cronograma planificado.");
    else add(G3, "ok", "La fecha de corte del EVM (" + workdayISO(cutoffDay) + ") cae dentro del cronograma.");
    if (m.acEstimated) add(G3, "warn", "No cargaste costo real: el CA se estima igual al VE y el CPI da 1. Cargá el costo real para que el EVM diga algo.");
    else add(G3, "ok", "El EVM usa costo real cargado.");
    var nl = (lessons || "").split("\n").filter(function (s) { return s.trim(); }).length;
    if (nl < 5) add(G3, "miss", "Lecciones aprendidas: " + nl + " de 5 como mínimo.");
    else add(G3, "ok", "Las lecciones aprendidas llegan al mínimo de 5 (" + nl + ").");
    if (!changeLog.length) add(G3, "miss", "El registro de cambios está vacío.");
    else add(G3, "ok", "El registro de cambios tiene " + changeLog.length + " entrada(s).");
    if (!decisionLog.length) add(G3, "miss", "El registro de decisiones está vacío.");
    else add(G3, "ok", "El registro de decisiones tiene " + decisionLog.length + " entrada(s).");
    var ncr = filledCount(changeRequest, CR_FIELDS);
    if (ncr === 0) add(G3, "miss", "La solicitud de cambio está vacía.");
    else if (ncr < CR_FIELDS.length) add(G3, "warn", "La solicitud de cambio tiene " + ncr + " de " + CR_FIELDS.length + " campos completos.");
    else add(G3, "ok", "La solicitud de cambio está completa.");
    var odi = issues.filter(function (x) { return x.status !== "Cerrado" && x.due && x.due < cutoffISO(); });
    if (odi.length) add(G3, "warn", odi.length + " problema(s) o acción(es) vencidos a la fecha de corte: " + odi.map(function (x) { return x.id; }).join(", ") + ".");
    var pcr = crList.filter(function (x) { return x.status === "Pendiente"; });
    if (pcr.length) add(G3, "warn", pcr.length + " solicitud(es) de cambio pendiente(s) de decisión: " + pcr.map(function (x) { return x.id; }).join(", ") + ".");
    add(G3, "warn", "Revisá a mano que el informe final sea coherente con el acta: el alcance, el presupuesto y los riesgos tienen que reaparecer.");
    return out;
  }
  // Los textos del acta, del Team Charter, etc. no redibujan la pantalla al editarse (para no perder el clic siguiente); el control de coherencia sí se refresca.
  function refreshChecks() { if (panelsOn.check) renderChecks(); }
  function renderChecks() {
    var list = runChecks(), tag = { ok: "Cumple", warn: "Revisar", miss: "Falta" };
    var titles = { 1: EGCI ? "Entrega 1 (E1): acta, interesados, plan de gestión y EDT" : "Inicio y planificación", 2: EGCI ? "Entrega 2 (E2): riesgos, comunicaciones, Team Charter y RACI" : "Riesgos, comunicaciones y equipo", 3: EGCI ? "TI final: EVM, cambios, decisiones y cierre" : "Control y cierre" };
    var cnt = { ok: 0, warn: 0, miss: 0 }; list.forEach(function (c) { cnt[c.lvl]++; });
    var h = '<p class="note" style="margin-top:0">' + cnt.ok + " cumplen, " + cnt.warn + " para revisar y " + cnt.miss + " faltan.</p>";
    [1, 2, 3].forEach(function (g) {
      h += '<h3 style="margin:14px 0 6px;font-size:13px">' + titles[g] + '</h3><ul class="checkList">' + list.filter(function (c) { return c.g === g; }).map(function (c) {
        return '<li class="chk ' + c.lvl + '"><span class="tag">' + tag[c.lvl] + "</span> " + esc(c.text) + "</li>";
      }).join("") + "</ul>";
    });
    h += '<p class="note">Esta lista detecta faltantes y desajustes formales; no corrige ni evalúa la calidad de lo que escribiste. La integración entre documentos (que el alcance se refleje en la EDT, que los riesgos reaparezcan en el cierre) la mira la corrección.</p>';
    $("checkBody").innerHTML = h;
  }

  /* ---- kanban ---- */
  function renderKanban() {
    var lt = leafTasks();
    function col(title, list) {
      return '<div class="kanbanCol"><h3>' + title + " (" + list.length + ")</h3>" + list.map(function (t) {
        return '<button type="button" class="kanbanCard' + (t.critical ? " crit" : "") + '" data-action="cycleKanban" data-id="' + esc(t.id) + '" data-fid="kb:' + esc(t.id) + '" aria-label="Tarea ' + esc(t.id) + " " + esc(t.name) + ". Activar para moverla de columna.\"><b>" + esc(t.id) + "</b> " + esc(t.name) + "<small>" + esc(t.resource || "") + " · " + t.dur + "d</small></button>";
      }).join("") + "</div>";
    }
    $("kanbanBody").innerHTML = '<div class="kanbanBoard">' + col("Por hacer", lt.filter(function (t) { return t.pct === 0; })) + col("En curso", lt.filter(function (t) { return t.pct > 0 && t.pct < 100; })) + col("Hecho", lt.filter(function (t) { return t.pct === 100; })) +
      '</div><p class="note">Activar una tarjeta la mueve: Por hacer → En curso (50%) → Hecho (100%) → Por hacer. Son los mismos datos del Gantt, vistos con lógica ágil.</p><button type="button" data-action="exportCsv" data-fid="csvKanban">Descargar CSV para Trello</button>';
  }

  /* ---- cierre ---- */
  function renderCloseLogs() {
    $("changeLogBody").innerHTML = '<table class="simpletable"><caption class="sr-only">Registro de cambios</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Cambio</th><th scope="col">Impacto</th><th scope="col">Estado</th><th scope="col">Aprobado por</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' + changeLog.map(function (c) {
      return "<tr><td>" + esc(c.fecha) + "</td><td>" + esc(c.desc) + "</td><td>" + esc(c.impacto) + "</td><td>" + esc(c.estado) + "</td><td>" + esc(c.aprobadoPor) + '</td><td><button type="button" class="delBtn" data-action="deleteChange" data-id="' + esc(c.id) + '" data-fid="chd:' + esc(c.id) + '" aria-label="Eliminar el cambio ' + esc(c.id) + '">✕</button></td></tr>';
    }).join("") + "</tbody></table>";
    $("decisionLogBody").innerHTML = '<table class="simpletable"><caption class="sr-only">Registro de decisiones</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Decisión</th><th scope="col">Contexto</th><th scope="col">Responsable</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' + decisionLog.map(function (d) {
      return "<tr><td>" + esc(d.fecha) + "</td><td>" + esc(d.decision) + "</td><td>" + esc(d.contexto) + "</td><td>" + esc(d.responsable) + '</td><td><button type="button" class="delBtn" data-action="deleteDecision" data-id="' + esc(d.id) + '" data-fid="dd:' + esc(d.id) + '" aria-label="Eliminar la decisión ' + esc(d.id) + '">✕</button></td></tr>';
    }).join("") + "</tbody></table>";
    var li = $("lessonsInput"); if (document.activeElement !== li) li.value = lessons;
    if ($("crBody") && !($("crBody").contains(document.activeElement))) $("crBody").innerHTML = renderFieldGrid("cr", CR_FIELDS);
  }
  function lessonsList() { return (lessons || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean); }
  // El informe final solo ordena lo que la persona registró: lecciones, decisiones y cambios van tal cual los escribió.
  function renderInformeCierre() {
    var box = $("cierreBox"), n = lessonsList().length;
    if (n < 5) {
      box.hidden = false; box.dataset.ready = "0";
      box.textContent = "Todavía no se puede armar el informe final: escribiste " + n + " lección(es) aprendida(s) y el mínimo es 5. El informe ordena lo que registraste en el cierre; el análisis y las lecciones tienen que ser tuyos.";
      return;
    }
    box.hidden = false; box.dataset.ready = "1"; box.textContent = buildInformeText();
  }
  function buildInformeText() {
    var m = computeEVM(), res = computeSchedule(tasks), projectEnd = res.projectEnd;
    var plannedEnd = m.planned.projectEnd, deltaDays = projectEnd - plannedEnd;
    var list = lessonsList();
    var idx = function (n) { return isFinite(n) ? n.toFixed(2) : "—"; };
    var txt = "INFORME FINAL — " + (CASOS[currentProjectId] ? CASOS[currentProjectId].title : "") + "\n" +
      "Patrocinador: " + (charter.sponsor || "—") + " · Presupuesto autorizado (acta de constitución): " + (charter.budget || "—") + "\n\n" +
      "1. RESUMEN EJECUTIVO\n" +
      "Inicio planificado: " + startDateValue() + " · Inicio real: " + (actualStart || "— no registrado —") + "\n" +
      "Fin planificado: " + plannedFinishDate() + " · Fin real: " + (actualFinish || "— no registrado —") + "\n" +
      "Duración de la línea base (" + m.planned.label + "): " + plannedEnd + " días hábiles. Duración recalculada: " + projectEnd + " días hábiles (" + (deltaDays > 0 ? "+" : "") + deltaDays + "d vs. línea base).\n" +
      "Costos calculados contra la misma línea base que el panel de valor ganado (" + m.planned.label + "):\n" +
      "Presupuesto al cierre (BAC): " + usd(m.BAC) + " · Costo real (CA): " + usd(m.AC) + (m.acEstimated ? " (estimado = VE, sin costo real cargado)" : "") + " · Estimación al cierre (EAC): " + usd(m.EAC) + " · CPI: " + idx(m.CPI) + " · SPI: " + idx(m.SPI) + "\n" +
      budgetNote(m) + "\n\n" +
      "2. RIESGOS REGISTRADOS (" + risks.length + ")\n" + (risks.map(function (r) { return "- [" + (r.type || "Amenaza") + " · " + r.category + "] " + r.desc + " — puntaje P×I " + riskScore(r.prob, r.impact) + "/9, respuesta: " + r.response; }).join("\n") || "— sin riesgos cargados —") + "\n\n" +
      "3. CAMBIOS (" + changeLog.length + ")\n" + (changeLog.map(function (c) { return "- " + c.fecha + " · " + c.desc + " — impacto: " + (c.impacto || "—") + " — " + c.estado + " (aprobado por: " + (c.aprobadoPor || "—") + ")"; }).join("\n") || "— sin cambios registrados —") + "\n\n" +
      "4. DECISIONES (" + decisionLog.length + ")\n" + (decisionLog.map(function (d) { return "- " + d.fecha + " · " + d.decision + " — contexto: " + (d.contexto || "—") + " (responsable: " + (d.responsable || "—") + ")"; }).join("\n") || "— sin decisiones registradas —") + "\n\n" +
      (issues.length ? "5. PROBLEMAS Y ACCIONES (" + issues.length + ")\n" + issues.map(function (x) { return "- [" + x.type + " · " + x.status + "] " + x.id + " " + x.desc + " — responsable: " + (x.owner || "—") + (x.due ? ", límite " + x.due : "") + (x.taskId ? " (tarea " + x.taskId + ")" : ""); }).join("\n") + "\n\n" : "") +
      (issues.length ? "6" : "5") + ". LECCIONES APRENDIDAS (" + list.length + ")\n" + list.map(function (l, i) { return (i + 1) + ". " + l; }).join("\n") + "\n\n" +
      (issues.length ? "7" : "6") + ". CIERRE FORMAL\nTareas al 100%: " + tasks.filter(function (t) { return t.pct === 100; }).length + " de " + tasks.length + ".\n\n" + CONFIG.ATTRIBUTION;
    return txt;
  }
  function copyInforme() {
    var box = $("cierreBox");
    if (box.hidden || box.dataset.ready !== "1") { notify("Primero generá el informe (hacen falta 5 lecciones aprendidas como mínimo)."); return; }
    if (!navigator.clipboard) { notify("Tu navegador no permite copiar automáticamente. Seleccioná el texto manualmente."); return; }
    navigator.clipboard.writeText(box.textContent).then(function () { notify("Informe copiado al portapapeles."); }, function () { notify("No se pudo copiar automáticamente. Seleccioná el texto manualmente."); });
  }

  /* ---- feriados y calendario ---- */
  function renderHolidays() {
    var countries = Object.keys(FERIADOS), set = FERIADOS[holidayCountry];
    var years = []; var y0 = yearOf(startDateValue()); for (var y = y0 - 1; y <= y0 + 3; y++) years.push(y);
    var copts = countries.map(function (c) { return '<option value="' + c + '"' + (c === holidayCountry ? " selected" : "") + ">" + esc(FERIADOS[c].nombre) + "</option>"; }).join("") + '<option value="__otro__"' + (holidayCountry === "__otro__" ? " selected" : "") + ">Otro país (pegar lista)</option>";
    var yopts = years.map(function (yy) { return '<option value="' + yy + '"' + (yy === holidayYear ? " selected" : "") + ">" + yy + "</option>"; }).join("");
    var avail = set && set.anios && set.anios[holidayYear];
    var shown = holidays.filter(function (h) { return yearOf(h) === holidayYear; });
    var months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    $("holidayBody").innerHTML =
      '<p class="note" style="margin-top:0"><b>Importante:</b> los feriados son una ayuda y pueden cambiar (traslados, puentes, decretos). Verificalos con la fuente oficial de cada país y año antes de usar el cronograma.</p>' +
      '<div class="holidayCtl"><label for="holCountry">País</label><select id="holCountry" data-change="holCountry" data-fid="hol:c">' + copts + '</select><label for="holYear">Año</label><select id="holYear" data-change="holYear" data-fid="hol:y">' + yopts + "</select>" +
      '<button type="button" data-action="loadHolidayPreset" data-fid="hol:load">Cargar lista de ' + esc(set ? set.nombre : "este país") + " " + holidayYear + '</button><button type="button" data-action="pasteHolidays" data-fid="hol:paste">Pegar lista de fechas</button><button type="button" data-action="addHoliday" data-fid="hol:add">+ Agregar feriado</button><button type="button" class="danger" data-action="clearHolidays" data-fid="hol:clear">Quitar todos</button></div>' +
      (!avail ? '<p class="banner" style="margin:0 0 10px;border:1px solid var(--gantt-near)">Falta el dato: no hay una lista precargada de feriados de ' + esc(set ? set.nombre : "este país") + " para " + holidayYear + ". Pegá la lista oficial con \"Pegar lista de fechas\" o agregalos de a uno.</p>" : (set && set.fuente ? '<p class="note" style="margin-top:0">' + esc(set.fuente) + "</p>" + (set.notas && set.notas[holidayYear] ? '<p class="note" style="margin-top:0">' + esc(set.notas[holidayYear]) + "</p>" : "") : "")) +
      '<h3 style="font-size:13px;margin:6px 0">Feriados cargados en ' + holidayYear + " (" + shown.length + ')</h3><div class="holidayList">' + (shown.map(function (h) {
        var p = h.split("-");
        return '<span class="holidayChip">' + parseInt(p[2], 10) + " " + months[parseInt(p[1], 10) - 1] + " " + p[0] + '<button type="button" data-action="deleteHoliday" data-date="' + esc(h) + '" data-fid="hd:' + esc(h) + '" aria-label="Quitar el feriado ' + esc(h) + '">✕</button></span>';
      }).join("") || '<span class="note">Ninguno cargado para este año.</span>') + "</div>";
  }

  /* ===================== mejoras para el trabajo diario del PM ===================== */
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(n) ? null : n; }
  function cutoffISO() { return workdayISO(cutoffDay); }
  function idx2(n) { return isFinite(n) ? n.toFixed(2) : "—"; }
  function lightOf(v, ok, warn) { return v >= ok ? "verde" : (v >= warn ? "ámbar" : "rojo"); }
  function lightClass(l) { return l === "verde" ? "ok" : (l === "ámbar" ? "warn" : (l === "rojo" ? "bad" : "na")); }
  function caseTitle() { return CASOS[currentProjectId] ? CASOS[currentProjectId].title : ""; }
  function isThreat(r) { return r.type !== "Oportunidad"; }
  function isOpenRisk(r) { return !r.status || r.status === "Abierto"; }
  function dl(name, mime, content) {
    var blob = new Blob([content], { type: mime }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---- 1. informe de estado semanal ---- */
  // Una tarea está atrasada si, a la fecha de corte, tendría que llevar al menos 10 puntos más de avance que el que tiene (contra la línea base vigente).
  function statusData() {
    var m = computeEVM(), cut = cutoffDay, late = [], critLate = [];
    leafTasks().forEach(function (t) {
      var pr = m.planned.schedule[t.id] || { es: t._es, ef: t._ef, dur: t.dur };
      var exp = pr.dur > 0 ? Math.max(0, Math.min(100, (cut - pr.es) / pr.dur * 100)) : (pr.es < cut ? 100 : 0);
      if (exp - t.pct >= 10) { var row = { t: t, exp: Math.round(exp) }; late.push(row); if (t.critical) critLate.push(row); }
    });
    var thr = risks.filter(function (r) { return isThreat(r) && isOpenRisk(r); }).map(function (r) { return { r: r, sc: riskScore(r.prob, r.impact) }; }).sort(function (a, b) { return b.sc - a.sc; });
    var today = cutoffISO(), openIssues = issues.filter(function (x) { return x.status !== "Cerrado"; });
    var overdue = openIssues.filter(function (x) { return x.due && x.due < today; });
    var sched = m.PV > 0 ? lightOf(m.SPI, 0.95, 0.85) : "sin dato";
    var cost = m.acEstimated ? "sin dato" : lightOf(m.CPI, 0.95, 0.85);
    var rk = !thr.length ? (risks.length ? "verde" : "sin dato") : (riskClass(thr[0].sc) === "r" ? "rojo" : (riskClass(thr[0].sc) === "a" ? "ámbar" : "verde"));
    var approved = changeLog.filter(function (c) { return c.estado === "Aprobado"; });
    return { m: m, late: late, critLate: critLate, thr: thr, openIssues: openIssues, overdue: overdue, sched: sched, cost: cost, rk: rk, approved: approved, today: today };
  }
  function listLines(arr, max) { return arr.slice(0, max).join("\n") + (arr.length > max ? "\n… y " + (arr.length - max) + " más" : ""); }
  function statusRows(d) {
    var m = d.m;
    return [
      ["Fecha de corte", d.today],
      ["Estado del cronograma", d.sched.toUpperCase() + (m.PV > 0 ? " · SPI " + idx2(m.SPI) : "")],
      ["Estado del costo", d.cost.toUpperCase() + (m.acEstimated ? " · falta cargar el costo real" : " · CPI " + idx2(m.CPI))],
      ["Estado de los riesgos", d.rk.toUpperCase() + (d.thr.length ? " · " + d.thr.length + " amenaza(s) abierta(s), la más alta con puntaje " + d.thr[0].sc + "/9" : "")],
      ["Avance planificado / real", pct(m.PV, m.BAC) + " / " + pct(m.EV, m.BAC)],
      ["BAC", usd(m.BAC)], ["VP (valor planificado)", usd(m.PV)], ["VE (valor ganado)", usd(m.EV)],
      ["CA (costo real)", usd(m.AC) + (m.acEstimated ? " — estimado igual al VE, sin costo real cargado" : "")],
      ["CPI / SPI", idx2(m.CPI) + " / " + idx2(m.SPI)], ["CV / SV", usd(m.CV) + " / " + usd(m.SV)], ["EAC / VAC", usd(m.EAC) + " / " + usd(m.VAC)],
      ["Ruta crítica", tasks.filter(function (t) { return t.critical; }).map(function (t) { return t.id; }).join(", ") || "—"],
      ["Tareas críticas atrasadas (" + d.critLate.length + ")", d.critLate.length ? listLines(d.critLate.map(function (x) { return x.t.id + " " + x.t.name + ": " + x.t.pct + "% real, " + x.exp + "% esperado"; }), 6) : "Ninguna"],
      ["Otras tareas atrasadas (" + (d.late.length - d.critLate.length) + ")", d.late.length - d.critLate.length ? listLines(d.late.filter(function (x) { return !x.t.critical; }).map(function (x) { return x.t.id + " " + x.t.name; }), 6) : "Ninguna"],
      ["Riesgos más altos", d.thr.length ? listLines(d.thr.slice(0, 3).map(function (x) { return x.r.id + " (" + x.sc + "/9): " + x.r.desc; }), 3) : "Sin amenazas abiertas"],
      ["Cambios aprobados (" + d.approved.length + ")", d.approved.length ? listLines(d.approved.map(function (c) { return c.fecha + " · " + c.desc + (c.impacto ? " (" + c.impacto + ")" : ""); }), 5) : "Ninguno"],
      ["Problemas abiertos / acciones vencidas", d.openIssues.length + " / " + d.overdue.length + (d.overdue.length ? "\n" + listLines(d.overdue.map(function (x) { return x.id + " " + x.desc + " (límite " + x.due + ", " + (x.owner || "sin responsable") + ")"; }), 4) : "")],
      ["Línea base usada", m.planned.label]
    ];
  }
  function buildStatusText() {
    var d = statusData(), m = d.m, t = caseTitle(), L = [];
    L.push("Asunto: Informe de estado — " + t + " — corte al " + d.today, "");
    L.push("Estado general: cronograma " + d.sched.toUpperCase() + ", costo " + d.cost.toUpperCase() + ", riesgos " + d.rk.toUpperCase() + ".");
    L.push("Avance: " + pct(m.EV, m.BAC) + " real contra " + pct(m.PV, m.BAC) + " planificado. SPI " + idx2(m.SPI) + ", CPI " + idx2(m.CPI) + (m.acEstimated ? " (sin costo real cargado, el costo no es informativo)" : "") + ".", "");
    L.push("Cronograma: " + (d.critLate.length ? d.critLate.length + " tarea(s) crítica(s) atrasada(s): " + d.critLate.slice(0, 4).map(function (x) { return x.t.id + " " + x.t.name; }).join("; ") + "." : "ninguna tarea crítica atrasada.") + (d.late.length - d.critLate.length ? " Otras tareas atrasadas: " + (d.late.length - d.critLate.length) + "." : ""));
    L.push("Costo: BAC " + usd(m.BAC) + ", valor ganado " + usd(m.EV) + ", costo real " + usd(m.AC) + (m.acEstimated ? " (estimado)" : "") + ", estimación al cierre " + usd(m.EAC) + ".");
    L.push("Riesgos: " + (d.thr.length ? d.thr.slice(0, 3).map(function (x) { return x.r.id + " (" + x.sc + "/9) " + x.r.desc; }).join("; ") + "." : "sin amenazas abiertas."));
    L.push("Cambios aprobados: " + (d.approved.length ? d.approved.map(function (c) { return c.desc; }).join("; ") + "." : "ninguno."));
    L.push("Problemas y acciones: " + d.openIssues.length + " abierto(s)" + (d.overdue.length ? ", " + d.overdue.length + " vencido(s): " + d.overdue.slice(0, 4).map(function (x) { return x.id + " " + x.desc; }).join("; ") : "") + ".", "");
    L.push(CONFIG.ATTRIBUTION);
    return L.join("\n");
  }
  function renderStatusPanel() {
    var d = statusData(), m = d.m;
    var card = function (label, light, detail) { return '<div class="stCard st-' + lightClass(light) + '"><div class="v">' + esc(light.toUpperCase()) + '</div><div class="l">' + esc(label) + '</div><div class="d">' + esc(detail) + "</div></div>"; };
    $("statusBody").innerHTML = '<p class="note" style="margin-top:0">Se calcula con la fecha de corte del panel de valor ganado (' + esc(d.today) + ') y la línea base ' + esc(m.planned.label) + '. Semáforo de cronograma y de costo: verde desde 0,95, ámbar desde 0,85, rojo por debajo. Semáforo de riesgos: según el puntaje más alto de las amenazas abiertas. Una tarea cuenta como atrasada si, a la fecha de corte, tendría que llevar al menos 10 puntos más de avance que el que tiene.</p>' +
      '<div class="stGrid">' + card("Cronograma", d.sched, m.PV > 0 ? "SPI " + idx2(m.SPI) : "sin valor planificado") + card("Costo", d.cost, m.acEstimated ? "cargá el costo real" : "CPI " + idx2(m.CPI)) + card("Riesgos", d.rk, d.thr.length ? "puntaje máximo " + d.thr[0].sc + "/9" : "sin amenazas abiertas") + "</div>" +
      '<div class="evmActions"><button type="button" data-action="copyStatus" data-fid="st:copy">Copiar texto para el correo</button><button type="button" class="primary" data-action="exportStatusPdf" data-fid="st:pdf">Exportar PDF de una página</button></div>' +
      '<div id="statusBox" class="cierreBox">' + esc(buildStatusText()) + "</div>" +
      '<h3 style="margin:16px 0 8px;font-size:13px">Detalle del informe</h3>' + tblHtml(["Indicador", "Valor"], statusRows(d));
  }
  function copyStatus() {
    if (!navigator.clipboard) { notify("Tu navegador no permite copiar automáticamente. Seleccioná el texto manualmente."); return; }
    navigator.clipboard.writeText(buildStatusText()).then(function () { track("exportar_informe_estado", { formato: "texto", caso_id: currentProjectId }); notify("Informe copiado: pegalo en el cuerpo del correo."); }, function () { notify("No se pudo copiar automáticamente. Seleccioná el texto manualmente."); });
  }
  function exportStatusPdf() {
    var d = statusData();
    $("printArea").innerHTML = '<div class="onepage"><h1>Informe de estado — ' + esc(caseTitle()) + '</h1><div class="sub">Corte al ' + esc(d.today) + " · Patrocinador: " + esc(charter.sponsor || "—") + " · Generado " + esc(dateToISO(new Date())) + "</div>" + tblHtml(["Indicador", "Valor"], statusRows(d)) + '<div class="attribPrint">' + esc(CONFIG.ATTRIBUTION) + "</div></div>";
    var prev = document.title; document.title = "Informe_estado_" + currentProjectId + "_" + d.today;
    window.addEventListener("afterprint", function () { document.title = prev; }, { once: true });
    track("exportar_informe_estado", { formato: "pdf", caso_id: currentProjectId });
    notify("En el cuadro de impresión elegí \"Guardar como PDF\".");
    setTimeout(function () { window.print(); }, 200);
  }

  /* ---- 3. registro de problemas y acciones ---- */
  var ISSUE_STATUS = ["Abierto", "En curso", "Cerrado"];
  function nextIssueId(type) { var p = type === "Acción" ? "AC" : "PR", n = 1; while (issues.some(function (x) { return x.id === p + n; })) n++; return p + n; }
  function addIssue() {
    var none = "(ninguna)";
    return askForm("Agregar problema o acción", [
      { key: "type", label: "Tipo", type: "select", options: ["Problema", "Acción"], value: "Problema", hint: "Problema: algo que ya ocurrió y hay que resolver (un riesgo que ocurrió pasa a ser un problema). Acción: algo que una persona tiene que hacer." },
      { key: "desc", label: "Descripción", value: "", required: true },
      { key: "owner", label: "Responsable", value: "PM" },
      { key: "due", label: "Fecha límite (opcional)", type: "date", value: "" },
      { key: "taskId", label: "Tarea vinculada", type: "select", options: [none].concat(tasks.map(function (t) { return t.id; })), value: none }
    ], "Agregar").then(function (r) {
      if (!r) return; pushHistory();
      issues.push({ id: nextIssueId(r.type), type: r.type, desc: r.desc.trim(), owner: r.owner || "PM", due: r.due || "", status: "Abierto", taskId: r.taskId === none ? "" : r.taskId });
      render();
    });
  }
  function renderIssuesPanel() {
    var today = cutoffISO(), open = issues.filter(function (x) { return x.status !== "Cerrado"; }), late = open.filter(function (x) { return x.due && x.due < today; });
    function inp(x, key, label, w, type) { return '<input type="' + (type || "text") + '" class="cell-input" style="width:' + w + '" value="' + esc(x[key] || "") + '" data-change="issueField" data-id="' + esc(x.id) + '" data-key="' + key + '" data-fid="is:' + key + ":" + esc(x.id) + '" aria-label="' + label + " de " + esc(x.id) + '">'; }
    function sel(x, key, label, list) { return '<select class="cell-input" data-change="issueField" data-id="' + esc(x.id) + '" data-key="' + key + '" data-fid="is:' + key + ":" + esc(x.id) + '" aria-label="' + label + " de " + esc(x.id) + '">' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (x[key] === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; }
    var taskOpts = [["", "—"]].concat(tasks.map(function (t) { return [t.id, t.id]; })), stOpts = ISSUE_STATUS.map(function (s) { return [s, s]; });
    var h = '<p class="note" style="margin-top:0">' + open.length + " abierto(s), " + late.length + " vencido(s) a la fecha de corte (" + esc(today) + "), " + (issues.length - open.length) + ' cerrado(s). Un problema ya ocurrió; un riesgo que se materializa pasa acá. Este registro alimenta el informe de estado y sirve de insumo al escribir las lecciones aprendidas: las lecciones las redactás vos.</p>' +
      '<div class="evmActions"><button type="button" data-action="addIssue" data-fid="is:add">Agregar problema o acción</button></div>' +
      '<table class="simpletable"><caption class="sr-only">Registro de problemas y acciones</caption><thead><tr><th scope="col">ID</th><th scope="col">Tipo</th><th scope="col">Descripción</th><th scope="col">Responsable</th><th scope="col">Fecha límite</th><th scope="col">Estado</th><th scope="col">Tarea</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      (issues.map(function (x) {
        var isLate = x.status !== "Cerrado" && x.due && x.due < today;
        return '<tr class="' + (isLate ? "issueLate" : "") + '"><td>' + esc(x.id) + "</td><td>" + esc(x.type) + "</td><td>" + inp(x, "desc", "Descripción", "260px") + "</td><td>" + inp(x, "owner", "Responsable", "110px") + "</td><td>" + inp(x, "due", "Fecha límite", "130px", "date") + (isLate ? ' <b class="issueTag">Vencido</b>' : "") + "</td><td>" + sel(x, "status", "Estado", stOpts) + "</td><td>" + sel(x, "taskId", "Tarea vinculada", taskOpts) +
          '</td><td><button type="button" class="delBtn" data-action="deleteIssue" data-id="' + esc(x.id) + '" data-fid="is:del:' + esc(x.id) + '" aria-label="Eliminar ' + esc(x.id) + '">✕</button></td></tr>';
      }).join("") || '<tr><td colspan="8">Todavía no hay problemas ni acciones registrados.</td></tr>') + "</tbody></table>";
    h += '<h3 style="margin:18px 0 8px;font-size:13px">Decisiones registradas (se cargan en el panel de cierre)</h3><table class="simpletable"><caption class="sr-only">Decisiones registradas</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Decisión</th><th scope="col">Responsable</th></tr></thead><tbody>' +
      (decisionLog.map(function (d) { return "<tr><td>" + esc(d.fecha) + "</td><td>" + esc(d.decision) + "</td><td>" + esc(d.responsable) + "</td></tr>"; }).join("") || '<tr><td colspan="3">Sin decisiones registradas.</td></tr>') + "</tbody></table>";
    $("issuesBody").innerHTML = h;
  }

  /* ---- 5. estimación de tres puntos (PERT) y probabilidad de cumplir la fecha ---- */
  var simResult = null;
  function hasThree(t) { return isNum(t.opt) && isNum(t.pess); }
  function pertExpected(t) { return hasThree(t) ? (t.opt + 4 * t.dur + t.pess) / 6 : t.dur; }
  function pertSd(t) { return hasThree(t) ? (t.pess - t.opt) / 6 : 0; }
  function threeOk(t) { return !hasThree(t) || (t.opt <= t.dur && t.dur <= t.pess); }
  function normCdf(z) { // aproximación de Abramowitz y Stegun, error menor a 1,5e-7
    var s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2, p = 0.3275911, tt = 1 / (1 + p * x);
    var y = 1 - (((((1.061405429 * tt - 1.453152027) * tt) + 1.421413741) * tt - 0.284496736) * tt + 0.254829592) * tt * Math.exp(-x * x);
    return 0.5 * (1 + s * y);
  }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function triSample(u, a, c, b) { if (b <= a) return a; c = Math.min(Math.max(c, a), b); var fc = (c - a) / (b - a); return u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c)); }
  function commitDay() { return dayOffsetFromDate(plannedFinishDate()) + 1; } // fin comprometido, en días hábiles desde el inicio (límite exclusivo)
  // PERT sobre la red: se calcula el cronograma con la duración esperada de cada tarea; el desvío estándar sale de las tareas críticas de esa red.
  function pertAnalysis() {
    computeSchedule(tasks);
    var list = cloneTasks(tasks);
    list.forEach(function (t) { t.dur = pertExpected(taskById(t.id)); });
    var res = computeScheduleOn(list), crit = list.filter(function (t) { return Math.abs(t.slack) < 1e-6 && !t.cycleError; });
    var variance = crit.reduce(function (s, t) { var sd = pertSd(taskById(t.id)); return s + sd * sd; }, 0), sd = Math.sqrt(variance), E = res.projectEnd, commit = commitDay();
    var P = sd > 0 ? normCdf((commit - E) / sd) : (E <= commit + 1e-9 ? 1 : 0);
    return { E: E, sd: sd, P: P, commit: commit, date: workdayISO(Math.max(0, Math.ceil(E - 1e-9) - 1)), critIds: crit.map(function (t) { return t.id; }) };
  }
  function threeSignature() {
    return JSON.stringify(tasks.map(function (t) { return [t.id, t.dur, t.opt, t.pess, t.preds, t.deps, t.levelDelay, t.overlapDays]; })) + "|" + commitDay() + "|" + startDateValue() + "|" + holidays.length;
  }
  // Simulación: cada tarea toma una duración al azar entre optimista y pesimista (distribución triangular con la probable como moda); se recalcula la red completa cada vez.
  function runSimulation() {
    var list = cloneTasks(tasks), n = 3000, rnd = mulberry32(20261010), ends = [], commit = commitDay();
    if (!list.some(hasThree)) { notify("Cargá al menos una tarea con duración optimista y pesimista para simular."); return; }
    list.forEach(function (t) { t._m = t.dur; });
    for (var i = 0; i < n; i++) {
      list.forEach(function (t) { t.dur = hasThree(t) ? Math.max(0, Math.round(triSample(rnd(), t.opt, t._m, t.pess))) : t._m; });
      ends.push(computeScheduleOn(list).projectEnd);
    }
    ends.sort(function (a, b) { return a - b; });
    var q = function (p) { return workdayISO(Math.max(0, ends[Math.min(n - 1, Math.floor(p * n))] - 1)); };
    var ok = ends.filter(function (e) { return e <= commit; }).length;
    simResult = { sig: threeSignature(), n: n, P: ok / n, p50: q(0.5), p80: q(0.8), p90: q(0.9) };
    track("simular_fecha", { caso_id: currentProjectId });
    render();
  }
  function renderThreePanel() {
    var lt = leafTasks().filter(function (t) { return t.dur > 0; }), any = lt.some(hasThree), pa = pertAnalysis(), plannedEnd = plannedFinishDate();
    var pc = function (p) { return (p * 100).toFixed(0) + " %"; };
    var card = function (v, l, warn) { return '<div class="evmCard' + (warn ? " warn" : "") + '"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>"; };
    var h = '<p class="note" style="margin-top:0">Duración probable = la duración de la tabla de tareas. Cargá la optimista y la pesimista de las tareas que más incertidumbre tienen (las demás se toman como fijas). Duración esperada de cada tarea = (optimista + 4 × probable + pesimista) ÷ 6; desvío estándar = (pesimista − optimista) ÷ 6. La fecha comprometida es el fin planificado: <b>' + esc(plannedEnd) + "</b>.</p>";
    if (any) {
      h += '<div class="evmGrid">' + card(esc(pa.date), "Fin esperado (PERT)", pa.E - 1e-9 > pa.commit) + card(pa.E.toFixed(1) + " d", "Duración esperada del proyecto") + card(pa.sd.toFixed(1) + " d", "Desvío estándar (tareas críticas)") + card(pc(pa.P), "Probabilidad de cumplir la fecha (PERT, distribución normal)", pa.P < 0.5) + "</div>";
      var fresh = simResult && simResult.sig === threeSignature();
      h += '<div class="evmActions"><button type="button" class="primary" data-action="runSim" data-fid="th:sim">' + (fresh ? "Recalcular simulación" : "Simular fecha de fin (3.000 corridas)") + "</button></div>";
      if (fresh) h += '<div class="evmGrid">' + card(pc(simResult.P), "Probabilidad de cumplir la fecha (simulación)", simResult.P < 0.5) + card(esc(simResult.p50), "Fin con 50 % de confianza") + card(esc(simResult.p80), "Fin con 80 % de confianza") + card(esc(simResult.p90), "Fin con 90 % de confianza") + "</div>";
      else if (simResult) h += '<p class="banner" role="status" style="border:1px solid var(--gantt-near)">La simulación quedó desactualizada: cambiaste duraciones, dependencias o la fecha comprometida. Volvé a simularla.</p>';
      h += '<p class="note">El PERT suma lo que pasa en las tareas críticas de la red con duraciones esperadas y supone independencia entre tareas. La simulación recalcula la red completa miles de veces, así que también captura las rutas casi críticas que pueden pasar a ser críticas. Los dos métodos suponen tareas independientes y estimaciones razonables: si las estimaciones son optimistas, la probabilidad también lo es.</p>';
    } else h += '<p class="banner" role="status" style="border:1px solid var(--gantt-near)">Todavía no cargaste ninguna estimación de tres puntos. Cargá optimista y pesimista en al menos una tarea para ver la probabilidad de cumplir la fecha.</p>';
    h += '<div class="evmActions"><button type="button" data-action="threeExample" data-fid="th:ex">Cargar un rango de ejemplo en la ruta crítica (−20 % / +50 %)</button><button type="button" data-action="threeClear" data-fid="th:clr">Borrar todas las estimaciones</button></div>';
    h += '<table class="simpletable"><caption class="sr-only">Estimaciones de tres puntos por tarea</caption><thead><tr><th scope="col">Tarea</th><th scope="col">Optimista</th><th scope="col">Probable</th><th scope="col">Pesimista</th><th scope="col">Esperada (PERT)</th><th scope="col">Desvío</th><th scope="col">Control</th></tr></thead><tbody>' + lt.map(function (t) {
      var id = esc(t.id);
      function f(k, lab) { return '<input type="number" class="cell-input" style="width:76px" min="0" max="2000" placeholder="—" value="' + (isNum(t[k]) ? t[k] : "") + '" data-change="threeField" data-id="' + id + '" data-key="' + k + '" data-fid="th:' + k + ":" + id + '" aria-label="Duración ' + lab + " de la tarea " + id + '">'; }
      return "<tr><td>" + id + " " + esc(t.name) + (t.critical ? ' <b class="issueTag">crítica</b>' : "") + "</td><td>" + f("opt", "optimista") + "</td><td>" + t.dur + "</td><td>" + f("pess", "pesimista") + "</td><td>" + (hasThree(t) ? pertExpected(t).toFixed(1) : "—") + "</td><td>" + (hasThree(t) ? pertSd(t).toFixed(2) : "—") + "</td><td>" + (threeOk(t) ? "" : '<b class="issueTag">Optimista ≤ probable ≤ pesimista</b>') + "</td></tr>";
    }).join("") + "</tbody></table>";
    $("threeBody").innerHTML = h;
  }

  /* ---- 2. análisis de reservas con valor monetario esperado (VME), versión alumnos ---- */
  var RISK_STATUS = ["Abierto", "Ocurrió", "Cerrado sin ocurrir"];
  function riskMoney(r) { var p = num(r.probPct), i = num(r.impactUsd); return (p === null || i === null) ? null : Math.round(p / 100 * i); }
  // Criterio didáctico: falta si la reserva es menor que el VME; alcanza si lo cubre con hasta 25 % de margen; sobra si lo supera por más de eso.
  function reserveVerdict(reserve, need) {
    if (!(need > 0)) return { k: "na", t: "sin VME cargado" };
    var ratio = reserve / need;
    if (ratio < 1) return { k: "bad", t: "FALTA: la reserva cubre " + Math.round(ratio * 100) + " % del VME" };
    if (ratio <= 1.25) return { k: "ok", t: "ALCANZA: cubre el VME con un margen de hasta 25 %" };
    return { k: "warn", t: "SOBRA: es más de 1,25 veces el VME; revisá si está inflada" };
  }
  function reserveData() {
    var thr = risks.filter(isThreat), opp = risks.filter(function (r) { return !isThreat(r); });
    var sum = function (arr, f) { return arr.reduce(function (s, r) { return s + (f(r) || 0); }, 0); };
    return { cont: parseBudget(charter.contingency), mg: parseBudget(charter.mgmtReserve), vmeAll: sum(thr, riskMoney), vmeOpen: sum(thr.filter(isOpenRisk), riskMoney),
      consumed: sum(thr.filter(function (r) { return r.status === "Ocurrió"; }), function (r) { return num(r.actualCost); }),
      vmeOpp: sum(opp.filter(function (r) { return r.status !== "Cerrado sin ocurrir"; }), riskMoney), withData: risks.filter(function (r) { return riskMoney(r) !== null; }).length };
  }
  function renderReservesPanel() {
    var d = reserveData(), none = d.cont === null;
    var card = function (v, l, warn) { return '<div class="evmCard' + (warn ? " warn" : "") + '"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>"; };
    var h = '<p class="note" style="margin-top:0">VME = probabilidad × impacto en USD de cada riesgo. La contingencia se compara con el VME de las <b>amenazas</b> (riesgos conocidos, dentro de la línea base); las oportunidades no la aumentan. La reserva de gestión es para riesgos desconocidos, queda fuera de la línea base y no se asigna a un riesgo puntual. Las dos son opcionales (PMBOK 8).</p>';
    h += '<p class="note">Monto de contingencia leído del acta: <b>' + (none ? "ninguno (el texto no tiene un monto)" : usd(d.cont)) + "</b>. Se toma el primer número del texto del campo; si no es el monto, escribilo primero, por ejemplo \"USD 90.000\". Reserva de gestión declarada: <b>" + (d.mg === null ? "ninguna con monto" : usd(d.mg)) + "</b> (fuera de la línea base).</p>";
    h += '<div class="evmGrid">' + card(usd(d.vmeAll), "VME de las amenazas (dimensionamiento)") + card(usd(d.vmeOpen), "VME de las amenazas todavía abiertas") + card(usd(d.consumed), "Consumo real (riesgos que ocurrieron)", !none && d.consumed > d.cont) + card(usd(d.vmeOpp), "VME de las oportunidades (informativo)") + (none ? "" : card(usd(d.cont - d.consumed), "Saldo de la contingencia", d.cont - d.consumed < 0)) + "</div>";
    if (none) h += '<p class="banner" role="status" style="border:1px solid var(--gantt-near)">El acta no declara un monto de contingencia. El VME de las amenazas es ' + usd(d.vmeAll) + ': decidí si lo cubrís con una reserva, si aceptás el riesgo de forma pasiva o si respondés de otra manera. No tener reserva es una decisión válida si está explicada.</p>';
    else {
      var v1 = reserveVerdict(d.cont, d.vmeAll), saldo = d.cont - d.consumed, v2 = reserveVerdict(Math.max(0, saldo), d.vmeOpen);
      h += '<ul class="checkList"><li class="chk ' + v1.k + '"><span class="tag">Inicio</span> Contingencia declarada (' + usd(d.cont) + ") contra el VME de todas las amenazas (" + usd(d.vmeAll) + "): " + esc(v1.t) + ".</li>" +
        '<li class="chk ' + (saldo < 0 ? "bad" : v2.k) + '"><span class="tag">Hoy</span> ' + (saldo < 0 ? "La contingencia se agotó: los riesgos que ocurrieron costaron " + usd(d.consumed) + ", " + usd(-saldo) + " más que la reserva. Lo que excede no sale de la línea base: hace falta una solicitud de cambio, que puede financiarse con reserva de gestión si la dirección la autoriza." : "Saldo de contingencia (" + usd(saldo) + ") contra el VME de las amenazas abiertas (" + usd(d.vmeOpen) + "): " + esc(v2.t) + ".") + "</li></ul>";
    }
    h = h.replace(/class="chk bad"/g, 'class="chk miss"');
    h += '<table class="simpletable"><caption class="sr-only">Análisis monetario de los riesgos</caption><thead><tr><th scope="col">Riesgo</th><th scope="col">Tipo</th><th scope="col">Probabilidad (%)</th><th scope="col">Impacto (USD)</th><th scope="col">VME (USD)</th><th scope="col">Estado</th><th scope="col">Costo real (USD)</th></tr></thead><tbody>' + (risks.map(function (r) {
      var id = esc(r.id), vm = riskMoney(r), st = r.status || "Abierto";
      return "<tr><td>" + id + " " + esc(r.desc) + "</td><td>" + esc(r.type || "Amenaza") + '</td><td><input type="number" class="cell-input" style="width:80px" min="0" max="100" placeholder="—" value="' + esc(r.probPct || "") + '" data-change="riskField" data-id="' + id + '" data-key="probPct" data-fid="rf:probPct:' + id + '" aria-label="Probabilidad en porcentaje del riesgo ' + id + '"></td>' +
        '<td><input type="number" class="cell-input" style="width:110px" min="0" placeholder="—" value="' + esc(r.impactUsd || "") + '" data-change="riskField" data-id="' + id + '" data-key="impactUsd" data-fid="rf:impactUsd:' + id + '" aria-label="Impacto en dólares del riesgo ' + id + '"></td><td>' + (vm === null ? "—" : usd(vm)) + "</td>" +
        '<td><select class="cell-input" data-change="riskField" data-id="' + id + '" data-key="status" data-fid="rf:status:' + id + '" aria-label="Estado del riesgo ' + id + '">' + RISK_STATUS.map(function (s) { return '<option value="' + esc(s) + '"' + (st === s ? " selected" : "") + ">" + esc(s) + "</option>"; }).join("") + "</select></td>" +
        '<td>' + (r.status === "Ocurrió" ? '<input type="number" class="cell-input" style="width:110px" min="0" placeholder="—" value="' + esc(r.actualCost || "") + '" data-change="riskField" data-id="' + id + '" data-key="actualCost" data-fid="rf:actualCost:' + id + '" aria-label="Costo real incurrido del riesgo ' + id + '">' : "—") + "</td></tr>";
    }).join("") || '<tr><td colspan="7">Todavía no hay riesgos: cargalos en el registro de riesgos.</td></tr>') + "</tbody></table>";
    $("reservesBody").innerHTML = h;
  }

  /* ---- 4. control de cambios completo, versión alumnos ---- */
  function crApplied(c) { return c.status === "Aprobada" && !!c.baselineName; }
  function approvedCostImpact() { return crList.filter(crApplied).reduce(function (s, c) { return s + (num(c.impactCost) || 0); }, 0); }
  function caseBac() {
    var proj = CASOS[currentProjectId]; if (!proj) return 0;
    return proj.tasks.reduce(function (s, t) { return s + t.dur * ((t.dailyCost !== undefined && t.dailyCost !== null) ? t.dailyCost : defaultDailyCost(t.resource)); }, 0);
  }
  function nextCrId() { var n = crList.length + 1; while (crList.some(function (x) { return x.id === "SC" + n; })) n++; return "SC" + n; }
  function crTaskCheck(taskId, days, cost) {
    if (!taskId) return (days || cost) ? "Elegí la tarea que absorbe el impacto para poder aplicarlo." : "";
    var t = taskById(taskId); if (!t) return "La tarea elegida no existe.";
    var nd = Math.max(0, t.dur + days);
    if (nd === 0 && (cost !== 0 || t.dur > 0)) return "La tarea " + taskId + " quedaría con duración 0 y no se puede repartir el costo en ella. Elegí otra tarea o cambiá los días.";
    return "";
  }
  function addCr() {
    var none = "(ninguna)", lt = leafTasks();
    return askForm("Nueva solicitud de cambio", [
      { key: "title", label: "Título", value: "", required: true },
      { key: "requester", label: "Solicitante", value: "" },
      { key: "desc", label: "Descripción y justificación", type: "textarea", rows: 3, value: "" },
      { key: "task", label: "Tarea que absorbe el impacto", type: "select", options: [none].concat(lt.map(function (t) { return t.id + " " + t.name; })), value: none, hint: "El impacto en días se suma a la duración de esa tarea y el cronograma se recalcula al aprobar." },
      { key: "impactDays", label: "Impacto en el cronograma: días hábiles de más (o de menos, con signo menos) en esa tarea", type: "number", value: 0, required: true },
      { key: "impactCost", label: "Impacto en el costo: cambio total del BAC en USD (con signo menos si baja)", type: "number", value: 0, required: true, hint: "La herramienta ajusta el costo diario de esa tarea para que el BAC cambie exactamente este monto. Si alargar la tarea cuesta más, ponelo acá." },
      { key: "impactScope", label: "Impacto en el alcance, los riesgos y la calidad", value: "" }
    ], "Registrar", function (v) { return crTaskCheck(v.task === none ? "" : v.task.split(" ")[0], v.impactDays, v.impactCost); }).then(function (r) {
      if (!r) return; pushHistory();
      crList.push({ id: nextCrId(), title: r.title.trim(), requester: r.requester, desc: r.desc, taskId: r.task === none ? "" : r.task.split(" ")[0], impactDays: String(r.impactDays), impactCost: String(r.impactCost), impactScope: r.impactScope, status: "Pendiente", who: "", date: "", baselineName: "", bacBefore: "", bacAfter: "", endBefore: "", endAfter: "" });
      render();
    });
  }
  function fmtImpact(dd, dc, t) { return (dd ? (dd > 0 ? "+" : "") + dd + " días" : "sin cambio de plazo") + ", " + (dc ? (dc > 0 ? "+" : "−") + usd(Math.abs(dc)) : "sin cambio de costo") + (t ? " (tarea " + t.id + ")" : ""); }
  function nextChangeLogId() { var n = changeLog.length + 1; while (changeLog.some(function (x) { return x.id === "CH" + n; })) n++; return "CH" + n; }
  function applyChangeRequest(c, who, date) {
    var t = c.taskId ? taskById(c.taskId) : null, dd = Math.round(num(c.impactDays) || 0), dc = num(c.impactCost) || 0;
    var err = crTaskCheck(c.taskId, dd, dc); if (err) { notify(err); return; }
    pushHistory();
    var bacBefore = computeEVM().BAC, endBefore = computeSchedule(tasks).projectEnd;
    if (t) t.dur = Math.max(0, t.dur + dd);
    var res = computeSchedule(tasks), snap = {};
    tasks.forEach(function (x) { snap[x.id] = { es: res.byId[x.id]._es, ef: res.byId[x.id]._ef }; });
    var name = "Línea base " + (baselines.length + 1) + " (" + c.id + ")", bl = { name: name, byId: snap, projectEnd: res.projectEnd, visible: true, bac: 0 };
    baselines.push(bl);
    if (t) {
      var m1 = computeEVM(), refDur = snap[t.id].ef - snap[t.id].es, delta = bacBefore + dc - m1.BAC;
      if (refDur > 0 && Math.abs(delta) > 0.001) t.dailyCost = Math.round((getDailyCost(t) + delta / refDur) * 10000) / 10000;
    }
    var after = computeEVM(); bl.bac = after.BAC;
    c.status = "Aprobada"; c.who = who; c.date = date; c.baselineName = name;
    c.bacBefore = String(Math.round(bacBefore)); c.bacAfter = String(Math.round(after.BAC)); c.endBefore = String(endBefore); c.endAfter = String(res.projectEnd);
    changeLog.push({ id: nextChangeLogId(), fecha: date, desc: c.id + " · " + c.title, impacto: fmtImpact(dd, dc, t) + " · " + name, estado: "Aprobado", aprobadoPor: who });
    track("aprobar_cambio", { caso_id: currentProjectId });
    render();
    notify("Cambio " + c.id + " aprobado y aplicado: BAC de " + usd(bacBefore) + " a " + usd(after.BAC) + ", fin del proyecto del día " + endBefore + " al " + res.projectEnd + ". Se creó la " + name + " y se asentó en el registro de cambios.");
  }
  function decideCr(id, decision) {
    var c = crList.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    var verb = { Aprobada: "Aprobar y aplicar", Rechazada: "Rechazar", Diferida: "Diferir" }[decision];
    return askForm(verb + " " + c.id + " · " + c.title, [
      { key: "who", label: "Decide (cargo o nombre)", value: "Patrocinador", required: true },
      { key: "date", label: "Fecha de la decisión", type: "date", value: cutoffISO(), required: true }
    ], verb).then(function (r) {
      if (!r) return;
      if (decision === "Aprobada") { applyChangeRequest(c, r.who.trim(), r.date); return; }
      pushHistory(); c.status = decision; c.who = r.who.trim(); c.date = r.date;
      if (decision === "Rechazada") changeLog.push({ id: nextChangeLogId(), fecha: r.date, desc: c.id + " · " + c.title, impacto: fmtImpact(Math.round(num(c.impactDays) || 0), num(c.impactCost) || 0, c.taskId ? taskById(c.taskId) : null) + " · no aplicado", estado: "Rechazado", aprobadoPor: r.who.trim() });
      render();
    });
  }
  function renderChangesPanel() {
    var m = computeEVM(), endNow = m.planned.projectEnd, origBac = caseBac(), applied = crList.filter(crApplied);
    var card = function (v, l) { return '<div class="evmCard"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>"; };
    var h = '<p class="note" style="margin-top:0">Cada solicitud tiene su impacto en el cronograma y en el costo. Al aprobarla, la herramienta suma los días a la tarea que elegiste, recalcula el cronograma, ajusta el costo para que el BAC cambie en el monto indicado, <b>fija una nueva línea base</b> y asienta el cambio en el registro de cambios. Rechazar o diferir no toca el plan. Se puede deshacer con el botón Deshacer.</p>' +
      '<div class="evmGrid">' + card(usd(origBac), "BAC de la línea base original") + card(usd(m.BAC), "BAC de la línea base vigente (" + esc(m.planned.label) + ")") + card("día " + originalProjectEnd + " · " + esc(workdayISO(Math.max(0, originalProjectEnd - 1))), "Fin de la línea base original") + card("día " + endNow + " · " + esc(workdayISO(Math.max(0, endNow - 1))), "Fin de la línea base vigente") + "</div>" +
      '<p class="note">Cambios aplicados: ' + applied.length + ", con un impacto total en el BAC de " + usd(approvedCostImpact()) + ". Si el BAC difiere del presupuesto del acta por estos cambios, actualizá el acta con la solicitud de cambio correspondiente (DOC-12).</p>" +
      '<div class="evmActions"><button type="button" data-action="addCr" data-fid="cr:add">Nueva solicitud de cambio</button></div>' +
      '<table class="simpletable"><caption class="sr-only">Solicitudes de cambio</caption><thead><tr><th scope="col">ID</th><th scope="col">Solicitud</th><th scope="col">Tarea</th><th scope="col">Impacto</th><th scope="col">Estado</th><th scope="col">Decisión</th><th scope="col">Resultado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      (crList.map(function (c) {
        var id = esc(c.id), pend = c.status === "Pendiente" || c.status === "Diferida", dd = Math.round(num(c.impactDays) || 0), dc = num(c.impactCost) || 0;
        return "<tr><td>" + id + "</td><td>" + esc(c.title) + (c.requester ? "<br><small>Solicitante: " + esc(c.requester) + "</small>" : "") + "</td><td>" + esc(c.taskId || "—") + "</td><td>" + esc(fmtImpact(dd, dc, null)) + "</td><td>" + esc(c.status) + "</td><td>" + (c.who ? esc(c.who) + "<br><small>" + esc(c.date) + "</small>" : "—") + "</td><td>" +
          (crApplied(c) ? "BAC " + usd(num(c.bacBefore)) + " → " + usd(num(c.bacAfter)) + "<br>Fin: día " + esc(c.endBefore) + " → " + esc(c.endAfter) + "<br><small>" + esc(c.baselineName) + "</small>" : "—") + "</td><td>" +
          (pend ? '<button type="button" data-action="crApprove" data-id="' + id + '" data-fid="cr:ok:' + id + '">Aprobar y aplicar</button> <button type="button" data-action="crReject" data-id="' + id + '" data-fid="cr:no:' + id + '">Rechazar</button>' + (c.status === "Pendiente" ? ' <button type="button" data-action="crDefer" data-id="' + id + '" data-fid="cr:def:' + id + '">Diferir</button>' : "") : "") +
          (crApplied(c) ? "" : ' <button type="button" class="delBtn" data-action="deleteCr" data-id="' + id + '" data-fid="cr:del:' + id + '" aria-label="Eliminar la solicitud ' + id + '">✕</button>') + "</td></tr>";
      }).join("") || '<tr><td colspan="8">Todavía no hay solicitudes de cambio.</td></tr>') + "</tbody></table>";
    $("changesBody").innerHTML = h;
  }

  /* ---- 6. calendario (.ics) con las comunicaciones y los hitos ---- */
  function icsEscape(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function icsFold(line) {
    var out = "", cur = 0, first = true;
    Array.from(line).forEach(function (ch) {
      var cp = ch.codePointAt(0), b = cp < 0x80 ? 1 : (cp < 0x800 ? 2 : (cp < 0x10000 ? 3 : 4)), limit = first ? 75 : 74;
      if (cur + b > limit) { out += "\r\n "; cur = 0; first = false; }
      out += ch; cur += b;
    });
    return out;
  }
  function icsDate(iso) { return iso.replace(/-/g, ""); }
  function icsNextDay(iso) { var d = isoToDate(iso); d.setDate(d.getDate() + 1); return dateToISO(d); }
  function freqRule(freq) {
    var f = String(freq || "").toLowerCase();
    if (/diari/.test(f)) return { r: "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR" };
    if (/quincen|bisemanal|cada 2 semanas|cada dos semanas/.test(f)) return { r: "FREQ=WEEKLY;INTERVAL=2" };
    if (/seman/.test(f)) return { r: "FREQ=WEEKLY" };
    if (/bimestr/.test(f)) return { r: "FREQ=MONTHLY;INTERVAL=2" };
    if (/trimestr/.test(f)) return { r: "FREQ=MONTHLY;INTERVAL=3" };
    if (/mensual|cada mes/.test(f)) return { r: "FREQ=MONTHLY" };
    if (/cierre|final|fin del/.test(f)) return { at: "end" };
    if (/inicio|kick|arranque/.test(f)) return { at: "start" };
    return null;
  }
  function buildIcs() {
    var res = computeSchedule(tasks), s0 = workdayISO(0), e0 = workdayISO(Math.max(0, res.projectEnd - 1));
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), L = [], nMs = 0, nCom = 0, unknown = [];
    L.push("BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//valeriayashan.com.ar//Planificador TI//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + icsEscape("Planificador TI · " + caseTitle()));
    function ev(uid, day, summary, desc, rrule) {
      L.push("BEGIN:VEVENT", "UID:" + uid + "@valeriayashan.com.ar", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + icsDate(day), "DTEND;VALUE=DATE:" + icsDate(icsNextDay(day)));
      if (rrule) L.push("RRULE:" + rrule + ";UNTIL=" + icsDate(e0));
      L.push("SUMMARY:" + icsEscape(summary), "DESCRIPTION:" + icsEscape(desc), "TRANSP:TRANSPARENT", "END:VEVENT");
    }
    tasks.filter(function (t) { return t.dur === 0 && !t.cycleError; }).forEach(function (t) { nMs++; ev(currentProjectId + "-hito-" + t.id, startISO(t), "Hito: " + t.name + " (" + t.id + ")", "Hito del proyecto " + caseTitle() + ". Fecha calculada por el planificador; se mueve si cambia el cronograma.", ""); });
    comms.forEach(function (c, i) {
      var fr = freqRule(c.freq), day = fr && fr.at === "end" ? e0 : s0, desc = "Información: " + (c.info || "—") + "\nCanal: " + (c.channel || "—") + "\nResponsable: " + (c.owner || "—") + "\nFrecuencia: " + (c.freq || "—") + "\nProyecto: " + caseTitle();
      if (!fr) { unknown.push(c.stakeholder); desc += "\n(Frecuencia no reconocida: se cargó un solo evento al inicio del proyecto. Ajustalo a mano en tu calendario.)"; }
      nCom++; ev(currentProjectId + "-com-" + (c.id || i), day, "Comunicación: " + (c.stakeholder || "parte interesada") + " — " + (c.info || ""), desc, fr && fr.r ? fr.r : "");
    });
    L.push("END:VCALENDAR");
    return { text: L.map(icsFold).join("\r\n") + "\r\n", nMs: nMs, nCom: nCom, unknown: unknown };
  }
  function exportIcs() {
    var r = buildIcs();
    if (!r.nMs && !r.nCom) { notify("No hay hitos ni filas en el plan de comunicaciones para llevar al calendario."); return; }
    dl("calendario-" + currentProjectId + ".ics", "text/calendar;charset=utf-8", r.text);
    track("exportar_calendario", { caso_id: currentProjectId });
    notify("Calendario descargado: " + r.nMs + " hito(s) y " + r.nCom + " comunicación(es). Importalo en Google Calendar o en Outlook (archivo .ics). Son eventos de día completo desde el inicio del proyecto hasta su fin." + (r.unknown.length ? " La frecuencia de " + r.unknown.join(", ") + " no se reconoció y quedó como un solo evento." : ""));
  }

  /* ===================== acciones ===================== */
  function nextCustomId() {
    var nums = tasks.filter(function (t) { return t.id.indexOf("1.6.") === 0; }).map(function (t) { return parseInt(t.id.split(".")[2], 10) || 0; });
    return "1.6." + (nums.length ? Math.max.apply(null, nums) + 1 : 1);
  }
  function ensureCustomPhase() {
    var ph = phases.filter(function (p) { return p.id === "1.6"; })[0];
    if (!ph) { ph = { id: "1.6", name: "Tareas agregadas", children: [] }; phases.push(ph); }
    return ph;
  }
  function addTask() {
    return askForm("Agregar tarea", [
      { key: "id", label: "ID / EDT", value: nextCustomId(), required: true },
      { key: "name", label: "Nombre de la tarea", value: "Nueva tarea", required: true },
      { key: "dur", label: "Duración en días hábiles (0 = hito)", type: "number", value: 10, min: 0, required: true },
      { key: "preds", label: "Predecesoras (IDs separados por coma)", value: "", hint: "Tipos: FC (fin-comienzo, el normal), CC, FF o CF, con desfase opcional: 1.2.1, 1.3.1CC+2, 1.3.2FF-1. Disponibles: " + tasks.map(function (t) { return t.id; }).join(", ") },
      { key: "resource", label: "Recurso responsable", value: "PM" }
    ], "Agregar", function (v) {
      var id = v.id.trim();
      if (taskById(id)) return "Ya existe una tarea con ese ID.";
      if (v.dur < 0 || v.dur > 2000) return "La duración tiene que ser un entero entre 0 y 2000.";
      if (tasks.length >= CONFIG.MAX_TASKS) return "Se alcanzó el máximo de tareas (" + CONFIG.MAX_TASKS + ").";
      return parsePredSpec(v.preds, id, tasks).error;
    }).then(function (r) {
      if (!r) return;
      pushHistory();
      var ps = parsePredSpec(r.preds, r.id.trim(), tasks);
      tasks.push({ id: r.id.trim(), name: r.name.trim(), dur: r.dur, preds: ps.preds, deps: Object.keys(ps.deps).length ? ps.deps : undefined, pct: 0, resource: (r.resource || "PM").trim() || "PM", extraResources: [], crashCostPerDay: null, overlapDays: 0, levelDelay: 0, notes: "", acTask: null });
      ensureCustomPhase().children.push(r.id.trim()); render();
    });
  }
  function deleteTask(id) {
    return confirmBox("¿Eliminar la tarea " + id + "? También se quita de las predecesoras de otras tareas y de los riesgos y el RACI vinculados.").then(function (ok) {
      if (!ok) return;
      pushHistory();
      tasks = tasks.filter(function (t) { return t.id !== id; });
      tasks.forEach(function (t) { t.preds = t.preds.filter(function (p) { return p !== id; }); if (t.deps) { delete t.deps[id]; if (!Object.keys(t.deps).length) delete t.deps; } });
      issues.forEach(function (x) { if (x.taskId === id) x.taskId = ""; });
      crList.forEach(function (x) { if (x.taskId === id) x.taskId = ""; });
      phases.forEach(function (ph) { ph.children = ph.children.filter(function (c) { return c !== id; }); });
      risks.forEach(function (r) { if (r.taskId === id) r.taskId = ""; });
      delete raciAssignments[id]; render();
    });
  }
  function editNote(id) {
    var t = taskById(id);
    return askForm('Nota de "' + t.name + '"', [{ key: "notes", label: "Nota", type: "textarea", value: t.notes || "" }], "Guardar").then(function (r) {
      if (r) { pushHistory(); t.notes = r.notes; render(); }
    });
  }
  function editExtraResources(id) {
    var t = taskById(id), opts = resourceOptionsList().filter(function (r) { return r !== t.resource; });
    var box = document.createElement("form"); box.className = "dlgBox"; box.setAttribute("aria-labelledby", "dlgTitle");
    box.innerHTML = '<h2 id="dlgTitle">Recursos secundarios de ' + esc(t.id) + "</h2><small>Se muestran en la vista de recursos para detectar sobreasignación, pero la optimización de recursos por nivelación solo resuelve el recurso principal.</small>" +
      '<div class="resTagList">' + (opts.map(function (r, i) { return '<label class="checkRow"><input type="checkbox" value="' + esc(r) + '" id="xr' + i + '"' + ((t.extraResources || []).indexOf(r) >= 0 ? " checked" : "") + "> " + esc(r) + "</label>"; }).join("") || "<small>No hay otros recursos todavía.</small>") + "</div>" +
      '<label for="xrNew">Agregar un recurso nuevo (opcional)</label><input type="text" id="xrNew" autocomplete="off"><div class="dlgBtns"><button type="button" class="dlgCancel">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>';
    var close = openModal(box, null);
    box.querySelector(".dlgCancel").addEventListener("click", function () { close(null); });
    box.addEventListener("submit", function (e) {
      e.preventDefault();
      var sel = Array.prototype.slice.call(box.querySelectorAll("input[type=checkbox]:checked")).map(function (c) { return c.value; });
      var nw = box.querySelector("#xrNew").value.trim();
      if (nw && nw !== t.resource && sel.indexOf(nw) < 0) sel.push(nw);
      pushHistory(); t.extraResources = sel; close(true); render();
    });
  }

  function levelResources() {
    pushHistory();
    tasks.forEach(function (t) { t.levelDelay = 0; });
    computeSchedule(tasks);
    var byRes = {};
    tasks.forEach(function (t) { if (t.resource) (byRes[t.resource] = byRes[t.resource] || []).push(t); });
    Object.keys(byRes).forEach(function (k) {
      var list = byRes[k]; list.sort(function (a, b) { return a._es - b._es; });
      var busy = -Infinity;
      list.forEach(function (t) {
        computeSchedule(tasks);
        if (t._es < busy) t.levelDelay = (t.levelDelay || 0) + (busy - t._es);
        computeSchedule(tasks);
        busy = Math.max(busy, t._ef);
      });
    });
    render();
  }
  function undoLeveling() { pushHistory(); tasks.forEach(function (t) { t.levelDelay = 0; }); render(); }

  function setBaseline() {
    return askForm("Fijar línea base del cronograma", [{ key: "name", label: "Nombre de esta línea base", value: "Línea base " + (baselines.length + 1), required: true }], "Fijar").then(function (r) {
      if (!r) return;
      pushHistory();
      var res = computeSchedule(tasks), snap = {};
      tasks.forEach(function (t) { snap[t.id] = { es: res.byId[t.id]._es, ef: res.byId[t.id]._ef }; });
      baselines.push({ name: r.name.trim(), byId: snap, projectEnd: res.projectEnd, visible: true }); render();
    });
  }
  function saveScenario() {
    return askForm("Guardar escenario", [{ key: "name", label: "Nombre del escenario", value: "Escenario " + scenarios.length, required: true }], "Guardar").then(function (r) {
      if (!r) return;
      scenarios.push({ name: r.name.trim(), snap: { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) } });
      activeScenario = scenarios.length - 1; render();
    });
  }
  function loadScenario(i) {
    activeScenario = i; tasks = cloneTasks(scenarios[i].snap.tasksSnap); phases = clonePhases(scenarios[i].snap.phasesSnap); render();
  }
  function cycleRaci(taskId, pi) {
    ensureRaciPeople(); pushHistory();
    var person = raciPeople[pi], order = ["", "R", "A", "C", "I"];
    raciAssignments[taskId] = raciAssignments[taskId] || {};
    var cur = raciAssignments[taskId][person] || "";
    raciAssignments[taskId][person] = order[(order.indexOf(cur) + 1) % order.length]; render();
  }
  function addRaciPerson() {
    ensureRaciPeople();
    return askForm("Agregar a la matriz RACI", [{ key: "name", label: "Nombre de la persona o rol", value: "", required: true }], "Agregar").then(function (r) {
      if (r && raciPeople.indexOf(r.name.trim()) < 0) { pushHistory(); raciPeople.push(r.name.trim()); render(); }
    });
  }
  function addRisk() {
    var none = "(ninguna)";
    return askForm("Agregar riesgo", [
      { key: "desc", label: "Descripción del riesgo", value: "", required: true },
      { key: "type", label: "Tipo", type: "select", options: ["Amenaza", "Oportunidad"], value: "Amenaza" },
      { key: "category", label: "Categoría", type: "select", options: ["Técnico", "Organizacional", "Externo", "De gestión"], value: "Técnico" },
      { key: "prob", label: "Probabilidad", type: "select", options: ["Baja", "Media", "Alta"], value: "Media" },
      { key: "impact", label: "Impacto", type: "select", options: ["Baja", "Media", "Alta"], value: "Media" },
      { key: "response", label: "Respuesta planificada", value: "", hint: "Empezá por la estrategia. Amenaza: evitar, mitigar, transferir, aceptar o escalar. Oportunidad: explotar, mejorar, compartir, aceptar o escalar." },
      { key: "owner", label: "Responsable del riesgo", value: "PM" },
      { key: "taskId", label: "Tarea vinculada", type: "select", options: [none].concat(tasks.map(function (t) { return t.id; })), value: none }
    ], "Agregar").then(function (r) {
      if (!r) return; pushHistory();
      var n = risks.length + 1; while (risks.some(function (x) { return x.id === "R" + n; })) n++;
      risks.push({ id: "R" + n, desc: r.desc.trim(), type: r.type, category: r.category, prob: r.prob, impact: r.impact, response: r.response, owner: r.owner || "PM", taskId: r.taskId === none ? "" : r.taskId }); render();
    });
  }
  function simpleAdd(title, fields, push) {
    return askForm(title, fields, "Agregar").then(function (r) { if (r) { pushHistory(); push(r); render(); } });
  }
  function addComm() {
    return simpleAdd("Agregar parte interesada", [
      { key: "stakeholder", label: "Parte interesada", value: "", required: true }, { key: "info", label: "Qué información recibe", value: "Avance general" },
      { key: "freq", label: "Frecuencia", value: "Semanal" }, { key: "channel", label: "Canal", value: "Email" }, { key: "owner", label: "Responsable de comunicar", value: "PM" }
    ], function (r) { var n = comms.length + 1; while (comms.some(function (x) { return x.id === "C" + n; })) n++; comms.push({ id: "C" + n, stakeholder: r.stakeholder.trim(), info: r.info, freq: r.freq, channel: r.channel, owner: r.owner || "PM" }); });
  }
  function addChange() {
    return simpleAdd("Agregar cambio", [
      { key: "fecha", label: "Fecha", type: "date", value: workdayISO(cutoffDay) }, { key: "desc", label: "Descripción del cambio", value: "", required: true },
      { key: "impacto", label: "Impacto (cronograma / costo)", value: "" }, { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Aprobado", "Rechazado"], value: "Pendiente" },
      { key: "aprobadoPor", label: "Aprobado por", value: "Patrocinador" }
    ], function (r) { var n = changeLog.length + 1; while (changeLog.some(function (x) { return x.id === "CH" + n; })) n++; changeLog.push({ id: "CH" + n, fecha: r.fecha, desc: r.desc.trim(), impacto: r.impacto, estado: r.estado, aprobadoPor: r.aprobadoPor }); });
  }
  function addDecision() {
    return simpleAdd("Agregar decisión", [
      { key: "fecha", label: "Fecha", type: "date", value: workdayISO(cutoffDay) }, { key: "decision", label: "Decisión tomada", value: "", required: true },
      { key: "contexto", label: "Contexto / razón", value: "" }, { key: "responsable", label: "Responsable", value: "PM" }
    ], function (r) { var n = decisionLog.length + 1; while (decisionLog.some(function (x) { return x.id === "D" + n; })) n++; decisionLog.push({ id: "D" + n, fecha: r.fecha, decision: r.decision.trim(), contexto: r.contexto, responsable: r.responsable || "PM" }); });
  }
  function delFrom(msg, getList, setList, id) {
    return confirmBox(msg).then(function (ok) { if (ok) { pushHistory(); setList(getList().filter(function (x) { return x.id !== id; })); render(); } });
  }
  function addHoliday() {
    return askForm("Agregar feriado", [{ key: "d", label: "Fecha del feriado", type: "date", value: "", required: true }], "Agregar").then(function (r) {
      if (!r) return; pushHistory(); if (holidays.indexOf(r.d) < 0) holidays.push(r.d); holidays.sort(); render();
    });
  }
  function pasteHolidays() {
    return askForm("Pegar lista de feriados", [{ key: "txt", label: "Una fecha por línea, formato AAAA-MM-DD", type: "textarea", rows: 8, value: "", required: true, hint: "Copiá la lista oficial del país y año que corresponda. Las fechas inválidas se rechazan." }], "Cargar", function (v) {
      var bad = v.txt.split(/[\s,;]+/).filter(Boolean).filter(function (x) { return !isISO(x); });
      return bad.length ? "Fechas inválidas: " + bad.slice(0, 5).join(", ") + (bad.length > 5 ? "…" : "") : "";
    }).then(function (r) {
      if (!r) return; pushHistory();
      r.txt.split(/[\s,;]+/).filter(Boolean).forEach(function (d) { if (holidays.indexOf(d) < 0) holidays.push(d); });
      holidays.sort(); render();
    });
  }

  /* ===================== guardar / cargar (JSON versionado y validado) ===================== */
  function serializeState() {
    return { app: CONFIG.APP_ID, schemaVersion: CONFIG.SCHEMA_VERSION, savedAt: new Date().toISOString(), audience: META.audience,
      projectId: currentProjectId, startDate: startDateValue(), holidayCountry: holidayCountry, holidays: holidays.slice(),
      tasks: cloneTasks(tasks), phases: clonePhases(phases), baselines: clone(baselines), scenarios: clone(scenarios), activeScenario: activeScenario,
      nearThreshold: nearThreshold, cutoffDay: cutoffDay, acActual: acActual, risks: clone(risks), raciAssignments: clone(raciAssignments), raciPeople: raciPeople.slice(),
      charter: clone(charter), comms: clone(comms), changeLog: clone(changeLog), decisionLog: clone(decisionLog), lessons: lessons,
      actualStart: actualStart, actualFinish: actualFinish, plannedFinishOverride: plannedFinishOverride,
      stakeholders: clone(stakeholders), teamCharter: clone(teamCharter), mgmtPlan: clone(mgmtPlan), changeRequest: clone(changeRequest),
      issues: clone(issues), crList: clone(crList) };
  }
  function storageKey(pid) { return "ptTI.v" + CONFIG.STORAGE_KEY_VERSION + "." + META.audience + "." + pid; }
  function downloadJson() {
    var blob = new Blob([JSON.stringify(serializeState(), null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "progreso-" + currentProjectId + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    track("guardar_progreso", { metodo: "archivo", caso_id: currentProjectId }); maybeShowLead("guardar");
    notify("Copia de seguridad descargada. El progreso ya se guarda solo en este navegador; esta copia sirve para pasarlo a otra computadora o conservarlo.");
  }
  // Si hay progreso guardado automáticamente de este caso, ofrece restaurarlo (no se pisa hasta que la persona haga un cambio).
  function maybeRestore(id) {
    var raw = store.get(storageKey(id));
    if (!raw) return;
    var when = "";
    try { var o = JSON.parse(raw); if (o && o.savedAt) { var d = new Date(o.savedAt); when = d.toLocaleDateString("es-AR") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); } } catch (e) { return; }
    confirmBox("Hay progreso guardado de este caso" + (when ? " (" + when + ")" : "") + ". ¿Querés restaurarlo? Si cancelás, empezás el caso desde cero y el guardado anterior se reemplaza recién cuando hagas un cambio.", "Restaurar").then(function (ok) {
      if (ok) applyImport(raw, "navegador");
    });
  }
  function importFile(file) {
    if (!file) return;
    if (file.size > CONFIG.MAX_FILE_BYTES) { notify("El archivo pesa más de " + (CONFIG.MAX_FILE_BYTES / 1048576) + " MB; no parece un progreso del planificador."); return; }
    var rd = new FileReader();
    rd.onload = function () { applyImport(String(rd.result), "archivo"); };
    rd.onerror = function () { notify("No se pudo leer el archivo."); };
    rd.readAsText(file);
  }
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function str(v, max) { return String(v == null ? "" : v).slice(0, max || 2000); }
  function validateTasks(list, label) {
    if (!Array.isArray(list)) return label + ": falta la lista de tareas.";
    if (list.length > CONFIG.MAX_TASKS) return label + ": demasiadas tareas (" + list.length + ").";
    var ids = new Set();
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t || typeof t !== "object") return label + ": la tarea " + (i + 1) + " no tiene formato válido.";
      if (typeof t.id !== "string" || !t.id.trim()) return label + ": la tarea " + (i + 1) + " no tiene ID.";
      if (ids.has(t.id)) return label + ": el ID " + t.id + " está repetido.";
      ids.add(t.id);
      if (typeof t.name !== "string") return label + ": la tarea " + t.id + " no tiene nombre.";
      if (!isNum(t.dur) || t.dur < 0 || t.dur > 2000) return label + ": la duración de la tarea " + t.id + " no es válida.";
      if (!Array.isArray(t.preds) || t.preds.some(function (p) { return typeof p !== "string"; })) return label + ": las predecesoras de " + t.id + " no son válidas.";
      if (!isNum(t.pct) || t.pct < 0 || t.pct > 100) return label + ": el porcentaje de la tarea " + t.id + " no es válido.";
      if (t.deps !== undefined && t.deps !== null) {
        if (typeof t.deps !== "object" || Array.isArray(t.deps)) return label + ": las dependencias de " + t.id + " no son válidas.";
        var dk = Object.keys(t.deps);
        for (var q = 0; q < dk.length; q++) {
          var dd = t.deps[dk[q]];
          if (t.preds.indexOf(dk[q]) < 0 || !dd || DEP_ES[dd.type] === undefined || (dd.lag !== undefined && !(isNum(dd.lag) && Math.abs(dd.lag) <= 2000))) return label + ": la dependencia de " + t.id + " con " + dk[q] + " no es válida.";
        }
      }
      if ((t.opt !== undefined && t.opt !== null && !(isNum(t.opt) && t.opt >= 0 && t.opt <= 2000)) || (t.pess !== undefined && t.pess !== null && !(isNum(t.pess) && t.pess >= 0 && t.pess <= 2000))) return label + ": las estimaciones de tres puntos de " + t.id + " no son válidas.";
    }
    for (var j = 0; j < list.length; j++) for (var k = 0; k < list[j].preds.length; k++) if (!ids.has(list[j].preds[k])) return label + ": la tarea " + list[j].id + " depende de " + list[j].preds[k] + ", que no existe.";
    return "";
  }
  function validateState(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return { error: "El archivo no es un progreso del planificador (el contenido no es un objeto JSON)." };
    var legacy = o.app === undefined;
    if (!legacy && o.app !== CONFIG.APP_ID) return { error: "Este archivo no fue exportado por el Planificador TI de Valeria Yashan (identificador de herramienta distinto)." };
    if (legacy && !(typeof o.projectId === "string" && Array.isArray(o.tasks) && Array.isArray(o.phases))) return { error: "Este archivo no corresponde al Planificador TI: faltan el caso, las tareas o las fases." };
    if (!legacy && !(Number.isInteger(o.schemaVersion) && o.schemaVersion >= 1)) return { error: "El archivo no indica la versión del formato." };
    if (!legacy && o.schemaVersion > CONFIG.SCHEMA_VERSION) return { error: "El archivo se creó con una versión más nueva del planificador (formato " + o.schemaVersion + "; esta herramienta entiende hasta el " + CONFIG.SCHEMA_VERSION + "). Recargá la página e intentá de nuevo." };
    if (!CASOS[o.projectId]) return { error: 'El archivo es del caso "' + str(o.projectId, 60) + '", que no está disponible en esta versión de la herramienta (' + (META.audience === "alumnos-egci" ? "versión para alumnos" : "versión pública") + ")." };
    var e = validateTasks(o.tasks, "Tareas");
    if (e) return { error: e };
    var ids = new Set(o.tasks.map(function (t) { return t.id; }));
    if (!Array.isArray(o.phases) || o.phases.some(function (p) { return !p || typeof p.id !== "string" || typeof p.name !== "string" || !Array.isArray(p.children) || p.children.some(function (c) { return !ids.has(c); }); })) return { error: "Las fases del archivo no son válidas o apuntan a tareas que no existen." };
    if (o.startDate !== undefined && !isISO(o.startDate)) return { error: "La fecha de inicio del archivo no es válida." };
    if (o.holidays !== undefined && (!Array.isArray(o.holidays) || o.holidays.some(function (h) { return !isISO(h); }))) return { error: "La lista de feriados del archivo tiene fechas inválidas." };
    return { ok: true, legacy: legacy };
  }
  function sanitizeObj(o, fields) {
    var out = {};
    fields.forEach(function (f) { out[f.key] = str(o && typeof o === "object" ? o[f.key] : "", 4000); });
    return out;
  }
  function sanitizeList(arr, keys) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 500).filter(function (x) { return x && typeof x === "object"; }).map(function (x) { var o = {}; keys.forEach(function (k) { o[k] = str(x[k], 1000); }); return o; });
  }
  function applyImport(text, origen) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { notify("No se pudo leer el archivo: no es un JSON válido. ¿Es un archivo exportado desde este planificador?"); return; }
    var v = validateState(obj);
    if (v.error) { notify(v.error); return; }
    var proj = CASOS[obj.projectId];
    currentProjectId = obj.projectId;
    tasks = obj.tasks.map(function (t) { return Object.assign({}, t, { notes: str(t.notes), acTask: isNum(t.acTask) ? t.acTask : null, extraResources: Array.isArray(t.extraResources) ? t.extraResources.map(function (x) { return str(x, 100); }) : [], overlapDays: isNum(t.overlapDays) ? t.overlapDays : 0, levelDelay: isNum(t.levelDelay) ? t.levelDelay : 0, name: str(t.name, 300), resource: str(t.resource, 100), preds: t.preds.slice(), crashCostPerDay: isNum(t.crashCostPerDay) ? t.crashCostPerDay : null, deps: cleanDeps(t), opt: isNum(t.opt) ? t.opt : null, pess: isNum(t.pess) ? t.pess : null }); });
    phases = clonePhases(obj.phases);
    ORIGINAL_DURS = {}; proj.tasks.forEach(function (t) { ORIGINAL_DURS[t.id] = t.dur; });
    var tmp = cloneTasks(proj.tasks.map(function (t) { return Object.assign({}, clone(t), { overlapDays: 0, levelDelay: 0 }); }));
    $("startDate").value = proj.startDate;
    originalProjectEnd = computeScheduleOn(tmp).projectEnd; originalSchedule = {};
    tmp.forEach(function (t) { originalSchedule[t.id] = { es: t._es, ef: t._ef, dur: t.dur }; });
    baselines = Array.isArray(obj.baselines) ? obj.baselines.filter(function (b) { return b && typeof b.name === "string" && b.byId && isNum(b.projectEnd); }).map(function (b) { return { name: str(b.name, 100), byId: b.byId, projectEnd: b.projectEnd, visible: b.visible !== false, bac: isNum(b.bac) ? b.bac : undefined }; }) : [];
    scenarios = []; activeScenario = 0;
    if (Array.isArray(obj.scenarios)) obj.scenarios.forEach(function (s) { if (s && typeof s.name === "string" && s.snap && !validateTasks(s.snap.tasksSnap, "esc") && Array.isArray(s.snap.phasesSnap)) scenarios.push({ name: str(s.name, 100), snap: { tasksSnap: s.snap.tasksSnap, phasesSnap: s.snap.phasesSnap } }); });
    if (!scenarios.length) scenarios = [{ name: "Plan original", snap: { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) } }];
    else activeScenario = Math.min(Math.max(0, parseInt(obj.activeScenario, 10) || 0), scenarios.length - 1);
    nearThreshold = isNum(obj.nearThreshold) && obj.nearThreshold >= 1 ? obj.nearThreshold : 5;
    cutoffDay = isNum(obj.cutoffDay) ? obj.cutoffDay : suggestedCutoff();
    acActual = isNum(obj.acActual) ? obj.acActual : null;
    risks = sanitizeList(obj.risks, ["id", "desc", "category", "prob", "impact", "response", "owner", "taskId", "type", "probPct", "impactUsd", "status", "actualCost"]);
    risks.forEach(function (r) { if (r.type !== "Oportunidad") r.type = "Amenaza"; if (RISK_STATUS.indexOf(r.status) < 0) r.status = ""; });
    issues = sanitizeList(obj.issues, ["id", "type", "desc", "owner", "due", "status", "taskId"]);
    issues.forEach(function (x) { if (x.type !== "Acción") x.type = "Problema"; if (ISSUE_STATUS.indexOf(x.status) < 0) x.status = "Abierto"; if (x.due && !isISO(x.due)) x.due = ""; });
    crList = sanitizeList(obj.crList, ["id", "title", "requester", "desc", "taskId", "impactDays", "impactCost", "impactScope", "status", "who", "date", "baselineName", "bacBefore", "bacAfter", "endBefore", "endAfter"]);
    crList.forEach(function (x) { if (["Pendiente", "Aprobada", "Rechazada", "Diferida"].indexOf(x.status) < 0) x.status = "Pendiente"; });
    simResult = null;
    stakeholders = sanitizeList(obj.stakeholders, STK_KEYS);
    teamCharter = sanitizeObj(obj.teamCharter, TEAM_FIELDS);
    mgmtPlan = sanitizeObj(obj.mgmtPlan, PLAN_FIELDS);
    changeRequest = sanitizeObj(obj.changeRequest, CR_FIELDS);
    raciAssignments = obj.raciAssignments && typeof obj.raciAssignments === "object" ? obj.raciAssignments : {};
    raciPeople = Array.isArray(obj.raciPeople) ? obj.raciPeople.map(function (x) { return str(x, 100); }) : [];
    charter = {}; Object.keys(clone(proj.charter || {})).concat(["objective", "scopeOut", "contingency", "mgmtReserve"]).forEach(function (k) { charter[k] = str(obj.charter && obj.charter[k] !== undefined ? obj.charter[k] : (proj.charter || {})[k], 4000); });
    comms = sanitizeList(obj.comms, ["id", "stakeholder", "info", "freq", "channel", "owner"]);
    changeLog = sanitizeList(obj.changeLog, ["id", "fecha", "desc", "impacto", "estado", "aprobadoPor"]);
    decisionLog = sanitizeList(obj.decisionLog, ["id", "fecha", "decision", "contexto", "responsable"]);
    lessons = str(obj.lessons, 10000);
    holidayCountry = typeof obj.holidayCountry === "string" ? obj.holidayCountry : holidayCountry;
    if (Array.isArray(obj.holidays)) holidays = obj.holidays.slice().sort();
    if (obj.startDate) $("startDate").value = obj.startDate;
    holidayYear = yearOf(startDateValue());
    actualStart = isISO(obj.actualStart) ? obj.actualStart : ""; actualFinish = isISO(obj.actualFinish) ? obj.actualFinish : ""; plannedFinishOverride = isISO(obj.plannedFinishOverride) ? obj.plannedFinishOverride : "";
    history = []; future = []; ftTaskId = "";
    $("projectSelect").value = currentProjectId; $("nearThreshold").value = nearThreshold;
    lastSavedAt = ""; setDirty(origen === "archivo"); render();
    notify("Progreso cargado (" + origen + "): " + proj.title + (v.legacy ? ". Era un archivo de formato anterior; se convirtió al formato actual al guardarlo de nuevo." : "."));
  }

  /* ===================== exportaciones ===================== */
  var xlsxPromise = null;
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { s.remove(); rej(new Error("No se pudo cargar " + src)); }; document.head.appendChild(s); });
  }
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsxPromise) xlsxPromise = loadScript(CONFIG.XLSX_LOCAL).catch(function () { return loadScript(CONFIG.XLSX_CDN); });
    return xlsxPromise.catch(function (e) { xlsxPromise = null; throw e; });
  }
  function exportExcel(btn) {
    var label = btn ? btn.textContent : ""; if (btn) { btn.textContent = "Preparando Excel…"; btn.disabled = true; }
    loadXlsx().then(function () { if (btn) { btn.textContent = label; btn.disabled = false; } runExportExcel(); }).catch(function () {
      if (btn) { btn.textContent = label; btn.disabled = false; }
      notify("No se pudo cargar la librería de Excel (sin conexión o bloqueada). Probá con otra conexión o desactivá el bloqueador de contenido.");
    });
  }
  function runExportExcel() {
    computeSchedule(tasks);
    var X = window.XLSX, rows = [];
    phases.filter(function (ph) { return ph.children.length; }).forEach(function (ph) {
      var kids = ph.children.map(taskById).filter(Boolean); if (!kids.length) return;
      var s = Math.min.apply(null, kids.map(function (k) { return k._es; })), e = Math.max.apply(null, kids.map(function (k) { return k._ef; }));
      rows.push({ "EDT": ph.id, "Tarea": ph.name, "Tipo": "Fase (resumen)", "Recurso": "", "Duración (días hábiles)": e - s, "Inicio": workdayISO(s), "Fin": workdayISO(Math.max(0, e - 1)), "Predecesoras": "", "Optimista (días)": "", "Pesimista (días)": "", "Esperada PERT (días)": "", "% Completado": "", "Holgura total (días)": "", "Ruta crítica": "" });
      kids.forEach(function (t) {
        rows.push({ "EDT": t.id, "Tarea": t.name, "Tipo": t.dur === 0 ? "Hito" : "Tarea", "Recurso": t.resource || "", "Duración (días hábiles)": t.dur, "Inicio": startISO(t), "Fin": finishISO(t), "Predecesoras": predsText(t) || "—", "Optimista (días)": hasThree(t) ? t.opt : "", "Pesimista (días)": hasThree(t) ? t.pess : "", "Esperada PERT (días)": hasThree(t) ? Math.round(pertExpected(t) * 10) / 10 : "", "% Completado": t.pct + "%", "Holgura total (días)": t.critical ? 0 : t.slack, "Ruta crítica": t.critical ? "Sí" : (t.near ? "Casi crítica" : "No") });
      });
    });
    var ws = X.utils.json_to_sheet(rows);
    ws["!cols"] = [8, 34, 14, 18, 20, 12, 12, 16, 14, 14, 16, 12, 14, 14].map(function (w) { return { wch: w }; });
    var r0 = rows.length + 2;
    X.utils.sheet_add_aoa(ws, [[CONFIG.ATTRIBUTION], [CONFIG.SITE_URL], ["Caso: " + (CASOS[currentProjectId] ? CASOS[currentProjectId].title : "") + " · Exportado el " + dateToISO(new Date())]], { origin: { r: r0, c: 0 } });
    var cell = ws["B" + (r0 + 2)]; if (cell) cell.l = { Target: CONFIG.SITE_URL, Tooltip: "valeriayashan.com.ar" };
    var byRes = {}, resRows = [];
    tasks.forEach(function (t) { allResourcesOf(t).forEach(function (r) { (byRes[r] = byRes[r] || []).push(t); }); });
    Object.keys(byRes).forEach(function (r) { byRes[r].forEach(function (t) { resRows.push({ "Recurso": r, "Tarea": t.id + " — " + t.name, "Inicio": startISO(t), "Fin": finishISO(t), "Duración (días)": t.dur }); }); });
    var wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Cronograma");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(resRows), "Asignación de recursos");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(risks.map(function (r) { return { "ID": r.id, "Riesgo": r.desc, "Tipo": r.type || "Amenaza", "Categoría": r.category, "Probabilidad": r.prob, "Impacto": r.impact, "Puntaje (P×I)": riskScore(r.prob, r.impact), "Respuesta": r.response, "Responsable del riesgo": r.owner, "Tarea vinculada": r.taskId || "—", "Probabilidad (%)": r.probPct || "", "Impacto (USD)": r.impactUsd || "", "VME (USD)": riskMoney(r) === null ? "" : riskMoney(r), "Estado": r.status || "", "Costo real (USD)": r.actualCost || "" }; })), "Registro de riesgos");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(comms.map(function (c) { return { "Parte interesada": c.stakeholder, "Información": c.info, "Frecuencia": c.freq, "Canal": c.channel, "Responsable": c.owner }; })), "Comunicaciones");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(changeLog.map(function (c) { return { "Fecha": c.fecha, "Cambio": c.desc, "Impacto": c.impacto, "Estado": c.estado, "Aprobado por": c.aprobadoPor }; })), "Registro de cambios");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(decisionLog.map(function (d) { return { "Fecha": d.fecha, "Decisión": d.decision, "Contexto": d.contexto, "Responsable": d.responsable }; })), "Registro de decisiones");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(issues.length ? issues.map(function (x) { return { "ID": x.id, "Tipo": x.type, "Descripción": x.desc, "Responsable": x.owner, "Fecha límite": x.due, "Estado": x.status, "Tarea": x.taskId || "—" }; }) : [{ "ID": "", "Descripción": "(sin completar)" }]), "Problemas y acciones");
    if (crList.length) X.utils.book_append_sheet(wb, X.utils.json_to_sheet(crList.map(function (c) { return { "ID": c.id, "Solicitud": c.title, "Solicitante": c.requester, "Tarea": c.taskId || "—", "Impacto (días)": num(c.impactDays) || 0, "Impacto (USD)": num(c.impactCost) || 0, "Estado": c.status, "Decide": c.who, "Fecha": c.date, "BAC antes": c.bacBefore, "BAC después": c.bacAfter, "Fin antes (día)": c.endBefore, "Fin después (día)": c.endAfter, "Línea base": c.baselineName }; })), "Control de cambios");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(stakeholders.map(function (s) { return { "Interesado": s.name, "Rol e interés": s.role, "Poder": s.power, "Interés": s.interest, "Participación actual": s.engNow, "Participación deseada": s.engDesired, "Estrategia": s.strategy }; })), "Interesados");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(PLAN_FIELDS.map(function (f) { return { "Área": f.label, "Plan": mgmtPlan[f.key] || "" }; })), "Plan de gestión");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(TEAM_FIELDS.map(function (f) { return { "Apartado": f.label, "Acuerdo": teamCharter[f.key] || "" }; })), "Team Charter");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(CR_FIELDS.map(function (f) { return { "Campo": f.label, "Contenido": changeRequest[f.key] || "" }; })), "Solicitud de cambio");
    var ls = (lessons || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(ls.length ? ls.map(function (l, i) { return { "#": i + 1, "Lección aprendida": l }; }) : [{ "#": "", "Lección aprendida": "(sin completar)" }]), "Lecciones aprendidas");
    wb.Props = { Title: "Cronograma — " + (CASOS[currentProjectId] ? CASOS[currentProjectId].title : ""), Author: "Valeria Yashan", Company: "valeriayashan.com.ar" };
    X.writeFile(wb, "cronograma-" + currentProjectId + ".xlsx");
    track("exportar_excel", { caso_id: currentProjectId }); maybeShowLead("excel");
  }
  function csvSafe(v) { var s = String(v == null ? "" : v).replace(/\n/g, " "); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
  function exportCsv() {
    computeSchedule(tasks);
    var rows = [["List", "Card", "Description"]];
    leafTasks().forEach(function (t) { rows.push([t.pct === 0 ? "Por hacer" : (t.pct === 100 ? "Hecho" : "En curso"), t.id + " — " + t.name, t.notes || ""]); });
    var blob = new Blob(["﻿" + rows.map(function (r) { return r.map(csvSafe).join(","); }).join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "kanban-" + currentProjectId + ".csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function printView() {
    var res = computeSchedule(tasks), rows = "";
    phases.filter(function (ph) { return ph.children.length; }).forEach(function (ph) {
      var kids = ph.children.map(taskById).filter(Boolean); if (!kids.length) return;
      rows += '<tr><th colspan="8" scope="colgroup" style="text-align:left">' + esc(ph.id + " " + ph.name) + "</th></tr>";
      kids.forEach(function (t) { rows += "<tr><td>" + esc(t.id) + "</td><td>" + esc(t.name) + (t.dur === 0 ? " (hito)" : "") + "</td><td>" + esc(t.resource || "") + "</td><td>" + esc(startISO(t)) + "</td><td>" + esc(finishISO(t)) + "</td><td>" + t.dur + "d</td><td>" + t.pct + "%</td><td>" + (t.critical ? "Crítica" : (t.near ? "Casi crítica" : "—")) + "</td></tr>"; });
    });
    var title = CASOS[currentProjectId] ? CASOS[currentProjectId].title : "";
    $("printArea").innerHTML = "<h1>Cronograma — " + esc(title) + '</h1><div class="sub">Patrocinador: ' + esc(charter.sponsor || "—") + " · Duración: " + res.projectEnd + " días hábiles · Generado " + esc(dateToISO(new Date())) + '</div><table><thead><tr><th scope="col">EDT</th><th scope="col">Tarea</th><th scope="col">Recurso</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col">Dur.</th><th scope="col">%</th><th scope="col">Estado</th></tr></thead><tbody>' + rows + '</tbody></table><div class="attribPrint">' + esc(CONFIG.ATTRIBUTION) + " — " + esc(CONFIG.SITE_URL) + "</div>";
    window.print();
  }

  /* ===================== exportar la entrega en PDF, ordenada según el índice TI-00 (versión alumnos) ===================== */
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }
  function tblHtml(heads, rows) {
    return '<table><thead><tr>' + heads.map(function (h) { return '<th scope="col">' + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      (rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + (nl2br(c == null || c === "" ? "—" : c)) + "</td>"; }).join("") + "</tr>"; }).join("") || '<tr><td colspan="' + heads.length + '">— sin datos —</td></tr>') + "</tbody></table>";
  }
  function kvHtml(fields, obj) {
    return '<table class="kv"><tbody>' + fields.map(function (f) { return '<tr><th scope="row">' + esc(f.label) + "</th><td>" + (nl2br(obj[f.key] || "") || "—") + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  function pct(a, b) { return b > 0 ? (a / b * 100).toFixed(1) + "%" : "—"; }
  function tiDocs(withRaci) {
    var res = computeSchedule(tasks), m = computeEVM(), idx = function (n) { return isFinite(n) ? n.toFixed(2) : "—"; }, D = {};
    D["DOC-01"] = { title: "Project Charter (acta de constitución)", html: kvHtml(CHARTER_FIELDS, charter) };
    D["DOC-02"] = { title: "Registro de interesados", html: tblHtml(["Interesado", "Rol e interés", "Poder", "Interés", "Estrategia de participación"], stakeholders.map(function (s) { return [s.name, s.role, s.power, s.interest, s.strategy]; })) };
    D["DOC-03"] = { title: "Matriz de participación de los interesados", html: tblHtml(["Interesado", "Participación actual", "Participación deseada", "Brecha"], stakeholders.map(function (s) {
      var gap = (s.engNow && s.engDesired) ? ENG_LEVELS.indexOf(s.engDesired) - ENG_LEVELS.indexOf(s.engNow) : null;
      return [s.name, s.engNow, s.engDesired, gap === null ? "—" : (gap === 0 ? "Sin brecha" : (gap > 0 ? "Subir " + gap + " nivel(es)" : "Bajar " + Math.abs(gap) + " nivel(es)"))];
    })) };
    D["DOC-04"] = { title: "Plan de gestión del proyecto (versión 1)", html: kvHtml(PLAN_FIELDS, mgmtPlan) };
    var edt = '<table><thead><tr><th scope="col">EDT</th><th scope="col">Elemento</th><th scope="col">Dur. (días hábiles)</th><th scope="col">Predecesoras</th><th scope="col">Recurso</th><th scope="col">Inicio</th><th scope="col">Fin</th></tr></thead><tbody>' +
      '<tr><th colspan="7" scope="colgroup" style="text-align:left">1 ' + esc(CASOS[currentProjectId] ? CASOS[currentProjectId].title : "Proyecto") + "</th></tr>";
    phases.filter(function (ph) { return ph.children.length; }).forEach(function (ph) {
      edt += '<tr><th colspan="7" scope="colgroup" style="text-align:left">' + esc(ph.id + " " + ph.name) + "</th></tr>";
      ph.children.map(taskById).filter(Boolean).forEach(function (t) {
        edt += "<tr><td>" + esc(t.id) + "</td><td>" + esc(t.name) + (t.dur === 0 ? " (hito)" : "") + "</td><td>" + t.dur + "</td><td>" + (esc(predsText(t)) || "—") + "</td><td>" + (esc(t.resource) || "—") + "</td><td>" + esc(startISO(t)) + "</td><td>" + esc(finishISO(t)) + "</td></tr>";
      });
    });
    edt += "</tbody></table>";
    if (withRaci) {
      ensureRaciPeople();
      edt += "<h3>Matriz RACI</h3>" + tblHtml(["Tarea"].concat(raciPeople), leafTasks().map(function (t) { return [t.id + " " + t.name].concat(raciPeople.map(function (p) { return (raciAssignments[t.id] || {})[p] || ""; })); }));
    }
    D["DOC-05"] = { title: withRaci ? "EDT / WBS con matriz RACI" : "EDT / WBS", html: edt };
    var money = risks.some(function (r) { return riskMoney(r) !== null; });
    D["DOC-06"] = { title: "Registro de riesgos", html: tblHtml(["#", "Tipo", "Riesgo", "Categoría", "Prob.", "Impacto", "P×I"].concat(money ? ["Prob. (%)", "Impacto (USD)", "VME (USD)"] : []).concat(["Respuesta", "Responsable", "Tarea"]), risks.map(function (r) { return [r.id, r.type || "Amenaza", r.desc, r.category, r.prob, r.impact, riskScore(r.prob, r.impact)].concat(money ? [r.probPct, r.impactUsd, riskMoney(r) === null ? "" : usd(riskMoney(r))] : []).concat([r.response, r.owner, r.taskId]); })) };
    D["DOC-07"] = { title: "Plan de comunicaciones", html: tblHtml(["Parte interesada", "Información", "Frecuencia", "Canal", "Responsable"], comms.map(function (c) { return [c.stakeholder, c.info, c.freq, c.channel, c.owner]; })) };
    D["DOC-08"] = { title: "Team Charter", html: kvHtml(TEAM_FIELDS, teamCharter) };
    D["DOC-09"] = { title: "Informe de estado (un período)", html: tblHtml(["Indicador", "Valor"], statusRows(statusData())) };
    D["DOC-10"] = { title: "Registro de cambios", html: tblHtml(["Fecha", "Cambio", "Impacto", "Estado", "Aprobado por"], changeLog.map(function (c) { return [c.fecha, c.desc, c.impacto, c.estado, c.aprobadoPor]; })) };
    D["DOC-11"] = { title: "Registro de decisiones", html: tblHtml(["Fecha", "Decisión", "Contexto", "Responsable"], decisionLog.map(function (d) { return [d.fecha, d.decision, d.contexto, d.responsable]; })) };
    D["DOC-12"] = { title: "Solicitud de cambio", html: kvHtml(CR_FIELDS, changeRequest) };
    D["DOC-13"] = { title: "Informe de cierre", html: '<pre class="informe">' + esc(buildInformeText()) + "</pre>" };
    return D;
  }
  var TI_SETS = {
    E1: ["DOC-01", "DOC-02", "DOC-03", "DOC-04", "DOC-05"],
    E2: ["DOC-01", "DOC-02", "DOC-03", "DOC-04", "DOC-05", "DOC-06", "DOC-07", "DOC-08"],
    Final: ["DOC-01", "DOC-02", "DOC-03", "DOC-04", "DOC-05", "DOC-06", "DOC-07", "DOC-08", "DOC-09", "DOC-10", "DOC-11", "DOC-12", "DOC-13"]
  };
  function exportTiPdf() {
    return askForm("Exportar la entrega en PDF", [
      { key: "surname", label: "Apellido (va en el nombre del archivo)", required: true },
      { key: "fullname", label: "Nombre y apellido (va en la portada)", required: true },
      { key: "entrega", label: "Entrega", type: "select", options: ["E1", "E2", "TI final"], value: "E1", hint: "E1: DOC-01 a DOC-05. E2: las correcciones del E1 más DOC-05 con RACI, DOC-06, DOC-07 y DOC-08. TI final: los 13 documentos." }
    ], "Preparar PDF").then(function (r) {
      if (!r) return;
      var code = r.entrega === "E1" ? "E1" : (r.entrega === "E2" ? "E2" : "Final");
      if (code === "Final" && lessonsList().length < 5) { notify("Para exportar el TI final hacen falta 5 lecciones aprendidas como mínimo (panel de cierre)."); return; }
      var D = tiDocs(code !== "E1"), codes = TI_SETS[code];
      var label = { E1: "Entrega 1 (E1)", E2: "Entrega 2 (E2)", Final: "Trabajo Integrador final" }[code];
      var safe = r.surname.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "") || "Alumno";
      var cover = '<section class="pcover"><h1>TI-00 · Portada e índice</h1><div class="sub">EGCI Escuela de Gerencia · Máster en Project Management 2026 · Trabajo Integrador</div>' +
        '<table class="kv"><tbody><tr><th scope="row">Alumno/a</th><td>' + esc(r.fullname) + '</td></tr><tr><th scope="row">Proyecto</th><td>' + esc(CASOS[currentProjectId] ? CASOS[currentProjectId].title : "") + '</td></tr><tr><th scope="row">Entrega</th><td>' + label + '</td></tr><tr><th scope="row">Archivo</th><td>TI_' + esc(safe) + "_" + code + '.pdf</td></tr><tr><th scope="row">Generado</th><td>' + esc(dateToISO(new Date())) + "</td></tr></tbody></table>" +
        "<h2>Índice</h2><ol class=\"idx\">" + codes.map(function (c) { return "<li>" + c + " · " + esc(D[c].title) + "</li>"; }).join("") + "</ol></section>";
      $("printArea").innerHTML = cover + codes.map(function (c) { return '<section class="pdoc"><h2>' + c + " · " + esc(D[c].title) + "</h2>" + D[c].html + "</section>"; }).join("") + '<div class="attribPrint">' + esc(CONFIG.ATTRIBUTION) + "</div>";
      var prev = document.title; document.title = "TI_" + safe + "_" + code;
      window.addEventListener("afterprint", function () { document.title = prev; }, { once: true });
      track("exportar_ti_pdf", { entrega: code });
      notify("En el cuadro de impresión elegí \"Guardar como PDF\". El archivo se va a llamar TI_" + safe + "_" + code + ".pdf.");
      setTimeout(function () { window.print(); }, 200);
    });
  }

  /* ===================== captación (no bloquea) ===================== */
  function maybeShowLead(trigger) {
    if (!CONFIG.LEAD_ENABLED) return; if (leadShownThisSession || store.get("ptTI.lead") === "dismissed" || store.get("ptTI.lead") === "opened") return;
    leadShownThisSession = true;
    var c = $("leadCard");
    c.innerHTML = '<p><strong>' + esc(CONFIG.LEAD_TITLE) + "</strong> " + esc(CONFIG.LEAD_TEXT) + '</p><div class="leadActions"><button type="button" class="btn-primary" data-action="openSubscribe" data-origin="' + esc(trigger) + '" data-fid="lead:yes">Quiero suscribirme</button><button type="button" data-action="dismissLead" data-fid="lead:no">Ahora no</button></div>';
    c.hidden = false;
  }
  function openSubscribe(origin) {
    track("abrir_formulario_suscripcion", { origen: origin || "manual" });
    store.set("ptTI.lead", "opened");
    $("leadCard").hidden = true;
    var box = document.createElement("div"); box.className = "dlgBox wide"; box.setAttribute("aria-labelledby", "dlgTitle");
    box.innerHTML = '<h2 id="dlgTitle">Suscribite</h2><p style="margin:0">' + esc(CONFIG.LEAD_TEXT) + '</p><iframe src="' + esc(CONFIG.SUBSCRIBE_URL) + '" title="Formulario de suscripción" loading="lazy"></iframe><div class="dlgBtns"><button type="button" class="dlgCancel">Cerrar</button></div>';
    var close = openModal(box, null); box.querySelector(".dlgCancel").addEventListener("click", function () { close(null); }); box.querySelector(".dlgCancel").focus();
  }

  /* ===================== eventos ===================== */
  var ACTIONS = {
    downloadJson: downloadJson, exportCsv: exportCsv, print: printView, exportTi: exportTiPdf,
    addStakeholder: addStakeholder, preloadStakeholders: preloadStakeholders,
    deleteStakeholder: function (el) { delFrom("¿Eliminar a este interesado del registro?", function () { return stakeholders; }, function (l) { stakeholders = l; }, el.dataset.id); },
    importJson: function () { $("importFile").click(); },
    exportExcel: function (el) { exportExcel(el); },
    saveScenario: saveScenario, setBaseline: setBaseline, addTask: addTask, level: levelResources, undoLevel: undoLeveling, undo: undo, redo: redo,
    ftToggle: toggleFastTrack,
    clearBaselines: function () { if (!baselines.length) return; confirmBox("¿Quitar todas las líneas base?", "Quitar").then(function (ok) { if (ok) { pushHistory(); baselines = []; render(); } }); },
    toggleBaseline: function (el) { pushHistory(); var b = baselines[+el.dataset.i]; b.visible = !b.visible; render(); },
    deleteBaseline: function (el) { var i = +el.dataset.i; confirmBox('¿Eliminar "' + baselines[i].name + '"?').then(function (ok) { if (ok) { pushHistory(); baselines.splice(i, 1); render(); } }); },
    loadScenario: function (el) { loadScenario(+el.dataset.i); },
    deleteTask: function (el) { deleteTask(el.dataset.id); }, editNote: function (el) { editNote(el.dataset.id); }, extraRes: function (el) { editExtraResources(el.dataset.id); },
    cycleRaci: function (el) { cycleRaci(el.dataset.id, +el.dataset.pi); }, addRaciPerson: addRaciPerson, addRisk: addRisk,
    deleteRisk: function (el) { delFrom("¿Eliminar este riesgo?", function () { return risks; }, function (l) { risks = l; }, el.dataset.id); },
    addComm: addComm, deleteComm: function (el) { delFrom("¿Eliminar esta fila del plan de comunicaciones?", function () { return comms; }, function (l) { comms = l; }, el.dataset.id); },
    addChange: addChange, deleteChange: function (el) { delFrom("¿Eliminar este cambio?", function () { return changeLog; }, function (l) { changeLog = l; }, el.dataset.id); },
    addDecision: addDecision, deleteDecision: function (el) { delFrom("¿Eliminar esta decisión?", function () { return decisionLog; }, function (l) { decisionLog = l; }, el.dataset.id); },
    cycleKanban: function (el) { var t = taskById(el.dataset.id); if (!t) return; pushHistory(); t.pct = t.pct === 0 ? 50 : (t.pct < 100 ? 100 : 0); render(); },
    genInforme: renderInformeCierre, copyInforme: copyInforme,
    useToday: function () {
      var today = dateToISO(new Date()), end = getPlannedRef().projectEnd, d = dayOffsetFromDate(today);
      if (today < startDateValue() || d >= end) {
        cutoffDay = suggestedCutoff(); setDirty(true); render();
        notify("Hoy (" + today + ") cae fuera del cronograma del caso (" + startDateValue() + " a " + workdayISO(Math.max(0, end - 1)) + "). Se usó el corte sugerido: " + workdayISO(cutoffDay) + ".");
        return;
      }
      cutoffDay = d; setDirty(true); render();
    },
    useSuggestedCutoff: function () { cutoffDay = suggestedCutoff(); setDirty(true); render(); },
    recalibrateCosts: recalibrateCosts,
    addHoliday: addHoliday, pasteHolidays: pasteHolidays,
    deleteHoliday: function (el) { pushHistory(); holidays = holidays.filter(function (h) { return h !== el.dataset.date; }); render(); },
    clearHolidays: function () { confirmBox("¿Quitar todos los feriados cargados?", "Quitar").then(function (ok) { if (ok) { pushHistory(); holidays = []; render(); } }); },
    loadHolidayPreset: function () {
      var r = applyHolidayPreset(holidayCountry, [holidayYear]);
      if (!r.loaded.length) { notify("Falta el dato: no hay lista precargada de feriados para ese país y año. Pegá la lista oficial."); return; }
      pushHistory(); holidays = holidays.filter(function (h) { return yearOf(h) !== holidayYear; }).concat(r.list).sort(); render();
      notify("Se cargó la lista de " + FERIADOS[holidayCountry].nombre + " " + holidayYear + ". Verificala con la fuente oficial.");
    },
    copyStatus: copyStatus, exportStatusPdf: exportStatusPdf, exportIcs: exportIcs,
    addIssue: addIssue, deleteIssue: function (el) { delFrom("¿Eliminar este registro?", function () { return issues; }, function (l) { issues = l; }, el.dataset.id); },
    runSim: runSimulation,
    threeExample: function () {
      computeSchedule(tasks);
      var crit = leafTasks().filter(function (t) { return t.critical && t.dur > 0; });
      if (!crit.length) { notify("No hay tareas críticas con duración para completar."); return; }
      pushHistory();
      crit.forEach(function (t) { t.opt = Math.min(t.dur, Math.max(1, Math.round(t.dur * 0.8))); t.pess = Math.max(t.dur, Math.round(t.dur * 1.5)); });
      render(); notify("Cargué un rango de ejemplo (−20 % / +50 %) en " + crit.length + " tarea(s) crítica(s). Reemplazalo con tus estimaciones reales.");
    },
    threeClear: function () {
      if (!tasks.some(function (t) { return isNum(t.opt) || isNum(t.pess); })) return;
      confirmBox("¿Borrar las estimaciones de tres puntos de todas las tareas?", "Borrar").then(function (ok) { if (ok) { pushHistory(); tasks.forEach(function (t) { t.opt = null; t.pess = null; }); render(); } });
    },
    addCr: addCr, crApprove: function (el) { decideCr(el.dataset.id, "Aprobada"); }, crReject: function (el) { decideCr(el.dataset.id, "Rechazada"); }, crDefer: function (el) { decideCr(el.dataset.id, "Diferida"); },
    deleteCr: function (el) { delFrom("¿Eliminar esta solicitud de cambio?", function () { return crList; }, function (l) { crList = l; }, el.dataset.id); },
    openSubscribe: function (el) { openSubscribe(el.dataset.origin); },
    dismissLead: function () { store.set("ptTI.lead", "dismissed"); $("leadCard").hidden = true; }
  };
  var CHANGE = {
    dur: function (el) {
      var t = taskById(el.dataset.id), v = parseInt(el.value, 10);
      if (isNaN(v) || v < 0 || v > 2000) v = t.dur;
      var orig = ORIGINAL_DURS[t.id];
      if (orig !== undefined && v < orig && !t.crashCostPerDay) { el.value = t.dur; notify("No se puede acelerar la tarea " + t.id + ": depende de un tercero."); return; }
      if (v === t.dur) return; pushHistory(); t.dur = v; queueRender();
    },
    preds: function (el) {
      var t = taskById(el.dataset.id); if (!t) return;
      if (el.value.trim() === predsText(t)) return;
      var ps = parsePredSpec(el.value, t.id, tasks);
      if (ps.error) { notify(ps.error); queueRender(); return; }
      var test = cloneTasks(tasks), tt = test.filter(function (x) { return x.id === t.id; })[0];
      tt.preds = ps.preds; tt.deps = Object.keys(ps.deps).length ? ps.deps : undefined;
      if (detectCycle(test).indexOf(t.id) >= 0 && detectCycle(tasks).indexOf(t.id) < 0) { notify("Esas predecesoras crean una dependencia circular: la tarea " + t.id + " terminaría dependiendo de sí misma."); queueRender(); return; }
      pushHistory(); t.preds = ps.preds; if (Object.keys(ps.deps).length) t.deps = ps.deps; else delete t.deps; queueRender();
    },
    pct: function (el) { var t = taskById(el.dataset.id), v = Math.max(0, Math.min(100, parseInt(el.value, 10) || 0)); if (v === t.pct) return; pushHistory(); t.pct = v; queueRender(); },
    resource: function (el) {
      var t = taskById(el.dataset.id);
      if (el.value === "__new__") { askForm("Nuevo recurso", [{ key: "name", label: "Nombre (persona o proveedor)", value: "", required: true }], "Agregar").then(function (r) { if (r) { pushHistory(); t.resource = r.name.trim(); } render(); }); return; }
      if (el.value === t.resource) return; pushHistory(); t.resource = el.value; queueRender();
    },
    dateStart: function (el) {
      var t = taskById(el.dataset.id); if (!el.value) { queueRender(); return; }
      computeSchedule(tasks);
      var natural = t._es - (t.levelDelay || 0), desired = dayOffsetFromDate(el.value), nd = desired - natural;
      if (nd < 0) { notify("Esta tarea no puede empezar antes de que terminen sus predecesoras. Se ajustó a la fecha más temprana posible."); nd = 0; }
      pushHistory(); t.levelDelay = nd; queueRender();
    },
    dateFinish: function (el) {
      var t = taskById(el.dataset.id); if (!el.value) { queueRender(); return; }
      computeSchedule(tasks);
      var newDur = (dayOffsetFromDate(el.value) + 1) - t._es, orig = ORIGINAL_DURS[t.id];
      if (orig !== undefined && newDur < orig && !t.crashCostPerDay) { notify("No se puede acelerar esta tarea (depende de un tercero): el fin no puede ser anterior al que da su duración mínima."); queueRender(); return; }
      pushHistory(); t.dur = Math.max(0, newDur); queueRender();
    },
    threshold: function (el) { nearThreshold = Math.max(1, parseInt(el.value, 10) || 5); queueRender(); },
    startDate: function () { if (!isISO($("startDate").value)) { notify("La fecha de inicio no es válida."); return; } pushHistory(); queueRender(); },
    actualStart: function (el) { pushHistory(); actualStart = el.value; queueRender(); },
    actualFinish: function (el) { pushHistory(); actualFinish = el.value; queueRender(); },
    plannedFinish: function (el) { pushHistory(); plannedFinishOverride = el.value; queueRender(); },
    cutoff: function (el) { if (!el.value) return; cutoffDay = dayOffsetFromDate(el.value); setDirty(true); queueRender(); },
    ac: function (el) { var v = parseFloat(el.value); acActual = isNaN(v) ? null : v; setDirty(true); queueRender(); },
    objField: function (el) {
      var obj = objByName(el.dataset.obj), k = el.dataset.key;
      if ((obj[k] || "") === el.value) return;
      pushHistory(); obj[k] = el.value; refreshChecks();
    },
    stkField: function (el) {
      var s = stakeholders.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!s) return;
      var k = el.dataset.key; if ((s[k] || "") === el.value) return;
      pushHistory(); s[k] = el.value; queueRender();
    },
    issueField: function (el) {
      var x = issues.filter(function (i) { return i.id === el.dataset.id; })[0]; if (!x) return;
      var k = el.dataset.key; if ((x[k] || "") === el.value) return;
      pushHistory(); x[k] = el.value; queueRender();
    },
    riskField: function (el) {
      var r = risks.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!r) return;
      var k = el.dataset.key, v = el.value;
      if (k === "probPct") { var p = num(v); v = p === null ? "" : String(Math.max(0, Math.min(100, p))); }
      else if (k === "impactUsd" || k === "actualCost") { var q = num(v); v = q === null ? "" : String(Math.max(0, q)); }
      if (String(r[k] || "") === v) return;
      pushHistory(); r[k] = v; queueRender();
    },
    threeField: function (el) {
      var t = taskById(el.dataset.id); if (!t) return;
      var k = el.dataset.key, v = num(el.value); if (v !== null) v = Math.max(0, Math.min(2000, Math.round(v)));
      if ((isNum(t[k]) ? t[k] : null) === v) return;
      pushHistory(); t[k] = v; queueRender();
    },
    taskAc: function (el) { var t = taskById(el.dataset.id); pushHistory(); t.acTask = el.value === "" ? null : Math.max(0, parseFloat(el.value) || 0); queueRender(); },
    dailyCost: function (el) { var t = taskById(el.dataset.id); var v = parseFloat(el.value); pushHistory(); t.dailyCost = isNaN(v) || v < 0 ? null : v; queueRender(); },
    ftSelect: function (el) { ftTaskId = el.value; queueRender(); },
    ftPct: function (el) { ftPct = Math.max(5, Math.min(75, parseInt(el.value, 10) || 25)); queueRender(); },
    riskTask: function (el) { var r = risks.filter(function (x) { return x.id === el.dataset.id; })[0]; if (r) { pushHistory(); r.taskId = el.value; queueRender(); } },
    charter: function (el) { if ((charter[el.dataset.key] || "") === el.value) return; pushHistory(); charter[el.dataset.key] = el.value; refreshChecks(); },
    lessons: function (el) { if (lessons === el.value) return; pushHistory(); lessons = el.value; refreshChecks(); },
    holCountry: function (el) { holidayCountry = el.value; queueRender(); },
    holYear: function (el) { holidayYear = parseInt(el.value, 10); queueRender(); },
    project: function (el) {
      var id = el.value, prev = currentProjectId;
      function go() { loadProject(id); track("cambio_de_caso", { caso_id: id }); maybeRestore(id); }
      autosaveNow(); // el progreso del caso actual se guarda solo antes de cambiar
      if (!isDirty) { go(); return; }
      confirmBox("No se pudo guardar el progreso de este caso en el navegador y se perdería al cambiar de caso. Descargá la copia de seguridad antes de cambiar. ¿Cambiar igual?", "Cambiar de caso").then(function (ok) { if (ok) go(); else el.value = prev; });
    }
  };

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]"); if (!el) return;
    var h = ACTIONS[el.dataset.action]; if (h) h(el, e);
  });
  document.addEventListener("change", function (e) {
    var el = e.target.closest("[data-change]"); if (!el) return;
    var h = CHANGE[el.dataset.change]; if (h) h(el, e);
  });
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-panel]"); if (el) togglePanel(el.dataset.panel);
  });
  document.addEventListener("keydown", function (e) {
    var tag = e.target && e.target.tagName, typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    var mod = e.ctrlKey || e.metaKey, k = (e.key || "").toLowerCase();
    if (mod && !typing) {
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === "y" || (e.shiftKey && k === "z")) { e.preventDefault(); redo(); }
    }
    // Alt + flechas arriba/abajo: moverse entre filas de la tabla en la misma columna
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && e.target.dataset && e.target.dataset.fid && e.target.closest("#taskbody")) {
      var parts = e.target.dataset.fid.split(":"), col = parts[0], ids = leafTasks().map(function (t) { return t.id; });
      var i = ids.indexOf(parts.slice(1).join(":")), n = ids[i + (e.key === "ArrowDown" ? 1 : -1)];
      if (n) { var nx = document.querySelector('[data-fid="' + col + ":" + n + '"]'); if (nx) { e.preventDefault(); nx.focus(); } }
    }
  });
  // Al cerrar: primero se guarda lo pendiente; solo se avisa si el navegador no dejó guardar.
  window.addEventListener("beforeunload", function (e) { autosaveNow(); if (isDirty || autosaveFailed) { e.preventDefault(); e.returnValue = ""; return ""; } });
  document.addEventListener("visibilitychange", function () { if (document.hidden) autosaveNow(); });

  /* ---- arrastre del Gantt con pointer events (mouse, táctil, lápiz) + teclado ---- */
  function bindGantt() {
    var gb = $("ganttBody");
    gb.addEventListener("pointerdown", function (e) {
      var bar = e.target.closest("[data-bar]"); if (!bar) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = taskById(bar.dataset.bar); if (!t) return;
      drag = { id: t.id, startX: e.clientX, lastX: e.clientX, startDelay: t.levelDelay || 0, moved: false, raf: 0, pointerId: e.pointerId };
      try { gb.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      e.preventDefault();
    });
    gb.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag.lastX = e.clientX;
      if (!drag.raf) drag.raf = requestAnimationFrame(applyDrag);
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== undefined && e.pointerId !== drag.pointerId)) return;
      if (drag.raf) cancelAnimationFrame(drag.raf);
      applyDrag(true);
      var id = drag.id; drag = null; render();
      var b = document.querySelector('[data-fid="bar:' + id + '"]'); if (b) b.focus({ preventScroll: true });
    }
    gb.addEventListener("pointerup", endDrag); gb.addEventListener("pointercancel", endDrag);
    gb.addEventListener("keydown", function (e) {
      var bar = e.target.closest("[data-bar]"); if (!bar) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var t = taskById(bar.dataset.bar); if (!t) return; e.preventDefault();
      pushHistory(); t.levelDelay = Math.max(0, (t.levelDelay || 0) + (e.key === "ArrowRight" ? 1 : -1)); render();
    });
  }
  function applyDrag() {
    if (!drag) return; drag.raf = 0;
    var t = taskById(drag.id); if (!t) return;
    var nd = Math.max(0, drag.startDelay + Math.round((drag.lastX - drag.startX) / DAY_PX));
    if (nd === (t.levelDelay || 0)) return;
    if (!drag.moved) { pushHistory(); drag.moved = true; }
    t.levelDelay = nd; render();
  }

  /* ===================== inicio ===================== */
  function init() {
    if (!caseIds().length) { var b = $("cycleBanner"); b.textContent = "No se cargaron los casos de proyecto (falta data/casos-*.js)."; b.className = "banner error"; b.hidden = false; return; }
    populateProjectSelect(); bindGantt();
    $("importFile").addEventListener("change", function (e) { importFile(e.target.files[0]); e.target.value = ""; });
    $("lessonsInput").setAttribute("data-change", "lessons");
    Array.prototype.forEach.call(document.querySelectorAll("[data-panel]"), function (b) { b.setAttribute("aria-expanded", "false"); });
    $("year").textContent = String(new Date().getFullYear());
    if (CONFIG.WHATSAPP_URL) { var w = $("waBtn"); w.href = CONFIG.WHATSAPP_URL; w.hidden = false; }
    var last = store.get(lastCaseKey()), first = (last && CASOS[last]) ? last : caseIds()[0];
    loadProject(first); maybeRestore(first);
    if ($("exportTiBtn")) $("exportTiBtn").hidden = !EGCI;
    track("herramienta_abierta", { audiencia: META.audience });
  }
  // utilidad de pruebas (no se usa en producción)
  window.__PTI_TEST__ = { computeScheduleOn: computeScheduleOn, validateState: validateState, getState: function () { return { tasks: tasks, holidays: holidays, risks: risks, issues: issues, crList: crList, baselines: baselines, changeLog: changeLog, charter: charter, comms: comms }; }, workdayISO: workdayISO, dayOffsetFromDate: dayOffsetFromDate, computeEVM: computeEVM,
    parsePredSpec: parsePredSpec, predsText: predsText, buildIcs: buildIcs, statusData: statusData, buildStatusText: buildStatusText, statusRows: statusRows, reserveData: reserveData, pertAnalysis: pertAnalysis, runChecks: runChecks, serializeState: serializeState, applyImport: applyImport, applyChangeRequest: applyChangeRequest, crTaskCheck: crTaskCheck, loadProject: loadProject, buildInformeText: buildInformeText, tiDocs: tiDocs, icsFold: icsFold, getSim: function () { return simResult; }, setCutoff: function (d) { cutoffDay = d; } };
  window.__PTI_ACTIONS__ = { ACTIONS: ACTIONS, CHANGE: CHANGE };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
