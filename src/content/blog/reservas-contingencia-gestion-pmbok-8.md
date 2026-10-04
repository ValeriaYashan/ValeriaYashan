---
title: "Reservas de contingencia y de gestión en PMBOK® 8"
description: "Los dos escenarios de PMBOK® 8 para reservas de contingencia y de gestión, con ejemplo numérico, gráfico comparativo y modelo de sección del Project Charter."
pubDate: "2026-10-04"
category: "Project Management"
tags: ["PMBOK", "Reservas", "Presupuesto", "Project Charter", "Costos"]
---

<style>
.art-res{--c-est:#3e5568;--c-cont:#2D6A4F;--c-gest:#b8710f;--rule:var(--color-border);--muted:var(--color-muted);--fg:var(--color-text);--panel:var(--color-surface);--paper:#fff;--on-est:#fff}
.art-res p{margin:0 0 1.1rem}
.art-res figure{margin:2rem 0}
.art-res .fig-scroll{overflow-x:auto;background:var(--panel);border-radius:6px;padding:14px 10px 6px}
.art-res .fig-scroll svg{display:block;width:100%;min-width:640px;height:auto}
.art-res figcaption{font-size:.9rem;color:var(--muted);margin-top:.6rem}
.art-res svg text{font-family:var(--font-body);fill:var(--fg);font-size:13px}
.art-res svg .t-muted{fill:var(--muted)}
.art-res svg .t-head{font-weight:600;font-size:14px}
.art-res svg .t-num{font-family:ui-monospace,Menlo,Consolas,monospace}
.art-res svg .t-on-est{fill:var(--on-est);font-weight:500}
.art-res svg .seg-est{fill:var(--c-est)}
.art-res svg .seg-cont{fill:var(--c-cont)}
.art-res svg .seg-gest{fill:var(--c-gest)}
.art-res svg .t-cont{fill:var(--c-cont);font-weight:600}
.art-res svg .t-gest{fill:var(--c-gest);font-weight:600}
.art-res svg .brk{stroke:var(--fg);stroke-width:1.4;fill:none}
.art-res svg .lead{stroke:var(--muted);stroke-width:1;fill:none}
.art-res svg .sep{stroke:var(--rule);stroke-width:1}
.art-res .legend{display:flex;flex-wrap:wrap;gap:6px 22px;margin:0 0 12px;font-size:.88rem;color:var(--muted)}
.art-res .legend span{display:inline-flex;align-items:center;gap:8px}
.art-res .sw{width:12px;height:12px;border-radius:2px;display:inline-block;flex:none}
.art-res .sw.est{background:var(--c-est)}
.art-res .sw.cont{background:var(--c-cont)}
.art-res .sw.gest{background:var(--c-gest)}
.art-res .table-wrap{overflow-x:auto;margin:1.4rem 0}
.art-res table{border-collapse:collapse;width:100%;min-width:520px;font-size:.95rem}
.art-res th,.art-res td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--rule);vertical-align:top}
.art-res th{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:600}
.art-res td.n,.art-res th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.art-res tr.strong td{font-weight:600}
.art-res tr.total td{border-bottom:2px solid var(--fg)}
.art-res .charter{background:var(--paper);border:1px solid var(--rule);border-radius:4px;padding:24px 22px 26px}
.art-res .ch-head{padding-bottom:14px;border-bottom:2px solid var(--fg);margin-bottom:4px}
.art-res .ch-head p{margin:0}
.art-res .ch-kicker{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.art-res .ch-title{font-family:var(--font-display);font-weight:600;font-size:1.3rem;line-height:1.3;margin-top:4px!important}
.art-res .ch-meta{font-size:.85rem;color:var(--muted);margin-top:6px!important}
.art-res .ch-block{padding-block:16px;border-bottom:1px solid var(--rule)}
.art-res .ch-block h3{font-family:var(--font-body);font-size:.8rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:0 0 10px}
.art-res .ch-block p{font-size:.95rem;line-height:1.55;margin:0}
.art-res .ch-total{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-weight:600;margin-bottom:8px}
.art-res .ch-total .num{font-size:1.25rem;font-variant-numeric:tabular-nums}
.art-res .ch-bar{display:flex;height:14px;border-radius:2px;overflow:hidden;margin-bottom:12px}
.art-res .ch-bar i{display:block;height:100%}
.art-res .ch-bar .est{background:var(--c-est)}
.art-res .ch-bar .cont{background:var(--c-cont)}
.art-res .ch-bar .gest{background:var(--c-gest)}
.art-res .ch-rows{margin:0}
.art-res .ch-rows>div{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:6px 0;font-size:.95rem}
.art-res .ch-rows dt{display:flex;align-items:baseline;gap:8px;margin:0;min-width:0}
.art-res .ch-rows dd{margin:0;font-variant-numeric:tabular-nums;white-space:nowrap}
.art-res .ch-rows .sub{border-top:1px dashed var(--rule);border-bottom:1px dashed var(--rule);font-weight:600;margin-block:2px}
.art-res .ch-scroll{overflow-x:auto}
.art-res .ch-table{min-width:480px;font-size:.9rem}
.art-res .ch-table th,.art-res .ch-table td{padding:8px 10px 8px 0}
.art-res .ch-sign{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:28px;padding-top:34px}
.art-res .ch-sign .line{display:block;border-bottom:1px solid var(--fg);height:1px}
.art-res .ch-sign p{margin:6px 0 0;font-size:.8rem;color:var(--muted)}
.art-res .fuente{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--rule);font-size:.88rem;color:var(--muted)}
</style>

