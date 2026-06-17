from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUTPUT = "public/recursos/guia-asana-pm.pdf"

VERDE = HexColor("#2D6A4F")
VERDE_CLARO = HexColor("#D1FAE5")
CREMA = HexColor("#FAFAF8")
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

styles = getSampleStyleSheet()

estilo_tag = ParagraphStyle("tag", fontSize=9, textColor=VERDE, spaceAfter=6, fontName="Helvetica-Bold", leading=12)
estilo_titulo = ParagraphStyle("titulo", fontSize=26, textColor=TEXTO, spaceAfter=10, fontName="Helvetica-Bold", leading=32)
estilo_lead = ParagraphStyle("lead", fontSize=12, textColor=MUTED, spaceAfter=6, fontName="Helvetica", leading=18)
estilo_meta = ParagraphStyle("meta", fontSize=9, textColor=MUTED, spaceAfter=20, fontName="Helvetica", leading=14)
estilo_h2 = ParagraphStyle("h2", fontSize=16, textColor=TEXTO, spaceBefore=24, spaceAfter=8, fontName="Helvetica-Bold", leading=22)
estilo_h3 = ParagraphStyle("h3", fontSize=12, textColor=TEXTO, spaceBefore=14, spaceAfter=4, fontName="Helvetica-Bold", leading=16)
estilo_body = ParagraphStyle("body", fontSize=10, textColor=TEXTO, spaceAfter=8, fontName="Helvetica", leading=16)
estilo_li = ParagraphStyle("li", fontSize=10, textColor=TEXTO, spaceAfter=4, fontName="Helvetica", leading=15, leftIndent=16, bulletIndent=6)
estilo_nota = ParagraphStyle("nota", fontSize=9, textColor=MUTED, spaceAfter=6, fontName="Helvetica-Oblique", leading=14, leftIndent=12, borderPadding=8)
estilo_footer = ParagraphStyle("footer", fontSize=9, textColor=MUTED, fontName="Helvetica", leading=13, spaceAfter=4)

story = []

story.append(Paragraph("GESTIÓN DE TAREAS", estilo_tag))
story.append(Paragraph("Asana para Project Managers", estilo_titulo))
story.append(Paragraph("Guía práctica para configurar y usar Asana en la gestión de proyectos reales. Desde cero, con ejemplos concretos y sin rodeos.", estilo_lead))
story.append(Paragraph("Nivel: inicial · Herramienta: Asana (plan gratuito) · Autora: Valeria Yashan", estilo_meta))
story.append(HRFlowable(width="100%", thickness=1, color=BORDE, spaceAfter=20))

