/* Casos de proyecto del Planificador TI. Datos intercambiables: este archivo se puede reemplazar
   por data/casos-publicos.js (genéricos) sin tocar app.js. Formato de cada caso:
   label, title, startDate (AAAA-MM-DD, lunes), startNote, phases, tasks, risks, charter.
   Tarea: T(id, nombre, duración en días hábiles, predecesoras, % avance, recurso, costo de aceleración por día | null, costo diario)
   Costo diario: calibrado con scripts/calibrar-costos.js para que el BAC sea igual al presupuesto del acta de constitución.
   SCHEMA_VERSION de los datos: 1 */
(function (global) {
  "use strict";

  function T(id, name, dur, preds, pct, resource, crashCostPerDay, dailyCost) {
    return { id: id, name: name, dur: dur, preds: preds, pct: pct, resource: resource, crashCostPerDay: crashCostPerDay, dailyCost: dailyCost };
  }

  var CASOS = {
    vacaenergia: {
      label: "1 — VacaEnergía (SCADA, Energía)",
      title: "SCADA VacaEnergía",
      startDate: "2026-01-05",
      startNote: "Acta de constitución: enero 2026. Se toma el primer lunes hábil del mes.",
      phases: [
        { id: "1.1", name: "Gestión del proyecto", children: ["1.1.1", "1.1.3"] },
        { id: "1.2", name: "Habilitación regulatoria (ENARGAS)", children: ["1.2.1", "1.2.2"] },
        { id: "1.3", name: "Implementación técnica", children: ["1.3.1", "1.3.2", "1.3.3"] },
        { id: "1.4", name: "Pruebas y puesta en marcha", children: ["1.4.1", "1.4.2"] },
        { id: "1.5", name: "Capacitación", children: ["1.5.1", "1.5.2"] }
      ],
      tasks: [
        T("1.1.1", "Acta de constitución y planificación", 10, [], 100, "PM", null, 1028),
        T("1.2.1", "Presentación ante ENARGAS", 20, ["1.1.1"], 100, "PM", null, 1028),
        T("1.2.2", "Aprobación ENARGAS", 30, ["1.2.1"], 100, "PM", null, 1028),
        T("1.3.1", "Instalación de sensores (18 pozos)", 60, ["1.2.2"], 20, "Proveedor SCADA", 800, 2755.1667),
        T("1.3.2", "Config. dashboard central", 40, ["1.2.2"], 10, "Proveedor SCADA", 600, 2754),
        T("1.3.3", "Integración con SAP", 25, ["1.3.2"], 0, "Gerente Sistemas", 500, 2020),
        T("1.4.1", "Pruebas por pozo", 15, ["1.3.1", "1.3.2"], 0, "Proveedor SCADA", 700, 2754),
        T("1.4.2", "Go-live escalonado", 10, ["1.4.1"], 0, "Gerente Sistemas", 400, 2020),
        T("1.5.1", "Manual de operaciones", 10, ["1.3.2"], 0, "PM", 300, 1028),
        T("1.5.2", "Capacitación a operadores", 15, ["1.5.1"], 0, "PM", 300, 1028),
        T("1.1.3", "Cierre del proyecto", 5, ["1.4.2", "1.3.3", "1.5.2"], 0, "PM", null, 1028)
      ],
      risks: [
        { id: "R1", desc: "El proveedor de integración no cumple los plazos comprometidos", category: "Externo", prob: "Media", impact: "Alta", response: "Mitigar — cláusulas de penalidad, seguimiento quincenal", owner: "PM", taskId: "1.3.1" },
        { id: "R2", desc: "Resistencia al cambio en sucursales con procesos manuales arraigados", category: "Organizacional", prob: "Alta", impact: "Alta", response: "Mitigar — plan de gestión del cambio", owner: "PM", taskId: "1.5.2" },
        { id: "R3", desc: "El ERP actual no soporta integración vía API sin desarrollo adicional", category: "Técnico", prob: "Media", impact: "Alta", response: "Mitigar — prueba de concepto técnica temprana", owner: "Gerente Sistemas", taskId: "1.3.3" }
      ],
      charter: {
        sponsor: "Gerente de Operaciones",
        budget: "USD 480.000",
        duration: "9 meses (enero–septiembre 2026)",
        deliverable: "Sistema SCADA instalado y operativo en los 18 pozos, con dashboard central, alertas automáticas y manual de operaciones.",
        objective: "",
        scopeIn: "Sistema SCADA instalado y operativo en los 18 pozos, con dashboard central, alertas automáticas y manual de operaciones.",
        scopeOut: "",
        constraints: "Los pozos no pueden detenerse durante la instalación. Requiere habilitación de ENARGAS antes del go-live. Presupuesto fijo por contrato. Integración con ERP SAP existente.",
        stakeholders: "Gerente de Operaciones (patrocinador), Jefe de IT, Operadores de campo, ENARGAS, Proveedor SCADA, Sindicato de trabajadores de la energía"
      }
    },

    finco: {
      label: "2 — FinCo Pymes (App de pagos, Fintech)",
      title: "App de Pagos FinCo Pymes",
      startDate: "2026-02-02",
      startNote: "Acta de constitución: febrero 2026. Se toma el primer lunes hábil del mes.",
      phases: [
        { id: "1.1", name: "Gestión del proyecto", children: ["1.1.1", "1.1.3"] },
        { id: "1.2", name: "Habilitación regulatoria (BCRA)", children: ["1.2.1", "1.2.2"] },
        { id: "1.3", name: "Desarrollo técnico", children: ["1.3.1", "1.3.2", "1.3.3"] },
        { id: "1.4", name: "Pruebas y beta", children: ["1.4.1", "1.4.2"] },
        { id: "1.5", name: "Onboarding de PyMEs", children: ["1.5.1", "1.5.2"] }
      ],
      tasks: [
        T("1.1.1", "Acta de constitución y planificación", 8, [], 100, "PM", null, 530),
        T("1.2.1", "Presentación ante BCRA", 15, ["1.1.1"], 100, "PM", null, 530),
        T("1.2.2", "Aprobación BCRA", 25, ["1.2.1"], 80, "PM", null, 530),
        T("1.3.1", "Desarrollo MVP core (app)", 55, ["1.1.1"], 40, "Equipo Dev", 900, 1607.9091),
        T("1.3.2", "Integración billeteras (MP, MODO, Naranja X)", 25, ["1.3.1"], 10, "Equipo Dev", 850, 1608),
        T("1.3.3", "Autenticación biométrica", 20, ["1.3.1"], 0, "Equipo Dev", 700, 1608),
        T("1.4.1", "Pruebas con 20 PyMEs beta", 20, ["1.3.2", "1.3.3", "1.2.2"], 0, "Product Owner", 500, 757),
        T("1.4.2", "Lanzamiento escalonado", 5, ["1.4.1"], 0, "Product Owner", 400, 757),
        T("1.5.1", "Material de onboarding", 8, ["1.3.1"], 0, "PM", 250, 530),
        T("1.5.2", "Onboarding 100 PyMEs", 15, ["1.5.1", "1.4.2"], 0, "PM", 250, 530),
        T("1.1.3", "Cierre del proyecto", 5, ["1.4.2", "1.5.2"], 0, "PM", null, 530)
      ],
      risks: [
        { id: "R1", desc: "Cumplimiento normativo BCRA obligatorio antes del lanzamiento", category: "Externo", prob: "Alta", impact: "Alta", response: "Mitigar — presentar expediente con anticipación", owner: "PM", taskId: "1.2.2" },
        { id: "R2", desc: "Competidor lanzó producto similar hace 3 meses", category: "Externo", prob: "Alta", impact: "Media", response: "Mitigar — diferenciar por UX y velocidad de onboarding", owner: "Product Owner", taskId: "1.4.2" },
        { id: "R3", desc: "Presupuesto sin reserva de contingencia aprobada", category: "De gestión", prob: "Media", impact: "Alta", response: "Escalar — solicitar reserva al CEO antes del desarrollo", owner: "PM", taskId: "1.3.1" }
      ],
      charter: {
        sponsor: "CEO",
        budget: "USD 220.000",
        duration: "7 meses (febrero–agosto 2026)",
        deliverable: "App mobile en producción (iOS + Android) con integración a 3 billeteras digitales, 100 PyMEs onboardeadas y tasa de conversión ≥ 75% en el proceso de pago.",
        objective: "",
        scopeIn: "App mobile en producción (iOS + Android) con integración a 3 billeteras digitales, 100 PyMEs onboardeadas y tasa de conversión ≥ 75% en el proceso de pago.",
        scopeOut: "",
        constraints: "Cumplimiento normativo BCRA obligatorio antes del lanzamiento. El CEO exige MVP en 90 días. Presupuesto sin reserva de contingencia aprobada. Competidor lanzó producto similar hace 3 meses.",
        stakeholders: "CEO (patrocinador), Product Owner, Equipo de desarrollo, Área de Compliance, BCRA, Proveedores de pago, Usuarios beta (20 PyMEs)"
      }
    },

    logired: {
      label: "3 — LogiRed Distribuidora (Rutas, Logística)",
      title: "Optimización de Rutas LogiRed",
      startDate: "2026-03-02",
      startNote: "Acta de constitución: marzo 2026. Se toma el primer lunes hábil del mes.",
      phases: [
        { id: "1.1", name: "Gestión del proyecto", children: ["1.1.1", "1.1.3"] },
        { id: "1.2", name: "Selección de software", children: ["1.2.1", "1.2.2"] },
        { id: "1.3", name: "Integración", children: ["1.3.1", "1.3.2"] },
        { id: "1.4", name: "Piloto y rollout", children: ["1.4.1", "1.4.2"] },
        { id: "1.5", name: "Gestión del cambio", children: ["1.5.1", "1.5.2"] }
      ],
      tasks: [
        T("1.1.1", "Acta de constitución y planificación", 6, [], 100, "PM", null, 388),
        T("1.2.1", "Selección de proveedor", 15, ["1.1.1"], 100, "PM", null, 388),
        T("1.2.2", "Configuración del software", 10, ["1.2.1"], 60, "IT", null, 554),
        T("1.3.1", "Integración con ERP de facturación", 35, ["1.2.2"], 20, "IT", 750, 554.0571),
        T("1.3.2", "App mobile para choferes", 30, ["1.2.2"], 10, "Proveedor", 650, 1039),
        T("1.4.1", "Piloto con choferes", 10, ["1.3.1", "1.3.2"], 0, "Supervisor", 400, 554),
        T("1.4.2", "Rollout completo (120 choferes)", 20, ["1.4.1"], 0, "Supervisor", 400, 554),
        T("1.5.1", "Plan de comunicación al sindicato", 10, ["1.1.1"], 0, "PM", 300, 388),
        T("1.5.2", "Capacitación a choferes", 15, ["1.5.1", "1.4.1"], 0, "Supervisor", 300, 554),
        T("1.1.3", "Cierre del proyecto", 5, ["1.4.2", "1.5.2"], 0, "PM", null, 388)
      ],
      risks: [
        { id: "R1", desc: "El sindicato de camioneros tiene historial de resistencia a cambios tecnológicos", category: "Organizacional", prob: "Alta", impact: "Alta", response: "Mitigar — plan de comunicación temprano, involucrar delegados", owner: "PM", taskId: "1.5.1" },
        { id: "R2", desc: "El proveedor de integración ERP tiene 6 semanas de backlog", category: "Externo", prob: "Alta", impact: "Alta", response: "Mitigar — reservar el cupo del proveedor apenas se firma contrato", owner: "IT", taskId: "1.3.1" },
        { id: "R3", desc: "Rutas deben seguir operando sin interrupción durante la transición", category: "Técnico", prob: "Media", impact: "Media", response: "Mitigar — rollout gradual sucursal por sucursal", owner: "Supervisor", taskId: "1.4.2" }
      ],
      charter: {
        sponsor: "Gerente Comercial",
        budget: "USD 95.000",
        duration: "5 meses (marzo–julio 2026)",
        deliverable: "Software de optimización instalado y adoptado por el 90% de los choferes, con reducción del 20% en tiempo promedio de ruta y 0% de rutas manuales.",
        objective: "",
        scopeIn: "Software de optimización instalado y adoptado por el 90% de los choferes, con reducción del 20% en tiempo promedio de ruta y 0% de rutas manuales.",
        scopeOut: "",
        constraints: "El sindicato de camioneros tiene historial de resistencia a cambios tecnológicos. La integración con el ERP es la dependencia técnica más crítica (proveedor con 6 semanas de backlog). Las rutas deben seguir operando sin interrupción durante la transición.",
        stakeholders: "Gerente Comercial (patrocinador), Supervisor de Logística, Choferes, Sindicato de camioneros, IT, Proveedor del software, Clientes corporativos clave"
      }
    },

    conurba: {
      label: "4 — Conurba Logística (Centro de distribución, Construcción)",
      title: "Centro de Distribución Conurba",
      startDate: "2026-01-05",
      startNote: "Acta de constitución: enero 2026. Se toma el primer lunes hábil del mes.",
      phases: [
        { id: "1.1", name: "Gestión del proyecto", children: ["1.1.1", "1.1.3"] },
        { id: "1.2", name: "Permisos municipales", children: ["1.2.1", "1.2.2"] },
        { id: "1.3", name: "Construcción", children: ["1.3.1", "1.3.2"] },
        { id: "1.4", name: "Habilitación final", children: ["1.4.1", "1.4.2"] },
        { id: "1.5", name: "Gestión ambiental", children: ["1.5.1"] }
      ],
      tasks: [
        T("1.1.1", "Acta de constitución y planificación", 10, [], 100, "PM", null, 2539),
        T("1.2.1", "Presentación municipal y bomberos", 5, ["1.1.1"], 100, "PM", null, 2539),
        T("1.2.2", "Aprobación de permisos", 60, ["1.2.1"], 50, "PM", null, 2539),
        T("1.3.1", "Obra civil (estructura)", 80, ["1.2.2"], 0, "Constructora", 1500, 13599.975),
        T("1.3.2", "Instalaciones (racks y equipamiento)", 60, ["1.3.1"], 0, "Proveedor equipamiento", 900, 6800),
        T("1.4.1", "Inspección final bomberos/municipio", 15, ["1.3.1", "1.3.2"], 0, "PM", null, 2539),
        T("1.4.2", "Puesta en marcha operativa", 10, ["1.4.1"], 0, "Directora Operaciones", 400, 5440),
        T("1.5.1", "Proyecto de gestión de residuos", 20, ["1.1.1"], 0, "PM", 300, 2539),
        T("1.1.3", "Cierre del proyecto", 8, ["1.4.2", "1.5.1"], 0, "PM", null, 2539)
      ],
      risks: [
        { id: "R1", desc: "Permisos municipales y de bomberos pueden demorar hasta 90 días", category: "Externo", prob: "Alta", impact: "Alta", response: "Mitigar — presentar expediente completo desde el día 1", owner: "PM", taskId: "1.2.2" },
        { id: "R2", desc: "Presupuesto en dólares en contexto de volatilidad cambiaria", category: "Externo", prob: "Alta", impact: "Alta", response: "Transferir — contrato con cláusula de ajuste cambiario; el remanente se acepta activamente con reserva de contingencia", owner: "PM", taskId: "1.3.1" },
        { id: "R3", desc: "Fecha de habilitación comprometida con un cliente corporativo", category: "De gestión", prob: "Media", impact: "Alta", response: "Mitigar — comunicar avance mensual al cliente", owner: "Directora Operaciones", taskId: "1.4.2" }
      ],
      charter: {
        sponsor: "Directora de Operaciones",
        budget: "USD 1.850.000",
        duration: "14 meses (enero 2026–febrero 2027)",
        deliverable: "Centro de distribución de 4.500 m² habilitado, con certificados municipales y de bomberos, equipamiento instalado y operaciones iniciadas.",
        objective: "",
        scopeIn: "Centro de distribución de 4.500 m² habilitado, con certificados municipales y de bomberos, equipamiento instalado y operaciones iniciadas.",
        scopeOut: "",
        constraints: "Los permisos municipales y de bomberos son el camino crítico — pueden demorar hasta 90 días. Presupuesto en dólares en contexto de volatilidad cambiaria. Fecha de habilitación comprometida con un cliente corporativo. El Municipio exige proyecto de gestión de residuos.",
        stakeholders: "Directora de Operaciones (patrocinador), Municipio de Pilar, Empresa constructora, Proveedores de racks y equipamiento, Área de Seguridad e Higiene, Bomberos, Equipo de operaciones"
      }
    },

    rivero: {
      label: "5 — Metalúrgica Rivero Hnos. (ERP Odoo)",
      title: "Implementación ERP Rivero Hnos.",
      startDate: "2026-02-02",
      startNote: "Acta de constitución: febrero 2026. Se toma el primer lunes hábil del mes.",
      phases: [
        { id: "1.1", name: "Gestión del proyecto", children: ["1.1.1", "1.1.3"] },
        { id: "1.2", name: "Relevamiento", children: ["1.2.1", "1.2.2"] },
        { id: "1.3", name: "Implementación Odoo", children: ["1.3.1", "1.3.2", "1.3.3"] },
        { id: "1.4", name: "Migración y pruebas", children: ["1.4.1", "1.4.2"] },
        { id: "1.5", name: "Capacitación", children: ["1.5.1", "1.5.2"] }
      ],
      tasks: [
        T("1.1.1", "Acta de constitución y planificación", 8, [], 100, "PM", null, 311),
        T("1.2.1", "Relevamiento de procesos", 20, ["1.1.1"], 100, "PM", null, 311),
        T("1.2.2", "Definición de alcance por módulo", 15, ["1.2.1"], 70, "Directora Financiera", null, 667),
        T("1.3.1", "Config. compras + inventario", 45, ["1.2.2"], 20, "Proveedor Odoo", 700, 834),
        T("1.3.2", "Config. producción", 40, ["1.2.2"], 10, "Proveedor Odoo", 700, 834),
        T("1.3.3", "Config. contabilidad", 35, ["1.2.2"], 0, "Proveedor Odoo", 650, 834),
        T("1.4.1", "Migración de datos históricos", 30, ["1.3.1", "1.3.2", "1.3.3"], 0, "IT interno", 400, 445),
        T("1.4.2", "Primer cierre contable en el nuevo sistema", 15, ["1.4.1"], 0, "Contador externo", 350, 556),
        T("1.5.1", "Capacitación a 45 usuarios", 20, ["1.3.1"], 0, "PM", 300, 311),
        T("1.5.2", "Soporte post go-live (60 días)", 60, ["1.4.2"], 0, "IT interno", 300, 445.7),
        T("1.1.3", "Cierre del proyecto", 5, ["1.4.2", "1.5.2"], 0, "PM", null, 311)
      ],
      risks: [
        { id: "R1", desc: "El Gerente General delega todo en la Directora Financiera, con expectativas distintas", category: "Organizacional", prob: "Alta", impact: "Media", response: "Mitigar — reuniones de alineación tripartitas periódicas", owner: "PM", taskId: "1.2.2" },
        { id: "R2", desc: "La migración de datos históricos es técnicamente compleja", category: "Técnico", prob: "Alta", impact: "Alta", response: "Mitigar — auditoría de datos previa a la migración", owner: "IT interno", taskId: "1.4.1" },
        { id: "R3", desc: "2 usuarios clave con alta resistencia declarada", category: "Organizacional", prob: "Media", impact: "Media", response: "Mitigar — capacitación reforzada + acompañamiento 1 a 1", owner: "PM", taskId: "1.5.1" }
      ],
      charter: {
        sponsor: "Gerente General",
        budget: "USD 175.000",
        duration: "10 meses (febrero–noviembre 2026)",
        deliverable: "ERP Odoo en producción con los 4 módulos implementados, 45 usuarios capacitados, datos históricos migrados y primer cierre contable realizado en el nuevo sistema.",
        objective: "",
        scopeIn: "ERP Odoo en producción con los 4 módulos implementados, 45 usuarios capacitados, datos históricos migrados y primer cierre contable realizado en el nuevo sistema.",
        scopeOut: "",
        constraints: "El Gerente General es el patrocinador pero delega todo en la Directora Financiera, que tiene expectativas muy distintas. La empresa no tiene cultura de proyectos formales. La migración de datos históricos es técnicamente compleja. 2 usuarios clave con alta resistencia declarada.",
        stakeholders: "Gerente General (patrocinador), Directora Financiera, Jefa de Producción, IT interno, Proveedor de Odoo, Contador externo, Usuarios clave de cada área"
      }
    }
  };

  global.PLANIFICADOR_CASOS = CASOS;
  global.PLANIFICADOR_CASOS_META = { version: 1, audience: "alumnos-egci" };
})(window);
