from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

OUTPUT = "public/recursos/guia-trello-pm.pdf"

VERDE = HexColor("#2D6A4F")
TEXTO = HexColor("#1A1A1A")
MUTED = HexColor("#6B6B6B")
BORDE = HexColor("#E0DFDB")

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2.5*cm,
    rightMargin=2.5*cm,
    topMargin=2.5*cm,
    bottomMargin=2.5*cm,
)

estilo_tag = ParagraphStyle("tag", fontSize=9, textColor=VERDE, spaceAfter=6, fontName="Helvetica-Bold", leading=12)
estilo_titulo = ParagraphStyle("titulo", fontSize=26, textColor=TEXTO, spaceAfter=10, fontName="Helvetica-Bold", leading=32)
estilo_lead = ParagraphStyle("lead", fontSize=12, textColor=MUTED, spaceAfter=6, fontName="Helvetica", leading=18)
estilo_meta = ParagraphStyle("meta", fontSize=9, textColor=MUTED, spaceAfter=20, fontName="Helvetica", leading=14)
estilo_h2 = ParagraphStyle("h2", fontSize=16, textColor=TEXTO, spaceBefore=24, spaceAfter=8, fontName="Helvetica-Bold", leading=22)
estilo_h3 = ParagraphStyle("h3", fontSize=12, textColor=TEXTO, spaceBefore=14, spaceAfter=4, fontName="Helvetica-Bold", leading=16)
estilo_body = ParagraphStyle("body", fontSize=10, textColor=TEXTO, spaceAfter=8, fontName="Helvetica", leading=16)
estilo_li = ParagraphStyle("li", fontSize=10, textColor=TEXTO, spaceAfter=4, fontName="Helvetica", leading=15, leftIndent=16, bulletIndent=6)
estilo_nota = ParagraphStyle("nota", fontSize=9, textColor=MUTED, spaceAfter=6, fontName="Helvetica-Oblique", leading=14, leftIndent=12)
estilo_footer = ParagraphStyle("footer", fontSize=9, textColor=MUTED, fontName="Helvetica", leading=13, spaceAfter=4)

story = []

story.append(Paragraph("GESTIÓN DE TAREAS", estilo_tag))
story.append(Paragraph("Trello para Project Managers", estilo_titulo))
story.append(Paragraph("Guía práctica para usar Trello en la gestión de proyectos reales. Simple, visual y efectivo para equipos que dan sus primeros pasos en herramientas digitales.", estilo_lead))
story.append(Paragraph("Nivel: inicial · Herramienta: Trello (plan gratuito) · Autora: Valeria Yashan", estilo_meta))
story.append(HRFlowable(width="100%", thickness=1, color=BORDE, spaceAfter=20))

