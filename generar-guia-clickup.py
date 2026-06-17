from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT

OUTPUT = "public/recursos/guia-clickup-pm.pdf"

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
story.append(Paragraph("ClickUp para Project Managers", estilo_titulo))
story.append(Paragraph("Guía práctica para configurar y usar ClickUp en la gestión de proyectos reales. Con foco en la jerarquía, las automatizaciones y el seguimiento de equipo.", estilo_lead))
story.append(Paragraph("Nivel: inicial · Herramienta: ClickUp (plan gratuito) · Autora: Valeria Yashan", estilo_meta))
story.append(HRFlowable(width="100%", thickness=1, color=BORDE, spaceAfter=20))

secciones = [
    ("1. Qué es ClickUp y en qué se diferencia de Asana", [
        ("p", "ClickUp es una herramienta de gestión de trabajo que busca reemplazar múltiples aplicaciones en una sola: tareas, documentos, metas, dashboards y automatizaciones conviven en el mismo espacio."),
        ("p", "Si Asana es una herramienta enfocada y simple, ClickUp es una plataforma más completa y flexible. Esa flexibilidad es su mayor ventaja y también su mayor riesgo: mal configurada, se convierte en un sistema caótico que nadie usa."),
        ("h3", "¿Cuándo conviene ClickUp sobre Asana?"),
        ("li", "Cuando gestionás múltiples proyectos con equipos distintos y necesitás visibilidad centralizada."),
        ("li", "Cuando necesitás estados de tarea personalizados por proyecto."),
        ("li", "Cuando querés automatizaciones más potentes sin pagar un plan premium."),
        ("li", "Cuando tu equipo también necesita documentación interna junto a las tareas."),
        ("h3", "¿Cuándo conviene Asana sobre ClickUp?"),
        ("li", "Cuando el equipo es pequeño y la simplicidad es más importante que las funciones."),
        ("li", "Cuando la curva de aprendizaje del equipo es un factor crítico."),
        ("li", "Cuando solo necesitás gestionar tareas sin documentación ni dashboards avanzados."),
        ("nota", "Nota práctica: El plan gratuito de ClickUp es significativamente más generoso que el de Asana. Incluye miembros ilimitados, tareas ilimitadas y la mayoría de las funciones que un PM necesita."),
    ]),
    ("2. La jerarquía de ClickUp: Spaces, Folders y Lists", [
        ("p", "Este es el concepto más importante de ClickUp y el que más confunde a los usuarios nuevos. Antes de crear una sola tarea, necesitás entender cómo se organiza la información."),
        ("h3", "La estructura de arriba hacia abajo"),
        ("li", "Workspace: el nivel más alto. Es tu organización o empresa."),
        ("li", "Space: un área de trabajo grande. Puede representar un departamento, un cliente o una línea de negocio."),
        ("li", "Folder: una agrupación dentro de un Space. Opcional."),
        ("li", "List: el contenedor de tareas. Cada List es lo que en Asana sería un proyecto."),
        ("li", "Task: la unidad de trabajo. Cada tarea tiene responsable, fecha, estado, prioridad y comentarios."),
        ("h3", "Ejemplo aplicado a PM"),
        ("li", "Space: 'Clientes 2026'"),
        ("li", "Folder: 'Empresa ABC'"),
        ("li", "List: 'Implementación ERP — Fase 1'"),
        ("li", "List: 'Implementación ERP — Fase 2'"),
        ("nota", "Regla de diseño: No uses Folders si no los necesitás. Empezá con Spaces y Lists directamente. Agregá Folders cuando tengas múltiples proyectos relacionados que convenga agrupar."),
    ]),
    ("3. Configuración inicial: cuenta y workspace", [
        ("h3", "Crear la cuenta"),
        ("li", "Ingresá a clickup.com y hacé clic en 'Get Started Free'."),
        ("li", "Registrate con tu email profesional o con Google."),
        ("li", "Completá el nombre de tu workspace."),
        ("li", "ClickUp te va a preguntar para qué lo vas a usar. Elegí 'Project Management'."),
        ("h3", "Configurar el primer Space"),
        ("li", "Para crear un Space: clic en el '+' junto a 'Spaces' en el panel lateral."),
        ("li", "Asigná un nombre, elegí un color y configurá los permisos de acceso."),
        ("li", "Elegí qué vistas querés disponibles: Lista, Tablero, Cronograma, Calendario."),
        ("h3", "Invitar al equipo"),
        ("li", "Desde el panel lateral, hacé clic en 'Invite People'."),
        ("li", "Ingresá los emails de los miembros del equipo."),
        ("li", "Asigná el rol: Owner, Admin, Member o Guest."),
        ("nota", "Decisión importante: Definí la estructura de Spaces antes de invitar al equipo. Si cambiás la estructura después, vas a tener que reubicar tareas y reconfigurar permisos."),
    ]),
    ("4. Crear tu primer proyecto", [
        ("p", "En ClickUp, un proyecto es una List. Todo lo que en Asana es un proyecto, en ClickUp es una List dentro de un Space o Folder."),
        ("h3", "Crear la List"),
        ("li", "Dentro de tu Space, hacé clic en 'Add List'."),
        ("li", "Asigná un nombre descriptivo. Ejemplo: 'Lanzamiento producto Q3 2026'."),
        ("li", "Elegí un color para identificarla visualmente."),
        ("li", "Configurá los estados de las tareas para esta List."),
        ("h3", "Configurar los estados de tarea"),
        ("li", "To Do: tarea pendiente, aún no iniciada."),
        ("li", "In Progress: tarea en curso."),
        ("li", "Done: tarea completada."),
        ("h3", "Elegir la vista correcta"),
        ("li", "List: vista estándar, ideal para el día a día."),
        ("li", "Board: vista Kanban, útil para visualizar el flujo de trabajo por estados."),
        ("li", "Gantt: vista de cronograma con dependencias."),
        ("li", "Calendar: vista de calendario, útil para ver fechas límite de forma mensual."),
        ("li", "Dashboard: vista de métricas y resumen, ideal para reportes ejecutivos."),
        ("nota", "Regla de oro: Configurá los estados de tarea antes de crear las primeras tareas. Cambiarlos después requiere reclasificar manualmente todas las tareas existentes."),
    ]),
    ("5. Gestión del día a día", [
        ("h3", "La vista 'My Work'"),
        ("p", "ClickUp tiene una vista personal llamada 'My Work' que muestra todas las tareas asignadas a vos en todos los proyectos. Es el punto de partida de cada jornada."),
        ("h3", "Prioridades"),
        ("p", "ClickUp tiene un sistema de prioridades nativo: Urgent, High, Normal y Low. Usalo para comunicar claridad al equipo sobre qué va primero."),
        ("h3", "Comentarios y menciones"),
        ("p", "Las conversaciones sobre una tarea deben ocurrir dentro de la tarea. Podés mencionar a un miembro con @ para que reciba una notificación específica."),
        ("h3", "Actualizar el estado de las tareas"),
        ("p", "Cada miembro del equipo debe actualizar el estado de sus tareas al menos una vez por día."),
        ("h3", "Configurar notificaciones"),
        ("p", "Desde Configuración → Notificaciones, ajustá para recibir solo lo que realmente importa: tareas asignadas a vos y menciones directas."),
    ]),
    ("6. Seguimiento y reportes", [
        ("h3", "Dashboards"),
        ("p", "Los Dashboards de ClickUp permiten crear vistas personalizadas con widgets: gráficos de avance, tareas vencidas, carga de trabajo por persona, tareas por estado."),
        ("h3", "Metas (Goals)"),
        ("p", "ClickUp permite crear Metas vinculadas a tareas o listas. El sistema calcula el avance automáticamente a medida que se completan las tareas."),
        ("h3", "Carga de trabajo (Workload)"),
        ("p", "La vista Workload muestra cuántas tareas tiene asignada cada persona en un período de tiempo. Usala para detectar cuellos de botella antes de que se conviertan en problemas."),
        ("h3", "Reportes de tiempo"),
        ("p", "ClickUp tiene un rastreador de tiempo integrado. Los miembros del equipo pueden registrar el tiempo dedicado a cada tarea."),
    ]),
    ("7. Automatizaciones para PMs", [
        ("p", "Las automatizaciones de ClickUp son más potentes que las de Asana en el plan gratuito. Permiten reducir el trabajo manual del equipo."),
        ("h3", "Cómo crear una automatización"),
        ("li", "Dentro de una List, hacé clic en 'Automate' en la barra superior."),
        ("li", "Elegí una plantilla de automatización o creá una desde cero."),
        ("li", "Definí el disparador (trigger): qué evento activa la automatización."),
        ("li", "Definí la acción: qué hace el sistema cuando se activa el trigger."),
        ("h3", "Automatizaciones más útiles para PMs"),
        ("li", "Cuando una tarea se marca como completada → notificar al PM."),
        ("li", "Cuando una tarea vence sin completarse → cambiar prioridad a Urgent."),
        ("li", "Cuando se crea una tarea en una List → asignar automáticamente a un responsable."),
        ("li", "Cuando el estado cambia a 'In Review' → asignar al PM como revisor."),
        ("nota", "Consejo: Empezá con una o dos automatizaciones simples. Las automatizaciones mal configuradas generan notificaciones innecesarias y confunden al equipo."),
    ]),
    ("8. Errores frecuentes y cómo evitarlos", [
        ("h3", "No definir la jerarquía antes de empezar"),
        ("p", "Dedicá 30 minutos a diseñar la jerarquía en papel antes de tocar la herramienta. Si empezás sin un plan claro, terminás con una estructura caótica muy difícil de reorganizar."),
        ("h3", "Activar todas las funciones desde el inicio"),
        ("p", "Empezá con tareas, estados y fechas. Agregá funciones a medida que el equipo las pida."),
        ("h3", "Crear demasiados estados personalizados"),
        ("p", "Tres a cinco estados son suficientes para la mayoría de los proyectos."),
        ("h3", "No capacitar al equipo antes de migrar"),
        ("p", "Antes de la migración, hacé al menos una sesión de 45 minutos con el equipo completo."),
        ("h3", "Ignorar la vista 'My Work'"),
        ("p", "La vista 'My Work' centraliza todo en un solo lugar y es el punto de partida correcto para cada jornada."),
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