export const materias = [
  {
    slug: 'costos',
    nombre: 'Costos para la Toma de Decisiones',
    corto: 'Costos',
    universidad: 'Universidad de San Isidro (USI)',
    descripcion:
      'Costos como herramienta de decisión: clasificación de costos, contribución marginal, punto de equilibrio, CVU, costeo ABC, presupuestos y Balanced Scorecard.',
  },
  {
    slug: 'adm-estrategica',
    nombre: 'Administración Estratégica',
    corto: 'Adm. Estratégica',
    universidad: 'Universidad de San Isidro (USI)',
    descripcion:
      'Análisis del entorno, formulación e implementación de estrategia, ventaja competitiva y control de gestión en organizaciones.',
  },
] as const;

export type MateriaSlug = (typeof materias)[number]['slug'];