secciones = [
    ("1. Qué es Asana y para qué sirve en gestión de proyectos", [
        ("p", "Asana es una herramienta de gestión de trabajo en equipo. Permite organizar tareas, asignar responsables, establecer fechas límite y hacer seguimiento del avance de un proyecto desde un solo lugar."),
        ("p", "Para un Project Manager, el valor principal de Asana es eliminar la dispersión: nada queda en el email, nada queda en mensajes de WhatsApp, nada queda en hojas de cálculo separadas. Todo el trabajo del equipo vive en un mismo sistema."),
        ("h3", "¿Qué problemas resuelve?"),
        ("li", "Falta de visibilidad sobre quién hace qué y para cuándo."),
        ("li", "Reuniones de seguimiento que podrían ser un dashboard."),
        ("li", "Tareas que caen entre las grietas porque nadie las tiene asignadas."),
        ("li", "Dificultad para identificar bloqueos y dependencias entre actividades."),
        ("h3", "¿Qué no resuelve?"),
        ("li", "No reemplaza la planificación estratégica del proyecto."),
        ("li", "No funciona si el equipo no la usa de forma consistente."),
        ("li", "No es un sustituto de la comunicación entre personas."),
        ("h3", "Asana vs Excel: el salto que vale la pena dar"),
        ("p", "Excel permite registrar tareas, pero no fue diseñado para gestionar trabajo en equipo en tiempo real. Asana sí. La diferencia más concreta: en Asana cada tarea tiene un responsable, una fecha, un estado y un historial de conversación. En Excel, esa información está dispersa o directamente no existe."),
        ("nota", "Nota práctica: El plan gratuito de Asana permite hasta 10 usuarios y cubre la mayoría de las funciones que necesita un PM para gestionar proyectos reales. Esta guía usa solo el plan gratuito."),
    ]),
    ("2. Configuración inicial: cuenta, workspace y equipo", [
        ("h3", "Crear la cuenta"),
        ("li", "Ingresá a asana.com y hacé clic en 'Empezar gratis'."),
        ("li", "Registrate con tu email profesional."),
        ("li", "Completá tu nombre y el nombre de tu organización o equipo."),
        ("h3", "Entender el workspace"),
        ("p", "Un workspace es el espacio de trabajo general de tu organización en Asana. Dentro de un workspace podés tener múltiples proyectos, equipos y miembros."),
        ("p", "Si trabajás de forma independiente o con clientes distintos, podés tener workspaces separados por cliente. Para la mayoría de los casos, un solo workspace es suficiente."),
        ("h3", "Invitar al equipo"),
        ("li", "Desde el panel lateral izquierdo, buscá la opción 'Invitar a miembros'."),
        ("li", "Ingresá los emails de las personas que van a trabajar en el proyecto."),
        ("li", "Asigná el rol: miembro o invitado."),
        ("nota", "Decisión importante: Antes de invitar a todo el equipo, configurá al menos un proyecto de prueba. Así cuando lleguen ya tienen algo concreto donde trabajar."),
    ]),
    ("3. Crear tu primer proyecto", [
        ("p", "Un proyecto en Asana representa un conjunto de trabajo con un objetivo definido y una fecha de cierre."),
        ("h3", "Cómo crear el proyecto"),
        ("li", "En el panel lateral, hacé clic en el ícono '+' junto a 'Proyectos'."),
        ("li", "Elegí 'Proyecto en blanco' para empezar desde cero."),
        ("li", "Asigná un nombre claro y descriptivo. Ejemplo: 'Implementación ERP — Q3 2026'."),
        ("li", "Elegí la vista inicial."),
        ("h3", "Elegir la vista correcta"),
        ("li", "Lista: ideal para el día a día. Mostrás todas las tareas con su responsable, fecha y estado."),
        ("li", "Tablero: vista tipo Kanban. Útil para proyectos con etapas claras."),
        ("li", "Cronograma: vista tipo Gantt. Muestra las tareas en el tiempo y sus dependencias."),
        ("h3", "Crear las primeras tareas"),
        ("li", "Hacé clic en 'Agregar tarea' dentro del proyecto."),
        ("li", "Asigná un nombre concreto y accionable. Mal ejemplo: 'Reunión'. Buen ejemplo: 'Reunión de kick-off con el equipo técnico'."),
        ("li", "Asignale un responsable y una fecha límite."),
        ("nota", "Regla de oro: Cada tarea debe tener exactamente un responsable. No 'el equipo'. Una persona. Esa persona es quien responde por esa tarea."),
    ]),
    ("4. Gestión del día a día", [
        ("h3", "Actualizar el estado de las tareas"),
        ("p", "Cada miembro del equipo debe actualizar el estado de sus tareas al menos una vez por día. Los estados básicos son: pendiente, en progreso y completada."),
        ("h3", "Comentar dentro de las tareas"),
        ("p", "Las conversaciones sobre una tarea deben ocurrir dentro de la tarea, no en WhatsApp ni por email. Esto mantiene el contexto junto al trabajo."),
        ("h3", "Usar la bandeja de entrada"),
        ("p", "Asana tiene una bandeja de entrada donde llegan todas las notificaciones: tareas asignadas, comentarios y cambios de estado. Como PM, revisala al inicio y al cierre de cada jornada."),
        ("h3", "Configurar notificaciones"),
        ("p", "Por defecto, Asana envía muchas notificaciones por email. Ajustá esto desde Configuración → Notificaciones y activá solo las que realmente importan."),
    ]),
    ("5. Seguimiento y reportes", [
        ("h3", "Estado del proyecto"),
        ("p", "Desde la pestaña 'Resumen' del proyecto, podés publicar un estado semanal con semáforo (en camino, en riesgo, retrasado) y un comentario breve. Esto reemplaza el típico email de estado semanal."),
        ("h3", "Progreso de tareas"),
        ("p", "La vista de lista muestra de forma inmediata cuántas tareas están completadas, en progreso o vencidas. Como PM, prestá especial atención a las tareas vencidas."),
        ("h3", "Portfolios (plan premium)"),
        ("p", "Si gestionás múltiples proyectos simultáneamente, los portfolios de Asana permiten ver el estado de todos en una sola pantalla."),
    ]),
    ("6. Funciones avanzadas útiles para PMs", [
        ("h3", "Subtareas"),
        ("p", "Una tarea puede contener subtareas. Útil cuando una actividad tiene pasos internos que también necesitan responsable y fecha."),
        ("h3", "Dependencias"),
        ("p", "Podés marcar que una tarea depende de otra: la tarea B no puede empezar hasta que la tarea A esté completada."),
        ("h3", "Plantillas"),
        ("p", "Si gestionás proyectos similares de forma recurrente, podés guardar un proyecto como plantilla y reutilizarlo."),
        ("h3", "Reglas de automatización"),
        ("p", "Asana permite crear reglas simples del tipo 'cuando pase X, hacer Y'. Estas automatizaciones reducen el trabajo manual del equipo."),
    ]),
    ("7. Errores frecuentes y cómo evitarlos", [
        ("h3", "Sobrecomplicar la estructura desde el inicio"),
        ("p", "Empezá simple: un proyecto, tareas con responsable y fecha. Complejizá solo cuando lo necesites."),
        ("h3", "No mantener las tareas actualizadas"),
        ("p", "Asana pierde todo su valor si las tareas no se actualizan. La disciplina de actualización es más importante que la configuración perfecta."),
        ("h3", "Usar Asana en paralelo con otros sistemas"),
        ("p", "La implementación exitosa requiere una decisión clara: Asana es el sistema único de gestión de trabajo."),
        ("h3", "No asignar responsable a cada tarea"),
        ("p", "Una tarea sin responsable no existe. Antes de cerrar la sesión de planificación, cada tarea debe tener nombre y apellido."),
        ("h3", "Ignorar las tareas vencidas"),
        ("p", "Las tareas vencidas son una señal de alerta que requiere acción inmediata: reasignar, replantear el plazo o escalar."),
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