<div class="art-res">

El Acta de Constitución del Proyecto (Project Charter) aprueba un presupuesto y, casi siempre, queda sin aclarar si las reservas están dentro de ese monto o por encima. [PMBOK® 8](/blog/pmbok-8-nuevo-examen-pmp-2026) reconoce que ambas formas son válidas y describe dos escenarios de acumulación del presupuesto. Entender la diferencia evita discusiones con el patrocinador y errores al medir el desempeño.

## Dos reservas con propósitos distintos

La reserva para contingencias es el tiempo o el dinero que se asigna en el cronograma o en la línea base de costos para riesgos conocidos, es decir, aquellos que ya están identificados y tienen una estrategia de respuesta activa. Si querés ver cómo se identifican y se planifican las respuestas, tenés [una guía sobre gestión de riesgos con IA](/blog/ia-para-gestionar-riesgos-proyectos).

La reserva de gestión es el tiempo o el dinero que la dirección separa además de la línea base, para trabajo imprevisto dentro del alcance. Se usa para riesgos desconocidos y no para riesgos específicos ya identificados, y normalmente queda a discreción de la alta dirección.

Según PMBOK 8, las dos se distinguen por su propósito y por la autoridad de uso.

## Lo que no cambia entre escenarios

La línea base de costos es la versión aprobada del presupuesto del proyecto por fases y excluye cualquier reserva de gestión. Solo se modifica mediante procedimientos formales de control de cambios y sirve como base de comparación con los resultados reales.

Con esa definición, la reserva de gestión nunca forma parte de la línea base. Lo que varía entre los dos escenarios es qué pasa con la contingencia y qué monto aparece como presupuesto inicial.

## Escenario 1, reservas dentro del presupuesto inicial

El presupuesto inicial contiene la suma de las estimaciones de costo de los paquetes de trabajo aprobados, más la reserva para contingencias, más la reserva de gestión. PMBOK 8 las describe como reservas gestionadas implícitamente: el monto aprobado ya las incluye.

La contingencia queda dentro de la línea base de costos y la reserva de gestión queda por encima de ella, dentro del presupuesto inicial. Es el caso que el texto presenta como habitual, porque la contingencia suele asignarse en el presupuesto inicial.

## Escenario 2, reservas administradas aparte

El presupuesto inicial contiene solo la suma de las estimaciones de costo aprobadas. La reserva para contingencias y la de gestión se gestionan explícitamente, como montos separados.

Acá la contingencia queda fuera del presupuesto inicial y de la línea base. PMBOK 8 atribuye esta variante a las preferencias de la organización o a factores externos.