secciones = [
    ("1. Qué es Trello y para qué sirve en gestión de proyectos", [
        ("p", "Trello es una herramienta de gestión de tareas basada en el modelo Kanban. Su interfaz es completamente visual: las tareas son tarjetas que se mueven entre columnas que representan estados del trabajo."),
        ("p", "Para un Project Manager, Trello es la herramienta ideal para equipos que vienen de Excel o WhatsApp y necesitan dar un primer paso hacia la gestión digital sin una curva de aprendizaje pronunciada."),
        ("h3", "¿Para qué tipo de proyectos es ideal?"),
        ("li", "Proyectos con flujos de trabajo lineales y etapas claras."),
        ("li", "Equipos pequeños de hasta 10 personas."),
        ("li", "Proyectos con ciclos cortos donde la visualización del avance es prioritaria."),
        ("li", "Gestión de contenido, campañas, lanzamientos o procesos repetitivos."),
        ("h3", "¿Cuándo Trello no es suficiente?"),
        ("li", "Cuando necesitás dependencias entre tareas."),
        ("li", "Cuando el proyecto tiene más de 50 tareas activas simultáneas."),
        ("li", "Cuando necesitás reportes de avance detallados o seguimiento de tiempo."),
        ("li", "Cuando el equipo supera las 10 personas o maneja múltiples proyectos simultáneos."),
        ("nota", "Nota práctica: El plan gratuito de Trello permite tableros ilimitados y todas las funciones básicas que un PM necesita para proyectos de tamaño mediano."),
    ]),
    ("2. Conceptos clave: Boards, Lists y Cards", [
        ("p", "Trello tiene solo tres elementos fundamentales. Entenderlos bien es todo lo que necesitás para empezar."),
        ("h3", "Board (Tablero)"),
        ("p", "Un Board es el espacio de trabajo de un proyecto. Cada proyecto tiene su propio Board. Ejemplo: 'Lanzamiento de producto Q3 2026' es un Board."),
        ("h3", "List (Lista)"),
        ("p", "Una List es una columna dentro del Board. Representa una etapa o estado del trabajo. Las Lists más comunes en PM son:"),
        ("li", "Por hacer: tareas pendientes que aún no se iniciaron."),
        ("li", "En progreso: tareas que alguien está haciendo ahora."),
        ("li", "En revisión: tareas completadas que esperan aprobación."),
        ("li", "Completado: tareas finalizadas y aprobadas."),
        ("h3", "Card (Tarjeta)"),
        ("p", "Una Card es una tarea. Cada Card puede contener: descripción, responsable, fecha límite, checklist, etiquetas, comentarios y archivos adjuntos."),
        ("nota", "La lógica del Kanban: Una Card empieza en la primera List y se mueve hacia la derecha a medida que avanza. El tablero completo muestra el estado real del proyecto en un solo vistazo."),
    ]),
    ("3. Configuración inicial y primer tablero", [
        ("h3", "Crear la cuenta"),
        ("li", "Ingresá a trello.com y hacé clic en 'Registrarse, es gratis'."),
        ("li", "Registrate con tu email profesional o con Google."),
        ("li", "Completá tu nombre y confirmá el email."),
        ("h3", "Crear el primer Board"),
        ("li", "Desde el panel principal, hacé clic en 'Crear nuevo tablero'."),
        ("li", "Asigná un nombre descriptivo. Ejemplo: 'Implementación CRM — Q3 2026'."),
        ("li", "Elegí un color o fondo para el tablero."),
        ("li", "Definí si el tablero es privado, de equipo o público."),
        ("h3", "Configurar las Lists"),
        ("li", "Backlog: tareas identificadas pero no priorizadas aún."),
        ("li", "Por hacer: tareas priorizadas para el sprint o semana actual."),
        ("li", "En progreso: tareas que alguien está ejecutando ahora."),
        ("li", "En revisión: tareas que esperan aprobación del PM."),
        ("li", "Completado: tareas finalizadas."),
        ("h3", "Invitar al equipo"),
        ("li", "Dentro del Board, hacé clic en 'Invitar' en la barra superior."),
        ("li", "Ingresá los emails de los miembros del equipo."),
        ("nota", "Consejo: Antes de invitar al equipo, creá al menos 5 Cards de ejemplo con el formato correcto. Así cuando lleguen saben exactamente cómo completar una Card."),
    ]),
    ("4. Gestión del día a día", [
        ("h3", "Crear y completar Cards"),
        ("p", "Para crear una Card, hacé clic en 'Agregar una tarjeta' al pie de cualquier List. Asigná un nombre concreto y accionable, luego completá los detalles: responsable, fecha límite, descripción y checklist."),
        ("h3", "Mover Cards entre Lists"),
        ("p", "El movimiento de Cards es la acción central en Trello. Cuando el responsable empieza a trabajar, mueve la Card de 'Por hacer' a 'En progreso'. Cuando termina, la mueve a 'En revisión'."),
        ("h3", "Usar etiquetas"),
        ("li", "Rojo: tarea bloqueada o con riesgo."),
        ("li", "Amarillo: tarea en espera de un tercero."),
        ("li", "Verde: tarea en camino sin problemas."),
        ("li", "Azul: tarea de alta prioridad."),
        ("h3", "Checklists dentro de las Cards"),
        ("p", "Cuando una tarea tiene pasos internos, agregá un checklist dentro de la Card. El porcentaje de completitud aparece visualmente en la Card dentro del tablero."),
        ("h3", "Comentarios y menciones"),
        ("p", "Las conversaciones sobre una tarea deben ocurrir en los comentarios de la Card. Usá @ para mencionar a un miembro específico."),
        ("h3", "Fechas límite"),
        ("p", "Cuando la fecha se acerca, la Card cambia de color automáticamente: amarillo cuando faltan 24 horas, rojo cuando está vencida."),
    ]),
    ("5. Power-Ups útiles para PMs", [
        ("p", "Los Power-Ups son integraciones y funciones adicionales que se activan dentro de un tablero."),
        ("h3", "Calendar"),
        ("p", "Muestra todas las Cards con fecha límite en una vista de calendario mensual. Muy útil para identificar semanas sobrecargadas."),
        ("h3", "Card Aging"),
        ("p", "Las Cards que no se tocan durante varios días se vuelven progresivamente más transparentes. Es una señal visual de tareas abandonadas."),
        ("h3", "Google Drive"),
        ("p", "Permite adjuntar archivos directamente desde Google Drive dentro de las Cards."),
        ("h3", "Slack"),
        ("p", "Envía notificaciones automáticas a un canal de Slack cuando se mueven Cards o se acercan fechas límite."),
        ("nota", "Recomendación: Empezá sin Power-Ups durante las primeras dos semanas. Una vez que el equipo tiene el flujo básico incorporado, activá Calendar como primer Power-Up."),
    ]),
    ("6. Errores frecuentes y cuándo migrar a otra herramienta", [
        ("h3", "Crear demasiadas Lists"),
        ("p", "El tablero pierde su claridad visual cuando tiene más de 6 o 7 Lists. Si necesitás más columnas, es una señal de que el proyecto es más complejo de lo que Trello puede manejar."),
        ("h3", "No asignar responsable a cada Card"),
        ("p", "Una Card sin responsable es una tarea que nadie va a hacer. Antes de cerrar la sesión de planificación, cada Card debe tener una persona asignada y una fecha límite."),
        ("h3", "Usar Trello como repositorio de ideas"),
        ("p", "El Backlog no puede convertirse en un cementerio de ideas sin priorizar. Si una Card lleva más de dos semanas sin moverse, hay que decidir: se hace, se descarta o se pospone."),
        ("h3", "No revisar el tablero diariamente"),
        ("p", "Trello funciona cuando el equipo lo usa todos los días. Si la revisión no forma parte de la rutina diaria, las Cards quedan desactualizadas."),
        ("h3", "Señales de que es momento de migrar a Asana o ClickUp"),
        ("li", "El equipo supera las 10 personas activas en el tablero."),
        ("li", "Necesitás dependencias entre tareas."),
        ("li", "Necesitás reportes de avance para stakeholders externos."),
        ("li", "Gestionás más de 3 proyectos simultáneos con el mismo equipo."),
        ("li", "Necesitás rastrear el tiempo dedicado a cada tarea."),
        ("nota", "Regla práctica: Trello es la herramienta correcta hasta que se siente limitada. Cuando el equipo empieza a pedir funciones que Trello no tiene, es el momento de migrar, no antes."),
    ]),
]

