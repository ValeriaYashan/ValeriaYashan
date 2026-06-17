from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

OUTPUT = "public/recursos/guia-monday-pm.pdf"

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
story.append(Paragraph("Monday para Project Managers", estilo_titulo))
story.append(Paragraph("Guía práctica para configurar y usar Monday.com en la gestión de proyectos reales. Con foco en el sistema de columnas, los dashboards y las automatizaciones.", estilo_lead))
story.append(Paragraph("Nivel: inicial · Herramienta: Monday.com (plan gratuito) · Autora: Valeria Yashan", estilo_meta))
story.append(HRFlowable(width="100%", thickness=1, color=BORDE, spaceAfter=20))

secciones = [
    ("1. Qué es Monday y para qué sirve en gestión de proyectos", [
        ("p", "Monday.com es una plataforma de gestión del trabajo que combina la flexibilidad de una hoja de cálculo con la potencia de una herramienta de gestión de proyectos."),
        ("p", "Para un Project Manager, Monday es especialmente útil cuando necesitás una herramienta que el equipo adopte rápido sin capacitación técnica, y que al mismo tiempo ofrezca dashboards y automatizaciones para el seguimiento ejecutivo."),
        ("h3", "¿Para qué tipo de organizaciones es ideal?"),
        ("li", "Equipos medianos de 10 a 50 personas que gestionan múltiples proyectos simultáneos."),
        ("li", "Organizaciones que necesitan visibilidad transversal entre departamentos."),
        ("li", "Proyectos con flujos de trabajo repetitivos que se benefician de automatizaciones."),
        ("li", "Equipos que necesitan reportes ejecutivos sin armar presentaciones manuales."),
        ("h3", "¿Cómo se diferencia de las otras herramientas?"),
        ("li", "vs Trello: Monday es más potente y flexible, pero más complejo."),
        ("li", "vs Asana: Monday tiene una interfaz más visual y colorida."),
        ("li", "vs ClickUp: Monday es más fácil de adoptar pero menos personalizable."),
        ("nota", "Nota sobre el plan gratuito: El plan gratuito de Monday.com permite hasta 2 usuarios. Para equipos más grandes, el plan básico de pago es necesario."),
    ]),
    ("2. Conceptos clave: Boards, Groups e Items", [
        ("h3", "Board (Tablero)"),
        ("p", "Un Board es el espacio de trabajo principal. Equivale a un proyecto en Asana. Ejemplo: 'Lanzamiento de producto Q3 2026' es un Board."),
        ("h3", "Group (Grupo)"),
        ("p", "Un Group es una agrupación de Items dentro de un Board. Puede representar una fase del proyecto, una semana de trabajo o un departamento. Ejemplo: 'Fase 1 — Planificación', 'Fase 2 — Ejecución'."),
        ("h3", "Item (Elemento)"),
        ("p", "Un Item es la unidad de trabajo. Equivale a una tarea en Asana o una Card en Trello. Cada Item tiene columnas con información específica: responsable, fecha, estado y prioridad."),
        ("nota", "La diferencia clave: En Monday, la información de cada Item se organiza en columnas, como en una hoja de cálculo. Esto hace que la vista de un Board sea más densa en información pero también más poderosa para el seguimiento."),
    ]),
    ("3. Configuración inicial y primer Board", [
        ("h3", "Crear la cuenta"),
        ("li", "Ingresá a monday.com y hacé clic en 'Empezar gratis'."),
        ("li", "Registrate con tu email profesional o con Google."),
        ("li", "Completá el nombre de tu organización y la cantidad de personas en tu equipo."),
        ("li", "Elegí 'Gestión de proyectos' cuando Monday te pregunte para qué lo vas a usar."),
        ("h3", "Crear el primer Board"),
        ("li", "Desde una plantilla: Monday tiene cientos de plantillas. Para PM, las más útiles son 'Project Tracker', 'Sprint Planning' y 'Campaign Management'."),
        ("li", "Desde cero: empezás con un Board vacío y configurás las columnas según las necesidades de tu proyecto."),
        ("h3", "Invitar al equipo"),
        ("li", "Desde el panel lateral, hacé clic en 'Invitar miembros'."),
        ("li", "Ingresá los emails de los miembros del equipo."),
        ("li", "Asigná el rol: Admin, Miembro o Espectador."),
        ("nota", "Recomendación: Empezá desde una plantilla en lugar de desde cero. Las plantillas de Monday están bien diseñadas y te ahorran tiempo de configuración."),
    ]),
    ("4. El sistema de columnas", [
        ("p", "El sistema de columnas es la funcionalidad más poderosa y diferenciadora de Monday. A diferencia de Asana o Trello, toda la información está visible directamente en el Board, organizada en columnas."),
        ("h3", "Columnas predeterminadas"),
        ("li", "Item: el nombre de la tarea. Es la única columna que no se puede eliminar."),
        ("li", "Persona: el responsable asignado."),
        ("li", "Estado: el estado actual de la tarea (configurable)."),
        ("li", "Fecha: la fecha límite."),
        ("h3", "Tipos de columnas más útiles para PM"),
        ("li", "Estado: columna de semáforo personalizable con colores propios."),
        ("li", "Prioridad: nivel de prioridad (crítica, alta, media, baja)."),
        ("li", "Números: para registrar horas, presupuesto o cualquier valor numérico."),
        ("li", "Dependencia: marca que un Item depende de otro para poder iniciarse."),
        ("li", "Progreso: barra de progreso calculada a partir de subtareas o valores manuales."),
        ("nota", "Regla de diseño: Menos columnas es mejor. Empezá con Estado, Persona, Fecha y Prioridad. Un Board con 15 columnas es difícil de leer y de mantener actualizado."),
    ]),
    ("5. Gestión del día a día", [
        ("h3", "Actualizar Items"),
        ("p", "Cada miembro del equipo debe actualizar el estado de sus Items al menos una vez por día. El cambio de estado es visual e inmediato: hacé clic en la celda y elegí el nuevo estado."),
        ("h3", "Vistas disponibles"),
        ("li", "Tabla: la vista por defecto, similar a una hoja de cálculo."),
        ("li", "Kanban: vista de tablero por columnas de estado."),
        ("li", "Gantt: vista de cronograma con dependencias y fechas."),
        ("li", "Calendario: vista mensual de fechas límite."),
        ("h3", "Filtros y agrupaciones"),
        ("p", "Podés filtrar el Board para ver solo las tareas asignadas a una persona, solo las tareas vencidas, o solo las tareas de una fase específica."),
        ("h3", "Mi trabajo (My Work)"),
        ("p", "Monday tiene una vista personal 'Mi trabajo' que muestra todos los Items asignados a vos en todos los Boards. Es el punto de partida recomendado para cada jornada."),
    ]),
    ("6. Dashboards y automatizaciones", [
        ("h3", "Dashboards"),
        ("p", "Los Dashboards de Monday permiten crear vistas con widgets que consolidan información de múltiples Boards en una sola pantalla."),
        ("li", "Gráfico de batería: muestra el porcentaje de tareas completadas vs pendientes."),
        ("li", "Carga de trabajo: muestra cuántas tareas tiene asignada cada persona."),
        ("li", "Cronograma: vista Gantt de múltiples proyectos simultáneos."),
        ("li", "Números: muestra totales calculados (horas, presupuesto, cantidad de tareas)."),
        ("h3", "Automatizaciones más útiles para PMs"),
        ("li", "Cuando el estado cambia a 'Completado' → notificar al PM."),
        ("li", "Cuando la fecha límite llega sin completar → cambiar estado a 'Atrasado'."),
        ("li", "Cuando se crea un Item → asignar automáticamente a un responsable."),
        ("li", "Cada lunes → enviar resumen de tareas pendientes al equipo."),
        ("nota", "Consejo: Empezá con la automatización de fechas vencidas. Es la más simple y la que más valor aporta desde el primer día."),
    ]),
    ("7. Errores frecuentes y cómo evitarlos", [
        ("h3", "Agregar demasiadas columnas desde el inicio"),
        ("p", "Empezá con cuatro columnas y agregá más solo cuando el equipo las necesite."),
        ("h3", "No definir los estados personalizados"),
        ("p", "Dedicá 15 minutos a definir los estados que representan exactamente el flujo de trabajo de tu proyecto antes de empezar."),
        ("h3", "Crear un Board por cada tema en lugar de usar Groups"),
        ("p", "Usá Groups dentro de un mismo Board para separar fases o categorías, y reservá Boards distintos para proyectos realmente independientes."),
        ("h3", "No capacitar al equipo en la lógica de columnas"),
        ("p", "Antes de invitar al equipo, prepará una guía de 5 minutos que explique qué significa cada columna y cómo actualizar el estado de un Item."),
        ("h3", "Usar Monday solo como lista de tareas"),
        ("p", "Si el equipo lo usa solo para registrar tareas sin aprovechar los Dashboards y las automatizaciones, están usando la herramienta al 20% de su capacidad."),
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