---
title: "Dashboard de KPIs en Excel: cómo armarlo y plantilla demo"
description: "Cómo armar un dashboard de KPIs en Excel paso a paso: metas, semáforo, filtros y fórmulas. Bajá el demo sin macros, con datos de ejemplo y fórmulas a la vista."
pubDate: "2026-07-29"
category: "Herramientas"
tags: ["Excel", "Indicadores", "Dashboards", "Procesos"]
---

Un pedido que veo repetido con la misma redacción: "necesito un dashboard de KPIs en Excel, dinámico y visualmente atractivo". El adjetivo del final es el que hunde la mitad de los tableros que se construyen.

Porque un panel no fracasa por ser feo. Fracasa cuando muestra veinte números y ninguno responde una pregunta.

## Qué es un dashboard de KPIs en Excel

Un dashboard de KPIs en Excel es un tablero que muestra pocos indicadores, cada uno con su meta y su semáforo, y que se actualiza pegando datos nuevos. Si al mirarlo no sabés qué cambiar mañana, no es un dashboard: es un reporte con colores. Más abajo está el paso a paso para armarlo, una tabla de ejemplos de indicadores y el demo para descargar.

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

**Datos separados del panel.** La base vive en su propia hoja y se actualiza pegando filas nuevas, sin reescribir ninguna fórmula (si la base supera el rango del demo, alcanza con extenderlo una vez). En el momento en que mantener el tablero requiere que lo mantenga quien lo construyó, el tablero tiene fecha de vencimiento — y suele ser el mes en que esa persona cambia de proyecto.

Esa misma lógica de separar la base de la capa de cálculo es la que sostiene sistemas más grandes en Excel; la conté en detalle en [un sistema de gestión en Excel que no se rompe al mes](/blog/sistema-de-gestion-en-excel-para-pymes).

## Cómo armarlo paso a paso en Excel

Estos pasos siguen la estructura del demo descargable (hojas Dashboard, Datos y Calculos). Las columnas de la hoja Datos son: ID, Fecha, Mes, Zona, Canal, Producto, Unidades, Ventas, Costo y Meta.

### Paso 1. Escribí la decisión de cada indicador

Una frase por KPI: "si baja de la meta, hago X". Si no hay X, ese indicador va a la hoja de detalle y no al panel.

### Paso 2. Armá la hoja de datos con una fila por registro

Una fila por venta u operación y una columna por dato. En el demo la base llega hasta la fila 55 y las fórmulas usan ese rango fijo: si cargás más filas, hay que extender los rangos una vez. Si armás tu propio tablero, convertir la base en tabla (Ctrl+T) evita ese paso, porque las fórmulas crecen con los datos.

### Paso 3. Creá los dos filtros

En el Dashboard, dos celdas con lista desplegable: Mes (con la opción TODOS) y Zona (con la opción TODAS). En el demo están en C5 y F5. Todo el panel lee de esas dos celdas.

### Paso 4. Calculá las tarjetas con el filtro aplicado

La idea es que cada fórmula respete los dos filtros a la vez. En el demo, las ventas filtradas son:

`=SUMPRODUCT(((Datos!$C$2:$C$55=Dashboard!$C$5)+(Dashboard!$C$5="TODOS")>0)*((Datos!$D$2:$D$55=Dashboard!$F$5)+(Dashboard!$F$5="TODAS")>0)*Datos!$H$2:$H$55)`

Las otras tarjetas reutilizan el mismo filtro y cambian la columna que suman:

- Margen bruto: (ventas − costo) ÷ ventas, con la columna Costo (I) y la columna Ventas (H).
- Cumplimiento de meta: ventas ÷ meta, con la columna Meta (J). Si la meta filtrada es cero, el demo muestra "Sin meta cargada" en lugar de un error.
- Ticket promedio: ventas ÷ unidades, con la columna Unidades (G).

### Paso 5. Traducí el cumplimiento a un semáforo

Verde si el cumplimiento llega al 100 % o más, amarillo entre el 90 % y el 100 %, rojo por debajo del 90 %. En el demo el estado sale de una fórmula con SI anidados y el color de un formato condicional, no de colores puestos a mano.

### Paso 6. Armá los gráficos desde la hoja de cálculos

Los gráficos leen de la hoja Calculos, que aplica los mismos filtros, y no de la hoja Datos. Después probá: cambiá el mes y la zona, y si algún gráfico no se mueve, está mal enlazado.

## Ejemplos de KPIs para tu dashboard

Los tres primeros son los del demo. Los demás son ejemplos de cálculo: cada organización define sus propias metas y definiciones.

| Área | KPI | Cómo se calcula | Decisión que habilita |
|---|---|---|---|
| Ventas | Cumplimiento de meta | Ventas del período ÷ meta | Reforzar zonas o canales que quedan por debajo |
| Ventas | Ticket promedio | Ventas ÷ unidades | Ajustar ofertas o combos |
| Rentabilidad | Margen bruto | (Ventas − costo) ÷ ventas | Revisar precios o costos por zona |
| Proyectos | Avance real vs. planificado | % real ÷ % planificado | Actuar sobre un desvío antes del cierre |
| Calidad | Tasa de no conformidades | No conformidades ÷ total de unidades o servicios | Priorizar acciones correctivas |
| Mantenimiento | Cumplimiento del plan | Órdenes cerradas a tiempo ÷ órdenes planificadas | Reasignar recursos |

