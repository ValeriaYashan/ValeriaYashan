/* Planificador TI — Valeria Yashan · valeriayashan.com.ar
   JavaScript vanilla, sin frameworks. Datos de casos en data/casos-*.js, feriados en data/feriados.js. */
(function () {
  "use strict";

  /* ===================== CONFIGURACIÓN (completar lo que falta) ===================== */
  var CONFIG = {
    APP_ID: "planificador-ti-valeriayashan",
    SCHEMA_VERSION: 2,
    SITE_URL: "https://valeriayashan.com.ar",
    PRESENTATION_URL: "/herramientas/planificador-ti/",
    SUBSCRIBE_URL: "/herramientas/planificador-ti/suscribirse/",
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
    MAX_TASKS: 300
  };

  var CASOS = window.PLANIFICADOR_CASOS || {};
  var META = window.PLANIFICADOR_CASOS_META || { audience: "publica" };
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

  /* ===================== estado ===================== */
  var DAY_PX = 6;
  var currentProjectId = "";
  var tasks = [], phases = [];
  var ORIGINAL_DURS = {}, originalProjectEnd = 0, originalSchedule = {};
  var nearThreshold = 5, baselines = [], cutoffDay = 65, acActual = null;
  var risks = [], raciAssignments = {}, raciPeople = [];
  var charter = {}, comms = [], changeLog = [], decisionLog = [], lessons = "";
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

  function cloneTasks(list) { return list.map(function (t) { var c = Object.assign({}, t); c.preds = t.preds.slice(); c.extraResources = (t.extraResources || []).slice(); return c; }); }
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
  function computeScheduleOn(list) {
    var byId = {}; list.forEach(function (t) { byId[t.id] = t; });
    var cyclic = detectCycle(list), cycSet = new Set(cyclic);
    list.forEach(function (t) { delete t._es; delete t._ef; t._lf = undefined; });
    function ES(t) {
      if (t._es !== undefined) return t._es;
      t._es = 0; // corta recursión ante datos inesperados
      var dep = 0;
      if (!cycSet.has(t.id) && t.preds.length) {
        var vals = t.preds.filter(function (p) { return byId[p]; }).map(function (p) { return EF(byId[p]) - (t.overlapDays || 0); });
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
    function LF(t) {
      if (t._lf !== undefined) return t._lf;
      var s = succ[t.id];
      // si el sucesor está solapado (seguimiento rápido), su inicio más tardío se adelanta ese solapamiento
      t._lf = s.length === 0 ? projectEnd : Math.min.apply(null, s.map(function (id) { return LS(byId[id]) + (byId[id].overlapDays || 0); }));
      return t._lf;
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
  function parseBudget(txt) { var n = parseInt(String(txt || "").replace(/[^\d]/g, ""), 10); return isNaN(n) || n <= 0 ? null : n; }
  function budgetNote(m) {
    var ab = parseBudget(charter.budget);
    if (ab === null) return "Los costos diarios son editables en la tabla de abajo: el acta de constitución no trae un presupuesto numérico para comparar con el BAC.";
    var diff = Math.round(m.BAC - ab);
    return "Presupuesto autorizado en el acta de constitución: " + usd(ab) + ". " + (Math.abs(diff) <= 1
      ? "El BAC coincide con ese presupuesto: los costos diarios de este caso se distribuyeron en proporción a la duración y al tipo de recurso de cada tarea (distribución didáctica, no una estimación ascendente). El BAC es la línea base de costos; las reservas de contingencia y de gestión no se discriminan."
      : "El BAC (" + usd(m.BAC) + ") difiere en " + usd(Math.abs(diff)) + " del presupuesto del acta " + (diff > 0 ? "por encima" : "por debajo") + ": cambiaste duraciones, costos o tareas (las tareas nuevas usan una tarifa didáctica). Revisá el BAC o actualizá el acta con una solicitud de cambio.") +
      " Podés editar los costos diarios en la tabla de abajo.";
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
      decisionLog: decisionLog, lessons: lessons, cutoffDay: cutoffDay, acActual: acActual, nearThreshold: nearThreshold, meta: metaState() });
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
    var m = s.meta || {};
    holidays = m.holidays || holidays; holidayCountry = m.holidayCountry || holidayCountry; holidayYear = m.holidayYear || holidayYear;
    if (m.startDate) $("startDate").value = m.startDate;
    actualStart = m.actualStart || ""; actualFinish = m.actualFinish || ""; plannedFinishOverride = m.plannedFinishOverride || "";
    $("nearThreshold").value = nearThreshold;
  }
  function undo() { if (!history.length) return; future.push(fullSnapshotStr()); restoreFromStr(history.pop()); setDirty(true); render(); }
  function redo() { if (!future.length) return; history.push(fullSnapshotStr()); restoreFromStr(future.pop()); setDirty(true); render(); }
  function setDirty(v) {
    isDirty = v;
    var el = $("dirtyIndicator");
    if (!el) return;
    el.className = "dirty" + (v ? "" : " clean");
    el.innerHTML = '<span class="dot" aria-hidden="true"></span>' + (v ? "Cambios sin guardar" : "Sin cambios pendientes");
  }

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
    risks = clone(proj.risks || []); raciAssignments = {}; raciPeople = [];
    charter = clone(proj.charter || {});
    comms = (charter.stakeholders || "").split(",").slice(0, 2).map(function (s, i) {
      return { id: "C" + (i + 1), stakeholder: s.trim(), info: i === 0 ? "Avance general del proyecto" : "Impacto en su área",
        freq: i === 0 ? "Semanal" : "Quincenal", channel: "Reunión / email", owner: "PM" };
    });
    changeLog = []; decisionLog = []; lessons = ""; history = []; future = [];
    scenarios = [{ name: "Plan original", snap: { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) } }];
    activeScenario = 0; ftTaskId = ""; setDirty(false);
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
          '<td class="pred">' + (t.preds.map(esc).join(", ") || "—") + "</td>" +
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
    var tlab = document.createElement("div"); tlab.className = "today-label"; tlab.style.left = (cutoffDay * DAY_PX) + "px"; tlab.textContent = "HOY"; tlab.setAttribute("aria-hidden", "true");
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
        var x1 = p._ef * DAY_PX, y1 = rowCenterY[p.id], x2 = t._es * DAY_PX, y2 = rowCenterY[t.id];
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
    var sel = $("ftSelect"), cands = leafTasks().filter(function (t) { return t.preds.length > 0 && t.dur > 0; });
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
      var minPred = Math.min.apply(null, t.preds.map(function (p) { var x = taskById(p); return x ? x.dur : t.dur; }));
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
    comms: { id: "commspanel", btn: "commsToggleBtn", label: "plan de comunicaciones", render: renderComms },
    kanban: { id: "kanbanpanel", btn: "kanbanToggleBtn", label: "Kanban", render: renderKanban },
    close: { id: "closepanel", btn: "closeToggleBtn", label: "cierre del proyecto", render: renderCloseLogs }
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
  function riskScore(p, i) { return (RISK_SCALE[p] || 1) * (RISK_SCALE[i] || 1); }
  function riskClass(e) { return e <= 2 ? "g" : (e <= 4 ? "a" : "r"); }
  function renderRisks() {
    var h = '<table class="risktable"><caption class="sr-only">Registro de riesgos</caption><thead><tr><th scope="col">#</th><th scope="col">Riesgo</th><th scope="col">Categoría</th><th scope="col">Prob.</th><th scope="col">Impacto</th><th scope="col">Puntaje (P×I)</th><th scope="col">Respuesta</th><th scope="col">Responsable del riesgo</th><th scope="col">Tarea vinculada</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>';
    risks.forEach(function (r) {
      var e = riskScore(r.prob, r.impact);
      var opts = '<option value="">—</option>' + tasks.map(function (t) { return '<option value="' + esc(t.id) + '"' + (r.taskId === t.id ? " selected" : "") + ">" + esc(t.id) + "</option>"; }).join("");
      h += "<tr><td>" + esc(r.id) + "</td><td>" + esc(r.desc) + "</td><td>" + esc(r.category) + "</td><td>" + esc(r.prob) + "</td><td>" + esc(r.impact) + '</td><td><span class="expo ' + riskClass(e) + '">' + e + "</span></td><td>" + esc(r.response) + "</td><td>" + esc(r.owner) + '</td><td><select class="cell-input" data-change="riskTask" data-id="' + esc(r.id) + '" data-fid="rt:' + esc(r.id) + '" aria-label="Tarea vinculada al riesgo ' + esc(r.id) + '">' + opts + '</select></td><td><button type="button" class="delBtn" data-action="deleteRisk" data-id="' + esc(r.id) + '" data-fid="rd:' + esc(r.id) + '" aria-label="Eliminar el riesgo ' + esc(r.id) + '">✕</button></td></tr>';
    });
    h += '</tbody></table><p class="note">Puntaje = probabilidad × impacto (escala 1 a 3 cada una), una ayuda para priorizar cada riesgo. No es la "exposición al riesgo" del proyecto, que en PMBOK es una medida agregada de todos los riesgos. Los riesgos vinculados a una tarea muestran un aviso sobre su barra en el Gantt.</p>';
    $("riskBody").innerHTML = h;
  }

  /* ---- charter ---- */
  function renderCharter() {
    var fields = [
      { key: "objective", label: "Objetivo SMART (a completar por el alumno)", full: true, ph: "Escribí el objetivo SMART del proyecto..." },
      { key: "sponsor", label: "Patrocinador (sponsor)" }, { key: "budget", label: "Presupuesto autorizado" }, { key: "duration", label: "Duración estimada" },
      { key: "deliverable", label: "Entregable principal", full: true }, { key: "scopeIn", label: "Alcance — dentro", full: true },
      { key: "scopeOut", label: "Alcance — fuera (a completar)", full: true, ph: "¿Qué queda explícitamente fuera del alcance?" },
      { key: "constraints", label: "Restricciones", full: true }, { key: "stakeholders", label: "Partes interesadas clave", full: true }
    ];
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
  }
  function renderInformeCierre() {
    var m = computeEVM(), res = computeSchedule(tasks), projectEnd = res.projectEnd;
    var plannedEnd = m.planned.projectEnd, deltaDays = projectEnd - plannedEnd;
    var list = (lessons || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
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
      "2. RIESGOS REGISTRADOS (" + risks.length + ")\n" + (risks.map(function (r) { return "- [" + r.category + "] " + r.desc + " — puntaje P×I " + riskScore(r.prob, r.impact) + "/9, respuesta: " + r.response; }).join("\n") || "— sin riesgos cargados —") + "\n\n" +
      "3. CONTROL DE CAMBIOS\n" + changeLog.length + " cambio(s) registrado(s). " + changeLog.filter(function (c) { return c.estado === "Aprobado"; }).length + " aprobado(s).\n\n" +
      "4. DECISIONES CLAVE\n" + decisionLog.length + " decisión(es) registrada(s).\n\n" +
      "5. LECCIONES APRENDIDAS (" + list.length + "/5 mínimo)\n" + (list.length ? list.map(function (l, i) { return (i + 1) + ". " + l; }).join("\n") : "— completar en el cuadro de arriba, mínimo 5 —") + "\n" +
      (list.length < 5 ? "Faltan " + (5 - list.length) + " lección(es) para cumplir el mínimo de la consigna." : "Cumple el mínimo de 5 lecciones aprendidas.") + "\n\n" +
      "6. CIERRE FORMAL\nProyecto cerrado con " + tasks.filter(function (t) { return t.pct === 100; }).length + " de " + tasks.length + " tareas al 100%.\n\n" + CONFIG.ATTRIBUTION;
    var box = $("cierreBox"); box.hidden = false; box.textContent = txt;
  }
  function copyInforme() {
    var box = $("cierreBox");
    if (box.hidden) { notify("Primero generá el informe."); return; }
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
  function parsePreds(s) { return s ? s.split(",").map(function (x) { return x.trim(); }).filter(Boolean) : []; }
  function addTask() {
    return askForm("Agregar tarea", [
      { key: "id", label: "ID / EDT", value: nextCustomId(), required: true },
      { key: "name", label: "Nombre de la tarea", value: "Nueva tarea", required: true },
      { key: "dur", label: "Duración en días hábiles (0 = hito)", type: "number", value: 10, min: 0, required: true },
      { key: "preds", label: "Predecesoras (IDs separados por coma)", value: "", hint: "Disponibles: " + tasks.map(function (t) { return t.id; }).join(", ") },
      { key: "resource", label: "Recurso responsable", value: "PM" }
    ], "Agregar", function (v) {
      var id = v.id.trim();
      if (taskById(id)) return "Ya existe una tarea con ese ID.";
      if (v.dur < 0 || v.dur > 2000) return "La duración tiene que ser un entero entre 0 y 2000.";
      if (tasks.length >= CONFIG.MAX_TASKS) return "Se alcanzó el máximo de tareas (" + CONFIG.MAX_TASKS + ").";
      var preds = parsePreds(v.preds);
      if (preds.indexOf(id) >= 0) return "Una tarea no puede depender de sí misma.";
      var bad = preds.filter(function (p) { return !taskById(p); });
      return bad.length ? "Estas predecesoras no existen: " + bad.join(", ") : "";
    }).then(function (r) {
      if (!r) return;
      pushHistory();
      tasks.push({ id: r.id.trim(), name: r.name.trim(), dur: r.dur, preds: parsePreds(r.preds), pct: 0, resource: (r.resource || "PM").trim() || "PM", extraResources: [], crashCostPerDay: null, overlapDays: 0, levelDelay: 0, notes: "", acTask: null });
      ensureCustomPhase().children.push(r.id.trim()); render();
    });
  }
  function deleteTask(id) {
    return confirmBox("¿Eliminar la tarea " + id + "? También se quita de las predecesoras de otras tareas y de los riesgos y el RACI vinculados.").then(function (ok) {
      if (!ok) return;
      pushHistory();
      tasks = tasks.filter(function (t) { return t.id !== id; });
      tasks.forEach(function (t) { t.preds = t.preds.filter(function (p) { return p !== id; }); });
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
      { key: "category", label: "Categoría", type: "select", options: ["Técnico", "Organizacional", "Externo", "De gestión"], value: "Técnico" },
      { key: "prob", label: "Probabilidad", type: "select", options: ["Baja", "Media", "Alta"], value: "Media" },
      { key: "impact", label: "Impacto", type: "select", options: ["Baja", "Media", "Alta"], value: "Media" },
      { key: "response", label: "Respuesta planificada", value: "" },
      { key: "owner", label: "Responsable del riesgo", value: "PM" },
      { key: "taskId", label: "Tarea vinculada", type: "select", options: [none].concat(tasks.map(function (t) { return t.id; })), value: none }
    ], "Agregar").then(function (r) {
      if (!r) return; pushHistory();
      var n = risks.length + 1; while (risks.some(function (x) { return x.id === "R" + n; })) n++;
      risks.push({ id: "R" + n, desc: r.desc.trim(), category: r.category, prob: r.prob, impact: r.impact, response: r.response, owner: r.owner || "PM", taskId: r.taskId === none ? "" : r.taskId }); render();
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
      actualStart: actualStart, actualFinish: actualFinish, plannedFinishOverride: plannedFinishOverride };
  }
  function storageKey(pid) { return "ptTI.v" + CONFIG.SCHEMA_VERSION + "." + META.audience + "." + pid; }
  function saveLocal() {
    var ok = store.set(storageKey(currentProjectId), JSON.stringify(serializeState()));
    if (ok) { setDirty(false); notify("Progreso guardado en este navegador."); track("guardar_progreso", { metodo: "navegador", caso_id: currentProjectId }); maybeShowLead("guardar"); }
    else notify("Este navegador no permite guardar. Tu avance sigue en pantalla mientras no cierres la página; descargá el archivo JSON para conservarlo.");
  }
  function downloadJson() {
    var blob = new Blob([JSON.stringify(serializeState(), null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "progreso-" + currentProjectId + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setDirty(false); track("guardar_progreso", { metodo: "archivo", caso_id: currentProjectId }); maybeShowLead("guardar");
  }
  function loadLocal() {
    var s = store.get(storageKey(currentProjectId));
    if (!s) { notify("No hay progreso guardado de este caso en este navegador."); return; }
    applyImport(s, "navegador");
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
    tasks = obj.tasks.map(function (t) { return Object.assign({}, t, { notes: str(t.notes), acTask: isNum(t.acTask) ? t.acTask : null, extraResources: Array.isArray(t.extraResources) ? t.extraResources.map(function (x) { return str(x, 100); }) : [], overlapDays: isNum(t.overlapDays) ? t.overlapDays : 0, levelDelay: isNum(t.levelDelay) ? t.levelDelay : 0, name: str(t.name, 300), resource: str(t.resource, 100), preds: t.preds.slice(), crashCostPerDay: isNum(t.crashCostPerDay) ? t.crashCostPerDay : null }); });
    phases = clonePhases(obj.phases);
    ORIGINAL_DURS = {}; proj.tasks.forEach(function (t) { ORIGINAL_DURS[t.id] = t.dur; });
    var tmp = cloneTasks(proj.tasks.map(function (t) { return Object.assign({}, clone(t), { overlapDays: 0, levelDelay: 0 }); }));
    $("startDate").value = proj.startDate;
    originalProjectEnd = computeScheduleOn(tmp).projectEnd; originalSchedule = {};
    tmp.forEach(function (t) { originalSchedule[t.id] = { es: t._es, ef: t._ef, dur: t.dur }; });
    baselines = Array.isArray(obj.baselines) ? obj.baselines.filter(function (b) { return b && typeof b.name === "string" && b.byId && isNum(b.projectEnd); }).map(function (b) { return { name: str(b.name, 100), byId: b.byId, projectEnd: b.projectEnd, visible: b.visible !== false }; }) : [];
    scenarios = []; activeScenario = 0;
    if (Array.isArray(obj.scenarios)) obj.scenarios.forEach(function (s) { if (s && typeof s.name === "string" && s.snap && !validateTasks(s.snap.tasksSnap, "esc") && Array.isArray(s.snap.phasesSnap)) scenarios.push({ name: str(s.name, 100), snap: { tasksSnap: s.snap.tasksSnap, phasesSnap: s.snap.phasesSnap } }); });
    if (!scenarios.length) scenarios = [{ name: "Plan original", snap: { tasksSnap: cloneTasks(tasks), phasesSnap: clonePhases(phases) } }];
    else activeScenario = Math.min(Math.max(0, parseInt(obj.activeScenario, 10) || 0), scenarios.length - 1);
    nearThreshold = isNum(obj.nearThreshold) && obj.nearThreshold >= 1 ? obj.nearThreshold : 5;
    cutoffDay = isNum(obj.cutoffDay) ? obj.cutoffDay : 65;
    acActual = isNum(obj.acActual) ? obj.acActual : null;
    risks = sanitizeList(obj.risks, ["id", "desc", "category", "prob", "impact", "response", "owner", "taskId"]);
    raciAssignments = obj.raciAssignments && typeof obj.raciAssignments === "object" ? obj.raciAssignments : {};
    raciPeople = Array.isArray(obj.raciPeople) ? obj.raciPeople.map(function (x) { return str(x, 100); }) : [];
    charter = {}; Object.keys(clone(proj.charter || {})).concat(["objective", "scopeOut"]).forEach(function (k) { charter[k] = str(obj.charter && obj.charter[k] !== undefined ? obj.charter[k] : (proj.charter || {})[k], 4000); });
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
    setDirty(false); render();
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
      rows.push({ "EDT": ph.id, "Tarea": ph.name, "Tipo": "Fase (resumen)", "Recurso": "", "Duración (días hábiles)": e - s, "Inicio": workdayISO(s), "Fin": workdayISO(Math.max(0, e - 1)), "Predecesoras": "", "% Completado": "", "Holgura total (días)": "", "Ruta crítica": "" });
      kids.forEach(function (t) {
        rows.push({ "EDT": t.id, "Tarea": t.name, "Tipo": t.dur === 0 ? "Hito" : "Tarea", "Recurso": t.resource || "", "Duración (días hábiles)": t.dur, "Inicio": startISO(t), "Fin": finishISO(t), "Predecesoras": t.preds.join(", ") || "—", "% Completado": t.pct + "%", "Holgura total (días)": t.critical ? 0 : t.slack, "Ruta crítica": t.critical ? "Sí" : (t.near ? "Casi crítica" : "No") });
      });
    });
    var ws = X.utils.json_to_sheet(rows);
    ws["!cols"] = [8, 34, 14, 18, 20, 12, 12, 14, 12, 14, 14].map(function (w) { return { wch: w }; });
    var r0 = rows.length + 2;
    X.utils.sheet_add_aoa(ws, [[CONFIG.ATTRIBUTION], [CONFIG.SITE_URL], ["Caso: " + (CASOS[currentProjectId] ? CASOS[currentProjectId].title : "") + " · Exportado el " + dateToISO(new Date())]], { origin: { r: r0, c: 0 } });
    var cell = ws["B" + (r0 + 2)]; if (cell) cell.l = { Target: CONFIG.SITE_URL, Tooltip: "valeriayashan.com.ar" };
    var byRes = {}, resRows = [];
    tasks.forEach(function (t) { allResourcesOf(t).forEach(function (r) { (byRes[r] = byRes[r] || []).push(t); }); });
    Object.keys(byRes).forEach(function (r) { byRes[r].forEach(function (t) { resRows.push({ "Recurso": r, "Tarea": t.id + " — " + t.name, "Inicio": startISO(t), "Fin": finishISO(t), "Duración (días)": t.dur }); }); });
    var wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Cronograma");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(resRows), "Asignación de recursos");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(risks.map(function (r) { return { "ID": r.id, "Riesgo": r.desc, "Categoría": r.category, "Probabilidad": r.prob, "Impacto": r.impact, "Puntaje (P×I)": riskScore(r.prob, r.impact), "Respuesta": r.response, "Responsable del riesgo": r.owner, "Tarea vinculada": r.taskId || "—" }; })), "Registro de riesgos");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(comms.map(function (c) { return { "Parte interesada": c.stakeholder, "Información": c.info, "Frecuencia": c.freq, "Canal": c.channel, "Responsable": c.owner }; })), "Comunicaciones");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(changeLog.map(function (c) { return { "Fecha": c.fecha, "Cambio": c.desc, "Impacto": c.impacto, "Estado": c.estado, "Aprobado por": c.aprobadoPor }; })), "Registro de cambios");
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(decisionLog.map(function (d) { return { "Fecha": d.fecha, "Decisión": d.decision, "Contexto": d.contexto, "Responsable": d.responsable }; })), "Registro de decisiones");
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

  /* ===================== captación (no bloquea) ===================== */
  function maybeShowLead(trigger) {
    if (leadShownThisSession || store.get("ptTI.lead") === "dismissed" || store.get("ptTI.lead") === "opened") return;
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
    saveLocal: saveLocal, downloadJson: downloadJson, loadLocal: loadLocal, exportCsv: exportCsv, print: printView,
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
      var today = dateToISO(new Date());
      if (today < startDateValue()) notify("La fecha de hoy (" + today + ") es anterior al inicio del proyecto (" + startDateValue() + "). Se usa el día 0 como corte.");
      cutoffDay = dayOffsetFromDate(today); render();
    },
    addHoliday: addHoliday, pasteHolidays: pasteHolidays,
    deleteHoliday: function (el) { pushHistory(); holidays = holidays.filter(function (h) { return h !== el.dataset.date; }); render(); },
    clearHolidays: function () { confirmBox("¿Quitar todos los feriados cargados?", "Quitar").then(function (ok) { if (ok) { pushHistory(); holidays = []; render(); } }); },
    loadHolidayPreset: function () {
      var r = applyHolidayPreset(holidayCountry, [holidayYear]);
      if (!r.loaded.length) { notify("Falta el dato: no hay lista precargada de feriados para ese país y año. Pegá la lista oficial."); return; }
      pushHistory(); holidays = holidays.filter(function (h) { return yearOf(h) !== holidayYear; }).concat(r.list).sort(); render();
      notify("Se cargó la lista de " + FERIADOS[holidayCountry].nombre + " " + holidayYear + ". Verificala con la fuente oficial.");
    },
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
    cutoff: function (el) { if (!el.value) return; cutoffDay = dayOffsetFromDate(el.value); queueRender(); },
    ac: function (el) { var v = parseFloat(el.value); acActual = isNaN(v) ? null : v; queueRender(); },
    taskAc: function (el) { var t = taskById(el.dataset.id); pushHistory(); t.acTask = el.value === "" ? null : Math.max(0, parseFloat(el.value) || 0); queueRender(); },
    dailyCost: function (el) { var t = taskById(el.dataset.id); var v = parseFloat(el.value); pushHistory(); t.dailyCost = isNaN(v) || v < 0 ? null : v; queueRender(); },
    ftSelect: function (el) { ftTaskId = el.value; queueRender(); },
    ftPct: function (el) { ftPct = Math.max(5, Math.min(75, parseInt(el.value, 10) || 25)); queueRender(); },
    riskTask: function (el) { var r = risks.filter(function (x) { return x.id === el.dataset.id; })[0]; if (r) { pushHistory(); r.taskId = el.value; queueRender(); } },
    charter: function (el) { if ((charter[el.dataset.key] || "") === el.value) return; pushHistory(); charter[el.dataset.key] = el.value; },
    lessons: function (el) { if (lessons === el.value) return; pushHistory(); lessons = el.value; },
    holCountry: function (el) { holidayCountry = el.value; queueRender(); },
    holYear: function (el) { holidayYear = parseInt(el.value, 10); queueRender(); },
    project: function (el) {
      var id = el.value, prev = currentProjectId;
      function go() { loadProject(id); track("cambio_de_caso", { caso_id: id }); }
      if (!isDirty) { go(); return; }
      confirmBox("Hay cambios sin guardar en este caso. Si cambiás de caso se pierden. ¿Cambiar igual?", "Cambiar de caso").then(function (ok) { if (ok) go(); else el.value = prev; });
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
  window.addEventListener("beforeunload", function (e) { if (isDirty) { e.preventDefault(); e.returnValue = ""; return ""; } });

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
    var first = caseIds()[0]; loadProject(first);
    track("herramienta_abierta", { audiencia: META.audience });
  }
  // utilidad de pruebas (no se usa en producción)
  window.__PTI_TEST__ = { computeScheduleOn: computeScheduleOn, validateState: validateState, getState: function () { return { tasks: tasks, holidays: holidays }; }, workdayISO: workdayISO, dayOffsetFromDate: dayOffsetFromDate, computeEVM: computeEVM };
  window.__PTI_ACTIONS__ = { ACTIONS: ACTIONS, CHANGE: CHANGE };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
