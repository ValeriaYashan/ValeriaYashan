/* Planificador TI — Valeria Yashan · valeriayashan.com.ar
   JavaScript vanilla, sin frameworks. Datos de casos en data/casos-*.js, feriados en data/feriados.js. */
(function () {
  "use strict";

  /* ===================== CONFIGURACIÓN (completar lo que falta) ===================== */
  var CONFIG = {
    APP_ID: "planificador-ti-valeriayashan",
    SCHEMA_VERSION: 4,        // 4: tareas inactivas, cortes de EVM, registro de tiempo, trazabilidad y reglas de alerta; 3: dependencias tipadas, tres puntos, problemas y acciones, riesgos con valor monetario y solicitudes de cambio
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
  var evmCuts = [], timeLog = [], traceItems = [], traceLinks = {}, alertCfg = defaultAlertCfg(), eacMethod = "cpi";
  function defaultAlertCfg() { return { lateCrit: 10, cpiMin: 0.9, spiMin: 0.9, contPct: 25 }; }
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
  function finishISO(t) { return t.dur === 0 || t.inactive ? workdayISO(t._es) : workdayISO(t._ef - 1); }
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
    function D(t) { return t.inactive ? 0 : t.dur; }
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
          else if (d.type === "FF") vals.push(EF(pt) + d.lag - D(t));
          else if (d.type === "SF") vals.push(ES(pt) + d.lag - D(t));
          else vals.push(EF(pt) + d.lag - (t.overlapDays || 0));
        });
        if (vals.length) dep = Math.max(0, Math.max.apply(null, vals));
      }
      t._es = dep + (t.levelDelay || 0);
      return t._es;
    }
    function EF(t) { ES(t); t._ef = t._es + D(t); return t._ef; }
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
        if (d.type === "SS") v = LS(s) - d.lag + D(t);
        else if (d.type === "FF") v = LF(s) - d.lag;
        else if (d.type === "SF") v = LF(s) - d.lag + D(t);
        else v = LS(s) - d.lag + (s.overlapDays || 0); // si la sucesora está solapada (seguimiento rápido), el fin más tardío se adelanta ese solape
        if (v < lf) lf = v;
      });
      t._lf = lf;
      return lf;
    }
    function LS(t) { LF(t); t._ls = t._lf - D(t); return t._ls; }
    list.forEach(LS);
    list.forEach(function (t) {
      t.slack = t._ls - t._es;
      t.cycleError = cycSet.has(t.id);
      t.critical = t.slack === 0 && !t.cycleError && !t.inactive;
      t.near = !t.critical && !t.inactive && t.slack <= nearThreshold;
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
  function logCostOf(e, tk) { return isNum(e.cost) && e.cost > 0 ? e.cost : (isNum(e.days) ? e.days * (tk ? getDailyCost(tk) : 0) : 0); }
  // opts: { cut: día de corte (por defecto el vigente), fromLog: true para calcular el AC solo con el registro de tiempo hasta ese corte, method: "cpi"|"plan"|"cpispi" }
  function computeEVM(opts) {
    opts = opts || {};
    computeSchedule(tasks);
    var cut = opts.cut !== undefined ? opts.cut : cutoffDay, method = opts.method || eacMethod;
    var cutISO = workdayISO(cut) || "";
    var planned = getPlannedRef();
    var BAC = 0, PV = 0, EV = 0, perTask = [], byId = {};
    tasks.forEach(function (t) {
      if (t.inactive) return;
      var dc = getDailyCost(t);
      var pRef = planned.schedule[t.id] || { es: t._es, ef: t._ef, dur: t.dur };
      var budget = pRef.dur * dc;
      BAC += budget;
      PV += Math.max(0, Math.min(cut - pRef.es, pRef.dur)) * dc;
      var pct = opts.fromLog ? logPctAt(t.id, cutISO) : t.pct;
      var ev = (pct / 100) * budget;
      EV += ev;
      var row = { t: t, budget: budget, ev: ev, dc: dc }; perTask.push(row); byId[t.id] = row;
    });
    // Costo real: el valor manual por tarea manda; si no hay, el registro de tiempo (entradas con fecha <= corte); si tampoco, el valor global o se estima igual al VG.
    var logAC = 0, logHas = {}, anyLog = false;
    timeLog.forEach(function (e) {
      if (!e.date || e.date > cutISO) return;
      var tk = null; tasks.forEach(function (x) { if (x.id === e.taskId) tk = x; });
      if (tk && tk.inactive) return;
      logAC += logCostOf(e, tk); logHas[e.taskId] = (logHas[e.taskId] || 0) + logCostOf(e, tk); anyLog = true;
    });
    var anyTaskAc = !opts.fromLog && tasks.some(function (t) { return !t.inactive && t.acTask !== null && t.acTask !== undefined; });
    var AC, acEstimated = false, acFromLog = false;
    if (anyTaskAc) {
      AC = perTask.reduce(function (s, p) { var v = p.t.acTask; return s + ((v !== null && v !== undefined) ? v : (logHas[p.t.id] !== undefined ? logHas[p.t.id] : p.ev)); }, 0);
      if (anyLog) acFromLog = true;
    } else if (anyLog) {
      AC = perTask.reduce(function (s, p) { return s + (logHas[p.t.id] !== undefined ? logHas[p.t.id] : p.ev); }, 0); acFromLog = true;
    } else if (!opts.fromLog && acActual !== null) {
      AC = acActual;
    } else { AC = EV; acEstimated = true; }
    var CPI = AC > 0 ? EV / AC : (EV > 0 ? Infinity : 1);
    var SPI = PV > 0 ? EV / PV : (EV > 0 ? Infinity : 1);
    var eacCpi = (CPI > 0 && isFinite(CPI)) ? BAC / CPI : BAC;
    var eacPlan = AC + (BAC - EV);
    var den = CPI * SPI, eacBoth = (den > 0 && isFinite(den)) ? AC + (BAC - EV) / den : BAC;
    var EAC = method === "plan" ? eacPlan : (method === "cpispi" ? eacBoth : eacCpi);
    var ETC = EAC - AC;
    var tcpiBac = (BAC - AC) !== 0 && (BAC - EV) / (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : null;
    var tcpiEac = (EAC - AC) !== 0 && (BAC - EV) / (EAC - AC) > 0 ? (BAC - EV) / (EAC - AC) : null;
    var estDur = (SPI > 0 && isFinite(SPI)) ? planned.projectEnd / SPI : null;
    return { BAC: BAC, PV: PV, EV: EV, AC: AC, CPI: CPI, SPI: SPI, EAC: EAC, VAC: BAC - EAC, CV: EV - AC, SV: EV - PV, ETC: ETC,
      eacCpi: eacCpi, eacPlan: eacPlan, eacBoth: eacBoth, method: method, tcpiBac: tcpiBac, tcpiEac: tcpiEac, estDur: estDur,
      cut: cut, cutISO: cutISO, acFromLog: acFromLog,
      planned: planned, perTask: perTask, anyTaskAc: anyTaskAc, acEstimated: acEstimated };
  }
  // % de avance de una tarea a una fecha, según el registro de tiempo (última entrada con pct hasta esa fecha); si no hay, el avance vigente.
  function logPctAt(taskId, iso) {
    var best = null;
    timeLog.forEach(function (e) { if (e.taskId === taskId && isNum(e.pct) && e.date <= iso && (!best || e.date >= best.date)) best = e; });
    if (best) return best.pct;
    var any = timeLog.some(function (e) { return e.taskId === taskId && isNum(e.pct); });
    if (any) return 0;
    var r = 0; tasks.forEach(function (t) { if (t.id === taskId) r = t.pct; }); return r;
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
      stakeholders: stakeholders, teamCharter: teamCharter, mgmtPlan: mgmtPlan, changeRequest: changeRequest, issues: issues, crList: crList,
      evmCuts: evmCuts, timeLog: timeLog, traceItems: traceItems, traceLinks: traceLinks, alertCfg: alertCfg, eacMethod: eacMethod });
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
    evmCuts = s.evmCuts || []; timeLog = s.timeLog || []; traceItems = s.traceItems || []; traceLinks = s.traceLinks || {}; alertCfg = s.alertCfg || defaultAlertCfg(); eacMethod = s.eacMethod || "cpi";
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
      if (!store.get(bakKey() + ".first")) store.set(bakKey() + ".first", new Date().toISOString());
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
    evmCuts = []; timeLog = []; traceItems = []; traceLinks = {}; alertCfg = defaultAlertCfg(); eacMethod = "cpi";
    charter = clone(proj.charter || {});
    charter.contingency = charter.contingency || ""; charter.mgmtReserve = charter.mgmtReserve || "";
    comms = (charter.stakeholders || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 2).map(function (s, i) {
      return { id: "C" + (i + 1), stakeholder: s.trim(), info: i === 0 ? "Avance general del proyecto" : "Impacto en su área",
        freq: i === 0 ? "Semanal" : "Quincenal", channel: "Reunión / email", owner: "PM" };
    });
    traceSeed();
    changeLog = []; decisionLog = []; lessons = ""; history = []; future = [];
    scenarios = [{ name: "Plan original", snap: { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) } }];
    activeScenario = 0; ftTaskId = ""; lastSavedAt = ""; autosaveFailed = false; clearTimeout(autosaveTimer);
    if (silent) { isDirty = false; return; }
    setDirty(false);
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
        var locked = ORIGINAL_DURS[t.id] !== undefined && !t.crashCostPerDay && !isCustomCase();
        var riskCount = risks.filter(function (rk) { return rk.taskId === t.id; }).length;
        var opts = resOptions.map(function (r) { return '<option value="' + esc(r) + '"' + (t.resource === r ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("") + '<option value="__new__">+ Nuevo recurso…</option>';
        if (resOptions.indexOf(t.resource) < 0 && t.resource) opts = '<option value="' + esc(t.resource) + '" selected>' + esc(t.resource) + "</option>" + opts;
        var nExtra = (t.extraResources || []).length;
        var id = esc(t.id);
        rows += '<tr class="leaf' + (t.inactive ? " inactive-row" : (t.critical ? " crit-row" : (t.near ? " near-row" : ""))) + '" data-row="' + id + '">' +
          '<td class="wbs">' + id + "</td>" +
          '<td class="name indent-2">' + esc(t.name) + (riskCount ? '<span class="riskTag" title="' + riskCount + ' riesgo(s) asociado(s)" aria-label="' + riskCount + ' riesgo(s) asociado(s)">!</span>' : "") +
          '<button type="button" class="noteBtn" data-action="editNote" data-id="' + id + '" data-fid="note:' + id + '" aria-label="' + (t.notes ? "Editar nota" : "Agregar nota") + " de la tarea " + id + '">' + (t.notes ? "Nota" : "+ nota") + "</button></td>" +
          '<td class="res"><div class="resCell"><select class="cell-input resSelect" data-change="resource" data-id="' + id + '" data-fid="res:' + id + '" aria-label="Recurso principal de la tarea ' + id + '">' + opts + "</select>" +
          '<button type="button" class="more" data-action="extraRes" data-id="' + id + '" data-fid="more:' + id + '" aria-label="Recursos secundarios de la tarea ' + id + ' (' + nExtra + ')">+' + nExtra + "</button></div></td>" +
          '<td class="dur"><input class="cell-input durInput' + (locked ? " locked" : "") + '" type="number" min="0" max="2000" value="' + t.dur + '" data-change="dur" data-id="' + id + '" data-fid="dur:' + id + '" aria-label="Duración en días hábiles de la tarea ' + id + '"' + (locked ? ' title="No se puede acelerar: depende de un tercero"' : "") + "></td>" +
          '<td class="dates"><input type="date" class="cell-input dateInput" data-change="dateStart" data-id="' + id + '" data-fid="ds:' + id + '" value="' + esc(startISO(t)) + '" aria-label="Inicio de la tarea ' + id + '"></td>' +
          '<td class="dates"><input type="date" class="cell-input dateInput" data-change="dateFinish" data-id="' + id + '" data-fid="df:' + id + '" value="' + esc(finishISO(t)) + '" aria-label="Fin (último día hábil) de la tarea ' + id + '"></td>' +
          '<td class="pred"><input type="text" class="cell-input predInput" value="' + esc(predsText(t)) + '" placeholder="—" data-change="preds" data-id="' + id + '" data-fid="pr:' + id + '" aria-label="Predecesoras de la tarea ' + id + '. IDs separados por coma; tipo FC, CC, FF o CF y desfase opcionales, por ejemplo 1.2.1CC+2"></td>' +
          '<td class="slack">' + (t.inactive ? "pausada" : (t.dur === 0 ? "—" : (t.critical ? "0 (crítica)" : t.slack + "d"))) + "</td>" +
          '<td class="pct"><input class="cell-input pctInput" type="number" min="0" max="100" value="' + t.pct + '" data-change="pct" data-id="' + id + '" data-fid="pct:' + id + '" aria-label="Porcentaje completado de la tarea ' + id + '"></td>' +
          '<td class="actcol"><div class="actrow"><button type="button" class="delBtn why" data-action="explainTask" data-id="' + id + '" data-fid="why:' + id + '" aria-label="¿Por qué esta fecha? Tarea ' + id + '" title="¿Por qué esta fecha?">?</button><button type="button" class="delBtn pause" data-action="toggleInactive" data-id="' + id + '" data-fid="pau:' + id + '" aria-pressed="' + (t.inactive ? "true" : "false") + '" aria-label="' + (t.inactive ? "Reactivar" : "Pausar (qué pasa si no se hace)") + ' la tarea ' + id + '" title="' + (t.inactive ? "Reactivar la tarea" : "Pausar: simula qué pasa si esta tarea no se hace") + '">' + (t.inactive ? "Activar" : "Pausa") + '</button><button type="button" class="delBtn" data-action="deleteTask" data-id="' + id + '" data-fid="del:' + id + '" aria-label="Eliminar la tarea ' + id + '">✕</button></div></td></tr>';
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
        var cls = t.inactive ? "inactive" : (t.critical ? "critical" : (t.near ? "nearcrit" : "normal"));
        var bar = document.createElement("div");
        if (t.dur === 0) { bar.className = "milestone " + cls; bar.style.left = (t._es * DAY_PX - 8) + "px"; }
        else { bar.className = "bar leafbar " + cls + (drag && drag.id === t.id ? " dragging" : ""); bar.style.left = (t._es * DAY_PX) + "px"; bar.style.width = Math.max(t.dur * DAY_PX, 4) + "px"; }
        bar.dataset.bar = t.id; bar.dataset.fid = "bar:" + t.id; bar.tabIndex = 0; bar.setAttribute("role", "button");
        var estado = t.inactive ? "pausada (escenario: no se hace)" : (t.critical ? "ruta crítica" : (t.near ? "casi crítica" : "con holgura"));
        var label = (t.dur === 0 ? "Hito " : "Tarea ") + t.id + " " + t.name + ", del " + startISO(t) + " al " + finishISO(t) + ", " + estado + ", holgura " + t.slack + " días. Flechas izquierda y derecha: mover un día.";
        bar.setAttribute("aria-label", label); bar.title = t.name + " — arrastrá para mover (holgura " + t.slack + "d)";
        if (t.pct > 0 && t.dur > 0) { var f = document.createElement("div"); f.className = "fill"; f.style.width = t.pct + "%"; f.setAttribute("aria-hidden", "true"); bar.appendChild(f); }
        var rc = risks.filter(function (rk) { return rk.taskId === t.id; });
        if (rc.length) { var rb = document.createElement("div"); rb.className = "barrisk"; rb.textContent = "!"; rb.title = rc.map(function (r) { return r.desc; }).join(" · "); rb.setAttribute("aria-hidden", "true"); bar.appendChild(rb); }
        row.appendChild(bar);
        if (t.slack > 0 && !t.inactive) {
          var gh = document.createElement("div"); gh.className = "ghost" + (t.near ? " near" : ""); gh.style.left = (t._ef * DAY_PX) + "px"; gh.style.width = Math.max(t.slack * DAY_PX, 2) + "px"; gh.setAttribute("aria-hidden", "true"); row.appendChild(gh);
        }
        // Línea base superpuesta: la última visible va como banda de 5 px bajo la barra; las anteriores, como trazos finos arriba. Sin líneas base, se muestra el plan original donde difiere.
        var vis = baselines.filter(function (bl) { return bl.visible && bl.byId[t.id]; }), refEnd = null;
        vis.forEach(function (bl, i) {
          var b = bl.byId[t.id], d = document.createElement("div"), latest = i === vis.length - 1;
          d.className = "baseline" + (latest ? " band" : " thin");
          d.style.background = "var(--baseline-" + ((baselines.indexOf(bl) % 4) + 1) + ")";
          if (!latest) d.style.top = (1 + (vis.length - 2 - i) * 3) + "px";
          d.style.left = (b.es * DAY_PX) + "px"; d.style.width = Math.max((b.ef - b.es) * DAY_PX, 4) + "px"; d.title = "Línea base: " + bl.name + " (" + workdayISO(b.es) + " a " + workdayISO(Math.max(0, b.ef - 1)) + ")"; d.setAttribute("aria-hidden", "true"); row.appendChild(d);
          if (latest) refEnd = b.ef;
        });
        if (!baselines.length && originalSchedule[t.id] && !t.inactive && (originalSchedule[t.id].es !== t._es || originalSchedule[t.id].ef !== t._ef)) {
          var o = originalSchedule[t.id], od = document.createElement("div"); od.className = "baseline band orig";
          od.style.left = (o.es * DAY_PX) + "px"; od.style.width = Math.max((o.ef - o.es) * DAY_PX, 4) + "px"; od.title = "Plan original (" + workdayISO(o.es) + " a " + workdayISO(Math.max(0, o.ef - 1)) + ")"; od.setAttribute("aria-hidden", "true"); row.appendChild(od);
          refEnd = o.ef;
        }
        if (refEnd !== null && !t.inactive && t.dur > 0 && t._ef !== refEnd) {
          var vd = t._ef - refEnd, vt = document.createElement("div"); vt.className = "varTag" + (vd > 0 ? " late" : " early");
          vt.textContent = (vd > 0 ? "+" : "") + vd + "d"; vt.style.left = Math.max(0, t._es * DAY_PX - 4) + "px"; vt.title = "Fin " + Math.abs(vd) + " día(s) " + (vd > 0 ? "después" : "antes") + " de la referencia"; vt.setAttribute("aria-hidden", "true"); row.appendChild(vt);
        }
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
    paintAlertBadge(); paintInactiveBanner(); paintProjectButtons(); paintBackupBanner();

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
  function paintInactiveBanner() {
    var b = $("inactBanner"); if (!b) return;
    var n = tasks.filter(function (t) { return t.inactive; });
    if (!n.length) { b.hidden = true; return; }
    b.textContent = "Escenario con tareas pausadas (" + n.map(function (t) { return t.id; }).join(", ") + "): las fechas, el costo y la ruta crítica se calculan como si esas tareas no se hicieran. No es el plan completo; reactivalas con el botón Activar de la tabla.";
    b.className = "banner"; b.hidden = false;
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
    changes: { id: "changespanel", btn: "changesToggleBtn", label: "control de cambios", render: renderChangesPanel },
    dash: { id: "dashpanel", btn: "dashToggleBtn", label: "panel de control", render: renderDash },
    port: { id: "portpanel", btn: "portToggleBtn", label: "vista de los cinco casos", render: renderPortfolio },
    time: { id: "timepanel", btn: "timeToggleBtn", label: "registro de tiempo real", render: renderTimePanel },
    scen: { id: "scenpanel", btn: "scenToggleBtn", label: "comparación de escenarios", render: renderScenarioPanel },
    proj: { id: "projpanel", btn: "projToggleBtn", label: "mis proyectos", render: renderProjectsPanel },
    trace: { id: "tracepanel", btn: "traceToggleBtn", label: "trazabilidad de objetivos", render: renderTracePanel }
  };
  function togglePanel(key) {
    var p = PANELS[key]; panelsOn[key] = !panelsOn[key];
    var on = panelsOn[key];
    $(p.id).className = "panel" + (on ? " show" : "");
    var b = $(p.btn); b.textContent = (on ? "Ocultar " : "Mostrar ") + p.label; b.setAttribute("aria-expanded", String(on));
    if (key === "dash") paintAlertBadge();
    if (on) {
      p.render();
      // El panel se abre en su lugar fijo de la página, que puede quedar lejos de los botones: se lo lleva a la vista.
      var el = $(p.id), reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (el && el.scrollIntoView) { try { el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); } }
    }
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
    var card = function (v, l, warn) { return '<div class="evmCard' + (warn ? " warn" : "") + '"><div class="v">' + v + '</div><div class="l">' + l + helpFor(l) + "</div></div>"; };
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
      card(usd(m.AC), "CA — Costo real" + (m.anyTaskAc ? " (por tarea)" : (m.acFromLog ? " (registro de tiempo)" : (m.acEstimated ? " (estimado = VE)" : " (global)")))) +
      card(idx(m.CPI), "CPI — Índice de rendimiento de costos", m.CPI < 1) + card(idx(m.SPI), "SPI — Índice de rendimiento del cronograma", m.SPI < 1) +
      card(usd(m.CV), "CV — Variación del costo", m.CV < 0) + card(usd(m.SV), "SV — Variación del cronograma", m.SV < 0) +
      card(usd(m.EAC), "EAC — Estimación al cierre", m.EAC > m.BAC) + card(usd(m.VAC), "VAC — Variación al cierre", m.VAC < 0) +
      card(usd(m.ETC), "ETC — Estimación hasta el cierre (lo que falta gastar)") + card(m.tcpiBac === null ? "—" : idx(m.tcpiBac), "TCPI — rendimiento necesario para cerrar en el BAC", m.tcpiBac !== null && m.tcpiBac > 1.1) +
      card(m.tcpiEac === null ? "—" : idx(m.tcpiEac), "TCPI — rendimiento necesario para cerrar en el EAC", m.tcpiEac !== null && m.tcpiEac > 1.1) +
      card(m.estDur ? Math.round(m.estDur) + " días hábiles" : "—", "Duración estimada (plan ÷ SPI)", m.estDur !== null && m.estDur > m.planned.projectEnd * 1.05) + "</div>" +
      '<div class="evmActions"><label class="inl">Cómo se calcula el EAC <select class="cell-input" data-change="eacMethod" data-fid="eacm" aria-label="Método de cálculo de la estimación al cierre"><option value="cpi"' + (eacMethod === "cpi" ? " selected" : "") + '>BAC ÷ CPI (el rendimiento de costos seguirá igual)</option><option value="plan"' + (eacMethod === "plan" ? " selected" : "") + '>CA + (BAC − VE) (lo que falta se gasta según el plan)</option><option value="cpispi"' + (eacMethod === "cpispi" ? " selected" : "") + '>CA + (BAC − VE) ÷ (CPI × SPI) (afectan costo y cronograma)</option></select></label><button type="button" data-action="recordCut" data-fid="cut:rec">Registrar este corte (' + evmCuts.length + ' guardado(s))</button>' + (evmCuts.length ? '<button type="button" data-action="clearCuts" data-fid="cut:clr">Borrar los cortes</button>' : "") + "</div>" +
      '<div class="evmbars">' + bar("VP", m.PV, m.BAC, "var(--color-muted)") + bar("VE", m.EV, m.BAC, "var(--gantt-normal)") + bar("CA", m.AC, m.BAC, "var(--gantt-near)") + "</div>" +
      '<p class="note">El EAC, el ETC y el TCPI se recalculan con el método elegido (EAC = BAC ÷ CPI por defecto). El TCPI es el CPI que tendrías que sostener de ahora en más para cerrar dentro del BAC (o del EAC): arriba de 1,1 es difícil de lograr. La duración estimada es una aproximación simple (duración planificada ÷ SPI), no un cálculo con el cronograma.</p>' + sCurveHtml(m) + trendHtml(m) +
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
    var tcv = traceCoverage();
    if (!tcv.hasObj) add(G1, "warn", "Trazabilidad: no hay objetivos cargados en el panel de trazabilidad, así que no se puede verificar que cada objetivo del acta tenga tareas.");
    else if (tcv.uncoveredObj.length) add(G1, "warn", "Trazabilidad: objetivo(s) sin ninguna tarea vinculada: " + tcv.uncoveredObj.map(function (x) { return x.id; }).join(", ") + ".");
    else add(G1, "ok", "Trazabilidad: cada objetivo tiene al menos una tarea vinculada.");
    if (tcv.hasItems && tcv.orphans.length) add(G1, "warn", "Trazabilidad: " + tcv.orphans.length + " tarea(s) no sirven a ningún objetivo o entregable cargado (" + tcv.orphans.slice(0, 6).map(function (t) { return t.id; }).join(", ") + (tcv.orphans.length > 6 ? ", …" : "") + "). Si son de gestión del proyecto, puede ser correcto.");
    var npau = tasks.filter(function (t) { return t.inactive; }).length;
    if (npau) add(G1, "warn", npau + " tarea(s) pausada(s): el cronograma y el costo reflejan un escenario, no el plan completo.");
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
    if (rc) {
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
      if (t.inactive) return;
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
    var res = computeScheduleOn(list), crit = list.filter(function (t) { return Math.abs(t.slack) < 1e-6 && !t.cycleError && !t.inactive; });
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
    var card = function (v, l, warn) { return '<div class="evmCard' + (warn ? " warn" : "") + '"><div class="v">' + v + '</div><div class="l">' + l + helpFor(l) + "</div></div>"; };
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
    var card = function (v, l, warn) { return '<div class="evmCard' + (warn ? " warn" : "") + '"><div class="v">' + v + '</div><div class="l">' + l + helpFor(l) + "</div></div>"; };
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
      '<p class="note">Cambios aplicados: ' + applied.length + ", con un impacto total en el BAC de " + usd(approvedCostImpact()) + ". Si el BAC difiere del presupuesto del acta por estos cambios, actualizá el acta con la solicitud de cambio correspondiente.</p>" +
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
    pushHistory(); activeScenario = i; tasks = cloneTasks(scenarios[i].snap.tasksSnap); phases = clonePhases(scenarios[i].snap.phasesSnap); render();
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
      issues: clone(issues), crList: clone(crList),
      evmCuts: clone(evmCuts), timeLog: clone(timeLog), traceItems: clone(traceItems), traceLinks: clone(traceLinks), alertCfg: clone(alertCfg), eacMethod: eacMethod,
      customCase: isCustomCase() ? customDefOf() : undefined };
  }
  function storageKey(pid) { return "ptTI.v" + CONFIG.STORAGE_KEY_VERSION + "." + META.audience + "." + pid; }
  function downloadJson() {
    var blob = new Blob([JSON.stringify(serializeState(), null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "progreso-" + currentProjectId + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    store.set(bakKey(), new Date().toISOString()); paintBackupBanner();
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
      if (t.inactive !== undefined && typeof t.inactive !== "boolean") return label + ": el estado activo de " + t.id + " no es válido.";
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
    if (isCustomId(o.projectId) && o.customCase) {
      var cerr = validateCustomDef(o.customCase); if (cerr) return { error: cerr };
      var sig = function (d) { return d.title + "|" + d.startDate + "|" + d.tasks.map(function (t) { return t.id + ":" + t.dur; }).join(","); }, ex = CASOS[o.projectId];
      if (!(ex && ex.custom && sig(ex) === sig(o.customCase))) {
        var nid = (ex && ex.custom) ? nextCustomIdName() : o.projectId;
        if (!nid || (!(ex && ex.custom) && customIds().length >= MAX_CUSTOM) || customIds().length >= MAX_CUSTOM + 5) return { error: "Ya tenés el máximo de proyectos propios (" + MAX_CUSTOM + "). Eliminá alguno desde \"Mis proyectos\" y probá de nuevo." };
        registerCustom(o.customCase, nid); o.projectId = nid;
      }
    }
    if (!CASOS[o.projectId]) return { error: 'El archivo es del caso "' + str(o.projectId, 60) + '", que no está disponible en esta versión de la herramienta (' + (META.audience === "alumnos-egci" ? "versión para alumnos" : "versión pública") + ")." };
    var e = validateTasks(o.tasks, "Tareas");
    if (e) return { error: e };
    var ids = new Set(o.tasks.map(function (t) { return t.id; }));
    if (!Array.isArray(o.phases) || o.phases.some(function (p) { return !p || typeof p.id !== "string" || typeof p.name !== "string" || !Array.isArray(p.children) || p.children.some(function (c) { return !ids.has(c); }); })) return { error: "Las fases del archivo no son válidas o apuntan a tareas que no existen." };
    if (o.startDate !== undefined && !isISO(o.startDate)) return { error: "La fecha de inicio del archivo no es válida." };
    if (o.holidays !== undefined && (!Array.isArray(o.holidays) || o.holidays.some(function (h) { return !isISO(h); }))) return { error: "La lista de feriados del archivo tiene fechas inválidas." };
    return { ok: true, legacy: legacy };
  }
  function sanitizeExtras(obj) {
    var ids = {}; (obj.tasks || []).forEach(function (t) { ids[t.id] = 1; });
    evmCuts = Array.isArray(obj.evmCuts) ? obj.evmCuts.slice(0, 200).filter(function (c) { return c && isISO(c.date) && isNum(c.PV) && isNum(c.EV) && isNum(c.AC); }).map(function (c) { return { date: c.date, PV: c.PV, EV: c.EV, AC: c.AC, CPI: isNum(c.CPI) ? c.CPI : null, SPI: isNum(c.SPI) ? c.SPI : null }; }) : [];
    timeLog = Array.isArray(obj.timeLog) ? obj.timeLog.slice(0, 5000).filter(function (e) { return e && isISO(e.date) && typeof e.taskId === "string" && ids[e.taskId]; }).map(function (e, i) { return { id: str(e.id, 20) || ("T" + (i + 1)), date: e.date, taskId: e.taskId, days: isNum(e.days) && e.days >= 0 ? e.days : 0, cost: isNum(e.cost) && e.cost >= 0 ? e.cost : null, pct: isNum(e.pct) && e.pct >= 0 && e.pct <= 100 ? e.pct : null, note: str(e.note, 300) }; }) : [];
    traceItems = Array.isArray(obj.traceItems) ? obj.traceItems.slice(0, 100).filter(function (x) { return x && typeof x.id === "string"; }).map(function (x) { return { id: str(x.id, 20), kind: x.kind === "Entregable" ? "Entregable" : "Objetivo", text: str(x.text, 400) }; }) : null;
    traceLinks = {};
    if (obj.traceLinks && typeof obj.traceLinks === "object" && !Array.isArray(obj.traceLinks)) Object.keys(obj.traceLinks).forEach(function (k) { if (ids[k] && Array.isArray(obj.traceLinks[k])) traceLinks[k] = obj.traceLinks[k].filter(function (v) { return typeof v === "string"; }).slice(0, 100); });
    var a = obj.alertCfg && typeof obj.alertCfg === "object" ? obj.alertCfg : {}, d = defaultAlertCfg();
    alertCfg = { lateCrit: isNum(a.lateCrit) && a.lateCrit >= 0 && a.lateCrit <= 100 ? a.lateCrit : d.lateCrit, cpiMin: isNum(a.cpiMin) && a.cpiMin > 0 && a.cpiMin <= 2 ? a.cpiMin : d.cpiMin, spiMin: isNum(a.spiMin) && a.spiMin > 0 && a.spiMin <= 2 ? a.spiMin : d.spiMin, contPct: isNum(a.contPct) && a.contPct >= 0 && a.contPct <= 100 ? a.contPct : d.contPct };
    eacMethod = ["cpi", "plan", "cpispi"].indexOf(obj.eacMethod) >= 0 ? obj.eacMethod : "cpi";
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
  function applyImport(text, origen, silent) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { if (silent) return false; notify("No se pudo leer el archivo: no es un JSON válido. ¿Es un archivo exportado desde este planificador?"); return; }
    var v = validateState(obj);
    if (v.error) { if (!silent) notify(v.error); return false; }
    var proj = CASOS[obj.projectId];
    currentProjectId = obj.projectId;
    if (!silent && isCustomId(obj.projectId)) { persistCustoms(); populateProjectSelect(); }
    tasks = obj.tasks.map(function (t) { return Object.assign({}, t, { notes: str(t.notes), acTask: isNum(t.acTask) ? t.acTask : null, extraResources: Array.isArray(t.extraResources) ? t.extraResources.map(function (x) { return str(x, 100); }) : [], overlapDays: isNum(t.overlapDays) ? t.overlapDays : 0, levelDelay: isNum(t.levelDelay) ? t.levelDelay : 0, name: str(t.name, 300), resource: str(t.resource, 100), preds: t.preds.slice(), crashCostPerDay: isNum(t.crashCostPerDay) ? t.crashCostPerDay : null, deps: cleanDeps(t), opt: isNum(t.opt) ? t.opt : null, pess: isNum(t.pess) ? t.pess : null, inactive: t.inactive === true }); });
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
    sanitizeExtras(obj);
    simResult = null;
    stakeholders = sanitizeList(obj.stakeholders, STK_KEYS);
    teamCharter = sanitizeObj(obj.teamCharter, TEAM_FIELDS);
    mgmtPlan = sanitizeObj(obj.mgmtPlan, PLAN_FIELDS);
    changeRequest = sanitizeObj(obj.changeRequest, CR_FIELDS);
    raciAssignments = obj.raciAssignments && typeof obj.raciAssignments === "object" ? obj.raciAssignments : {};
    raciPeople = Array.isArray(obj.raciPeople) ? obj.raciPeople.map(function (x) { return str(x, 100); }) : [];
    charter = {}; Object.keys(clone(proj.charter || {})).concat(["objective", "scopeOut", "contingency", "mgmtReserve"]).forEach(function (k) { charter[k] = str(obj.charter && obj.charter[k] !== undefined ? obj.charter[k] : (proj.charter || {})[k], 4000); });
    if (!traceItems) { traceItems = []; traceSeed(); }
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
    lastSavedAt = ""; if (silent) { isDirty = false; return true; }
    setDirty(origen === "archivo"); render();
    notify("Progreso cargado (" + origen + "): " + proj.title + (v.legacy ? ". Era un archivo de formato anterior; se convirtió al formato actual al guardarlo de nuevo." : "."));
  }

  /* ===================== inspector de fechas: ¿por qué esta fecha? ===================== */
  // Recalcula, para una tarea, qué impone cada predecesora y cuál manda (la que fija el inicio más tardío). Es la misma fórmula del motor CPM.
  function driversOf(t) {
    var D = t.inactive ? 0 : t.dur, cands = [];
    t.preds.forEach(function (p) {
      var pt = taskById(p); if (!pt) return;
      var d = depOf(t, p), v;
      if (d.type === "SS") v = pt._es + d.lag;
      else if (d.type === "FF") v = pt._ef + d.lag - D;
      else if (d.type === "SF") v = pt._es + d.lag - D;
      else v = pt._ef + d.lag - (t.overlapDays || 0);
      cands.push({ p: pt, d: d, v: v });
    });
    var mx = cands.length ? Math.max.apply(null, cands.map(function (c) { return c.v; })) : 0, base = Math.max(0, mx);
    return { cands: cands, base: base, drivers: cands.length && mx >= 0 ? cands.filter(function (c) { return c.v === base; }) : [] };
  }
  function depSentence(c, t) {
    var d = c.d, p = c.p, lag = d.lag ? (d.lag > 0 ? " más " + d.lag + " día(s) de desfase" : " menos " + Math.abs(d.lag) + " día(s) de adelanto") : "";
    var ov = d.type === "FS" && t.overlapDays > 0 ? " (con " + t.overlapDays + " día(s) de solape por seguimiento rápido)" : "";
    var pn = p.id + " " + p.name;
    if (d.type === "SS") return "Dependencia comienzo-comienzo con " + pn + ": no puede empezar antes de que empiece esa tarea (" + startISO(p) + ")" + lag + ".";
    if (d.type === "FF") return "Dependencia fin-fin con " + pn + ": no puede terminar antes de que termine esa tarea (" + finishISO(p) + ")" + lag + ".";
    if (d.type === "SF") return "Dependencia comienzo-fin con " + pn + ": su fin queda atado al inicio de esa tarea (" + startISO(p) + ")" + lag + ".";
    return "Dependencia fin-comienzo con " + pn + ": no puede empezar hasta que esa tarea termine (" + finishISO(p) + ")" + lag + ov + ".";
  }
  function calendarNote(t) {
    if (t.inactive || t.dur <= 0) return "";
    var a = startISO(t), b = finishISO(t), cd = daysBetween(a, b) + 1, skip = cd - t.dur;
    var hs = holidays.filter(function (h) { var w = isoToDate(h).getDay(); return h >= a && h <= b && w !== 0 && w !== 6; });
    return "Del " + a + " al " + b + " hay " + cd + " días de calendario y " + t.dur + " hábiles" + (skip > 0 ? ": se saltan " + skip + " (fines de semana" + (hs.length ? " y feriados: " + hs.join(", ") : "") + ")" : "") + ".";
  }
  function explainData(t) {
    computeSchedule(tasks);
    var dv = driversOf(t), L = [];
    if (t.inactive) L.push("La tarea está pausada: el escenario la trata como si no se hiciera (duración 0, fuera del costo y de la ruta crítica).");
    if (!t.preds.length) L.push("No tiene predecesoras: arranca el día 1 del proyecto (" + workdayISO(0) + ")" + ((t.levelDelay || 0) > 0 ? ", pero tiene " + t.levelDelay + " día(s) de demora agregados a mano o por nivelación." : "."));
    else {
      if (dv.drivers.length) dv.drivers.forEach(function (c) { L.push("Manda: " + depSentence(c, t)); });
      else L.push("Ninguna predecesora impone un inicio posterior al día 1 del proyecto.");
      dv.cands.filter(function (c) { return dv.drivers.indexOf(c) < 0; }).forEach(function (c) {
        L.push("No manda (holgura de " + (dv.base - c.v) + " día(s) respecto de la que manda): " + depSentence(c, t));
      });
      if ((t.levelDelay || 0) > 0) L.push("Además se suma una demora de " + t.levelDelay + " día(s): la pusiste vos al fijar una fecha de inicio o la agregó la nivelación de recursos.");
    }
    var cn = calendarNote(t); if (cn) L.push(cn);
    var succ = tasks.filter(function (s) { return s.preds.indexOf(t.id) >= 0; }), drives = succ.filter(function (s) { return driversOf(s).drivers.some(function (c) { return c.p.id === t.id; }); });
    var S = [];
    if (t.inactive) S.push("Al reactivarla, vuelve a ocupar su duración original (" + t.dur + " día(s)).");
    else if (t.critical) S.push("Es crítica (holgura 0): cada día que se atrase mueve el fin del proyecto.");
    else S.push("Tiene " + t.slack + " día(s) de holgura total: puede demorarse hasta ese margen sin mover el fin del proyecto.");
    if (drives.length) S.push("Marca la fecha de: " + drives.map(function (s) { return s.id + " " + s.name; }).join("; ") + ".");
    else if (succ.length) S.push("Tiene sucesoras (" + succ.map(function (s) { return s.id; }).join(", ") + "), pero ninguna depende de ella para su fecha de inicio.");
    else S.push("No tiene sucesoras: no condiciona la fecha de ninguna otra tarea.");
    return { why: L, effect: S, start: startISO(t), finish: finishISO(t) };
  }
  function explainTask(id) {
    var t = taskById(id); if (!t) return;
    var e = explainData(t), box = document.createElement("div"); box.className = "dlgBox"; box.setAttribute("aria-labelledby", "dlgWhyT");
    box.innerHTML = '<h2 id="dlgWhyT">¿Por qué esta fecha? ' + esc(t.id + " " + t.name) + '</h2><p class="note" style="margin-top:0">Empieza el ' + esc(e.start) + (t.dur > 0 && !t.inactive ? " y termina el " + esc(e.finish) : "") + '.</p><h3 style="font-size:13px;margin:10px 0 4px">Qué fija la fecha</h3><ul class="whyList">' +
      e.why.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><h3 style="font-size:13px;margin:10px 0 4px">Qué pasa si se mueve</h3><ul class="whyList">' + e.effect.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      '</ul><div class="dlgBtns"><button type="button" class="btn-primary dlgOk">Cerrar</button></div>';
    var close = openModal(box); box.querySelector(".dlgOk").addEventListener("click", function () { close(null); }); box.querySelector(".dlgOk").focus();
    track("inspector_fechas", { caso_id: currentProjectId });
  }

  /* ===================== escenarios: tareas pausadas y comparación ===================== */
  function toggleInactive(id) {
    var t = taskById(id); if (!t) return;
    pushHistory(); t.inactive = !t.inactive; render();
    notify(t.inactive ? "Tarea " + t.id + " pausada: el cronograma y el costo se calculan como si no se hiciera. Guardá el escenario para compararlo con el plan." : "Tarea " + t.id + " reactivada.");
  }
  function updateScenario(i) {
    if (!scenarios[i]) return;
    confirmBox('¿Reemplazar el contenido del escenario "' + scenarios[i].name + '" por el estado actual de las tareas?', "Reemplazar").then(function (ok) {
      if (!ok) return; pushHistory(); scenarios[i].snap = { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) }; activeScenario = i; render();
    });
  }
  function deleteScenario(i) {
    if (scenarios.length < 2) { notify("Tiene que quedar al menos un escenario."); return; }
    confirmBox('¿Eliminar el escenario "' + scenarios[i].name + '"?').then(function (ok) {
      if (!ok) return; pushHistory(); scenarios.splice(i, 1); activeScenario = Math.min(activeScenario, scenarios.length - 1); render();
    });
  }
  function scenarioStats(list, isLive) {
    var l = cloneTasks(list), res = computeScheduleOn(l), cost = 0, crash = 0, inact = 0, crit = 0;
    l.forEach(function (t) {
      if (t.inactive) { inact++; return; }
      cost += t.dur * getDailyCost(t); if (t.critical) crit++;
      var orig = ORIGINAL_DURS[t.id]; if (orig !== undefined && t.crashCostPerDay && orig > t.dur) crash += (orig - t.dur) * t.crashCostPerDay;
    });
    return { end: res.projectEnd, endISO: workdayISO(Math.max(0, res.projectEnd - 1)), cost: cost + crash, crit: crit, inact: inact, live: !!isLive };
  }
  function renderScenarioPanel() {
    var base = originalProjectEnd, baseCost = tasks.reduce(function (sum, t) { return sum + (ORIGINAL_DURS[t.id] !== undefined ? ORIGINAL_DURS[t.id] : t.dur) * getDailyCost(t); }, 0), rows = scenarios.map(function (sc, i) {
      var live = i === activeScenario, st = scenarioStats(live ? tasks : sc.snap.tasksSnap, live), d = st.end - base;
      return { sc: sc, i: i, st: st, d: d, live: live };
    });
    var h = '<p class="note" style="margin-top:0">Un escenario es una versión del cronograma para probar "qué pasa si". Con el botón <b>Pausa</b> de cada tarea la sacás del plan (no se hace): el cronograma, el costo y la ruta crítica se recalculan sin ella. Después guardás el escenario y lo comparás acá con el plan original. Las líneas base, en cambio, fijan el plan contra el que se mide el avance.</p>' +
      '<div class="evmActions"><button type="button" data-action="saveScenario" data-fid="sc:save">Guardar el estado actual como escenario</button></div>' +
      '<table class="simpletable"><caption class="sr-only">Comparación de escenarios</caption><thead><tr><th scope="col">Escenario</th><th scope="col">Fin del proyecto</th><th scope="col">Diferencia con el plan original</th><th scope="col">Costo total</th><th scope="col">Diferencia de costo con el plan original</th><th scope="col">Tareas críticas</th><th scope="col">Tareas pausadas</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var dc = r.st.cost - baseCost;
        return "<tr" + (r.live ? ' class="rowLive"' : "") + "><td>" + esc(r.sc.name) + (r.live ? " <small>(en pantalla, con tus cambios)</small>" : "") + "</td><td>" + esc(r.st.endISO) + "</td><td>" + (r.d === 0 ? "igual" : (r.d > 0 ? "+" : "") + r.d + " día(s)") + "</td><td>" + usd(r.st.cost) + "</td><td>" + (Math.abs(dc) < 1 ? "igual" : (dc > 0 ? "+" : "−") + usd(Math.abs(dc))) + "</td><td>" + r.st.crit + "</td><td>" + r.st.inact + '</td><td class="nowrap">' +
          (r.live ? "" : '<button type="button" data-action="loadScenario" data-i="' + r.i + '" data-fid="scn:load:' + r.i + '">Cargar</button> ') +
          '<button type="button" data-action="updateScenario" data-i="' + r.i + '" data-fid="scn:upd:' + r.i + '" aria-label="Reemplazar el escenario ' + esc(r.sc.name) + ' por el estado actual">Actualizar</button> <button type="button" class="delBtn" data-action="deleteScenario" data-i="' + r.i + '" data-fid="scn:del:' + r.i + '" aria-label="Eliminar el escenario ' + esc(r.sc.name) + '">✕</button></td></tr>';
      }).join("") + "</tbody></table>" +
      '<p class="note">El costo total suma la duración efectiva de cada tarea por su costo diario, más el costo de aceleración (crash) si lo hay. La diferencia de costo se mide contra el costo del plan original (duraciones originales por costo diario). La comparación respeta la fecha de inicio y los feriados vigentes.</p>';
    $("scenBody").innerHTML = h;
  }

  /* ===================== EVM ampliado: curva S, tendencia, cortes ===================== */
  function jsNum(n) { return isFinite(n) ? Math.round(n * 100) / 100 : 0; }
  function lineChart(o) {
    var W = 680, H = 260, L = 64, R = 16, T = 14, B = 36, iw = W - L - R, ih = H - T - B, yMin = o.yMin || 0, yMax = o.yMax > yMin ? o.yMax : yMin + 1;
    var X = function (x) { return L + (o.xMax > 0 ? x / o.xMax : 0) * iw; }, Y = function (y) { return T + ih - (y - yMin) / (yMax - yMin) * ih; };
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.label) + '" focusable="false"><title>' + esc(o.label) + "</title>";
    for (var i = 0; i <= 4; i++) {
      var yv = yMin + (yMax - yMin) * i / 4;
      s += '<line class="ch-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text class="ch-tick" x="' + (L - 6) + '" y="' + (Y(yv) + 3) + '" text-anchor="end">' + esc(o.yFmt(yv)) + "</text>";
    }
    (o.xTicks || []).forEach(function (tk) { s += '<line class="ch-grid" x1="' + X(tk.x) + '" x2="' + X(tk.x) + '" y1="' + T + '" y2="' + (T + ih) + '"/><text class="ch-tick" x="' + X(tk.x) + '" y="' + (H - 18) + '" text-anchor="middle">' + esc(tk.label) + "</text>"; });
    (o.hlines || []).forEach(function (hl) { if (hl.y < yMin || hl.y > yMax) return; s += '<line class="ch-line ' + hl.cls + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(hl.y) + '" y2="' + Y(hl.y) + '"/><text class="ch-lab ' + hl.cls + '" x="' + (W - R - 2) + '" y="' + (Y(hl.y) - 4) + '" text-anchor="end">' + esc(hl.label) + "</text>"; });
    (o.vlines || []).forEach(function (vl) { s += '<line class="ch-line ' + vl.cls + '" x1="' + X(vl.x) + '" x2="' + X(vl.x) + '" y1="' + T + '" y2="' + (T + ih) + '"/><text class="ch-lab ' + vl.cls + '" x="' + (X(vl.x) + 3) + '" y="' + (T + 10) + '">' + esc(vl.label) + "</text>"; });
    o.series.forEach(function (se) {
      if (!se.pts.length) return;
      s += '<path class="ch-line ' + se.cls + '" fill="none" d="' + se.pts.map(function (p, k) { return (k ? "L" : "M") + jsNum(X(p[0])) + "," + jsNum(Y(Math.max(yMin, Math.min(yMax, p[1])))); }).join(" ") + '"/>';
      if (se.dots) se.pts.forEach(function (p) { s += '<circle class="ch-dot ' + se.cls + '" cx="' + jsNum(X(p[0])) + '" cy="' + jsNum(Y(Math.max(yMin, Math.min(yMax, p[1])))) + '" r="3.2"/>'; });
    });
    return s + "</svg>";
  }
  function pvCurve(m) {
    var end = Math.max(m.planned.projectEnd, 1), pts = [], sch = m.planned.schedule, step = end > 400 ? 5 : (end > 160 ? 2 : 1);
    for (var d = 0; d <= end; d += step) {
      var v = 0; m.perTask.forEach(function (p) { var pr = sch[p.t.id] || { es: p.t._es, dur: p.t.dur }; v += Math.max(0, Math.min(d - pr.es, pr.dur)) * p.dc; }); pts.push([d, v]);
    }
    if (pts[pts.length - 1][0] !== end) { var v2 = 0; m.perTask.forEach(function (p) { var pr = sch[p.t.id] || { es: p.t._es, dur: p.t.dur }; v2 += Math.max(0, Math.min(end - pr.es, pr.dur)) * p.dc; }); pts.push([end, v2]); }
    return pts;
  }
  function cutRow(c) { return { date: c.date, day: dayOffsetFromDate(c.date), PV: c.PV, EV: c.EV, AC: c.AC, CPI: c.CPI, SPI: c.SPI }; }
  function allCuts(m) {
    var rows = evmCuts.map(cutRow);
    if (!rows.some(function (r) { return r.date === m.cutISO; })) rows.push({ date: m.cutISO, day: m.cut, PV: m.PV, EV: m.EV, AC: m.AC, CPI: isFinite(m.CPI) ? m.CPI : null, SPI: isFinite(m.SPI) ? m.SPI : null, live: true });
    return rows.sort(function (a, b) { return a.day - b.day; });
  }
  function sCurveHtml(m) {
    var cuts = allCuts(m), pv = pvCurve(m), est = m.estDur ? Math.ceil(m.estDur) : 0, xMax = Math.max(pv[pv.length - 1][0], cuts.length ? cuts[cuts.length - 1].day : 0, est > 0 && est < pv[pv.length - 1][0] * 3 ? est : 0) * 1.0;
    var yMax = Math.max(m.BAC, m.EAC, Math.max.apply(null, cuts.map(function (c) { return Math.max(c.EV, c.AC); }))) * 1.08, nTicks = 5, xt = [];
    for (var i = 0; i <= nTicks; i++) { var x = Math.round(xMax * i / nTicks); xt.push({ x: x, label: workdayISO(x).slice(5) }); }
    var svg = lineChart({ label: "Curva S: valor planificado, valor ganado y costo real acumulados contra el tiempo. Presupuesto al cierre " + usd(m.BAC) + ", estimación al cierre " + usd(m.EAC) + ".", xMax: xMax, yMax: yMax, xTicks: xt, yFmt: function (v) { return v >= 1000 ? Math.round(v / 1000) + " mil" : String(Math.round(v)); },
      series: [{ cls: "ch-pv", pts: pv }, { cls: "ch-ev", pts: cuts.map(function (c) { return [c.day, c.EV]; }), dots: true }, { cls: "ch-ac", pts: cuts.map(function (c) { return [c.day, c.AC]; }), dots: true }],
      hlines: [{ y: m.BAC, cls: "ch-bac", label: "BAC" }].concat(Math.abs(m.EAC - m.BAC) > 1 ? [{ y: m.EAC, cls: "ch-eac", label: "EAC" }] : []), vlines: [{ x: m.cut, cls: "ch-cut", label: "corte" }] });
    var tbl = '<table class="simpletable"><caption class="sr-only">Valores de la curva S por corte</caption><thead><tr><th scope="col">Fecha</th><th scope="col">VP</th><th scope="col">VE</th><th scope="col">CA</th></tr></thead><tbody>' +
      cuts.map(function (c) { return "<tr><td>" + esc(c.date) + (c.live ? " (corte vigente)" : "") + "</td><td>" + usd(c.PV) + "</td><td>" + usd(c.EV) + "</td><td>" + usd(c.AC) + "</td></tr>"; }).join("") + "</tbody></table>";
    return '<h3 style="margin:16px 0 6px;font-size:13px">Curva S</h3><div class="chartBox">' + svg + '</div><p class="chartLegend"><span class="lg ch-pv">Valor planificado (VP)</span> <span class="lg ch-ev">Valor ganado (VE)</span> <span class="lg ch-ac">Costo real (CA)</span> <span class="lg ch-bac">BAC</span> <span class="lg ch-eac">EAC</span></p>' +
      '<p class="note">La línea de VP es el plan acumulado contra ' + esc(m.planned.label) + ". VE y CA son puntos: uno por cada corte que registres más el corte vigente. Con un solo corte se ve un punto; registrá cortes periódicos (o generalos desde el registro de tiempo) para ver la curva.</p><details><summary>Ver los valores como tabla</summary>" + tbl + "</details>";
  }
  function trendHtml(m) {
    var cuts = allCuts(m).filter(function (c) { return c.CPI !== null || c.SPI !== null; });
    if (cuts.length < 2) return '<h3 style="margin:16px 0 6px;font-size:13px">Tendencia de CPI y SPI</h3><p class="note">La tendencia necesita al menos dos cortes. Registrá el corte actual con el botón "Registrar este corte", cambiá la fecha de corte y volvé a registrar, o generá los cortes semanales desde el registro de tiempo.</p>';
    var cap = function (v) { return v === null ? null : Math.min(v, 2); }, xMax = cuts.length - 1, xt = cuts.map(function (c, i) { return { x: i, label: c.date.slice(5) }; });
    if (xt.length > 8) xt = xt.filter(function (_, i) { return i % Math.ceil(xt.length / 8) === 0; });
    var ser = function (key, cls) { var p = []; cuts.forEach(function (c, i) { var v = cap(c[key]); if (v !== null) p.push([i, v]); }); return { cls: cls, pts: p, dots: true }; };
    var first = cuts[0], last = cuts[cuts.length - 1];
    var arrow = function (a, b) { if (a === null || b === null) return "sin dato"; var d = b - a; return Math.abs(d) < 0.02 ? "estable" : (d > 0 ? "mejora" : "empeora"); };
    var svg = lineChart({ label: "Tendencia de CPI y SPI en " + cuts.length + " cortes. CPI " + arrow(first.CPI, last.CPI) + ", SPI " + arrow(first.SPI, last.SPI) + ".", xMax: xMax || 1, yMin: 0, yMax: 2, xTicks: xt, yFmt: function (v) { return v.toFixed(1); }, series: [ser("CPI", "ch-cpi"), ser("SPI", "ch-spi")], hlines: [{ y: 1, cls: "ch-bac", label: "1,0" }] });
    var tbl = '<table class="simpletable"><caption class="sr-only">CPI y SPI por corte</caption><thead><tr><th scope="col">Fecha</th><th scope="col">CPI</th><th scope="col">SPI</th></tr></thead><tbody>' + cuts.map(function (c) { return "<tr><td>" + esc(c.date) + "</td><td>" + (c.CPI === null ? "—" : c.CPI.toFixed(2)) + "</td><td>" + (c.SPI === null ? "—" : c.SPI.toFixed(2)) + "</td></tr>"; }).join("") + "</tbody></table>";
    return '<h3 style="margin:16px 0 6px;font-size:13px">Tendencia de CPI y SPI</h3><div class="chartBox">' + svg + '</div><p class="chartLegend"><span class="lg ch-cpi">CPI</span> <span class="lg ch-spi">SPI</span> <span class="lg ch-bac">1,0 = según lo planificado</span></p><p class="note">Entre el primer y el último corte, el CPI ' + arrow(first.CPI, last.CPI) + " y el SPI " + arrow(first.SPI, last.SPI) + ". El gráfico corta los valores en 2,0.</p><details><summary>Ver los valores como tabla</summary>" + tbl + "</details>";
  }
  function recordCut() {
    var m = computeEVM(); if (!(m.cut > 0)) { notify("El corte está en el inicio del proyecto: elegí una fecha posterior."); return; }
    pushHistory();
    var row = { date: m.cutISO, PV: m.PV, EV: m.EV, AC: m.AC, CPI: isFinite(m.CPI) ? m.CPI : null, SPI: isFinite(m.SPI) ? m.SPI : null };
    evmCuts = evmCuts.filter(function (c) { return c.date !== row.date; }); evmCuts.push(row); evmCuts.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); render();
    notify("Corte del " + row.date + " registrado (" + evmCuts.length + " en total).");
  }
  function clearCuts() { if (!evmCuts.length) return; confirmBox("¿Borrar los " + evmCuts.length + " cortes registrados de la curva S y la tendencia?", "Borrar").then(function (ok) { if (ok) { pushHistory(); evmCuts = []; render(); } }); }
  function syncPctFromLog() {
    var best = {};
    timeLog.forEach(function (e, i) { if (!isNum(e.pct)) return; var b = best[e.taskId]; if (!b || e.date > b.date || (e.date === b.date && i > b.i)) best[e.taskId] = { date: e.date, pct: e.pct, i: i }; });
    tasks.forEach(function (t) { if (best[t.id]) t.pct = Math.round(best[t.id].pct); });
  }
  function generateWeeklyCuts() {
    if (!timeLog.length) { notify("Todavía no hay entradas en el registro de tiempo."); return; }
    var first = dayOffsetFromDate(timeLog.reduce(function (a, e) { return e.date < a ? e.date : a; }, timeLog[0].date)), last = Math.min(cutoffDay, getPlannedRef().projectEnd);
    if (last <= first) { notify("El corte vigente tiene que ser posterior a la primera entrada del registro."); return; }
    pushHistory();
    var offs = []; for (var d = first + 4; d < last; d += 5) offs.push(d); offs.push(last);
    var gen = offs.map(function (c) { var m = computeEVM({ cut: c, fromLog: true }); return { date: workdayISO(c), PV: m.PV, EV: m.EV, AC: m.AC, CPI: isFinite(m.CPI) ? m.CPI : null, SPI: isFinite(m.SPI) ? m.SPI : null }; });
    var dates = {}; gen.forEach(function (g) { dates[g.date] = 1; });
    evmCuts = evmCuts.filter(function (c) { return !dates[c.date]; }).concat(gen).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    render(); notify("Se generaron " + gen.length + " cortes semanales con los datos del registro de tiempo.");
  }

  /* ===================== registro de tiempo y costo real ===================== */
  function nextTimeId() { var n = 1; while (timeLog.some(function (e) { return e.id === "T" + n; })) n++; return "T" + n; }
  function addTimeEntry() {
    var cand = leafTasks().filter(function (t) { return !t.inactive && t.dur > 0; }), opts = cand.map(function (t) { return t.id + " " + t.name; });
    if (!opts.length) { notify("No hay tareas activas para registrar tiempo."); return Promise.resolve(); }
    return askForm("Registrar tiempo real", [
      { key: "date", label: "Fecha del trabajo", type: "date", value: cutoffISO(), required: true },
      { key: "task", label: "Tarea", type: "select", options: opts, value: opts[0] },
      { key: "days", label: "Días trabajados (puede ser 0,5)", value: "1" },
      { key: "cost", label: "Costo real en USD (opcional; si lo dejás vacío se calcula días × costo diario)", value: "" },
      { key: "pct", label: "% de avance acumulado de la tarea (opcional)", value: "" },
      { key: "note", label: "Nota (opcional)", value: "" }
    ], "Registrar", function (r) {
      if (!isISO(r.date)) return "La fecha no es válida.";
      var d = r.days === "" ? 0 : num(r.days), c = r.cost === "" ? null : num(r.cost), p = r.pct === "" ? null : num(r.pct);
      if (d === null || d < 0) return "Los días trabajados tienen que ser un número mayor o igual a 0.";
      if (r.cost !== "" && (c === null || c < 0)) return "El costo tiene que ser un número mayor o igual a 0.";
      if (r.pct !== "" && (p === null || p < 0 || p > 100)) return "El avance tiene que estar entre 0 y 100.";
      if (d === 0 && c === null && p === null) return "Cargá días, costo o avance.";
    }).then(function (r) {
      if (!r) return; pushHistory();
      timeLog.push({ id: nextTimeId(), date: r.date, taskId: r.task.split(" ")[0], days: r.days === "" ? 0 : num(r.days), cost: r.cost === "" ? null : num(r.cost), pct: r.pct === "" ? null : num(r.pct), note: String(r.note || "").slice(0, 300) });
      syncPctFromLog(); render(); track("registro_tiempo", { caso_id: currentProjectId });
    });
  }
  function timeRowsByTask() {
    var by = {};
    timeLog.forEach(function (e) { var b = by[e.taskId] = by[e.taskId] || { days: 0, cost: 0, n: 0 }; var tk = taskById(e.taskId); b.days += e.days || 0; b.cost += logCostOf(e, tk); b.n++; });
    return by;
  }
  function renderTimePanel() {
    var by = timeRowsByTask(), tot = Object.keys(by).reduce(function (s, k) { return s + by[k].cost; }, 0), totD = Object.keys(by).reduce(function (s, k) { return s + by[k].days; }, 0);
    var m = computeEVM();
    var h = '<p class="note" style="margin-top:0">Registrá el trabajo real: fecha, tarea, días y, si querés, el costo y el avance acumulado. Con esos datos la herramienta calcula sola el costo real (CA) y el avance (VE) a la fecha de corte, sin cargar nada a mano en el panel de valor ganado. Si cargaste un costo real manual por tarea, ese manda sobre el registro. Todo queda en tu navegador y en la copia de seguridad.</p>' +
      '<div class="evmActions"><button type="button" class="primary" data-action="addTimeEntry" data-fid="tl:add">Registrar tiempo real</button><button type="button" data-action="genCuts" data-fid="tl:cuts">Generar cortes semanales para la curva S</button><button type="button" data-action="timeCsv" data-fid="tl:csv">Descargar el registro (CSV)</button></div>' +
      '<p class="note">' + timeLog.length + " entrada(s), " + (Math.round(totD * 10) / 10) + " día(s) y " + usd(tot) + " en total. A la fecha de corte (" + esc(m.cutISO) + ") el costo real " + (m.acFromLog ? "sale del registro: " + usd(m.AC) + "." : "todavía no usa el registro (CA " + usd(m.AC) + (m.acEstimated ? ", estimado igual al VE" : "") + ").") + "</p>";
    var list = timeLog.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    h += '<table class="simpletable"><caption class="sr-only">Registro de tiempo real</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Tarea</th><th scope="col">Días</th><th scope="col">Costo</th><th scope="col">Avance</th><th scope="col">Nota</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      (list.map(function (e) {
        var tk = taskById(e.taskId);
        return "<tr><td>" + esc(e.date) + "</td><td>" + esc(e.taskId + (tk ? " " + tk.name : "")) + "</td><td>" + (e.days || 0) + "</td><td>" + usd(logCostOf(e, tk)) + (isNum(e.cost) && e.cost > 0 ? "" : " <small>(días × costo diario)</small>") + "</td><td>" + (isNum(e.pct) ? e.pct + "%" : "—") + "</td><td>" + esc(e.note) + '</td><td><button type="button" class="delBtn" data-action="deleteTime" data-id="' + esc(e.id) + '" data-fid="tl:del:' + esc(e.id) + '" aria-label="Eliminar la entrada ' + esc(e.id) + '">✕</button></td></tr>';
      }).join("") || '<tr><td colspan="7">Todavía no hay entradas.</td></tr>') + "</tbody></table>";
    var ks = Object.keys(by);
    if (ks.length) h += '<h3 style="margin:16px 0 8px;font-size:13px">Resumen por tarea</h3><table class="simpletable"><caption class="sr-only">Resumen del registro de tiempo por tarea</caption><thead><tr><th scope="col">Tarea</th><th scope="col">Entradas</th><th scope="col">Días</th><th scope="col">Costo real</th><th scope="col">Presupuesto</th></tr></thead><tbody>' +
      ks.sort().map(function (k) { var tk = taskById(k), pt = m.perTask.filter(function (p) { return p.t.id === k; })[0]; return "<tr><td>" + esc(k + (tk ? " " + tk.name : "")) + "</td><td>" + by[k].n + "</td><td>" + (Math.round(by[k].days * 10) / 10) + "</td><td>" + usd(by[k].cost) + "</td><td>" + (pt ? usd(pt.budget) : "—") + "</td></tr>"; }).join("") + "</tbody></table>";
    $("timeBody").innerHTML = h;
  }
  function timeCsv() {
    var rows = [["Fecha", "Tarea", "Nombre", "Días", "Costo (USD)", "Avance acumulado (%)", "Nota"]];
    timeLog.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (e) { var tk = taskById(e.taskId); rows.push([e.date, e.taskId, tk ? tk.name : "", e.days || 0, Math.round(logCostOf(e, tk)), isNum(e.pct) ? e.pct : "", e.note || ""]); });
    dl("registro-tiempo-" + currentProjectId + ".csv", "text/csv;charset=utf-8", "﻿" + rows.map(function (r) { return r.map(csvSafe).join(","); }).join("\n"));
  }

  /* ===================== trazabilidad: objetivos del acta → entregables → tareas ===================== */
  function traceSeed() {
    var obj = String(charter.objective || "").trim(), del = String(charter.deliverable || "").trim();
    if (obj) traceItems.push({ id: "O1", kind: "Objetivo", text: obj.slice(0, 400) });
    if (del) traceItems.push({ id: "E1", kind: "Entregable", text: del.slice(0, 400) });
  }
  function nextTraceId(kind) { var p = kind === "Entregable" ? "E" : "O", n = 1; while (traceItems.some(function (x) { return x.id === p + n; })) n++; return p + n; }
  function traceFromCharter() {
    var added = 0;
    [["Objetivo", String(charter.objective || "").trim()], ["Entregable", String(charter.deliverable || "").trim()]].forEach(function (k) {
      if (!k[1] || traceItems.some(function (x) { return x.kind === k[0] && x.text === k[1].slice(0, 400); })) return;
      if (!added) pushHistory();
      traceItems.push({ id: nextTraceId(k[0]), kind: k[0], text: k[1].slice(0, 400) }); added++;
    });
    if (added) render(); else notify("El acta no tiene objetivo ni entregable nuevos para traer (o ya están en la lista).");
  }
  function traceAdd(kind) {
    return askForm(kind === "Objetivo" ? "Agregar objetivo" : "Agregar entregable", [{ key: "text", label: kind === "Objetivo" ? "Objetivo (del acta de constitución)" : "Entregable", value: "", required: true }], "Agregar").then(function (r) {
      if (!r) return; pushHistory(); traceItems.push({ id: nextTraceId(kind), kind: kind, text: r.text.trim().slice(0, 400) }); render();
    });
  }
  function traceDel(id) {
    confirmBox("¿Eliminar este elemento y sus vínculos con las tareas?").then(function (ok) {
      if (!ok) return; pushHistory(); traceItems = traceItems.filter(function (x) { return x.id !== id; });
      Object.keys(traceLinks).forEach(function (k) { traceLinks[k] = traceLinks[k].filter(function (v) { return v !== id; }); if (!traceLinks[k].length) delete traceLinks[k]; });
      render();
    });
  }
  function traceCoverage() {
    var lt = leafTasks().filter(function (t) { return !t.inactive; }), ids = {}; traceItems.forEach(function (x) { ids[x.id] = 1; });
    var linked = function (itemId) { return lt.filter(function (t) { return (traceLinks[t.id] || []).indexOf(itemId) >= 0; }); };
    var objs = traceItems.filter(function (x) { return x.kind === "Objetivo"; }), dels = traceItems.filter(function (x) { return x.kind === "Entregable"; });
    var unc = traceItems.filter(function (x) { return linked(x.id).length === 0; });
    var orphans = lt.filter(function (t) { return !(traceLinks[t.id] || []).some(function (v) { return ids[v]; }); });
    return { hasObj: objs.length > 0, hasItems: traceItems.length > 0, objs: objs, dels: dels, uncovered: unc, uncoveredObj: unc.filter(function (x) { return x.kind === "Objetivo"; }), orphans: orphans, nLeaf: lt.length };
  }
  function renderTracePanel() {
    var tc = traceCoverage();
    var h = '<p class="note" style="margin-top:0">La trazabilidad responde dos preguntas: ¿qué tarea del cronograma sirve a cada objetivo y a cada entregable del acta? y ¿hay tareas que no sirven a ninguno? Vinculá cada tarea (casilla) con el objetivo o el entregable al que contribuye. Las tareas de gestión del proyecto pueden quedar sin vínculo, o vincularse a un entregable de gestión que agregues.</p>' +
      '<div class="evmActions"><button type="button" data-action="traceAdd" data-kind="Objetivo" data-fid="tr:addO">Agregar objetivo</button><button type="button" data-action="traceAdd" data-kind="Entregable" data-fid="tr:addE">Agregar entregable</button><button type="button" data-action="traceFromCharter" data-fid="tr:charter">Traer objetivo y entregable del acta</button></div>';
    if (!tc.hasItems) { $("traceBody").innerHTML = h + '<p class="note">Todavía no hay objetivos ni entregables para trazar. Escribí el objetivo SMART en el acta y traelo con el botón, o agregalos a mano.</p>'; return; }
    h += '<table class="simpletable"><caption class="sr-only">Objetivos y entregables a trazar</caption><thead><tr><th scope="col">ID</th><th scope="col">Tipo</th><th scope="col">Texto</th><th scope="col">Tareas vinculadas</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      traceItems.map(function (x) {
        var n = leafTasks().filter(function (t) { return !t.inactive && (traceLinks[t.id] || []).indexOf(x.id) >= 0; }).length, i = esc(x.id);
        return "<tr" + (n ? "" : ' class="issueLate"') + "><td>" + i + '</td><td><select class="cell-input" data-change="traceItem" data-id="' + i + '" data-key="kind" data-fid="tr:k:' + i + '" aria-label="Tipo de ' + i + '"><option' + (x.kind === "Objetivo" ? " selected" : "") + ">Objetivo</option><option" + (x.kind === "Entregable" ? " selected" : "") + ">Entregable</option></select></td><td><input type=\"text\" class=\"cell-input\" style=\"width:100%;min-width:260px\" value=\"" + esc(x.text) + '" data-change="traceItem" data-id="' + i + '" data-key="text" data-fid="tr:t:' + i + '" aria-label="Texto de ' + i + '"></td><td>' + n + (n ? "" : ' <b class="issueTag">Sin tareas</b>') + '</td><td><button type="button" class="delBtn" data-action="traceDel" data-id="' + i + '" data-fid="tr:d:' + i + '" aria-label="Eliminar ' + i + '">✕</button></td></tr>';
      }).join("") + "</tbody></table>";
    h += '<h3 style="margin:16px 0 8px;font-size:13px">Matriz de trazabilidad</h3><div class="traceWrap"><table class="simpletable traceMx"><caption class="sr-only">Matriz que vincula cada tarea con objetivos y entregables</caption><thead><tr><th scope="col">Tarea</th>' +
      traceItems.map(function (x) { return '<th scope="col" title="' + esc(x.kind + ": " + x.text) + '">' + esc(x.id) + "</th>"; }).join("") + '<th scope="col">Estado</th></tr></thead><tbody>' +
      leafTasks().map(function (t) {
        var lk = traceLinks[t.id] || [], orphan = !t.inactive && tc.orphans.indexOf(t) >= 0, id = esc(t.id);
        return "<tr" + (t.inactive ? ' class="inactive-row"' : "") + '><th scope="row" class="taskname">' + id + " " + esc(t.name) + "</th>" + traceItems.map(function (x) {
          return '<td class="tcell"><input type="checkbox" data-change="traceLink" data-id="' + id + '" data-item="' + esc(x.id) + '" data-fid="tr:c:' + id + ":" + esc(x.id) + '"' + (lk.indexOf(x.id) >= 0 ? " checked" : "") + ' aria-label="Tarea ' + id + " vinculada a " + esc(x.id) + '"></td>';
        }).join("") + "<td>" + (t.inactive ? "pausada" : (orphan ? '<b class="issueTag">Sin vínculo</b>' : "ok")) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    h += '<p class="note">Cobertura: ' + (tc.objs.length - tc.uncoveredObj.length) + " de " + tc.objs.length + " objetivo(s) con al menos una tarea; " + (tc.dels.length - (tc.uncovered.length - tc.uncoveredObj.length)) + " de " + tc.dels.length + " entregable(s) con al menos una tarea; " + tc.orphans.length + " de " + tc.nLeaf + " tarea(s) sin vínculo. La herramienta cuenta vínculos; que sean los correctos lo juzgás vos (o quien corrige).</p>";
    $("traceBody").innerHTML = h;
  }

  /* ===================== reglas de alerta y panel de control ===================== */
  function overAllocated() {
    var by = {}, out = [];
    tasks.forEach(function (t) { if (t.inactive || t.dur <= 0) return; allResourcesOf(t).forEach(function (r) { (by[r] = by[r] || []).push(t); }); });
    Object.keys(by).forEach(function (r) {
      var l = by[r].slice().sort(function (a, b) { return a._es - b._es; }), mx = -1, ids = {};
      l.forEach(function (t) { if (t._es < mx) { ids[t.id] = 1; } mx = Math.max(mx, t._ef); });
      if (Object.keys(ids).length) out.push({ res: r, n: Object.keys(ids).length });
    });
    return out;
  }
  // Reglas "si pasa X, avisar": todos los umbrales son editables en el panel de control y viajan con la copia de seguridad.
  function alertList() {
    var out = [], m = computeEVM(), c = alertCfg, cut = cutoffDay;
    leafTasks().forEach(function (t) {
      if (t.inactive || !t.critical) return;
      var pr = m.planned.schedule[t.id] || { es: t._es, dur: t.dur }, exp = pr.dur > 0 ? Math.max(0, Math.min(100, (cut - pr.es) / pr.dur * 100)) : (pr.es < cut ? 100 : 0), gap = Math.round(exp - t.pct);
      if (gap >= c.lateCrit) out.push({ id: "crit:" + t.id, sev: gap >= c.lateCrit * 2 ? "rojo" : "ámbar", msg: "Tarea crítica " + t.id + " " + t.name + ": lleva " + t.pct + "% y a esta fecha debería llevar " + Math.round(exp) + "% (" + gap + " puntos de atraso; el umbral es " + c.lateCrit + ").", panel: "status" });
    });
    if (!m.acEstimated && m.CPI < c.cpiMin) out.push({ id: "cpi", sev: m.CPI < c.cpiMin - 0.1 ? "rojo" : "ámbar", msg: "CPI " + idx2(m.CPI) + ", por debajo del umbral " + c.cpiMin.toFixed(2) + ": se gasta más de lo que se gana.", panel: "evm" });
    if (m.PV > 0 && m.SPI < c.spiMin) out.push({ id: "spi", sev: m.SPI < c.spiMin - 0.1 ? "rojo" : "ámbar", msg: "SPI " + idx2(m.SPI) + ", por debajo del umbral " + c.spiMin.toFixed(2) + ": el avance va por detrás del plan.", panel: "evm" });
    if (!m.acEstimated && m.EAC > m.BAC * 1.0001) out.push({ id: "eac", sev: "ámbar", msg: "La estimación al cierre (" + usd(m.EAC) + ") supera el presupuesto (" + usd(m.BAC) + ") en " + usd(m.EAC - m.BAC) + ".", panel: "evm" });
    var rd = reserveData();
    if (rd.cont && rd.withData > 0) {
      var rem = rd.cont - rd.consumed;
      if (rem < rd.cont * c.contPct / 100) out.push({ id: "cont", sev: rem <= 0 ? "rojo" : "ámbar", msg: "Reserva de contingencia: quedan " + usd(Math.max(0, rem)) + " de " + usd(rd.cont) + " (" + Math.round(Math.max(0, rem) / rd.cont * 100) + "%); el umbral es " + c.contPct + "%.", panel: "risk" });
    }
    var today = cutoffISO(), od = issues.filter(function (x) { return x.status !== "Cerrado" && x.due && x.due < today; });
    if (od.length) out.push({ id: "issues", sev: "ámbar", msg: od.length + " problema(s) o acción(es) vencidos a la fecha de corte: " + od.map(function (x) { return x.id; }).join(", ") + ".", panel: "issues" });
    var pcr = crList.filter(function (x) { return x.status === "Pendiente"; });
    if (pcr.length) out.push({ id: "cr", sev: "ámbar", msg: pcr.length + " solicitud(es) de cambio sin decidir: " + pcr.map(function (x) { return x.id; }).join(", ") + ".", panel: "changes" });
    var oa = overAllocated();
    if (oa.length) out.push({ id: "over", sev: "ámbar", msg: "Recursos sobreasignados: " + oa.map(function (o) { return o.res; }).join(", ") + ".", panel: "res" });
    var ni = tasks.filter(function (t) { return t.inactive; }).length;
    if (ni) out.push({ id: "inact", sev: "ámbar", msg: ni + " tarea(s) pausada(s): los números que ves corresponden a un escenario, no al plan completo.", panel: "scen" });
    return out;
  }
  function worstLight(list) {
    var l = list.filter(function (x) { return x !== "sin dato"; });
    if (!l.length) return "sin dato";
    return l.indexOf("rojo") >= 0 ? "rojo" : (l.indexOf("ámbar") >= 0 ? "ámbar" : "verde");
  }
  function caseMetrics() {
    var res = computeSchedule(tasks), m = computeEVM(), d = statusData(), al = alertList(), ck = runChecks(), tc = traceCoverage(), rd = reserveData();
    var cnt = { ok: 0, warn: 0, miss: 0 }; ck.forEach(function (c) { cnt[c.lvl]++; });
    var tb = targetBudget(), nl = (lessons || "").split("\n").filter(function (s) { return s.trim(); }).length;
    return { id: currentProjectId, label: CASOS[currentProjectId] ? CASOS[currentProjectId].label : currentProjectId, title: caseTitle(),
      projectEnd: res.projectEnd, endISO: workdayISO(Math.max(0, res.projectEnd - 1)), planEnd: originalProjectEnd, delta: res.projectEnd - originalProjectEnd,
      crit: tasks.filter(function (t) { return t.critical; }).length, nTasks: tasks.length, inactive: tasks.filter(function (t) { return t.inactive; }).length,
      m: { BAC: m.BAC, PV: m.PV, EV: m.EV, AC: m.AC, CPI: m.CPI, SPI: m.SPI, EAC: m.EAC, ETC: m.ETC, TCPI: m.tcpiBac, acEstimated: m.acEstimated, acFromLog: m.acFromLog },
      sched: d.sched, cost: d.cost, rk: d.rk, overall: worstLight([d.sched, d.cost, d.rk]),
      bacTarget: tb, bacDiff: tb === null ? null : Math.round(m.BAC - tb), counts: cnt,
      miss: ck.filter(function (c) { return c.lvl === "miss"; }).map(function (c) { return c.text; }), warn: ck.filter(function (c) { return c.lvl === "warn"; }).map(function (c) { return c.text; }),
      alerts: al, trace: { has: tc.hasItems, uncovered: tc.uncovered.length, orphans: tc.orphans.length, nLeaf: tc.nLeaf },
      reserve: { cont: rd.cont, consumed: rd.consumed, withData: rd.withData }, openIssues: d.openIssues.length, overdue: d.overdue.length, pendingCR: crList.filter(function (x) { return x.status === "Pendiente"; }).length,
      lessonsN: nl, risksN: risks.length, timeN: timeLog.length, pctReal: m.BAC > 0 ? m.EV / m.BAC : 0, pctPlan: m.BAC > 0 ? m.PV / m.BAC : 0 };
  }
  function lightCard(label, light, detail) { return '<div class="stCard st-' + lightClass(light) + '"><div class="v">' + esc(light.toUpperCase()) + '</div><div class="l">' + esc(label) + '</div><div class="d">' + esc(detail) + "</div></div>"; }
  var LINKS = [["status", "Informe de estado"], ["evm", "Valor ganado"], ["time", "Tiempo real"], ["risk", "Riesgos"], ["issues", "Problemas y acciones"], ["trace", "Trazabilidad"], ["scen", "Escenarios"], ["check", "Coherencia"]];
  function renderDash() {
    var cm = caseMetrics(), m = cm.m, idx = idx2;
    var traceLight = !cm.trace.has ? "sin dato" : (cm.trace.uncovered ? "ámbar" : "verde");
    var h = '<p class="note" style="margin-top:0">Resumen de ' + esc(cm.title) + " a la fecha de corte (" + esc(cutoffISO()) + "), medido contra " + esc(computeEVM().planned.label) + '. Cronograma y costo: verde desde 0,95, ámbar desde 0,85, rojo por debajo. Riesgos: según el puntaje más alto de las amenazas abiertas. El semáforo general toma el peor de los tres.</p>' +
      '<div class="stGrid">' + lightCard("General", cm.overall, cm.alerts.length + " alerta(s) activa(s)") + lightCard("Cronograma", cm.sched, m.PV > 0 ? "SPI " + idx(m.SPI) : "sin valor planificado") +
      lightCard("Costo", cm.cost, m.acEstimated ? "cargá el costo real" : "CPI " + idx(m.CPI)) + lightCard("Riesgos", cm.rk, risks.length ? risks.length + " en el registro" : "sin registro") +
      lightCard("Trazabilidad", traceLight, cm.trace.has ? cm.trace.uncovered + " sin tareas; " + cm.trace.orphans + " tarea(s) sin vínculo" : "sin objetivos cargados") + "</div>" +
      '<div class="evmGrid">' + [[usd(m.BAC), "BAC"], [pct(m.EV, m.BAC) + " / " + pct(m.PV, m.BAC), "Avance real / planificado"], [usd(m.AC), "Costo real" + (m.acEstimated ? " (estimado)" : (m.acFromLog ? " (registro)" : ""))], [usd(m.EAC), "EAC — estimación al cierre"], [usd(m.ETC), "ETC — por gastar"], [m.TCPI === null ? "—" : idx(m.TCPI), "TCPI — rendimiento necesario"], [cm.endISO, "Fin proyectado" + (cm.delta ? " (" + (cm.delta > 0 ? "+" : "") + cm.delta + " d vs plan)" : "")], [cm.crit + " tarea(s)", "Ruta crítica"]].map(function (k) { return '<div class="evmCard"><div class="v">' + esc(k[0]) + '</div><div class="l">' + esc(k[1]) + helpFor(k[1]) + "</div></div>"; }).join("") + "</div>";
    h += '<h3 style="margin:14px 0 6px;font-size:13px">Alertas</h3>' + (cm.alerts.length ? '<ul class="checkList">' + cm.alerts.map(function (a) { return '<li class="chk ' + (a.sev === "rojo" ? "miss" : "warn") + '"><span class="tag">' + (a.sev === "rojo" ? "Urgente" : "Atención") + "</span><span>" + esc(a.msg) + ' <button type="button" class="linkBtn" data-action="openPanel" data-key="' + a.panel + '" data-fid="al:' + esc(a.id) + '">Ver panel</button></span></li>'; }).join("") + "</ul>" : '<p class="note">Ninguna regla de alerta se disparó con los datos actuales.</p>');
    h += '<h3 style="margin:14px 0 6px;font-size:13px">Reglas de alerta (editables)</h3><div class="alertCfg">' +
      [["lateCrit", "Tarea crítica atrasada desde (puntos de avance)", 1, 100], ["cpiMin", "CPI mínimo aceptable", 0.1, 2, 0.01], ["spiMin", "SPI mínimo aceptable", 0.1, 2, 0.01], ["contPct", "Avisar si la reserva de contingencia baja de (% de lo aprobado)", 0, 100]].map(function (f) {
        return '<label>' + esc(f[1]) + '<input type="number" class="cell-input" min="' + f[2] + '" max="' + f[3] + '" step="' + f[4] + '" value="' + alertCfg[f[0]] + '" data-change="alertCfg" data-key="' + f[0] + '" data-fid="ac:' + f[0] + '"></label>';
      }).join("") + '</div><p class="note">Además se avisa cuando: la estimación al cierre supera al presupuesto, hay problemas o acciones vencidos, hay solicitudes de cambio sin decidir, hay recursos sobreasignados o hay tareas pausadas. Los avisos se recalculan solos con cada cambio.</p>';
    h += '<h3 style="margin:14px 0 6px;font-size:13px">Coherencia de los documentos</h3><div class="evmActions"><button type="button" data-action="exportDashPdf" data-fid="dash:pdf">Exportar el panel en PDF (una página)</button></div><p class="note">' + cm.counts.ok + " cumplen, " + cm.counts.warn + " para revisar y " + cm.counts.miss + ' faltan.</p><div class="evmActions">' + LINKS.map(function (l) { return '<button type="button" data-action="openPanel" data-key="' + l[0] + '" data-fid="dl:' + l[0] + '">' + esc(l[1]) + "</button>"; }).join("") + "</div>";
    $("dashBody").innerHTML = h;
  }
  function paintAlertBadge() {
    var b = $("dashToggleBtn"); if (!b) return;
    var n = 0; try { n = alertList().length; } catch (e) { n = 0; }
    var base = (panelsOn.dash ? "Ocultar " : "Mostrar ") + PANELS.dash.label;
    b.innerHTML = esc(base) + (n ? ' <span class="alertBadge" aria-label="' + n + ' alerta(s)">' + n + "</span>" : "");
  }

  /* ===================== portafolio de los cinco casos y modo docente ===================== */
  var docEntries = [], portCache = null;
  function docenteEnabled() { return (store.get("ptTI.docente") === "1" || /(^|[#&])docente\b/.test(String(location.hash || ""))); }
  function grabCtx() {
    return { tasks: tasks, phases: phases, baselines: baselines, ORIGINAL_DURS: ORIGINAL_DURS, originalProjectEnd: originalProjectEnd, originalSchedule: originalSchedule, cutoffDay: cutoffDay, acActual: acActual, risks: risks, charter: charter,
      issues: issues, crList: crList, comms: comms, changeLog: changeLog, decisionLog: decisionLog, lessons: lessons, stakeholders: stakeholders, teamCharter: teamCharter, mgmtPlan: mgmtPlan, changeRequest: changeRequest,
      raciAssignments: raciAssignments, raciPeople: raciPeople, holidays: holidays, holidayCountry: holidayCountry, holidayYear: holidayYear, currentProjectId: currentProjectId, nearThreshold: nearThreshold,
      evmCuts: evmCuts, timeLog: timeLog, traceItems: traceItems, traceLinks: traceLinks, alertCfg: alertCfg, eacMethod: eacMethod, simResult: simResult, actualStart: actualStart, actualFinish: actualFinish,
      plannedFinishOverride: plannedFinishOverride, scenarios: scenarios, activeScenario: activeScenario, history: history, future: future, ftTaskId: ftTaskId, isDirty: isDirty, lastSavedAt: lastSavedAt, autosaveFailed: autosaveFailed,
      startDate: $("startDate").value, projectSel: $("projectSelect").value, nearInput: $("nearThreshold").value };
  }
  function putCtx(c) {
    tasks = c.tasks; phases = c.phases; baselines = c.baselines; ORIGINAL_DURS = c.ORIGINAL_DURS; originalProjectEnd = c.originalProjectEnd; originalSchedule = c.originalSchedule; cutoffDay = c.cutoffDay; acActual = c.acActual; risks = c.risks; charter = c.charter;
    issues = c.issues; crList = c.crList; comms = c.comms; changeLog = c.changeLog; decisionLog = c.decisionLog; lessons = c.lessons; stakeholders = c.stakeholders; teamCharter = c.teamCharter; mgmtPlan = c.mgmtPlan; changeRequest = c.changeRequest;
    raciAssignments = c.raciAssignments; raciPeople = c.raciPeople; holidays = c.holidays; holidayCountry = c.holidayCountry; holidayYear = c.holidayYear; currentProjectId = c.currentProjectId; nearThreshold = c.nearThreshold;
    evmCuts = c.evmCuts; timeLog = c.timeLog; traceItems = c.traceItems; traceLinks = c.traceLinks; alertCfg = c.alertCfg; eacMethod = c.eacMethod; simResult = c.simResult; actualStart = c.actualStart; actualFinish = c.actualFinish;
    plannedFinishOverride = c.plannedFinishOverride; scenarios = c.scenarios; activeScenario = c.activeScenario; history = c.history; future = c.future; ftTaskId = c.ftTaskId; isDirty = c.isDirty; lastSavedAt = c.lastSavedAt; autosaveFailed = c.autosaveFailed;
    $("startDate").value = c.startDate; $("projectSelect").value = c.projectSel; $("nearThreshold").value = c.nearInput;
    computeSchedule(tasks);
    if (isDirty) scheduleAutosave();
  }
  // Calcula las métricas de otros casos (o de archivos de alumnos) cargándolos "en silencio" y devolviendo el estado de la pantalla tal cual estaba.
  function buildPortfolio() {
    var saved = grabCtx(), rows = [], savedCustoms = {}; customIds().forEach(function (k) { savedCustoms[k] = CASOS[k]; });
    try {
      caseIds().forEach(function (id) {
        var raw = store.get(storageKey(id)), ok = raw ? applyImport(raw, "navegador", true) === true : false, src = ok ? "avance guardado" : "valores iniciales";
        if (!ok) loadProject(id, true);
        var cm = caseMetrics(); cm.source = src;
        if (!ok) { cm.notStarted = true; cm.source = "sin avance guardado (datos de ejemplo)"; cm.sched = cm.cost = cm.rk = cm.overall = "sin dato"; cm.alerts = []; }
        rows.push(cm);
      });
      docEntries.forEach(function (e) {
        var ok = applyImport(e.text, "archivo", true) === true;
        if (!ok) { rows.push({ error: true, source: "archivo: " + e.name, label: e.name, id: "" }); return; }
        var cm = caseMetrics(); cm.source = "archivo: " + e.name; cm.doc = true; rows.push(cm);
      });
    } finally { customIds().forEach(function (k) { delete CASOS[k]; }); Object.keys(savedCustoms).forEach(function (k) { CASOS[k] = savedCustoms[k]; }); putCtx(saved); }
    return rows;
  }
  function refreshPortfolio() { portCache = buildPortfolio(); if (panelsOn.port) renderPortfolio(); }
  function lightTag(l) { return '<span class="ltag lt-' + lightClass(l) + '">' + esc(l) + "</span>"; }
  function portRowHtml(r, docente) {
    if (r.error) return '<tr><td colspan="' + (docente ? 11 : 10) + '">' + esc(r.source) + ': el archivo no es un progreso válido del planificador.</td></tr>';
    var m = r.m, bac = r.bacDiff === null ? "—" : (r.bacDiff === 0 ? "coincide" : (r.bacDiff > 0 ? "+" : "−") + fmtInt(Math.abs(r.bacDiff)));
    var det = (docente && (r.miss.length || r.alerts.length)) ? '<details><summary>' + r.miss.length + " faltan" + (r.alerts.length ? ", " + r.alerts.length + " alerta(s)" : "") + "</summary><ul class=\"miniList\">" + r.miss.map(function (x) { return "<li>Falta: " + esc(x) + "</li>"; }).join("") + r.alerts.map(function (a) { return "<li>" + esc(a.msg) + "</li>"; }).join("") + "</ul></details>" : (docente ? "—" : "");
    return "<tr" + (r.live ? ' class="rowLive"' : "") + "><th scope=\"row\">" + esc(r.label) + "<br><small>" + esc(r.source) + "</small></th><td>" + lightTag(r.overall) + "</td><td>" + lightTag(r.sched) + "</td><td>" + lightTag(r.cost) + "</td><td>" + lightTag(r.rk) + "</td><td>" + esc(r.endISO) + "<br><small>" + (r.delta ? (r.delta > 0 ? "+" : "") + r.delta + " d vs plan" : "según plan") + "</small></td><td>" + idx2(m.SPI) + " / " + (m.acEstimated ? "—" : idx2(m.CPI)) + "</td><td>" + pct(m.EV, m.BAC) + "</td><td>" + esc(bac) + "</td><td>" + r.counts.ok + " / " + r.counts.warn + " / " + r.counts.miss + (docente ? "</td><td>" + det : "") + "</td><td>" + r.alerts.length + "</td></tr>";
  }
  function renderPortfolio() {
    if (!portCache) portCache = buildPortfolio();
    var live = caseMetrics(); live.source = "en pantalla (sin guardar)"; live.live = true;
    var rows = portCache.map(function (r) { return (!r.doc && r.id === currentProjectId) ? live : r; });
    var doc = docenteEnabled();
    var head = '<th scope="col">Caso</th><th scope="col">General</th><th scope="col">Cronograma</th><th scope="col">Costo</th><th scope="col">Riesgos</th><th scope="col">Fin proyectado</th><th scope="col">SPI / CPI</th><th scope="col">Avance</th><th scope="col">BAC vs acta</th><th scope="col">Coherencia (cumple / revisar / falta)</th>' + (doc ? '<th scope="col">Detalle</th>' : "") + '<th scope="col">Alertas</th>';
    var h = '<p class="note" style="margin-top:0">Los cinco casos lado a lado, con el avance que guardaste en este navegador (o los valores iniciales si no empezaste ese caso). El caso abierto se muestra con lo que ves en pantalla. Cada fila usa las mismas reglas que el panel de control.</p><div class="evmActions"><button type="button" data-action="refreshPort" data-fid="pt:ref">Actualizar la vista</button>' + (doc ? '<button type="button" data-action="portCsv" data-fid="pt:csv">Descargar resumen (CSV)</button>' : "") + "</div>" +
      '<div class="traceWrap"><table class="simpletable portMx"><caption class="sr-only">Comparación de los casos</caption><thead><tr>' + head + "</tr></thead><tbody>" + rows.map(function (r) { return portRowHtml(r, doc); }).join("") + "</tbody></table></div>";
    {
      h += '<h3 style="margin:18px 0 8px;font-size:13px">Modo docente</h3>';
      if (!doc) h += '<p class="note">El modo docente se activa abriendo esta página con <code>#docente</code> al final de la dirección. No es una protección: es solo para mostrar las herramientas de corrección a quien las necesita.</p>';
      else h += '<p class="note">Cargá los archivos de copia de seguridad (.json) que entregaron los alumnos. Se leen en tu navegador: no se envían a ningún servidor ni se guardan. Cada archivo se evalúa con las mismas reglas de coherencia; el resumen ordena lo que falta, no califica: la corrección sigue siendo tuya.</p><div class="evmActions"><button type="button" class="primary" data-action="pickDocFiles" data-fid="pt:pick">Cargar archivos de alumnos</button><button type="button" data-action="clearDocFiles" data-fid="pt:clr">Quitar los archivos cargados (' + docEntries.length + ')</button><button type="button" data-action="docenteOff" data-fid="pt:off">Salir del modo docente</button></div>';
    }
    $("portBody").innerHTML = h;
  }
  function portCsv() {
    if (!portCache) portCache = buildPortfolio();
    var rows = [["Origen", "Caso", "General", "Cronograma", "Costo", "Riesgos", "Fin proyectado", "Desvío vs plan (días)", "SPI", "CPI", "Avance real (%)", "BAC", "Presupuesto del acta", "Diferencia BAC", "Cumple", "Revisar", "Faltan", "Faltantes", "Alertas", "Riesgos cargados", "Lecciones", "Registros de tiempo"]];
    portCache.forEach(function (r) {
      if (r.error) { rows.push([r.source, "archivo inválido"]); return; }
      var m = r.m; rows.push([r.source, r.label, r.overall, r.sched, r.cost, r.rk, r.endISO, r.delta, isFinite(m.SPI) ? m.SPI.toFixed(2) : "", m.acEstimated || !isFinite(m.CPI) ? "" : m.CPI.toFixed(2), (r.pctReal * 100).toFixed(1), Math.round(m.BAC), r.bacTarget === null ? "" : r.bacTarget, r.bacDiff === null ? "" : r.bacDiff, r.counts.ok, r.counts.warn, r.counts.miss, r.miss.join(" | "), r.alerts.length, r.risksN, r.lessonsN, r.timeN]);
    });
    dl("resumen-casos-" + dateToISO(new Date()) + ".csv", "text/csv;charset=utf-8", "﻿" + rows.map(function (r) { return r.map(csvSafe).join(","); }).join("\n"));
  }
  function loadDocFiles(files) {
    var list = Array.prototype.slice.call(files || [], 0, 80), pending = list.length;
    if (!pending) return;
    list.forEach(function (f) {
      if (f.size > CONFIG.MAX_FILE_BYTES) { notify(f.name + ": pesa más de " + (CONFIG.MAX_FILE_BYTES / 1048576) + " MB, no parece un progreso del planificador."); if (!--pending) refreshPortfolio(); return; }
      var rd = new FileReader();
      rd.onload = function () { docEntries = docEntries.filter(function (e) { return e.name !== f.name; }); docEntries.push({ name: f.name.slice(0, 80), text: String(rd.result) }); if (!--pending) refreshPortfolio(); };
      rd.onerror = function () { if (!--pending) refreshPortfolio(); };
      rd.readAsText(f);
    });
  }


  /* ===================== proyecto propio: en blanco o importado desde Excel / CSV ===================== */
  var CUSTOM_ID = "propio", MAX_CUSTOM = 10;
  var RISK_KEYS = ["id", "desc", "category", "prob", "impact", "response", "owner", "taskId", "type", "probPct", "impactUsd", "status", "actualCost"];
  function isCustomId(id) { return /^propio(-\d{1,2})?$/.test(String(id)); }
  function isCustomCase() { return !!(CASOS[currentProjectId] && CASOS[currentProjectId].custom); }
  function customIds() { return Object.keys(CASOS).filter(function (k) { return isCustomId(k) && CASOS[k].custom; }); }
  function customKey() { return "ptTI.custom." + META.audience; }
  function customsKey() { return "ptTI.customs." + META.audience; }
  function nextCustomIdName() { if (!CASOS[CUSTOM_ID]) return CUSTOM_ID; for (var n = 2; n <= 99; n++) if (!CASOS["propio-" + n]) return "propio-" + n; return ""; }
  function normCustomTask(t) {
    var o = { id: str(t.id, 40), name: str(t.name, 300), dur: Math.round(t.dur), preds: t.preds.slice(0, 60).map(function (p) { return str(p, 40); }), pct: isNum(t.pct) ? Math.max(0, Math.min(100, Math.round(t.pct))) : 0, resource: str(t.resource || "PM", 100) || "PM", crashCostPerDay: isNum(t.crashCostPerDay) && t.crashCostPerDay >= 0 ? t.crashCostPerDay : null };
    var d = cleanDeps(t); if (d) o.deps = d;
    if (isNum(t.dailyCost) && t.dailyCost >= 0) o.dailyCost = t.dailyCost;
    if (isNum(t.opt) && isNum(t.pess)) { o.opt = t.opt; o.pess = t.pess; }
    if (Array.isArray(t.extraResources)) o.extraResources = t.extraResources.slice(0, 20).map(function (x) { return str(x, 100); });
    if (typeof t.notes === "string" && t.notes) o.notes = str(t.notes, 2000);
    return o;
  }
  function validateCustomDef(cc) {
    if (!cc || typeof cc !== "object" || Array.isArray(cc)) return "El proyecto propio del archivo no es válido.";
    if (typeof cc.title !== "string" || !isISO(cc.startDate)) return "El proyecto propio del archivo no tiene nombre o fecha de inicio válidos.";
    var e = validateTasks(cc.tasks, "Proyecto propio"); if (e) return e;
    var ids = new Set(cc.tasks.map(function (t) { return t.id; }));
    if (!Array.isArray(cc.phases) || cc.phases.some(function (p) { return !p || typeof p.id !== "string" || typeof p.name !== "string" || !Array.isArray(p.children) || p.children.some(function (c) { return !ids.has(c); }); })) return "Las fases del proyecto propio del archivo no son válidas.";
    return "";
  }
  function registerCustom(def, id) {
    id = id || CUSTOM_ID;
    var title = str(def.title, 120).trim() || "Mi proyecto", ch = {};
    if (def.charter && typeof def.charter === "object" && !Array.isArray(def.charter)) Object.keys(def.charter).slice(0, 30).forEach(function (k) { ch[str(k, 40)] = str(def.charter[k], 4000); });
    var rk = sanitizeList(def.risks, RISK_KEYS); rk.forEach(function (r) { if (r.type !== "Oportunidad") r.type = "Amenaza"; });
    CASOS[id] = { label: "Mi proyecto — " + title, title: title, startDate: def.startDate, startNote: "Proyecto propio. La fecha de inicio es editable.", custom: true,
      phases: def.phases.map(function (p) { return { id: str(p.id, 40), name: str(p.name, 200), children: p.children.map(function (c) { return str(c, 40); }) }; }),
      tasks: def.tasks.map(normCustomTask), risks: rk, charter: ch };
  }
  function customDefOf(id) {
    var c = CASOS[id || currentProjectId]; if (!c || !c.custom) return null;
    return { id: id || currentProjectId, title: c.title, startDate: c.startDate, phases: clone(c.phases), tasks: clone(c.tasks), risks: clone(c.risks || []), charter: clone(c.charter || {}) };
  }
  function persistCustoms() { store.set(customsKey(), JSON.stringify(customIds().map(function (k) { return customDefOf(k); }))); }
  function loadStoredCustom() {
    var raw = store.get(customsKey()), old = store.get(customKey());
    try {
      if (raw) { JSON.parse(raw).slice(0, MAX_CUSTOM).forEach(function (d) { if (d && isCustomId(d.id) && !validateCustomDef(d)) registerCustom(d, d.id); }); }
      else if (old) { var d0 = JSON.parse(old); if (!validateCustomDef(d0)) { registerCustom(d0, CUSTOM_ID); persistCustoms(); } }
      if (old) { try { localStorage.removeItem(customKey()); } catch (e) { /* sin almacenamiento */ } }
    } catch (e) { /* definición dañada: se ignora */ }
  }
  function startCustom(def, msg) {
    var id = nextCustomIdName();
    if (!id || customIds().length >= MAX_CUSTOM) { notify("Llegaste al máximo de " + MAX_CUSTOM + " proyectos propios. Eliminá alguno desde \"Mis proyectos\" para crear otro."); return; }
    autosaveNow();
    try { localStorage.removeItem(storageKey(id)); } catch (e) { /* sin almacenamiento */ }
    registerCustom(def, id); persistCustoms(); populateProjectSelect();
    loadProject(id); store.set(lastCaseKey(), id); track("proyecto_propio", { origen: msg.origen, tareas: def.tasks.length });
    notify(msg.text);
  }
  function renameProject(id) {
    var c = CASOS[id]; if (!c || !c.custom) return Promise.resolve();
    return askForm("Renombrar el proyecto", [{ key: "title", label: "Nombre del proyecto", value: c.title, required: true }], "Guardar").then(function (r) {
      if (!r) return; var t = r.title.trim().slice(0, 120); if (!t) return;
      c = CASOS[id]; if (!c) return;
      c.title = t; c.label = "Mi proyecto — " + t; persistCustoms(); populateProjectSelect(); $("projectSelect").value = currentProjectId; render(); notify("Proyecto renombrado.");
    });
  }
  function deleteProject(id) {
    var c = CASOS[id]; if (!c || !c.custom) return Promise.resolve();
    return confirmBox("¿Eliminar el proyecto \"" + c.title + "\"? Se borra de este navegador junto con su avance. Si querés conservarlo, cancelá y descargá antes la copia de seguridad.", "Eliminar").then(function (ok) {
      if (!ok) return;
      var wasCurrent = id === currentProjectId; clearTimeout(autosaveTimer); autosaveTimer = 0;
      try { localStorage.removeItem(storageKey(id)); localStorage.removeItem(bakKey(id)); localStorage.removeItem(bakKey(id) + ".snooze"); localStorage.removeItem(bakKey(id) + ".first"); } catch (e) { /* sin almacenamiento */ }
      delete CASOS[id]; persistCustoms(); populateProjectSelect();
      if (wasCurrent) { var first = caseIds()[0]; isDirty = false; loadProject(first); store.set(lastCaseKey(), first); maybeRestore(first); } else render();
      notify("Proyecto eliminado.");
    });
  }
  function duplicateProject() {
    return askForm("Duplicar este proyecto", [{ key: "title", label: "Nombre de la copia", value: ("Copia de " + caseTitle()).slice(0, 120), required: true }], "Duplicar").then(function (r) {
      if (!r) return; computeSchedule(tasks);
      startCustom({ title: r.title.trim(), startDate: startDateValue(), phases: clonePhases(phases), tasks: cloneTasks(tasks).map(function (t) { return { id: t.id, name: t.name, dur: t.dur, preds: t.preds, deps: t.deps, pct: t.pct, resource: t.resource, dailyCost: getDailyCost(t), crashCostPerDay: t.crashCostPerDay, opt: t.opt, pess: t.pess, extraResources: t.extraResources, notes: t.notes }; }), risks: clone(risks), charter: clone(charter) },
        { origen: "copia", text: "Copia creada. Es un proyecto propio independiente: los cambios que hagas acá no afectan al original." });
    });
  }
  function openProject(id) { if (id === currentProjectId || !CASOS[id]) return; CHANGE.project({ value: id }); }
  function saveNow() {
    isDirty = true; autosaveNow();
    if (autosaveFailed) { notify("No se pudo guardar en este navegador (almacenamiento bloqueado o lleno). Descargá la copia de seguridad para no perder el trabajo."); return; }
    notify("Guardado en este navegador a las " + lastSavedAt + ". Si querés tener una copia fuera del navegador, descargá la copia de seguridad.");
  }
  /* ---- aviso de copia de seguridad ---- */
  function bakKey(id) { return "ptTI.bak." + META.audience + "." + (id || currentProjectId); }
  var BAK_DAYS = 3;
  function bakDue() {
    if (!currentProjectId || !store.get(storageKey(currentProjectId))) return false;
    var ref = 0, k = bakKey();
    [store.get(k), store.get(k + ".snooze"), store.get(k + ".first")].forEach(function (v) { var t = v ? Date.parse(v) : NaN; if (isFinite(t) && t > ref) ref = t; });
    return ref > 0 && Date.now() - ref >= BAK_DAYS * 86400000;
  }
  function paintBackupBanner() {
    var b = $("bakBanner"); if (!b) return;
    if (!bakDue()) { b.hidden = true; return; }
    b.className = "banner info"; b.hidden = false;
    b.innerHTML = 'Hace más de ' + BAK_DAYS + ' días que no descargás una copia de seguridad de este proyecto. El avance vive solo en este navegador: si se borran los datos del sitio, se pierde. <button type="button" class="linkBtn" data-action="bakNow" data-fid="bak:now">Descargar copia ahora</button> · <button type="button" class="linkBtn" data-action="bakSnooze" data-fid="bak:snz">Recordármelo en ' + BAK_DAYS + ' días</button>';
  }
  function renderProjectsPanel() {
    var ids = customIds(), h = '<p class="note" style="margin-top:0">Tus proyectos propios (' + ids.length + " de " + MAX_CUSTOM + "), guardados en este navegador. Podés crear uno en blanco, importarlo desde una planilla, o duplicar el que tengas abierto (incluso un caso de ejemplo) para probar variantes sin tocar el original.</p>" +
      '<div class="evmActions"><button type="button" class="primary" data-action="newBlank" data-fid="pj:new">Nuevo proyecto en blanco</button><button type="button" data-action="importPlan" data-fid="pj:imp">Importar planilla (Excel o CSV)</button><button type="button" data-action="planTemplate" data-fid="pj:tpl">Plantilla (CSV)</button><button type="button" data-action="duplicateProject" data-fid="pj:dup">Duplicar el proyecto abierto</button></div>';
    h += '<table class="simpletable"><caption class="sr-only">Mis proyectos</caption><thead><tr><th scope="col">Proyecto</th><th scope="col">Inicio</th><th scope="col">Tareas</th><th scope="col">Avance guardado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' +
      (ids.map(function (id) {
        var c = CASOS[id], cur = id === currentProjectId, sv = !!store.get(storageKey(id)), i = esc(id);
        return "<tr" + (cur ? ' class="rowLive"' : "") + "><th scope=\"row\">" + esc(c.title) + (cur ? " <small>(abierto)</small>" : "") + "</th><td>" + esc(c.startDate) + "</td><td>" + c.tasks.length + "</td><td>" + (sv ? "sí" : "no") + '</td><td class="nowrap">' +
          (cur ? "" : '<button type="button" data-action="openProject" data-id="' + i + '" data-fid="pj:open:' + i + '">Abrir</button> ') + '<button type="button" data-action="renameProject" data-id="' + i + '" data-fid="pj:ren:' + i + '">Renombrar</button> <button type="button" class="delBtn" data-action="deleteProject" data-id="' + i + '" data-fid="pj:del:' + i + '" aria-label="Eliminar el proyecto ' + esc(c.title) + '">✕</button></td></tr>';
      }).join("") || '<tr><td colspan="5">Todavía no creaste proyectos propios.</td></tr>') + "</tbody></table>";
    $("projBody").innerHTML = h;
  }
  function paintProjectButtons() {
    var c = isCustomCase(); ["renameBtn", "deleteProjBtn"].forEach(function (id) { var e = $(id); if (e) e.hidden = !c; });
  }
  function newBlankProject() {
    return askForm("Nuevo proyecto en blanco", [
      { key: "title", label: "Nombre del proyecto", value: "", required: true },
      { key: "startDate", label: "Fecha de inicio", type: "date", value: dateToISO(new Date()), required: true },
      { key: "resource", label: "Recurso o responsable inicial", value: "PM" }
    ], "Crear", function (r) { if (!isISO(r.startDate)) return "La fecha de inicio no es válida."; }).then(function (r) {
      if (!r) return;
      var res = (r.resource || "PM").trim() || "PM";
      var T = function (id, name, dur, preds) { return { id: id, name: name, dur: dur, preds: preds, pct: 0, resource: res, crashCostPerDay: null }; };
      startCustom({ title: r.title.trim(), startDate: r.startDate, phases: [{ id: "1.1", name: "Inicio y planificación", children: ["1.1.1", "1.1.2"] }, { id: "1.2", name: "Ejecución", children: ["1.2.1"] }],
        tasks: [T("1.1.1", "Definir el alcance y los objetivos", 5, []), T("1.1.2", "Armar el plan del proyecto", 5, ["1.1.1"]), T("1.2.1", "Ejecutar el trabajo", 10, ["1.1.2"])] },
        { origen: "blanco", text: "Proyecto creado con tres tareas de ejemplo: editalas, borralas o agregá las tuyas con \"Agregar tarea\"." });
    });
  }
  /* ---- lectura de la planilla ---- */
  function parseCsv(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    var first = text.split(/\r?\n/)[0] || "", sep = (first.split(";").length > first.split(",").length) ? ";" : ",", rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function normHead(h) { return String(h || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  var PLAN_COLS = { phase: ["fase", "etapa", "phase"], id: ["id", "edt", "wbs", "codigo"], name: ["tarea", "actividad", "nombre", "task", "name"], dur: ["duracion", "dias", "duration"], preds: ["predecesora", "dependencia", "predecessor"], res: ["recurso", "responsable", "resource"], cost: ["costo", "cost"], pct: ["avance", "completado", "porcentaje", "pct"] };
  function planRowsToDef(rows) {
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
    if (rows.length < 2) return { error: "La planilla está vacía: tiene que tener una fila de títulos y al menos una tarea." };
    var heads = rows[0].map(normHead), col = {};
    Object.keys(PLAN_COLS).forEach(function (k) { for (var i = 0; i < heads.length; i++) { if (PLAN_COLS[k].some(function (a) { return heads[i] === a || heads[i].indexOf(a) === 0; }) && Object.keys(col).every(function (kk) { return col[kk] !== i; })) { col[k] = i; break; } } });
    if (col.name === undefined || col.dur === undefined) return { error: "Faltan columnas obligatorias: \"Tarea\" y \"Duración\". Descargá la plantilla para ver los títulos esperados." };
    var data = rows.slice(1), errs = [], tasksL = [], phases = [], phaseByName = {}, counters = {}, curPhase = "", seen = {};
    if (data.length > CONFIG.MAX_TASKS) return { error: "La planilla tiene " + data.length + " tareas y el máximo es " + CONFIG.MAX_TASKS + "." };
    var cell = function (r, k) { return col[k] === undefined ? "" : String(r[col[k]] === undefined ? "" : r[col[k]]).trim(); };
    data.forEach(function (r, ri) {
      var line = ri + 2, name = cell(r, "name"); if (!name) { errs.push("Fila " + line + ": falta el nombre de la tarea."); return; }
      var ph = cell(r, "phase") || curPhase || "Tareas"; curPhase = ph;
      if (!phaseByName[ph]) { var pid = "1." + (phases.length + 1); phaseByName[ph] = { id: pid, name: ph.slice(0, 200), children: [] }; phases.push(phaseByName[ph]); counters[pid] = 0; }
      var P = phaseByName[ph], id = cell(r, "id");
      if (!id) { do { counters[P.id]++; id = P.id + "." + counters[P.id]; } while (seen[id]); }
      id = id.slice(0, 40);
      if (seen[id]) { errs.push("Fila " + line + ": el ID " + id + " está repetido."); return; }
      var dv = cell(r, "dur").replace(",", "."), dur = dv === "" ? NaN : Math.round(parseFloat(dv));
      if (!isFinite(dur) || dur < 0 || dur > 2000) { errs.push("Fila " + line + ": la duración de " + id + " tiene que ser un número de días entre 0 y 2000."); return; }
      var pv = cell(r, "pct").replace("%", "").replace(",", "."), pct = pv === "" ? 0 : parseFloat(pv);
      if (!isFinite(pct) || pct < 0 || pct > 100) { errs.push("Fila " + line + ": el avance de " + id + " tiene que estar entre 0 y 100."); return; }
      var cv = cell(r, "cost").replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."), cost = cv === "" ? null : parseFloat(cv);
      seen[id] = true; P.children.push(id);
      var t = { id: id, name: name.slice(0, 300), dur: dur, preds: [], pct: Math.round(pct), resource: cell(r, "res").slice(0, 100) || "PM", crashCostPerDay: null, _spec: cell(r, "preds"), _line: line };
      if (cost !== null && isFinite(cost) && cost >= 0) t.dailyCost = cost;
      tasksL.push(t);
    });
    tasksL.forEach(function (t) {
      if (!t._spec) return;
      var ps = parsePredSpec(t._spec.replace(/;/g, ","), t.id, tasksL);
      if (ps.error) { errs.push("Fila " + t._line + ": " + ps.error); return; }
      t.preds = ps.preds; if (Object.keys(ps.deps).length) t.deps = ps.deps;
    });
    if (!errs.length && detectCycle(tasksL).length) errs.push("Las predecesoras forman un ciclo: " + detectCycle(tasksL).slice(0, 5).join(", ") + ".");
    if (errs.length) return { error: errs.slice(0, 6).join("\n") + (errs.length > 6 ? "\n… y " + (errs.length - 6) + " problema(s) más." : "") };
    tasksL.forEach(function (t) { delete t._spec; delete t._line; });
    return { phases: phases, tasks: tasksL };
  }
  function importPlanFile(file) {
    if (!file) return;
    if (file.size > CONFIG.MAX_FILE_BYTES) { notify("El archivo pesa más de " + (CONFIG.MAX_FILE_BYTES / 1048576) + " MB."); return; }
    var isX = /\.xlsx?$/i.test(file.name), rd = new FileReader();
    rd.onerror = function () { notify("No se pudo leer el archivo."); };
    rd.onload = function () {
      if (!isX) { finishImport(parseCsv(String(rd.result)), file.name); return; }
      loadXlsx().then(function () {
        var wb = window.XLSX.read(rd.result, { type: "array" }), ws = wb.Sheets[wb.SheetNames[0]];
        finishImport(window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }), file.name);
      }).catch(function () { notify("No se pudo leer el Excel (la librería no cargó o el archivo no es válido). Probá guardándolo como CSV."); });
    };
    if (isX) rd.readAsArrayBuffer(file); else rd.readAsText(file);
  }
  function finishImport(rows, fname) {
    var def = planRowsToDef(rows);
    if (def.error) { alertBox("No se pudo importar la planilla", def.error); return; }
    askForm("Importar proyecto (" + def.tasks.length + " tareas en " + def.phases.length + " fase(s))", [
      { key: "title", label: "Nombre del proyecto", value: fname.replace(/\.[^.]+$/, "").slice(0, 120), required: true },
      { key: "startDate", label: "Fecha de inicio", type: "date", value: dateToISO(new Date()), required: true }
    ], "Importar", function (r) { if (!isISO(r.startDate)) return "La fecha de inicio no es válida."; }).then(function (r) {
      if (!r) return;
      startCustom({ title: r.title.trim(), startDate: r.startDate, phases: def.phases, tasks: def.tasks }, { origen: "planilla", text: "Planilla importada: " + def.tasks.length + " tareas en " + def.phases.length + " fase(s). Revisá las fechas y las predecesoras." });
    });
  }
  function alertBox(title, msg) {
    var box = document.createElement("div"); box.className = "dlgBox"; box.setAttribute("aria-labelledby", "dlgAlT");
    box.innerHTML = '<h2 id="dlgAlT">' + esc(title) + '</h2><pre class="alertPre">' + esc(msg) + '</pre><div class="dlgBtns"><button type="button" class="btn-primary dlgOk">Entendido</button></div>';
    var close = openModal(box); box.querySelector(".dlgOk").addEventListener("click", function () { close(null); }); box.querySelector(".dlgOk").focus();
  }
  function downloadPlanTemplate() {
    var rows = [["Fase", "ID", "Tarea", "Duración (días hábiles)", "Predecesoras", "Recurso", "Costo diario (USD)", "Avance (%)"],
      ["Inicio", "1.1.1", "Definir alcance y objetivos", 5, "", "PM", 300, 0], ["Inicio", "1.1.2", "Armar el plan del proyecto", 5, "1.1.1", "PM", 300, 0],
      ["Ejecución", "1.2.1", "Desarrollar el entregable", 20, "1.1.2", "Equipo", 800, 0], ["Ejecución", "1.2.2", "Pruebas", 8, "1.2.1", "Equipo", 600, 0], ["Cierre", "1.3.1", "Entrega y cierre", 0, "1.2.2", "PM", 0, 0]];
    dl("plantilla-planificador.csv", "text/csv;charset=utf-8", "\uFEFF" + rows.map(function (r) { return r.map(csvSafe).join(","); }).join("\n"));
  }

  /* ===================== ayuda en contexto: glosario de términos ===================== */
  var GLOSS = {
    "BAC": "Presupuesto al cierre (Budget at Completion): el costo total planificado de todo el proyecto. Ejemplo: si el plan completo cuesta USD 480.000, el BAC es 480.000.",
    "VP": "Valor planificado: cuánto trabajo, medido en dinero del presupuesto, debería estar hecho a la fecha de corte según el plan. Ejemplo: si a esa fecha tendría que estar hecho el 40% de un BAC de 100.000, el VP es 40.000.",
    "VE": "Valor ganado: el valor del trabajo realmente terminado, medido con el presupuesto. Ejemplo: si se completó el 30% de un BAC de 100.000, el VE es 30.000.",
    "CA": "Costo real: lo que se gastó de verdad hasta la fecha de corte. Si no cargaste costo real, la herramienta lo estima igual al VE.",
    "CPI": "Índice de rendimiento de costos = VE ÷ CA. Menor que 1 significa que gastás más de lo que ganás. Ejemplo: VE 80.000 y CA 100.000 dan CPI 0,80: por cada dólar gastado se obtienen 80 centavos de trabajo.",
    "SPI": "Índice de rendimiento del cronograma = VE ÷ VP. Menor que 1 significa que vas atrasado. Ejemplo: VE 30.000 y VP 40.000 dan SPI 0,75.",
    "CV": "Variación del costo = VE − CA. Negativa significa sobrecosto.",
    "SV": "Variación del cronograma = VE − VP. Negativa significa atraso (medido en dinero, no en días).",
    "EAC": "Estimación al cierre: cuánto va a costar el proyecto completo si el desempeño sigue como hasta ahora. Con el método por defecto, EAC = BAC ÷ CPI. Ejemplo: BAC 100.000 y CPI 0,80 dan un EAC de 125.000.",
    "ETC": "Estimación hasta el cierre: lo que falta gastar. ETC = EAC − CA. Ejemplo: EAC 125.000 y CA 50.000 dan un ETC de 75.000.",
    "VAC": "Variación al cierre = BAC − EAC. Negativa significa que se prevé terminar por encima del presupuesto.",
    "TCPI": "Índice de rendimiento necesario: el CPI que tendrías que sostener de ahora en adelante para cerrar dentro del presupuesto. TCPI = (BAC − VE) ÷ (BAC − CA). Si da bastante más que 1, cerrar en el BAC es poco realista.",
    "Duración estimada": "Aproximación simple de cuánto va a durar el proyecto = duración planificada ÷ SPI. No recalcula el cronograma: es solo una señal.",
    "Ruta crítica": "Las tareas sin holgura: si una se demora, se mueve la fecha de fin del proyecto."
  };
  function glossKey(label) { return String(label).replace(/<[^>]*>/g, "").split(" — ")[0].replace(/\s*\(.*$/, "").trim(); }
  function helpFor(label) { var k = glossKey(label); return GLOSS[k] ? ' <button type="button" class="helpBtn" data-action="helpTerm" data-term="' + esc(k) + '" aria-label="¿Qué es ' + esc(k) + '?" title="¿Qué es ' + esc(k) + '?">?</button>' : ""; }
  function helpTerm(k) { if (GLOSS[k]) alertBox(k, GLOSS[k]); }
  function exportDashPdf() {
    var cm = caseMetrics(), m = cm.m, idx = idx2;
    var rows = [["Fecha de corte", cutoffISO()], ["Estado general", cm.overall.toUpperCase()], ["Cronograma", cm.sched.toUpperCase() + (m.PV > 0 ? " · SPI " + idx(m.SPI) : "")], ["Costo", cm.cost.toUpperCase() + (m.acEstimated ? "" : " · CPI " + idx(m.CPI))], ["Riesgos", cm.rk.toUpperCase()],
      ["BAC", usd(m.BAC)], ["Avance real / planificado", pct(m.EV, m.BAC) + " / " + pct(m.PV, m.BAC)], ["Costo real", usd(m.AC) + (m.acEstimated ? " (estimado)" : "")], ["EAC / ETC", usd(m.EAC) + " / " + usd(m.ETC)], ["TCPI", m.TCPI === null ? "—" : idx(m.TCPI)],
      ["Fin proyectado", cm.endISO + (cm.delta ? " (" + (cm.delta > 0 ? "+" : "") + cm.delta + " días hábiles vs el plan)" : "")], ["Tareas críticas", String(cm.crit)],
      ["Alertas (" + cm.alerts.length + ")", cm.alerts.length ? cm.alerts.map(function (a) { return (a.sev === "rojo" ? "Urgente: " : "Atención: ") + a.msg; }).join("\n") : "Ninguna"]];
    $("printArea").innerHTML = '<div class="onepage"><h1>Panel de control — ' + esc(caseTitle()) + '</h1><div class="sub">Corte al ' + esc(cutoffISO()) + " · Generado " + esc(dateToISO(new Date())) + "</div>" + tblHtml(["Indicador", "Valor"], rows) + '<div class="attribPrint">' + esc(CONFIG.ATTRIBUTION) + "</div></div>";
    var prev = document.title; document.title = "Panel_de_control_" + currentProjectId + "_" + cutoffISO();
    window.addEventListener("afterprint", function () { document.title = prev; }, { once: true });
    track("exportar_panel_control", { caso_id: currentProjectId });
    notify("En el cuadro de impresión elegí \"Guardar como PDF\".");
    setTimeout(function () { window.print(); }, 200);
  }

  /* ===================== visita guiada ===================== */
  var tourStep = -1;
  var TOUR = [
    { sel: "#projectSelect", t: "Elegí uno de los casos de ejemplo, o creá tu propio proyecto en blanco o importándolo desde una planilla (botones de la barra superior)." },
    { sel: "#ganttBody", t: "Este es el diagrama de Gantt. Las barras rojas son la ruta crítica: si se demoran, se mueve el fin del proyecto. Arrastrá una barra para probar un cambio." },
    { sel: '[data-action="explainTask"]', t: "En cada fila, el botón ? explica por qué la tarea tiene esa fecha, y Pausa simula qué pasa si esa tarea no se hace." },
    { sel: "#dashToggleBtn", t: "El panel de control resume en una vista el semáforo de cronograma, costo y riesgos, y las alertas que se disparan." },
    { sel: '[data-action="downloadJson"]', t: "Tu avance se guarda solo en este navegador. Descargá la copia de seguridad para llevarlo a otra computadora, o exportá a Excel." }
  ];
  function tourKey() { return "ptTI.tour." + META.audience; }
  function tourSteps() { return TOUR.filter(function (s) { return document.querySelector(s.sel); }); }
  function endTour(markSeen) {
    var b = $("tourBox"); if (b) b.remove();
    Array.prototype.forEach.call(document.querySelectorAll(".tourTarget"), function (e) { e.classList.remove("tourTarget"); });
    document.removeEventListener("keydown", tourEsc, true); tourStep = -1;
    if (markSeen) store.set(tourKey(), "1");
  }
  function tourEsc(e) { if (e.key === "Escape") { endTour(true); } }
  function showTourStep(i) {
    var steps = tourSteps(); if (!steps.length) { endTour(true); return; }
    i = Math.max(0, Math.min(steps.length - 1, i)); tourStep = i;
    Array.prototype.forEach.call(document.querySelectorAll(".tourTarget"), function (e) { e.classList.remove("tourTarget"); });
    var el = document.querySelector(steps[i].sel);
    if (el) { el.classList.add("tourTarget"); var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; try { el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); } catch (e) { el.scrollIntoView(); } }
    var b = $("tourBox"); if (!b) { b = document.createElement("div"); b.id = "tourBox"; b.className = "tourBox"; b.setAttribute("role", "dialog"); b.setAttribute("aria-labelledby", "tourT"); document.body.appendChild(b); }
    var last = i === steps.length - 1;
    b.innerHTML = '<div id="tourT" class="tourT">Visita guiada · paso ' + (i + 1) + " de " + steps.length + "</div><p>" + esc(steps[i].t) + '</p><div class="dlgBtns"><button type="button" class="tourSkip" data-action="tourEnd">Saltar</button>' + (i > 0 ? '<button type="button" data-action="tourPrev">Anterior</button>' : "") + '<button type="button" class="btn-primary" data-action="' + (last ? "tourEnd" : "tourNext") + '">' + (last ? "Terminar" : "Siguiente") + "</button></div>";
    var nb = b.querySelector(".btn-primary"); if (nb) nb.focus({ preventScroll: true });
  }
  function startTour() { endTour(false); document.addEventListener("keydown", tourEsc, true); showTourStep(0); track("visita_guiada", { audiencia: META.audience }); }

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
  /* ===================== exportar para Power BI (tablas planas con claves, listas para relacionar) ===================== */
  function exportPowerBI(btn) {
    var label = btn ? btn.textContent : ""; if (btn) { btn.textContent = "Preparando archivo…"; btn.disabled = true; }
    loadXlsx().then(function () { if (btn) { btn.textContent = label; btn.disabled = false; } runExportPowerBI(); }).catch(function () {
      if (btn) { btn.textContent = label; btn.disabled = false; }
      notify("No se pudo cargar la librería de Excel (sin conexión o bloqueada). Probá con otra conexión o desactivá el bloqueador de contenido.");
    });
  }
  function xlDate(iso) { // fecha como número de serie de Excel con formato de fecha: Power BI la reconoce como fecha sin importar la zona horaria
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    var p = iso.split("-"); return { t: "n", v: Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(1899, 11, 30)) / 86400000), z: "yyyy-mm-dd" };
  }
  function pbiSheet(X, cols, rows) { // cols: [{k, dt?}] ; rows: objetos
    var aoa = [cols.map(function (c) { return c.k; })];
    rows.forEach(function (r) { aoa.push(cols.map(function (c) { var v = r[c.k]; if (c.dt) return xlDate(v); return v === undefined || v === null ? "" : v; })); });
    var ws = X.utils.aoa_to_sheet(aoa);
    ws["!cols"] = cols.map(function (c) { return { wch: Math.max(10, Math.min(40, c.k.length + 4)) }; });
    return ws;
  }
  function runExportPowerBI() {
    var m = computeEVM(), res = computeSchedule(tasks), X = window.XLSX, pid = currentProjectId, title = CASOS[pid] ? CASOS[pid].title : pid, exported = dateToISO(new Date());
    var key = function (id) { return pid + "|" + id; };
    var phaseOf = {}; phases.forEach(function (ph) { ph.children.forEach(function (c) { phaseOf[c] = ph; }); });
    var cutISO = m.cutISO, logByTask = {};
    timeLog.forEach(function (e) { if (e.date && e.date <= cutISO) { var tk = taskById(e.taskId); logByTask[e.taskId] = (logByTask[e.taskId] || 0) + logCostOf(e, tk); } });
    var perId = {}; m.perTask.forEach(function (p) { perId[p.t.id] = p; });
    var endISO = workdayISO(Math.max(0, res.projectEnd - 1)), baseEndISO = workdayISO(Math.max(0, m.planned.projectEnd - 1));
    var bs = parseBudget(charter.budget);
    var proyecto = [{ "ProyectoID": pid, "Proyecto": title, "Audiencia": META.audience, "Inicio": startDateValue(), "FinPlanificado": baseEndISO, "FinPronosticado": endISO,
      "DuracionPlanificadaDias": m.planned.projectEnd, "DuracionPronosticadaDias": res.projectEnd, "LineaBase": m.planned.label, "Patrocinador": charter.sponsor || "", "PresupuestoActa": bs === null ? "" : bs,
      "FechaCorte": cutISO, "BAC": Math.round(m.BAC), "PV": Math.round(m.PV), "EV": Math.round(m.EV), "AC": Math.round(m.AC), "CPI": isFinite(m.CPI) ? Math.round(m.CPI * 1000) / 1000 : "", "SPI": isFinite(m.SPI) ? Math.round(m.SPI * 1000) / 1000 : "",
      "EAC": Math.round(m.EAC), "ETC": Math.round(m.ETC), "VAC": Math.round(m.VAC), "CV": Math.round(m.CV), "SV": Math.round(m.SV), "TCPI": m.tcpiBac === null ? "" : Math.round(m.tcpiBac * 1000) / 1000,
      "MetodoEAC": m.method, "CostoRealEstimado": m.acEstimated ? 1 : 0, "FechaExportacion": exported }];
    var tareas = [], deps = [], recursos = [];
    tasks.forEach(function (t) {
      var ph = phaseOf[t.id], p = perId[t.id], pr = m.planned.schedule[t.id] || { es: t._es, ef: t._ef, dur: t.dur }, dc = getDailyCost(t);
      var acT = (t.acTask !== null && t.acTask !== undefined) ? t.acTask : (logByTask[t.id] !== undefined ? logByTask[t.id] : "");
      tareas.push({ "TareaKey": key(t.id), "ProyectoID": pid, "EDT": t.id, "FaseEDT": ph ? ph.id : "", "Fase": ph ? ph.name : "", "Tarea": t.name, "Tipo": t.dur === 0 ? "Hito" : "Tarea", "Recurso": t.resource || "",
        "DuracionDias": t.dur, "Inicio": startISO(t), "Fin": finishISO(t), "InicioLineaBase": workdayISO(pr.es), "FinLineaBase": pr.dur === 0 ? workdayISO(pr.es) : workdayISO(Math.max(0, pr.ef - 1)),
        "DesvioFinDias": t.inactive ? 0 : t._ef - pr.ef, "HolguraDias": t.slack, "EsCritica": t.critical ? 1 : 0, "EstadoRuta": t.critical ? "Crítica" : (t.near ? "Casi crítica" : "Con holgura"),
        "AvancePct": t.pct, "CostoDiario": Math.round(dc * 100) / 100, "Presupuesto": p ? Math.round(p.budget) : 0, "VE": p ? Math.round(p.ev) : 0,
        "VPAlCorte": t.inactive ? 0 : Math.round(Math.max(0, Math.min(m.cut - pr.es, pr.dur)) * dc), "CostoReal": acT === "" ? "" : Math.round(acT), "Inactiva": t.inactive ? 1 : 0, "Predecesoras": predsText(t), "Notas": t.notes || "" });
      t.preds.forEach(function (pp) { var d = depOf(t, pp); deps.push({ "TareaKey": key(t.id), "PredecesoraKey": key(pp), "ProyectoID": pid, "Tipo": DEP_ES[d.type], "DesfaseDias": d.lag }); });
      allResourcesOf(t).forEach(function (r) { recursos.push({ "ProyectoID": pid, "TareaKey": key(t.id), "Recurso": r, "Inicio": startISO(t), "Fin": finishISO(t), "DuracionDias": t.dur }); });
    });
    var curva = [], hasta = Math.max(m.planned.projectEnd, res.projectEnd);
    for (var d = 0; d <= hasta; d++) {
      var vp = 0; m.perTask.forEach(function (p) { var pr = m.planned.schedule[p.t.id] || { es: p.t._es, dur: p.t.dur }; vp += Math.max(0, Math.min(d - pr.es, pr.dur)) * p.dc; });
      curva.push({ "ProyectoID": pid, "Fecha": workdayISO(d), "DiaHabil": d, "VPAcumulado": Math.round(vp), "BAC": Math.round(m.BAC) });
    }
    var cortes = allCuts(m).map(function (c) { return { "ProyectoID": pid, "Fecha": c.date, "DiaHabil": c.day, "PV": Math.round(c.PV), "EV": Math.round(c.EV), "AC": Math.round(c.AC), "CPI": c.CPI === null ? "" : Math.round(c.CPI * 1000) / 1000, "SPI": c.SPI === null ? "" : Math.round(c.SPI * 1000) / 1000, "EsCorteVigente": c.live ? 1 : 0 }; });
    var tiempos = timeLog.map(function (e) { var tk = taskById(e.taskId); return { "ProyectoID": pid, "Fecha": e.date, "TareaKey": key(e.taskId), "DiasTrabajados": e.days === null || e.days === undefined ? "" : e.days, "Costo": Math.round(logCostOf(e, tk)), "AvancePct": e.pct === null || e.pct === undefined ? "" : e.pct, "Nota": e.note || "" }; });
    var riesgos = risks.map(function (r) { var mv = riskMoney(r); return { "ProyectoID": pid, "RiesgoKey": pid + "|" + r.id, "ID": r.id, "Riesgo": r.desc, "Tipo": r.type || "Amenaza", "Categoria": r.category || "", "Probabilidad": r.prob, "Impacto": r.impact, "Puntaje": riskScore(r.prob, r.impact),
      "Respuesta": r.response || "", "Responsable": r.owner || "", "TareaKey": r.taskId ? key(r.taskId) : "", "ProbabilidadPct": r.probPct === undefined || r.probPct === null ? "" : r.probPct, "ImpactoUSD": r.impactUsd === undefined || r.impactUsd === null ? "" : r.impactUsd, "VME": mv === null ? "" : mv, "Estado": r.status || "", "CostoRealUSD": r.actualCost || "" }; });
    var problemas = issues.map(function (x) { return { "ProyectoID": pid, "ID": x.id, "Tipo": x.type || "", "Descripcion": x.desc || "", "Responsable": x.owner || "", "FechaLimite": x.due || "", "Estado": x.status || "", "TareaKey": x.taskId ? key(x.taskId) : "" }; });
    var cambios = crList.map(function (c) { return { "ProyectoID": pid, "ID": c.id, "Solicitud": c.title || "", "Solicitante": c.requester || "", "TareaKey": c.taskId ? key(c.taskId) : "", "ImpactoDias": num(c.impactDays) || 0, "ImpactoUSD": num(c.impactCost) || 0, "Estado": c.status || "", "Decide": c.who || "", "Fecha": c.date || "", "BACAntes": c.bacBefore === "" ? "" : c.bacBefore, "BACDespues": c.bacAfter === "" ? "" : c.bacAfter }; });
    var interesados = stakeholders.map(function (s) { return { "ProyectoID": pid, "Interesado": s.name || "", "Rol": s.role || "", "Poder": s.power || "", "Interes": s.interest || "", "ParticipacionActual": s.engNow || "", "ParticipacionDeseada": s.engDesired || "", "Estrategia": s.strategy || "" }; });
    var C = function (names, dts) { return names.map(function (k) { return { k: k, dt: !!(dts && dts.indexOf(k) >= 0) }; }); };
    var spec = [
      ["Proyecto", proyecto, ["ProyectoID", "Proyecto", "Audiencia", "Inicio", "FinPlanificado", "FinPronosticado", "DuracionPlanificadaDias", "DuracionPronosticadaDias", "LineaBase", "Patrocinador", "PresupuestoActa", "FechaCorte", "BAC", "PV", "EV", "AC", "CPI", "SPI", "EAC", "ETC", "VAC", "CV", "SV", "TCPI", "MetodoEAC", "CostoRealEstimado", "FechaExportacion"], ["Inicio", "FinPlanificado", "FinPronosticado", "FechaCorte", "FechaExportacion"]],
      ["Tareas", tareas, ["TareaKey", "ProyectoID", "EDT", "FaseEDT", "Fase", "Tarea", "Tipo", "Recurso", "DuracionDias", "Inicio", "Fin", "InicioLineaBase", "FinLineaBase", "DesvioFinDias", "HolguraDias", "EsCritica", "EstadoRuta", "AvancePct", "CostoDiario", "Presupuesto", "VE", "VPAlCorte", "CostoReal", "Inactiva", "Predecesoras", "Notas"], ["Inicio", "Fin", "InicioLineaBase", "FinLineaBase"]],
      ["Dependencias", deps, ["TareaKey", "PredecesoraKey", "ProyectoID", "Tipo", "DesfaseDias"], []],
      ["Recursos", recursos, ["ProyectoID", "TareaKey", "Recurso", "Inicio", "Fin", "DuracionDias"], ["Inicio", "Fin"]],
      ["CurvaS", curva, ["ProyectoID", "Fecha", "DiaHabil", "VPAcumulado", "BAC"], ["Fecha"]],
      ["CortesEVM", cortes, ["ProyectoID", "Fecha", "DiaHabil", "PV", "EV", "AC", "CPI", "SPI", "EsCorteVigente"], ["Fecha"]],
      ["RegistroTiempo", tiempos, ["ProyectoID", "Fecha", "TareaKey", "DiasTrabajados", "Costo", "AvancePct", "Nota"], ["Fecha"]],
      ["Riesgos", riesgos, ["ProyectoID", "RiesgoKey", "ID", "Riesgo", "Tipo", "Categoria", "Probabilidad", "Impacto", "Puntaje", "Respuesta", "Responsable", "TareaKey", "ProbabilidadPct", "ImpactoUSD", "VME", "Estado", "CostoRealUSD"], []],
      ["ProblemasAcciones", problemas, ["ProyectoID", "ID", "Tipo", "Descripcion", "Responsable", "FechaLimite", "Estado", "TareaKey"], ["FechaLimite"]],
      ["Cambios", cambios, ["ProyectoID", "ID", "Solicitud", "Solicitante", "TareaKey", "ImpactoDias", "ImpactoUSD", "Estado", "Decide", "Fecha", "BACAntes", "BACDespues"], ["Fecha"]],
      ["Interesados", interesados, ["ProyectoID", "Interesado", "Rol", "Poder", "Interes", "ParticipacionActual", "ParticipacionDeseada", "Estrategia"], []]
    ];
    var wb = X.utils.book_new();
    spec.forEach(function (s) { X.utils.book_append_sheet(wb, pbiSheet(X, C(s[2], s[3]), s[1]), s[0]); });
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Archivo para Power BI generado por el Planificador TI · " + CONFIG.SITE_URL], ["Proyecto: " + title + " (ProyectoID = " + pid + ")"], ["Exportado el " + exported + ". Fecha de corte del EVM: " + cutISO + ". Línea base: " + m.planned.label + "."],
      ["Cada hoja es una tabla plana. Claves: ProyectoID (proyecto) y TareaKey (= ProyectoID|EDT). Las fechas son fechas reales; los importes están en USD."], ["Para reportar varios proyectos: guardá un archivo por proyecto en una misma carpeta y conectá Power BI a la carpeta (Obtener datos → Carpeta)."]]), "LEEME");
    wb.Props = { Title: "Power BI — " + title, Author: "Valeria Yashan", Company: "valeriayashan.com.ar" };
    X.writeFile(wb, "PowerBI-" + pid + ".xlsx");
    track("exportar_powerbi", { caso_id: pid });
    notify("Archivo para Power BI descargado (PowerBI-" + pid + ".xlsx). Guardalo en una carpeta y conectá Power BI a esa carpeta para sumar varios proyectos.");
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
    exportPowerBI: function (el) { exportPowerBI(el); },
    saveScenario: saveScenario, setBaseline: setBaseline, addTask: addTask, level: levelResources, undoLevel: undoLeveling, undo: undo, redo: redo,
    ftToggle: toggleFastTrack,
    clearBaselines: function () { if (!baselines.length) return; confirmBox("¿Quitar todas las líneas base?", "Quitar").then(function (ok) { if (ok) { pushHistory(); baselines = []; render(); } }); },
    toggleBaseline: function (el) { pushHistory(); var b = baselines[+el.dataset.i]; b.visible = !b.visible; render(); },
    deleteBaseline: function (el) { var i = +el.dataset.i; confirmBox('¿Eliminar "' + baselines[i].name + '"?').then(function (ok) { if (ok) { pushHistory(); baselines.splice(i, 1); render(); } }); },
    loadScenario: function (el) { loadScenario(+el.dataset.i); },
    explainTask: function (el) { explainTask(el.dataset.id); }, toggleInactive: function (el) { toggleInactive(el.dataset.id); },
    updateScenario: function (el) { updateScenario(+el.dataset.i); }, deleteScenario: function (el) { deleteScenario(+el.dataset.i); },
    duplicateProject: duplicateProject, renameProject: function (el) { renameProject(el.dataset.id || currentProjectId); }, deleteProject: function (el) { deleteProject(el.dataset.id || currentProjectId); },
    openProject: function (el) { openProject(el.dataset.id); }, saveNow: saveNow, exportDashPdf: exportDashPdf, helpTerm: function (el) { helpTerm(el.dataset.term); },
    bakNow: downloadJson, bakSnooze: function () { store.set(bakKey() + ".snooze", new Date().toISOString()); paintBackupBanner(); },
    newBlank: newBlankProject, importPlan: function () { $("planFile").click(); }, planTemplate: downloadPlanTemplate, startTour: startTour,
    tourNext: function () { showTourStep(tourStep + 1); }, tourPrev: function () { showTourStep(tourStep - 1); }, tourEnd: function () { endTour(true); },
    openPanel: function (el) { var k = el.dataset.key; if (!PANELS[k]) return; if (panelsOn[k]) { PANELS[k].render(); var pe = $(PANELS[k].id); if (pe && pe.scrollIntoView) pe.scrollIntoView(); } else togglePanel(k); },
    recordCut: recordCut, clearCuts: clearCuts, genCuts: generateWeeklyCuts, addTimeEntry: addTimeEntry, timeCsv: timeCsv,
    deleteTime: function (el) { confirmBox("¿Eliminar esta entrada del registro de tiempo?").then(function (ok) { if (!ok) return; pushHistory(); timeLog = timeLog.filter(function (e) { return e.id !== el.dataset.id; }); syncPctFromLog(); render(); }); },
    traceAdd: function (el) { traceAdd(el.dataset.kind); }, traceDel: function (el) { traceDel(el.dataset.id); }, traceFromCharter: traceFromCharter,
    refreshPort: refreshPortfolio, portCsv: portCsv, pickDocFiles: function () { $("docFiles").click(); },
    clearDocFiles: function () { docEntries = []; refreshPortfolio(); },
    docenteOff: function () { store.set("ptTI.docente", "0"); if (/docente/.test(location.hash)) { try { window.history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; } } renderPortfolio(); },
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
      if (orig !== undefined && v < orig && !t.crashCostPerDay && !isCustomCase()) { el.value = t.dur; notify("No se puede acelerar la tarea " + t.id + ": depende de un tercero."); return; }
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
      if (orig !== undefined && newDur < orig && !t.crashCostPerDay && !isCustomCase()) { notify("No se puede acelerar esta tarea (depende de un tercero): el fin no puede ser anterior al que da su duración mínima."); queueRender(); return; }
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
    eacMethod: function (el) { if (["cpi", "plan", "cpispi"].indexOf(el.value) < 0 || el.value === eacMethod) return; pushHistory(); eacMethod = el.value; queueRender(); },
    alertCfg: function (el) {
      var k = el.dataset.key, v = parseFloat(String(el.value).replace(",", ".")), lim = { lateCrit: [1, 100], cpiMin: [0.1, 2], spiMin: [0.1, 2], contPct: [0, 100] }[k]; if (!lim) return;
      if (!isFinite(v)) v = defaultAlertCfg()[k]; v = Math.max(lim[0], Math.min(lim[1], v)); if (alertCfg[k] === v) return;
      pushHistory(); alertCfg[k] = v; queueRender();
    },
    traceItem: function (el) {
      var x = traceItems.filter(function (i) { return i.id === el.dataset.id; })[0]; if (!x) return;
      var k = el.dataset.key, v = k === "kind" ? (el.value === "Entregable" ? "Entregable" : "Objetivo") : el.value.slice(0, 400);
      if (x[k] === v) return; pushHistory(); x[k] = v; if (k === "kind") queueRender(); else paintAlertBadge();
    },
    traceLink: function (el) {
      var id = el.dataset.id, it = el.dataset.item; if (!taskById(id)) return;
      pushHistory(); var l = traceLinks[id] || [], i = l.indexOf(it);
      if (el.checked && i < 0) l.push(it); else if (!el.checked && i >= 0) l.splice(i, 1);
      if (l.length) traceLinks[id] = l; else delete traceLinks[id]; queueRender();
    },
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
    loadStoredCustom(); populateProjectSelect(); bindGantt();
    $("planFile").addEventListener("change", function (e) { importPlanFile(e.target.files[0]); e.target.value = ""; });
    $("importFile").addEventListener("change", function (e) { importFile(e.target.files[0]); e.target.value = ""; });
    $("lessonsInput").setAttribute("data-change", "lessons");
    if ($("docFiles")) $("docFiles").addEventListener("change", function (e) { loadDocFiles(e.target.files); e.target.value = ""; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-panel]"), function (b) { b.setAttribute("aria-expanded", "false"); });
    $("year").textContent = String(new Date().getFullYear());
    if (CONFIG.WHATSAPP_URL) { var w = $("waBtn"); w.href = CONFIG.WHATSAPP_URL; w.hidden = false; }
    var last = store.get(lastCaseKey()), first = (last && CASOS[last]) ? last : caseIds()[0];
    loadProject(first); maybeRestore(first);
    if ($("exportTiBtn")) $("exportTiBtn").hidden = !EGCI;
    track("herramienta_abierta", { audiencia: META.audience });
    if (store.get(tourKey()) !== "1") setTimeout(function () { if (!document.querySelector(".dlgOverlay") && store.get(tourKey()) !== "1" && tourStep < 0) startTour(); }, 900);
  }
  // utilidad de pruebas (no se usa en producción)
  window.__PTI_TEST__ = { computeScheduleOn: computeScheduleOn, validateState: validateState, getState: function () { return { tasks: tasks, holidays: holidays, risks: risks, issues: issues, crList: crList, baselines: baselines, changeLog: changeLog, charter: charter, comms: comms }; }, workdayISO: workdayISO, dayOffsetFromDate: dayOffsetFromDate, computeEVM: computeEVM,
    parsePredSpec: parsePredSpec, predsText: predsText, buildIcs: buildIcs, statusData: statusData, buildStatusText: buildStatusText, statusRows: statusRows, reserveData: reserveData, pertAnalysis: pertAnalysis, runChecks: runChecks, serializeState: serializeState, applyImport: applyImport, applyChangeRequest: applyChangeRequest, crTaskCheck: crTaskCheck, loadProject: loadProject, buildInformeText: buildInformeText, tiDocs: tiDocs, icsFold: icsFold, getSim: function () { return simResult; }, setCutoff: function (d) { cutoffDay = d; },
    caseMetrics: caseMetrics, explainData: explainData, alertList: alertList, buildPortfolio: buildPortfolio, traceCoverage: traceCoverage, scenarioStats: scenarioStats, allCuts: allCuts, syncPctFromLog: syncPctFromLog, customIds: customIds, deleteProject: deleteProject, renameProject: renameProject, duplicateProject: duplicateProject, bakDue: bakDue, saveNow: saveNow, helpFor: helpFor, GLOSS: GLOSS, getExt: function () { return { evmCuts: evmCuts, timeLog: timeLog, traceItems: traceItems, traceLinks: traceLinks, alertCfg: alertCfg, eacMethod: eacMethod }; }, setExt: function (o) { if (o.timeLog) timeLog = o.timeLog; if (o.evmCuts) evmCuts = o.evmCuts; if (o.eacMethod) eacMethod = o.eacMethod; }, planRowsToDef: planRowsToDef, parseCsv: parseCsv, registerCustom: registerCustom, startCustom: startCustom, finishImport: finishImport, tourSteps: tourSteps, pvCurve: pvCurve, sCurveHtml: sCurveHtml, trendHtml: trendHtml, restoreFromStr: restoreFromStr, fullSnapshotStr: fullSnapshotStr, setDocEntries: function (l) { docEntries = l; portCache = null; } };
  window.__PTI_ACTIONS__ = { ACTIONS: ACTIONS, CHANGE: CHANGE };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