## ¿Cuándo conviene pasar a Power BI?

Excel alcanza cuando una sola persona mantiene el tablero, hay una única fuente de datos y pocas personas lo consultan. Conviene pasar a Power BI cuando hay varias fuentes de datos, varios proyectos o muchas personas consultando, o cuando armar el tablero a mano consume horas cada semana.

Para ver el recorrido completo, está la [guía de Power BI para Project Managers](/herramientas/power-bi/) y el servicio de [control de proyectos con Power BI](/servicios/control-de-proyectos-power-bi/).

## Lo que sí importa del diseño

Que se lea en una pantalla sin scroll. Que los números importantes sean los más grandes. Que el color signifique algo en lugar de decorar.

Eso es "visualmente atractivo" en un tablero de gestión. Todo lo demás es ruido con degradado.

## Descargá el demo

Podés bajar el archivo completo y abrirlo por dentro: las cuatro tarjetas, los tres gráficos, el semáforo y las fórmulas sin proteger.

**[⬇ Descargar el demo en Excel](/descargas/dashboard-kpis-demo.xlsx)** — sin macros, funciona en cualquier versión de Excel.

Los datos son ficticios. La estructura es la real: cuatro hojas (Dashboard, Datos, Cálculos, Cómo se usa) y una hoja de instrucciones de cinco pasos.

## Preguntas frecuentes

### ¿Cuántos KPIs debería tener un dashboard en Excel?

Pocos. El demo tiene cuatro. Si un indicador no cambia ninguna decisión, va a una hoja de detalle y no al panel principal.

### ¿Hace falta usar macros?

No. Sin macros el archivo funciona en otras PC, en Excel online y en el celular.

### ¿Cómo se actualiza el dashboard?

Pegando los datos nuevos en la hoja Datos, que está separada del panel. En el demo los rangos llegan hasta la fila 55: con más filas hay que extenderlos una vez.

### ¿El demo sirve con mis datos?

Sí. Reemplazás los datos de ejemplo por los tuyos y ajustás metas y definiciones a tu organización.

### ¿Qué es un semáforo de KPI?

Un indicador con tres estados según el cumplimiento de la meta: verde, amarillo y rojo.

<script type="application/ld+json">{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "¿Cuántos KPIs debería tener un dashboard en Excel?", "acceptedAnswer": {"@type": "Answer", "text": "Pocos. El demo tiene cuatro. Si un indicador no cambia ninguna decisión, va a una hoja de detalle y no al panel principal."}}, {"@type": "Question", "name": "¿Hace falta usar macros?", "acceptedAnswer": {"@type": "Answer", "text": "No. Sin macros el archivo funciona en otras PC, en Excel online y en el celular."}}, {"@type": "Question", "name": "¿Cómo se actualiza el dashboard?", "acceptedAnswer": {"@type": "Answer", "text": "Pegando los datos nuevos en la hoja Datos, que está separada del panel. En el demo los rangos llegan hasta la fila 55: con más filas hay que extenderlos una vez."}}, {"@type": "Question", "name": "¿El demo sirve con mis datos?", "acceptedAnswer": {"@type": "Answer", "text": "Sí. Reemplazás los datos de ejemplo por los tuyos y ajustás metas y definiciones a tu organización."}}, {"@type": "Question", "name": "¿Qué es un semáforo de KPI?", "acceptedAnswer": {"@type": "Answer", "text": "Un indicador con tres estados según el cumplimiento de la meta: verde, amarillo y rojo."}}]}</script>

## Para llevar

1. **Antes de elegir los gráficos, definí las decisiones.** Un indicador que no cambia ninguna decisión no va en el panel principal.
2. **Ningún número solo.** Meta, período anterior o promedio: sin referencia, el indicador describe pero no informa.
3. **Si el tablero solo lo puede mantener quien lo hizo, ya está roto.** El mantenimiento se diseña al mismo tiempo que el panel, no después.

---

**¿Necesitás un tablero de indicadores para tu equipo o tu negocio?**

Si Excel ya se te quedó corto (varias fuentes de datos, varios proyectos o mucha gente consultando el tablero), mirá el servicio de [control de proyectos con Power BI](/servicios/control-de-proyectos-power-bi/).

Escribime a [hola@valeriayashan.com.ar](mailto:hola@valeriayashan.com.ar) o por [WhatsApp](https://wa.me/5491140791007). En una llamada de 15 minutos definimos qué decisiones tiene que habilitar el panel — que es la parte que después no se puede corregir con diseño.

---

Cada semana escribo sobre gestión de proyectos, procesos e indicadores en mi newsletter: [suscribite en Substack](https://valeriayashanpm.substack.com). Y si preferís verlo en video, publico en [YouTube @ValeriaYashanPM](https://www.youtube.com/@ValeriaYashanPM).