<figure>
<div class="legend" aria-hidden="true">
<span><i class="sw est"></i>Estimaciones de los paquetes de trabajo</span>
<span><i class="sw cont"></i>Reserva para contingencias</span>
<span><i class="sw gest"></i>Reserva de gestión</span>
</div>
<div class="fig-scroll">
<svg viewBox="0 0 720 400" role="img" aria-label="Los mismos 1.000.000 de fondos totales presentados de dos maneras: en el escenario 1 el presupuesto inicial es 1.000.000 y la línea base 960.000; en el escenario 2 el presupuesto inicial es 900.000 y las reservas se administran aparte.">
<text class="t-head" x="20" y="22">Escenario 1, reservas gestionadas implícitamente</text>
<text class="t-muted" x="20" y="48">Presupuesto inicial</text>
<text class="t-num" x="680" y="48" text-anchor="end">1.000.000</text>
<path class="brk" d="M20 62 V55 H680 V62"/>
<text class="t-muted" x="20" y="80">Línea base de costos</text>
<text class="t-num" x="653.6" y="80" text-anchor="end">960.000</text>
<path class="brk" d="M20 94 V87 H653.6 V94"/>
<rect class="seg-est" x="20" y="102" width="594" height="40"/>
<rect class="seg-cont" x="614" y="102" width="39.6" height="40"/>
<rect class="seg-gest" x="653.6" y="102" width="26.4" height="40"/>
<text class="t-on-est" x="34" y="127">Estimaciones</text>
<text class="t-on-est t-num" x="602" y="127" text-anchor="end">900.000</text>
<path class="lead" d="M633.8 142 V154"/>
<text class="t-cont" x="640" y="168" text-anchor="end">Contingencia <tspan class="t-num">60.000</tspan></text>
<path class="lead" d="M667 142 V178"/>
<text class="t-gest" x="680" y="192" text-anchor="end">Reserva de gestión <tspan class="t-num">40.000</tspan></text>
<line class="sep" x1="20" y1="216" x2="700" y2="216"/>
<text class="t-head" x="20" y="244">Escenario 2, reservas gestionadas explícitamente</text>
<text class="t-muted" x="20" y="270">Presupuesto inicial y línea base</text>
<text class="t-num" x="560" y="270" text-anchor="end">900.000</text>
<path class="brk" d="M20 284 V277 H614 V284"/>
<text class="t-muted" x="700" y="270" text-anchor="end">Aparte <tspan class="t-num">100.000</tspan></text>
<path class="brk" d="M634 284 V277 H700 V284"/>
<rect class="seg-est" x="20" y="292" width="594" height="40"/>
<rect class="seg-cont" x="634" y="292" width="39.6" height="40"/>
<rect class="seg-gest" x="673.6" y="292" width="26.4" height="40"/>
<text class="t-on-est" x="34" y="317">Estimaciones</text>
<text class="t-on-est t-num" x="602" y="317" text-anchor="end">900.000</text>
<path class="lead" d="M653.8 332 V344"/>
<text class="t-cont" x="660" y="358" text-anchor="end">Contingencia <tspan class="t-num">60.000</tspan></text>
<path class="lead" d="M686.8 332 V368"/>
<text class="t-gest" x="700" y="382" text-anchor="end">Reserva de gestión <tspan class="t-num">40.000</tspan></text>
</svg>
</div>
<figcaption>Los fondos totales son 1.000.000 en ambos escenarios. En el primero, el monto aprobado es 1.000.000 y la línea base es 960.000. En el segundo, el monto aprobado es 900.000 y las reservas se administran aparte.</figcaption>
</figure>

## Un ejemplo con números

Supongamos un proyecto con estimaciones por 900.000, una contingencia de 60.000 y una reserva de gestión de 40.000. Los fondos totales son 1.000.000 en cualquiera de los dos escenarios. Cambian el monto que figura como presupuesto inicial y la línea base contra la que se mide el desempeño.

<div class="table-wrap">
<table>
<thead>
<tr><th>Concepto</th><th class="n">Escenario 1</th><th class="n">Escenario 2</th></tr>
</thead>
<tbody>
<tr><td>Estimaciones de los paquetes de trabajo</td><td class="n">900.000</td><td class="n">900.000</td></tr>
<tr><td>Reserva para contingencias</td><td class="n">60.000 (dentro)</td><td class="n">60.000 (aparte)</td></tr>
<tr><td>Reserva de gestión</td><td class="n">40.000 (dentro)</td><td class="n">40.000 (aparte)</td></tr>
<tr class="strong"><td>Presupuesto inicial</td><td class="n">1.000.000</td><td class="n">900.000</td></tr>
<tr class="strong"><td>Línea base de costos</td><td class="n">960.000</td><td class="n">900.000</td></tr>
<tr class="strong total"><td>Fondos totales a disponer</td><td class="n">1.000.000</td><td class="n">1.000.000</td></tr>
</tbody>
</table>
</div>

Durante la ejecución se materializa un riesgo identificado que cuesta 25.000. Ese gasto corresponde a la reserva para contingencias, que baja a 35.000. En el escenario 1 la línea base sigue en 960.000, porque la contingencia ya estaba dentro de ella. En el escenario 2 se descuenta de la reserva que se administra aparte y también queda en 35.000.

