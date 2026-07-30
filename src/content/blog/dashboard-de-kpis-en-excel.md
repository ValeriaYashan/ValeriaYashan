---
title: "Dashboard de KPIs en Excel: qué lo hace útil"
description: "Qué separa un dashboard de KPIs en Excel de un reporte con colores: la meta, la cantidad de indicadores y el mantenimiento. Con un demo descargable."
pubDate: "2026-07-29"
category: "Herramientas"
tags: ["Excel", "Indicadores", "Dashboards", "Procesos"]
---

Un pedido que veo repetido con la misma redacción: "necesito un dashboard de KPIs en Excel, dinámico y visualmente atractivo". El adjetivo del final es el que hunde la mitad de los tableros que se construyen.

Porque un panel no fracasa por ser feo. Fracasa cuando muestra veinte números y ninguno responde una pregunta.

## La prueba de fuego

Mirás el tablero treinta segundos. ¿Sabés qué tenés que hacer distinto mañana?

Si la respuesta es no, no es un dashboard. Es un reporte con colores.

Y esa parte no se resuelve con diseño. Se resuelve antes de abrir Excel, definiendo qué decisión tiene que habilitar cada número. Es el mismo criterio que aplico antes de automatizar cualquier proceso, y lo desarrollo en [cómo mapear un proceso antes de automatizarlo](/blog/como-mapear-un-proceso-antes-de-automatizarlo).

## Un indicador sin meta es decoración

Este es el agujero más común, y es el más fácil de tapar con diseño.

Podés medir las ventas del mes con seis decimales, ponerlas en una tarjeta enorme, con tipografía impecable y un ícono al costado. Y seguir sin saber si el mes fue bueno.

Sin referencia, un número no informa: describe. La referencia puede ser una meta, el mismo mes del año anterior, o el promedio de los últimos seis. Lo que no puede es faltar.

En el demo que armé, el cumplimiento de meta se traduce en un semáforo de tres estados:

- **Verde** — arriba del 100 %
- **Amarillo** — entre el 90 % y el 100 %
- **Rojo** — abajo del 90 %

El semáforo no es cosmético. Es lo que fuerza la conversación que nadie quiere tener: definir la meta. Mientras el tablero solo muestre ventas, todos los meses son discutibles.

## Cuatro indicadores, no veinte

El demo tiene cuatro tarjetas: ventas, margen bruto, cumplimiento de meta y ticket promedio.

Cada una con una línea de texto abajo que aclara qué mide, porque "margen" significa cosas distintas según quién lo lea — y si dos personas leen el mismo número con definiciones distintas, el tablero está generando desacuerdos en lugar de resolverlos.

La tentación siempre es agregar. Si el negocio mide algo, alguien quiere verlo en el panel. El resultado es una pantalla donde todo compite por atención y nada la gana.

Regla práctica: si un indicador no cambia ninguna decisión, no va en el tablero principal. Va en una hoja de detalle, disponible para quien lo busque.

## Filtros: uno controla todo o no sirve

El demo tiene dos desplegables, mes y zona, y controlan el panel completo. Cambiás uno y las cuatro tarjetas, los tres gráficos y el semáforo se recalculan juntos.

Eso parece obvio hasta que ves tableros donde cada gráfico tiene su propio filtro. Ahí aparece el estado peor que no tener filtros: la mitad del panel mirando un período y la otra mitad mirando otro, sin ninguna señal visible de que eso está pasando.

Los tres gráficos, cada uno con una función distinta:

- **Ventas vs. meta por mes** → la tendencia y el tamaño del desvío
- **Ventas por canal** → dónde se concentra la facturación
- **Margen bruto por zona** → dónde se pierde la rentabilidad

El tercero es el que suele incomodar. La zona que más vende casi nunca es la que más deja.

## Dos decisiones que nadie pide y todos necesitan

**Sin macros.** Un archivo con macros se rompe al abrirse en otra PC, en Excel online o en el celular. El panel deja de existir justo cuando alguien lo necesita proyectado en una reunión. Todo con fórmulas nativas: SUMPRODUCT para los filtros cruzados, formato condicional para el semáforo.

**Datos separados del panel.** La base vive en su propia hoja y se actualiza pegando filas nuevas, sin tocar una fórmula. En el momento en que mantener el tablero requiere que lo mantenga quien lo construyó, el tablero tiene fecha de vencimiento — y suele ser el mes en que esa persona cambia de proyecto.

Esa misma lógica de separar la base de la capa de cálculo es la que sostiene sistemas más grandes en Excel; la conté en detalle en [un sistema de gestión en Excel que no se rompe al mes](/blog/sistema-de-gestion-en-excel-para-pymes).

## Lo que sí importa del diseño

Que se lea en una pantalla sin scroll. Que los números importantes sean los más grandes. Que el color signifique algo en lugar de decorar.

Eso es "visualmente atractivo" en un tablero de gestión. Todo lo demás es ruido con degradado.

## Descargá el demo

Podés bajar el archivo completo y abrirlo por dentro: las cuatro tarjetas, los tres gráficos, el semáforo y las fórmulas sin proteger.

**[⬇ Descargar el demo en Excel](/descargas/dashboard-kpis-demo.xlsx)** — sin macros, funciona en cualquier versión de Excel.

Los datos son ficticios. La estructura es la real: cuatro hojas (Dashboard, Datos, Cálculos, Cómo se usa) y una hoja de instrucciones de cinco pasos.

## Para llevar

1. **Antes de elegir los gráficos, definí las decisiones.** Un indicador que no cambia ninguna decisión no va en el panel principal.
2. **Ningún número solo.** Meta, período anterior o promedio: sin referencia, el indicador describe pero no informa.
3. **Si el tablero solo lo puede mantener quien lo hizo, ya está roto.** El mantenimiento se diseña al mismo tiempo que el panel, no después.

---

**¿Necesitás un tablero de indicadores para tu equipo o tu negocio?**

Escribime a [hola@valeriayashan.com.ar](mailto:hola@valeriayashan.com.ar) o por [WhatsApp](https://wa.me/5491140791007). En una llamada de 15 minutos definimos qué decisiones tiene que habilitar el panel — que es la parte que después no se puede corregir con diseño.

---

Cada semana escribo sobre gestión de proyectos, procesos e indicadores en mi newsletter: [suscribite en Substack](https://valeriayashanpm.substack.com). Y si preferís verlo en video, publico en [YouTube @ValeriaYashanPM](https://www.youtube.com/@ValeriaYashanPM).
