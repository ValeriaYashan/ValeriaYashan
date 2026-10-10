/* Casos GENÉRICOS (versión pública). Generado con scripts/build-casos-publicos.js. Revisar antes de publicar. */
window.PLANIFICADOR_CASOS = {
  "vacaenergia": {
    "label": "Caso A — Monitoreo industrial (SCADA, Energía)",
    "title": "Sistema de monitoreo industrial",
    "startDate": "2026-01-05",
    "startNote": "Caso de ejemplo genérico. Fecha de inicio editable.",
    "phases": [
      {
        "id": "1.1",
        "name": "Gestión del proyecto",
        "children": [
          "1.1.1",
          "1.1.3"
        ]
      },
      {
        "id": "1.2",
        "name": "Habilitación regulatoria (ente regulador)",
        "children": [
          "1.2.1",
          "1.2.2"
        ]
      },
      {
        "id": "1.3",
        "name": "Implementación técnica",
        "children": [
          "1.3.1",
          "1.3.2",
          "1.3.3"
        ]
      },
      {
        "id": "1.4",
        "name": "Pruebas y puesta en marcha",
        "children": [
          "1.4.1",
          "1.4.2"
        ]
      },
      {
        "id": "1.5",
        "name": "Capacitación",
        "children": [
          "1.5.1",
          "1.5.2"
        ]
      }
    ],
    "tasks": [
      {
        "id": "1.1.1",
        "name": "Acta de constitución y planificación",
        "dur": 10,
        "preds": [],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 1028
      },
      {
        "id": "1.2.1",
        "name": "Presentación ante el ente regulador",
        "dur": 20,
        "preds": [
          "1.1.1"
        ],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 1028
      },
      {
        "id": "1.2.2",
        "name": "Aprobación del ente regulador",
        "dur": 30,
        "preds": [
          "1.2.1"
        ],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 1028
      },
      {
        "id": "1.3.1",
        "name": "Instalación de sensores (18 pozos)",
        "dur": 60,
        "preds": [
          "1.2.2"
        ],
        "pct": 20,
        "resource": "Proveedor SCADA",
        "crashCostPerDay": 800,
        "dailyCost": 2755.1667
      },
      {
        "id": "1.3.2",
        "name": "Config. dashboard central",
        "dur": 40,
        "preds": [
          "1.2.2"
        ],
        "pct": 10,
        "resource": "Proveedor SCADA",
        "crashCostPerDay": 600,
        "dailyCost": 2754
      },
      {
        "id": "1.3.3",
        "name": "Integración con ERP actual",
        "dur": 25,
        "preds": [
          "1.3.2"
        ],
        "pct": 0,
        "resource": "Gerente Sistemas",
        "crashCostPerDay": 500,
        "dailyCost": 2020
      },
      {
        "id": "1.4.1",
        "name": "Pruebas por pozo",
        "dur": 15,
        "preds": [
          "1.3.1",
          "1.3.2"
        ],
        "pct": 0,
        "resource": "Proveedor SCADA",
        "crashCostPerDay": 700,
        "dailyCost": 2754
      },
      {
        "id": "1.4.2",
        "name": "Go-live escalonado",
        "dur": 10,
        "preds": [
          "1.4.1"
        ],
        "pct": 0,
        "resource": "Gerente Sistemas",
        "crashCostPerDay": 400,
        "dailyCost": 2020
      },
      {
        "id": "1.5.1",
        "name": "Manual de operaciones",
        "dur": 10,
        "preds": [
          "1.3.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 300,
        "dailyCost": 1028
      },
      {
        "id": "1.5.2",
        "name": "Capacitación a operadores",
        "dur": 15,
        "preds": [
          "1.5.1"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 300,
        "dailyCost": 1028
      },
      {
        "id": "1.1.3",
        "name": "Cierre del proyecto",
        "dur": 5,
        "preds": [
          "1.4.2",
          "1.3.3",
          "1.5.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 1028
      }
    ],
    "risks": [
      {
        "id": "R1",
        "desc": "El proveedor de integración no cumple los plazos comprometidos",
        "category": "Externo",
        "prob": "Media",
        "impact": "Alta",
        "response": "Mitigar — cláusulas de penalidad, seguimiento quincenal",
        "owner": "PM",
        "taskId": "1.3.1"
      },
      {
        "id": "R2",
        "desc": "Resistencia al cambio en sucursales con procesos manuales arraigados",
        "category": "Organizacional",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Mitigar — plan de gestión del cambio",
        "owner": "PM",
        "taskId": "1.5.2"
      },
      {
        "id": "R3",
        "desc": "El ERP actual no soporta integración vía API sin desarrollo adicional",
        "category": "Técnico",
        "prob": "Media",
        "impact": "Alta",
        "response": "Mitigar — prueba de concepto técnica temprana",
        "owner": "Gerente Sistemas",
        "taskId": "1.3.3"
      }
    ],
    "charter": {
      "sponsor": "Gerente de Operaciones",
      "budget": "USD 480.000",
      "duration": "9 meses (enero–septiembre 2026)",
      "deliverable": "Sistema SCADA instalado y operativo en los 18 pozos, con dashboard central, alertas automáticas y manual de operaciones.",
      "objective": "",
      "scopeIn": "Sistema SCADA instalado y operativo en los 18 pozos, con dashboard central, alertas automáticas y manual de operaciones.",
      "scopeOut": "",
      "constraints": "Los pozos no pueden detenerse durante la instalación. Requiere habilitación del ente regulador antes del go-live. Presupuesto fijo por contrato. Integración con ERP existente.",
      "stakeholders": "Gerente de Operaciones (patrocinador), Jefe de IT, Operadores de campo, Ente regulador, Proveedor SCADA, Sindicato de trabajadores de la energía"
    }
  },
  "finco": {
    "label": "Caso B — App de pagos (Fintech)",
    "title": "App de pagos para pymes",
    "startDate": "2026-02-02",
    "startNote": "Caso de ejemplo genérico. Fecha de inicio editable.",
    "phases": [
      {
        "id": "1.1",
        "name": "Gestión del proyecto",
        "children": [
          "1.1.1",
          "1.1.3"
        ]
      },
      {
        "id": "1.2",
        "name": "Habilitación regulatoria (banco central)",
        "children": [
          "1.2.1",
          "1.2.2"
        ]
      },
      {
        "id": "1.3",
        "name": "Desarrollo técnico",
        "children": [
          "1.3.1",
          "1.3.2",
          "1.3.3"
        ]
      },
      {
        "id": "1.4",
        "name": "Pruebas y beta",
        "children": [
          "1.4.1",
          "1.4.2"
        ]
      },
      {
        "id": "1.5",
        "name": "Onboarding de PyMEs",
        "children": [
          "1.5.1",
          "1.5.2"
        ]
      }
    ],
    "tasks": [
      {
        "id": "1.1.1",
        "name": "Acta de constitución y planificación",
        "dur": 8,
        "preds": [],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 530
      },
      {
        "id": "1.2.1",
        "name": "Presentación ante el banco central",
        "dur": 15,
        "preds": [
          "1.1.1"
        ],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 530
      },
      {
        "id": "1.2.2",
        "name": "Aprobación del banco central",
        "dur": 25,
        "preds": [
          "1.2.1"
        ],
        "pct": 80,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 530
      },
      {
        "id": "1.3.1",
        "name": "Desarrollo MVP core (app)",
        "dur": 55,
        "preds": [
          "1.1.1"
        ],
        "pct": 40,
        "resource": "Equipo Dev",
        "crashCostPerDay": 900,
        "dailyCost": 1607.9091
      },
      {
        "id": "1.3.2",
        "name": "Integración billeteras (3 billeteras digitales)",
        "dur": 25,
        "preds": [
          "1.3.1"
        ],
        "pct": 10,
        "resource": "Equipo Dev",
        "crashCostPerDay": 850,
        "dailyCost": 1608
      },
      {
        "id": "1.3.3",
        "name": "Autenticación biométrica",
        "dur": 20,
        "preds": [
          "1.3.1"
        ],
        "pct": 0,
        "resource": "Equipo Dev",
        "crashCostPerDay": 700,
        "dailyCost": 1608
      },
      {
        "id": "1.4.1",
        "name": "Pruebas con 20 PyMEs beta",
        "dur": 20,
        "preds": [
          "1.3.2",
          "1.3.3",
          "1.2.2"
        ],
        "pct": 0,
        "resource": "Product Owner",
        "crashCostPerDay": 500,
        "dailyCost": 757
      },
      {
        "id": "1.4.2",
        "name": "Lanzamiento escalonado",
        "dur": 5,
        "preds": [
          "1.4.1"
        ],
        "pct": 0,
        "resource": "Product Owner",
        "crashCostPerDay": 400,
        "dailyCost": 757
      },
      {
        "id": "1.5.1",
        "name": "Material de onboarding",
        "dur": 8,
        "preds": [
          "1.3.1"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 250,
        "dailyCost": 530
      },
      {
        "id": "1.5.2",
        "name": "Onboarding 100 PyMEs",
        "dur": 15,
        "preds": [
          "1.5.1",
          "1.4.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 250,
        "dailyCost": 530
      },
      {
        "id": "1.1.3",
        "name": "Cierre del proyecto",
        "dur": 5,
        "preds": [
          "1.4.2",
          "1.5.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 530
      }
    ],
    "risks": [
      {
        "id": "R1",
        "desc": "Cumplimiento normativo del banco central obligatorio antes del lanzamiento",
        "category": "Externo",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Mitigar — presentar expediente con anticipación",
        "owner": "PM",
        "taskId": "1.2.2"
      },
      {
        "id": "R2",
        "desc": "Competidor lanzó producto similar hace 3 meses",
        "category": "Externo",
        "prob": "Alta",
        "impact": "Media",
        "response": "Mitigar — diferenciar por UX y velocidad de onboarding",
        "owner": "Product Owner",
        "taskId": "1.4.2"
      },
      {
        "id": "R3",
        "desc": "Presupuesto sin reserva de contingencia aprobada",
        "category": "De gestión",
        "prob": "Media",
        "impact": "Alta",
        "response": "Escalar — solicitar reserva al CEO antes del desarrollo",
        "owner": "PM",
        "taskId": "1.3.1"
      }
    ],
    "charter": {
      "sponsor": "CEO",
      "budget": "USD 220.000",
      "duration": "7 meses (febrero–agosto 2026)",
      "deliverable": "App mobile en producción (iOS + Android) con integración a 3 billeteras digitales, 100 PyMEs onboardeadas y tasa de conversión ≥ 75% en el proceso de pago.",
      "objective": "",
      "scopeIn": "App mobile en producción (iOS + Android) con integración a 3 billeteras digitales, 100 PyMEs onboardeadas y tasa de conversión ≥ 75% en el proceso de pago.",
      "scopeOut": "",
      "constraints": "Cumplimiento normativo del banco central obligatorio antes del lanzamiento. El CEO exige MVP en 90 días. Presupuesto sin reserva de contingencia aprobada. Competidor lanzó producto similar hace 3 meses.",
      "stakeholders": "CEO (patrocinador), Product Owner, Equipo de desarrollo, Área de Compliance, Banco central, Proveedores de pago, Usuarios beta (20 PyMEs)"
    }
  },
  "logired": {
    "label": "Caso C — Optimización de rutas (Logística)",
    "title": "Optimización de rutas de reparto",
    "startDate": "2026-03-02",
    "startNote": "Caso de ejemplo genérico. Fecha de inicio editable.",
    "phases": [
      {
        "id": "1.1",
        "name": "Gestión del proyecto",
        "children": [
          "1.1.1",
          "1.1.3"
        ]
      },
      {
        "id": "1.2",
        "name": "Selección de software",
        "children": [
          "1.2.1",
          "1.2.2"
        ]
      },
      {
        "id": "1.3",
        "name": "Integración",
        "children": [
          "1.3.1",
          "1.3.2"
        ]
      },
      {
        "id": "1.4",
        "name": "Piloto y rollout",
        "children": [
          "1.4.1",
          "1.4.2"
        ]
      },
      {
        "id": "1.5",
        "name": "Gestión del cambio",
        "children": [
          "1.5.1",
          "1.5.2"
        ]
      }
    ],
    "tasks": [
      {
        "id": "1.1.1",
        "name": "Acta de constitución y planificación",
        "dur": 6,
        "preds": [],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 388
      },
      {
        "id": "1.2.1",
        "name": "Selección de proveedor",
        "dur": 15,
        "preds": [
          "1.1.1"
        ],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 388
      },
      {
        "id": "1.2.2",
        "name": "Configuración del software",
        "dur": 10,
        "preds": [
          "1.2.1"
        ],
        "pct": 60,
        "resource": "IT",
        "crashCostPerDay": null,
        "dailyCost": 554
      },
      {
        "id": "1.3.1",
        "name": "Integración con ERP de facturación",
        "dur": 35,
        "preds": [
          "1.2.2"
        ],
        "pct": 20,
        "resource": "IT",
        "crashCostPerDay": 750,
        "dailyCost": 554.0571
      },
      {
        "id": "1.3.2",
        "name": "App mobile para choferes",
        "dur": 30,
        "preds": [
          "1.2.2"
        ],
        "pct": 10,
        "resource": "Proveedor",
        "crashCostPerDay": 650,
        "dailyCost": 1039
      },
      {
        "id": "1.4.1",
        "name": "Piloto con choferes",
        "dur": 10,
        "preds": [
          "1.3.1",
          "1.3.2"
        ],
        "pct": 0,
        "resource": "Supervisor",
        "crashCostPerDay": 400,
        "dailyCost": 554
      },
      {
        "id": "1.4.2",
        "name": "Rollout completo (120 choferes)",
        "dur": 20,
        "preds": [
          "1.4.1"
        ],
        "pct": 0,
        "resource": "Supervisor",
        "crashCostPerDay": 400,
        "dailyCost": 554
      },
      {
        "id": "1.5.1",
        "name": "Plan de comunicación al sindicato",
        "dur": 10,
        "preds": [
          "1.1.1"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 300,
        "dailyCost": 388
      },
      {
        "id": "1.5.2",
        "name": "Capacitación a choferes",
        "dur": 15,
        "preds": [
          "1.5.1",
          "1.4.1"
        ],
        "pct": 0,
        "resource": "Supervisor",
        "crashCostPerDay": 300,
        "dailyCost": 554
      },
      {
        "id": "1.1.3",
        "name": "Cierre del proyecto",
        "dur": 5,
        "preds": [
          "1.4.2",
          "1.5.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 388
      }
    ],
    "risks": [
      {
        "id": "R1",
        "desc": "El sindicato de camioneros tiene historial de resistencia a cambios tecnológicos",
        "category": "Organizacional",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Mitigar — plan de comunicación temprano, involucrar delegados",
        "owner": "PM",
        "taskId": "1.5.1"
      },
      {
        "id": "R2",
        "desc": "El proveedor de integración ERP tiene 6 semanas de backlog",
        "category": "Externo",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Mitigar — reservar el cupo del proveedor apenas se firma contrato",
        "owner": "IT",
        "taskId": "1.3.1"
      },
      {
        "id": "R3",
        "desc": "Rutas deben seguir operando sin interrupción durante la transición",
        "category": "Técnico",
        "prob": "Media",
        "impact": "Media",
        "response": "Mitigar — rollout gradual sucursal por sucursal",
        "owner": "Supervisor",
        "taskId": "1.4.2"
      }
    ],
    "charter": {
      "sponsor": "Gerente Comercial",
      "budget": "USD 95.000",
      "duration": "5 meses (marzo–julio 2026)",
      "deliverable": "Software de optimización instalado y adoptado por el 90% de los choferes, con reducción del 20% en tiempo promedio de ruta y 0% de rutas manuales.",
      "objective": "",
      "scopeIn": "Software de optimización instalado y adoptado por el 90% de los choferes, con reducción del 20% en tiempo promedio de ruta y 0% de rutas manuales.",
      "scopeOut": "",
      "constraints": "El sindicato de camioneros tiene historial de resistencia a cambios tecnológicos. La integración con el ERP es la dependencia técnica más crítica (proveedor con 6 semanas de backlog). Las rutas deben seguir operando sin interrupción durante la transición.",
      "stakeholders": "Gerente Comercial (patrocinador), Supervisor de Logística, Choferes, Sindicato de camioneros, IT, Proveedor del software, Clientes corporativos clave"
    }
  },
  "conurba": {
    "label": "Caso D — Centro de distribución (Construcción)",
    "title": "Centro de distribución",
    "startDate": "2026-01-05",
    "startNote": "Caso de ejemplo genérico. Fecha de inicio editable.",
    "phases": [
      {
        "id": "1.1",
        "name": "Gestión del proyecto",
        "children": [
          "1.1.1",
          "1.1.3"
        ]
      },
      {
        "id": "1.2",
        "name": "Permisos municipales",
        "children": [
          "1.2.1",
          "1.2.2"
        ]
      },
      {
        "id": "1.3",
        "name": "Construcción",
        "children": [
          "1.3.1",
          "1.3.2"
        ]
      },
      {
        "id": "1.4",
        "name": "Habilitación final",
        "children": [
          "1.4.1",
          "1.4.2"
        ]
      },
      {
        "id": "1.5",
        "name": "Gestión ambiental",
        "children": [
          "1.5.1"
        ]
      }
    ],
    "tasks": [
      {
        "id": "1.1.1",
        "name": "Acta de constitución y planificación",
        "dur": 10,
        "preds": [],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 2539
      },
      {
        "id": "1.2.1",
        "name": "Presentación municipal y bomberos",
        "dur": 5,
        "preds": [
          "1.1.1"
        ],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 2539
      },
      {
        "id": "1.2.2",
        "name": "Aprobación de permisos",
        "dur": 60,
        "preds": [
          "1.2.1"
        ],
        "pct": 50,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 2539
      },
      {
        "id": "1.3.1",
        "name": "Obra civil (estructura)",
        "dur": 80,
        "preds": [
          "1.2.2"
        ],
        "pct": 0,
        "resource": "Constructora",
        "crashCostPerDay": 1500,
        "dailyCost": 13599.975
      },
      {
        "id": "1.3.2",
        "name": "Instalaciones (racks y equipamiento)",
        "dur": 60,
        "preds": [
          "1.3.1"
        ],
        "pct": 0,
        "resource": "Proveedor equipamiento",
        "crashCostPerDay": 900,
        "dailyCost": 6800
      },
      {
        "id": "1.4.1",
        "name": "Inspección final bomberos/municipio",
        "dur": 15,
        "preds": [
          "1.3.1",
          "1.3.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 2539
      },
      {
        "id": "1.4.2",
        "name": "Puesta en marcha operativa",
        "dur": 10,
        "preds": [
          "1.4.1"
        ],
        "pct": 0,
        "resource": "Directora Operaciones",
        "crashCostPerDay": 400,
        "dailyCost": 5440
      },
      {
        "id": "1.5.1",
        "name": "Proyecto de gestión de residuos",
        "dur": 20,
        "preds": [
          "1.1.1"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 300,
        "dailyCost": 2539
      },
      {
        "id": "1.1.3",
        "name": "Cierre del proyecto",
        "dur": 8,
        "preds": [
          "1.4.2",
          "1.5.1"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 2539
      }
    ],
    "risks": [
      {
        "id": "R1",
        "desc": "Permisos municipales y de bomberos pueden demorar hasta 90 días",
        "category": "Externo",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Mitigar — presentar expediente completo desde el día 1",
        "owner": "PM",
        "taskId": "1.2.2"
      },
      {
        "id": "R2",
        "desc": "Presupuesto en dólares en contexto de volatilidad cambiaria",
        "category": "Externo",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Transferir — contrato con cláusula de ajuste cambiario; el remanente se acepta activamente con reserva de contingencia",
        "owner": "PM",
        "taskId": "1.3.1"
      },
      {
        "id": "R3",
        "desc": "Fecha de habilitación comprometida con un cliente corporativo",
        "category": "De gestión",
        "prob": "Media",
        "impact": "Alta",
        "response": "Mitigar — comunicar avance mensual al cliente",
        "owner": "Directora Operaciones",
        "taskId": "1.4.2"
      }
    ],
    "charter": {
      "sponsor": "Directora de Operaciones",
      "budget": "USD 1.850.000",
      "duration": "14 meses (enero 2026–febrero 2027)",
      "deliverable": "Centro de distribución de 4.500 m² habilitado, con certificados municipales y de bomberos, equipamiento instalado y operaciones iniciadas.",
      "objective": "",
      "scopeIn": "Centro de distribución de 4.500 m² habilitado, con certificados municipales y de bomberos, equipamiento instalado y operaciones iniciadas.",
      "scopeOut": "",
      "constraints": "Los permisos municipales y de bomberos son el camino crítico — pueden demorar hasta 90 días. Presupuesto en dólares en contexto de volatilidad cambiaria. Fecha de habilitación comprometida con un cliente corporativo. El Municipio exige proyecto de gestión de residuos.",
      "stakeholders": "Directora de Operaciones (patrocinador), Municipio, Empresa constructora, Proveedores de racks y equipamiento, Área de Seguridad e Higiene, Bomberos, Equipo de operaciones"
    }
  },
  "rivero": {
    "label": "Caso E — Implementación de ERP (Industria)",
    "title": "Implementación de ERP en una pyme industrial",
    "startDate": "2026-02-02",
    "startNote": "Caso de ejemplo genérico. Fecha de inicio editable.",
    "phases": [
      {
        "id": "1.1",
        "name": "Gestión del proyecto",
        "children": [
          "1.1.1",
          "1.1.3"
        ]
      },
      {
        "id": "1.2",
        "name": "Relevamiento",
        "children": [
          "1.2.1",
          "1.2.2"
        ]
      },
      {
        "id": "1.3",
        "name": "Implementación ERP",
        "children": [
          "1.3.1",
          "1.3.2",
          "1.3.3"
        ]
      },
      {
        "id": "1.4",
        "name": "Migración y pruebas",
        "children": [
          "1.4.1",
          "1.4.2"
        ]
      },
      {
        "id": "1.5",
        "name": "Capacitación",
        "children": [
          "1.5.1",
          "1.5.2"
        ]
      }
    ],
    "tasks": [
      {
        "id": "1.1.1",
        "name": "Acta de constitución y planificación",
        "dur": 8,
        "preds": [],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 311
      },
      {
        "id": "1.2.1",
        "name": "Relevamiento de procesos",
        "dur": 20,
        "preds": [
          "1.1.1"
        ],
        "pct": 100,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 311
      },
      {
        "id": "1.2.2",
        "name": "Definición de alcance por módulo",
        "dur": 15,
        "preds": [
          "1.2.1"
        ],
        "pct": 70,
        "resource": "Directora Financiera",
        "crashCostPerDay": null,
        "dailyCost": 667
      },
      {
        "id": "1.3.1",
        "name": "Config. compras + inventario",
        "dur": 45,
        "preds": [
          "1.2.2"
        ],
        "pct": 20,
        "resource": "Proveedor ERP",
        "crashCostPerDay": 700,
        "dailyCost": 834
      },
      {
        "id": "1.3.2",
        "name": "Config. producción",
        "dur": 40,
        "preds": [
          "1.2.2"
        ],
        "pct": 10,
        "resource": "Proveedor ERP",
        "crashCostPerDay": 700,
        "dailyCost": 834
      },
      {
        "id": "1.3.3",
        "name": "Config. contabilidad",
        "dur": 35,
        "preds": [
          "1.2.2"
        ],
        "pct": 0,
        "resource": "Proveedor ERP",
        "crashCostPerDay": 650,
        "dailyCost": 834
      },
      {
        "id": "1.4.1",
        "name": "Migración de datos históricos",
        "dur": 30,
        "preds": [
          "1.3.1",
          "1.3.2",
          "1.3.3"
        ],
        "pct": 0,
        "resource": "IT interno",
        "crashCostPerDay": 400,
        "dailyCost": 445
      },
      {
        "id": "1.4.2",
        "name": "Primer cierre contable en el nuevo sistema",
        "dur": 15,
        "preds": [
          "1.4.1"
        ],
        "pct": 0,
        "resource": "Contador externo",
        "crashCostPerDay": 350,
        "dailyCost": 556
      },
      {
        "id": "1.5.1",
        "name": "Capacitación a 45 usuarios",
        "dur": 20,
        "preds": [
          "1.3.1"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": 300,
        "dailyCost": 311
      },
      {
        "id": "1.5.2",
        "name": "Soporte post go-live (60 días)",
        "dur": 60,
        "preds": [
          "1.4.2"
        ],
        "pct": 0,
        "resource": "IT interno",
        "crashCostPerDay": 300,
        "dailyCost": 445.7
      },
      {
        "id": "1.1.3",
        "name": "Cierre del proyecto",
        "dur": 5,
        "preds": [
          "1.4.2",
          "1.5.2"
        ],
        "pct": 0,
        "resource": "PM",
        "crashCostPerDay": null,
        "dailyCost": 311
      }
    ],
    "risks": [
      {
        "id": "R1",
        "desc": "El Gerente General delega todo en la Directora Financiera, con expectativas distintas",
        "category": "Organizacional",
        "prob": "Alta",
        "impact": "Media",
        "response": "Mitigar — reuniones de alineación tripartitas periódicas",
        "owner": "PM",
        "taskId": "1.2.2"
      },
      {
        "id": "R2",
        "desc": "La migración de datos históricos es técnicamente compleja",
        "category": "Técnico",
        "prob": "Alta",
        "impact": "Alta",
        "response": "Mitigar — auditoría de datos previa a la migración",
        "owner": "IT interno",
        "taskId": "1.4.1"
      },
      {
        "id": "R3",
        "desc": "2 usuarios clave con alta resistencia declarada",
        "category": "Organizacional",
        "prob": "Media",
        "impact": "Media",
        "response": "Mitigar — capacitación reforzada + acompañamiento 1 a 1",
        "owner": "PM",
        "taskId": "1.5.1"
      }
    ],
    "charter": {
      "sponsor": "Gerente General",
      "budget": "USD 175.000",
      "duration": "10 meses (febrero–noviembre 2026)",
      "deliverable": "ERP en producción con los 4 módulos implementados, 45 usuarios capacitados, datos históricos migrados y primer cierre contable realizado en el nuevo sistema.",
      "objective": "",
      "scopeIn": "ERP en producción con los 4 módulos implementados, 45 usuarios capacitados, datos históricos migrados y primer cierre contable realizado en el nuevo sistema.",
      "scopeOut": "",
      "constraints": "El Gerente General es el patrocinador pero delega todo en la Directora Financiera, que tiene expectativas muy distintas. La empresa no tiene cultura de proyectos formales. La migración de datos históricos es técnicamente compleja. 2 usuarios clave con alta resistencia declarada.",
      "stakeholders": "Gerente General (patrocinador), Directora Financiera, Jefa de Producción, IT interno, Proveedor de ERP, Contador externo, Usuarios clave de cada área"
    }
  }
};
window.PLANIFICADOR_CASOS_META = { version: 1, audience: "publica" };