Más adelante aparece un requerimiento regulatorio que nadie había previsto y cuesta 30.000. No responde a un riesgo identificado, de modo que se cubre con la reserva de gestión, que queda en 10.000. Como la línea base solo cambia por control formal de cambios, en la práctica esto se tramita como una solicitud de cambio aprobada por quien tiene autoridad sobre esa reserva. En el escenario 1, una vez aprobado el cambio, la línea base pasa de 960.000 a 990.000.

En ambos escenarios los fondos totales se mantienen en 1.000.000: lo que se consumió salió de las reservas y no de un monto adicional.

## Qué conviene dejar escrito

El Acta de Constitución del Proyecto (Project Charter) o el plan de gestión financiera debería indicar qué escenario se aplica, qué monto aprueba el patrocinador (1.000.000 o 900.000 en el ejemplo), quién autoriza el uso de cada reserva y hasta qué umbral puede actuar el director del proyecto sin pedir aprobación.

Sin esa definición, dos personas pueden leer el mismo presupuesto y entender montos distintos. También conviene informar el seguimiento siempre contra la misma línea base y aclarar en cada reporte si la contingencia está dentro o fuera de ella.

## Cómo debería quedar en el Acta de Constitución del Proyecto

Una forma simple de evitar la ambigüedad es dedicar una sección del Acta de Constitución del Proyecto (Project Charter) al presupuesto y las reservas. El ejemplo siguiente aplica el escenario 1 con los mismos montos del caso anterior.

<figure>
<div class="charter" role="group" aria-label="Ejemplo de sección de presupuesto y reservas en un Acta de Constitución del Proyecto">
<div class="ch-head">
<p class="ch-kicker">Acta de Constitución del Proyecto (Project Charter)</p>
<p class="ch-title">Sección 6. Presupuesto y reservas aprobados</p>
<p class="ch-meta">Proyecto: [nombre del proyecto] · Moneda: USD · Escenario aplicado: 1, reservas dentro del presupuesto inicial</p>
</div>
<div class="ch-block">
<h3>6.1 Presupuesto inicial aprobado</h3>
<div class="ch-total"><span>Presupuesto inicial</span><span class="num">1.000.000</span></div>
<div class="ch-bar" aria-hidden="true"><i class="est" style="width:90%"></i><i class="cont" style="width:6%"></i><i class="gest" style="width:4%"></i></div>
<dl class="ch-rows">
<div><dt><i class="sw est"></i>Estimaciones de los paquetes de trabajo</dt><dd>900.000</dd></div>
<div><dt><i class="sw cont"></i>Reserva para contingencias</dt><dd>60.000</dd></div>
<div class="sub"><dt>Línea base de costos (estimaciones + contingencia)</dt><dd>960.000</dd></div>
<div><dt><i class="sw gest"></i>Reserva de gestión (fuera de la línea base)</dt><dd>40.000</dd></div>
</dl>
</div>
<div class="ch-block">
<h3>6.2 Autoridad de uso de las reservas</h3>
<div class="ch-scroll">
<table class="ch-table">
<thead><tr><th>Reserva</th><th>Se usa para</th><th>Autoriza</th></tr></thead>
<tbody>
<tr><td>Contingencia</td><td>Riesgos identificados en el registro de riesgos</td><td>Director del proyecto, hasta [umbral a definir]. Por encima del umbral, el Patrocinador.</td></tr>
<tr><td>Gestión</td><td>Trabajo imprevisto dentro del alcance</td><td>Patrocinador o alta dirección, mediante solicitud de cambio.</td></tr>
</tbody>
</table>
</div>
</div>
<div class="ch-block">
<h3>6.3 Control y seguimiento</h3>
<p>La línea base de costos solo se modifica mediante control formal de cambios. El desempeño se mide contra la línea base de 960.000, sin la reserva de gestión. Los informes de estado indican el saldo de cada reserva.</p>
</div>
<div class="ch-sign">
<div><span class="line"></span><p>Patrocinador · Fecha</p></div>
<div><span class="line"></span><p>Director del proyecto · Fecha</p></div>
</div>
</div>
<figcaption>Ejemplo ilustrativo de redacción, con montos inventados. Los datos entre corchetes los completa cada organización. Si se aplicara el escenario 2, el presupuesto inicial aprobado figuraría como 900.000 y las dos reservas aparecerían como líneas separadas, cada una con su propia autoridad de uso.</figcaption>
</figure>

<div class="fuente">

Fuente: PMBOK® Guide, 8.ª edición (PMI, 2025), sección 2.4 y Figura 2-25. El texto resume el contenido con palabras propias. Los montos del ejemplo son ilustrativos y no provienen de la guía.

</div>

</div>
