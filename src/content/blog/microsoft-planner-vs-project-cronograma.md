---
title: "Microsoft Planner vs. Project: cuándo falla cada uno"
description: "Planner y Project no resuelven lo mismo. Te muestro, con el PMBOK 8 y un caso real, cuándo cada herramienta cumple y cuándo falla en tu cronograma de proyecto."
pubDate: "2026-08-11"
category: "Herramientas"
tags: ["Microsoft Project", "Planner", "PMBOK", "Cronograma"]
---

Elegí Microsoft Planner para reemplazar el cronograma de un proyecto. Me arrepentí en la segunda semana. No fue un problema de la herramienta — fue elegirla antes de entender qué necesitaba controlar. Y esa confusión, entre Microsoft Planner y Microsoft Project, es uno de los errores más comunes que veo en equipos que recién adoptan una metodología formal de gestión de proyectos.

## Qué resuelve cada herramienta

Planner es un tablero de tareas. Organiza el trabajo del equipo en columnas, asigna responsables, pone fechas límite y da visibilidad rápida de qué está pendiente, en curso o terminado. Para coordinación operativa del día a día, cumple perfecto.

Project es un sistema de programación. No solo lista actividades: calcula cómo se relacionan entre sí, qué tan sensible es cada una a un atraso y cuál es la duración mínima real del proyecto completo.

Son categorías distintas de herramienta. El problema aparece cuando se usa una para resolver lo que exige la otra.

## El error real

Pasó en un proyecto grande, para un cliente del sector energético, con más de 40 entregables interrelacionados. El equipo venía usando Planner para tareas simples, y migramos ahí todo el seguimiento del cronograma. Sonaba razonable: menos fricción, un tablero visual, todo el equipo en el mismo lugar.

A la segunda semana ya no sabíamos qué actividad estaba realmente en riesgo. No porque el equipo no trabajara — porque Planner no tiene forma de mostrarlo. Volvimos a Project para el cronograma maestro. Planner se quedó donde sí funciona: la gestión operativa de tareas visibles para todo el equipo.

## Los 4 pasos que el PMBOK exige para un cronograma

El PMBOK 8 define el desarrollo del cronograma en cuatro pasos: definir actividades, secuenciarlas, estimar su duración y ajustar. Planner resuelve el primero — listar qué hay que hacer. Los otros tres quedan afuera.

Secuenciar implica establecer relaciones lógicas entre actividades: qué depende de qué, con qué adelantos o rezagos. Estimar duración implica juicio de expertos, descomposición o planificación de ondas sucesivas. Ajustar implica poder recalcular todo el modelo cuando algo cambia. Planner no hace nada de esto — cada tarea existe de forma aislada, como si no dependiera de ninguna otra.

## Ruta crítica: el dato que separa un cronograma de una lista de tareas

El método de la ruta crítica identifica qué secuencia de actividades determina la duración mínima del proyecto, y cuánta holgura tiene cada actividad antes de convertirse en un problema. Es el dato que le permite a un PM saber, con precisión, qué atraso es tolerable y cuál pone en riesgo la fecha de entrega.

Sin ruta crítica no hay forma real de priorizar. Se puede saber que "hay tareas atrasadas", pero no cuáles de esos atrasos afectan el proyecto completo y cuáles no. Planner no calcula ruta crítica porque no analiza dependencias — y sin dependencias, el concepto ni siquiera existe.

## Entonces, ¿cuándo usar cada uno?

La pregunta correcta no es qué herramienta es mejor, sino qué necesitás controlar. Si el objetivo es coordinar tareas simples de un equipo pequeño, sin dependencias complejas ni necesidad de calcular impacto de atrasos, Planner alcanza y sobra — es liviano y todo el equipo lo entiende sin curva de aprendizaje.

Si el proyecto tiene entregables interdependientes, necesita ruta crítica, o vas a reportar estado de cronograma a stakeholders que necesitan precisión, ahí hace falta un sistema de información de gestión de proyectos real — como Project, o cualquier herramienta que sí modele dependencias y calcule duración mínima.

## Para llevar

- Planner gestiona tareas; un cronograma exige secuenciación, duración y ajuste — cosas que Planner no resuelve
- El método de la ruta crítica es lo que separa "una lista de pendientes" de "un cronograma controlado"
- Elegir la herramienta antes de entender el problema es el error más caro y más común en la adopción de metodología formal

---

¿Necesitás ayuda para elegir la herramienta correcta para tu próximo cronograma? [Escribime](mailto:hola@valeriayashan.com.ar).

---

Si te interesa profundizar en herramientas de gestión de proyectos, también podés leer sobre [alternativas a Microsoft Project](/blog/microsoft-project-alternativas) o sobre [los cambios que trajo el PMBOK 8 al examen PMP 2026](/blog/pmbok-8-nuevo-examen-pmp-2026).

Si querés seguir esta conversación, suscribite a [PM & Strategy en Substack](https://valeriayashanpm.substack.com) o mirá el análisis completo en el canal de [YouTube](https://youtube.com/@ValeriaYashanPM).
