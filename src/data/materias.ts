export const materias = [
  {
    slug: 'costos',
    nombre: 'Costos para la Toma de Decisiones',
    corto: 'Costos',
    universidad: 'Universidad de San Isidro (USI)',
    descripcion:
      'Costos como herramienta de decisión: clasificación de costos, contribución marginal, punto de equilibrio, CVU, costeo ABC, presupuestos y Balanced Scorecard.',
    docentes: {
      intro:
        'La materia se apoya en tres actividades formativas, no calificables, que recorren el ciclo completo de la decisión basada en costos: cuánto cuesta, qué conviene decidir, cómo planifico, cómo controlo y cómo aseguro la calidad. Están pensadas como una ruta: se practica una herramienta, se integra en un caso y se cierra con una autoevaluación.',
      actividades: [
        { nombre: 'Calculadora de punto de equilibrio', objetivo: 'Practicar la relación entre precio, costo variable, costos fijos y volumen, y ver cómo cada variable mueve el equilibrio.' },
        { nombre: 'Del Norte S.A.: semana de decisiones', objetivo: 'Integrar las herramientas de las Unidades 1 y 2 en cinco decisiones de gestión, trabajando en equipo.' },
        { nombre: 'Misión Mermeladas del Delta', objetivo: 'Autoevaluar las cinco unidades en un único caso, con retroalimentación inmediata y un plan de repaso que señala qué clase releer.' },
      ],
      uso:
        'Se usan de forma autónoma, en celular o computadora, o en clase con un solo dispositivo y proyector, con equipos de 2 a 5 personas que se turnan. No requieren instalación ni cuenta, no envían datos de los estudiantes y el avance se guarda solo en el dispositivo.',
    },
  },
  {
    slug: 'adm-estrategica',
    nombre: 'Administración Estratégica',
    corto: 'Adm. Estratégica',
    universidad: 'Universidad de San Isidro (USI)',
    descripcion:
      'Administración estratégica como juego de decisiones: diagnóstico del entorno con las 5 Fuerzas de Porter, trabajo en equipo, evidencia del caso y síntesis estratégica.',
    docentes: {
      intro:
        'La materia recorre el camino completo de la estrategia: diagnosticar el entorno y la empresa, formular opciones, decidir y poner el plan en marcha. La actividad publicada trabaja la primera herramienta del diagnóstico competitivo, las 5 Fuerzas de Porter, con una dinámica de equipo pensada para ser jugada y no solo completada.',
      actividades: [
        { nombre: 'Caso PedidosYa: el juego de las 5 Fuerzas de Porter', objetivo: 'Ubicar evidencia en la fuerza correcta, distinguir qué dato pertenece a Porter y cuál a otra herramienta, calificar la intensidad de cada fuerza y concluir sobre el atractivo del sector. Equipos de 3 a 5 personas, 60 minutos, mazo de 30 cartas (9 trampa). Entregan una tabla de síntesis, una hipótesis verificable, un trade-off explícito y la respuesta a una pregunta obligatoria sobre el grupo más afectado. Se autoevalúan con una rúbrica de 100 puntos incluida en el tablero.' },
      ],
      uso:
        'Se usa en clase con proyector o de forma remota, en el navegador y sin instalar nada. Los participantes pueden sumarse desde el celular o la computadora, y el tablero admite votación, cronómetro y ruleta de roles.',
    },
  },
  {
    slug: 'egci-pm',
    nombre: 'EGCI Máster en Project Management',
    corto: 'EGCI Máster PM',
    universidad: 'EGCI Escuela de Gerencia',
    descripcion:
      'Máster en Project Management de EGCI Escuela de Gerencia: material de cátedra, clases y herramientas para la gestión profesional de proyectos con PMBOK® 8.',
  },
] as const;

export type MateriaSlug = (typeof materias)[number]['slug'];