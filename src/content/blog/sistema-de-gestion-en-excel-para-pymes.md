---
title: "Un sistema de gestión en Excel que no se rompe al mes"
description: "Cómo se diseña un sistema de gestión en Excel para una PyME: la cadena insumo-receta-costo-precio-stock, la merma y las dos preguntas previas."
pubDate: "2026-07-29"
category: "Herramientas"
tags: ["Excel", "Costos", "PyMEs", "Procesos"]
---

Me llegó el pedido de un sistema de gestión en Excel para un emprendimiento de pastelería. Ocho hojas: configuración, insumos, recetas, productos, compras, pedidos, inventario y dashboard. La lista estaba bien pensada, con nombres claros y una idea razonable de qué tenía que hacer cada una.

Y aun así, ese tipo de archivo suele morir en el segundo mes.

No por falta de hojas. Por falta de cadena.

## El archivo no se rompe donde uno cree

Un negocio de tortas no se complica porque le falte una planilla. Se complica cuando no sabe cuánto cuesta realmente cada torta, y cuando descubre a mitad de un pedido que falta un insumo.

Las dos cosas dependen de la misma secuencia:

**insumo → receta → costo de producción → precio de venta → consumo de inventario**

Si esa cadena está construida con fórmulas reales, cambiar el precio del chocolate en una sola celda recalcula el costo de tres productos, el precio sugerido de cada uno, el margen del tablero y la alerta de reposición. Si no está construida, cada una de esas cosas es un número que alguien tipeó una vez.

Y ahí empieza el deterioro: la primera vez que un dato no cuadra, el dueño pega el valor correcto encima de la fórmula. La segunda vez, otro. Al mes, el archivo abre igual pero ya no es un sistema: es un cementerio de valores pegados que nadie se anima a tocar.

Este es el mismo criterio que aplico antes de automatizar cualquier cosa, y lo desarrollo en detalle en [cómo mapear un proceso antes de automatizarlo](/blog/como-mapear-un-proceso-antes-de-automatizarlo): la herramienta no arregla una lógica que nunca se definió.

## Las dos preguntas que cambian el diseño

Antes de escribir una fórmula hice dos preguntas. No son de trámite: cada una manda sobre una parte distinta del archivo.

**1. ¿El inventario se descuenta al confirmar el pedido o al producirlo?**

Si se descuenta al confirmar, el stock que muestra el sistema es stock comprometido: sirve para saber si podés aceptar el pedido del viernes, pero no coincide con lo que hay en la heladera hoy. Si se descuenta al producir, el stock es físico y real, pero podés vender algo que no tenés insumo para hacer.

No hay una respuesta correcta. Hay una respuesta que corresponde a cómo trabaja ese negocio. Lo que no se puede es elegir las dos, ni dejarlo sin decidir y ver qué pasa.

**2. ¿El costeo contempla merma?**

La masa que queda en el bowl, el huevo que se rompe, la porción que sale mal. Sin merma, el costo unitario queda subestimado entre un 3 % y un 8 %.

Ese error no se nota en la hoja de costos. Se nota en el dashboard, que muestra un margen más alto que el real, y en la decisión que se toma con ese margen: promocionar el producto equivocado.

## Qué hace visible un sistema bien armado

Armé un demo funcional antes de responder el pedido: las ocho hojas, con precios de referencia del mercado y 414 fórmulas activas. No una maqueta con capturas: el sistema andando, con datos que se pueden cambiar.

El resultado más interesante no fue una hoja linda. Fue un número incómodo.

Con un margen objetivo del 55 %, el cheesecake daba un margen real del 37 %. El precio sugerido por el sistema era S/ 109 y el precio que estaba cargado como precio de venta era S/ 78. La brecha no venía de un error de cálculo: venía del queso crema, que a S/ 26 el kilo y 0,80 kg por receta se come casi la mitad del costo de insumos.

Ese es exactamente el trabajo del archivo. No producir reportes: producir el número que obliga a decidir si se sube el precio, se cambia el proveedor o se acepta que ese producto es un gancho y no un negocio.

## Tres decisiones técnicas que sostienen el sistema

**Sin macros.** Un archivo con macros se rompe al abrirse en otra PC, en Excel online o en el celular, y el negocio queda sin sistema justo cuando lo necesita. Todo con fórmulas nativas: SUMIFS, INDEX/MATCH, SUMIF, formato condicional. Si más adelante hace falta automatizar algo puntual, se agrega como módulo aparte y no como dependencia del núcleo.

**Celdas de entrada en azul, calculadas en negro.** Parece cosmético y es lo que decide si el sistema sobrevive. El dueño del negocio no tiene que adivinar dónde puede escribir. Cada fórmula que se pisa por error es un pedazo de lógica que se pierde en silencio.

**Una sola fuente de precios.** El costo de un insumo se escribe en un solo lugar del archivo. Cualquier otra hoja que lo necesite lo trae de ahí. En el momento en que el mismo dato vive en dos hojas, el sistema tiene dos verdades y ninguna es confiable.

## Para llevar

1. **Antes de decidir cuántas hojas, definí la cadena.** Si no podés dibujar cómo un cambio en un insumo llega hasta el margen del tablero, todavía no tenés un sistema.
2. **Dos preguntas de diseño valen más que veinte fórmulas.** Cuándo se descuenta el stock y si el costeo contempla merma condicionan toda la arquitectura. Contestarlas después significa rehacer.
3. **Un buen sistema de gestión incomoda.** Si el tablero solo confirma lo que ya creías, probablemente le falte merma, mano de obra o los dos.

---

**¿Necesitás un sistema de gestión así para tu negocio o tu equipo?**

Escribime a [hola@valeriayashan.com.ar](mailto:hola@valeriayashan.com.ar) o por [WhatsApp](https://wa.me/5491140791007). En una llamada de 15 minutos vemos si Excel alcanza para tu caso o si te conviene otra herramienta — a veces la respuesta honesta es la segunda, y sobre eso escribí en [Notion con IA para gestionar proyectos](/blog/notion-ia-para-gestionar-proyectos).

---

Cada semana escribo sobre gestión de proyectos, procesos e IA aplicada en mi newsletter: [suscribite en Substack](https://valeriayashanpm.substack.com). Y si preferís verlo en video, publico en [YouTube @ValeriaYashanPM](https://www.youtube.com/@ValeriaYashanPM).
