/* Feriados precargados. NO se inventan datos: solo se incluye lo verificado con fuente oficial. Para cualquier otro país o año
   el dato FALTA y la herramienta lo avisa; la persona puede pegar la lista oficial desde el panel "Feriados y calendario".
   Verificar siempre contra la fuente oficial vigente (Boletín Oficial / organismo competente de cada país).
   Solo se cargan los feriados de alcance NACIONAL; los feriados regionales (provincia o ciudad) se informan en "notas". */
window.PLANIFICADOR_FERIADOS = {
  AR: {
    nombre: "Argentina",
    fuente: "Feriados nacionales según Ley 27.399, resoluciones y decretos del Poder Ejecutivo (Boletín Oficial). Verificar con la fuente oficial vigente.",
    notas: {
      2026: "2026: incluye los días no laborables con fines turísticos fijados por la Resolución 164/2025 de la Jefatura de Gabinete (lunes 23/3, viernes 10/7 y lunes 7/12) y el feriado nacional del lunes 9/11, Decreto 1103/2026 (visita del Papa León XIV). Ese decreto agrega feriados regionales que NO están cargados: martes 10/11 solo en CABA y Córdoba, miércoles 11/11 solo en la provincia de Buenos Aires. Si tu proyecto es de esas jurisdicciones, agregalos con \"+ Agregar feriado\".",
      2027: "2027: feriados nacionales según Ley 27.399, con los traslados que corresponden por día de la semana (Güemes al lunes 21/6, San Martín al lunes 16/8, Diversidad Cultural al lunes 11/10). Todavía NO hay días no laborables con fines turísticos fijados para 2027 (el Poder Ejecutivo puede fijar hasta 3 por año; en 2026 se publicaron el 26/12/2025): revisá el Boletín Oficial a fin de año. El 20/11 cae sábado y su eventual traslado aún no está resuelto. El jueves santo (25/3) es día no laborable optativo y no está cargado."
    },
    anios: {
      2026: [
        "2026-01-01", "2026-02-16", "2026-02-17", "2026-03-23", "2026-03-24", "2026-04-02", "2026-04-03",
        "2026-05-01", "2026-05-25", "2026-06-15", "2026-06-20", "2026-07-09", "2026-07-10", "2026-08-17",
        "2026-10-12", "2026-11-09", "2026-11-23", "2026-12-07", "2026-12-08", "2026-12-25"
      ],
      2027: [
        "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-24", "2027-03-26", "2027-04-02", "2027-05-01",
        "2027-05-25", "2027-06-20", "2027-06-21", "2027-07-09", "2027-08-16", "2027-10-11", "2027-11-20",
        "2027-12-08", "2027-12-25"
      ]
    }
  }
};