for titulo_seccion, contenido in secciones:
    story.append(HRFlowable(width="100%", thickness=1, color=BORDE, spaceAfter=16))
    story.append(Paragraph(titulo_seccion, estilo_h2))
    for tipo, texto in contenido:
        if tipo == "p":
            story.append(Paragraph(texto, estilo_body))
        elif tipo == "h3":
            story.append(Paragraph(texto, estilo_h3))
        elif tipo == "li":
            story.append(Paragraph(f"• {texto}", estilo_li))
        elif tipo == "nota":
            story.append(Spacer(1, 6))
            story.append(Paragraph(texto, estilo_nota))
            story.append(Spacer(1, 6))

story.append(Spacer(1, 30))
story.append(HRFlowable(width="100%", thickness=1, color=BORDE, spaceAfter=12))
story.append(Paragraph("Valeria Yashan", ParagraphStyle("autor_nombre", fontSize=11, textColor=TEXTO, fontName="Helvetica-Bold", leading=16)))
story.append(Paragraph("PMP® · Consultora en gestión de proyectos e IA · Autora de 4 libros sobre Project Management.", estilo_footer))
story.append(Paragraph("valeriayashan.com.ar", ParagraphStyle("web", fontSize=9, textColor=VERDE, fontName="Helvetica", leading=13)))

doc.build(story)
print(f"PDF generado: {OUTPUT}")