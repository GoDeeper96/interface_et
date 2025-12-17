import * as XLSX from "xlsx"

export function exportIpesToExcel(ipes: any[]) {
  const workbook = XLSX.utils.book_new()

  // Hoja 1: Resumen General
  const resumenData = ipes.map((ipe) => ({
    Unidad: ipe.unidad,
    Semana: ipe.introduccion?.semana || "N/A",
    "Nombre de Sesión": ipe.introduccion?.nombre_de_la_sesion || "N/A",
    "Logro de Semana": ipe.introduccion?.logro_de_la_semana || "N/A",
    "Cantidad Presentaciones": ipe.presentaciones?.length || 0,
    "Tiene Ejercicios": ipe.ejercicios ? "Sí" : "No",
  }))

  const resumenSheet = XLSX.utils.json_to_sheet(resumenData)
  XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen IPES")

  // Hoja 2: Introducciones Completas
  const introduccionData = ipes
    .filter((ipe) => ipe.introduccion)
    .map((ipe) => ({
      Unidad: ipe.unidad,
      Curso: ipe.introduccion.curso,
      "Logro Aprendizaje Curso": ipe.introduccion.logro_de_aprendizaje_curso,
      "Horas Estudio Semanales": ipe.introduccion.horas_de_estudio_semanales,
      "Logro Aprendizaje Unidad": ipe.introduccion.logro_de_aprendizaje_unidad,
      Semana: ipe.introduccion.semana,
      "Nombre de la Sesión": ipe.introduccion.nombre_de_la_sesion,
      "Logro de la Semana": ipe.introduccion.logro_de_la_semana,
      "Importancia del Logro": ipe.introduccion.importancia_del_logro,
      "Situación Inicial": ipe.introduccion.situacion_inicial,
      "Propósito de la SI": ipe.introduccion.proposito_de_la_si,
      "Pregunta Cuestionadora": ipe.introduccion.pregunta_cuestionadora,
      "Tipo Recurso": ipe.introduccion.tipo_recurso,
      "Tiempo Estimado": ipe.introduccion.tiempo_estimado,
    }))

  if (introduccionData.length > 0) {
    const introduccionSheet = XLSX.utils.json_to_sheet(introduccionData)
    XLSX.utils.book_append_sheet(workbook, introduccionSheet, "Introducciones")
  }

  // Hoja 3: Presentaciones Detalladas
  const presentacionesData: any[] = []
  ipes.forEach((ipe) => {
    if (ipe.presentaciones && Array.isArray(ipe.presentaciones)) {
      ipe.presentaciones.forEach((pres: any, idx: number) => {
        presentacionesData.push({
          Unidad: ipe.unidad,
          Semana: ipe.introduccion?.semana || "N/A",
          "Presentación #": idx + 1,
          Tema: pres.tema,
          Subtema: pres.subtema,
          "Propósito del Recurso": pres.proposito_del_recurso,
          "Tipo Recurso": pres.tipo_recurso,
          "Tiempo Estimado": pres.tiempo_estimado,
          "Detalles del Recurso": pres.detalles_del_recurso,
        })
      })
    }
  })

  if (presentacionesData.length > 0) {
    const presentacionesSheet = XLSX.utils.json_to_sheet(presentacionesData)
    XLSX.utils.book_append_sheet(workbook, presentacionesSheet, "Presentaciones")
  }

  // Hoja 4: Ejercicios
  const ejerciciosData = ipes
    .filter((ipe) => ipe.ejercicios)
    .map((ipe) => ({
      Unidad: ipe.unidad,
      Semana: ipe.introduccion?.semana || "N/A",
      Tema: ipe.ejercicios.tema,
      Subtemas: Array.isArray(ipe.ejercicios.subtemas) ? ipe.ejercicios.subtemas.join(", ") : "",
      "Código Actividad": ipe.ejercicios.codigo_actividad,
      "Tipo Actividad": ipe.ejercicios.tipo_actividad,
    }))

  if (ejerciciosData.length > 0) {
    const ejerciciosSheet = XLSX.utils.json_to_sheet(ejerciciosData)
    XLSX.utils.book_append_sheet(workbook, ejerciciosSheet, "Ejercicios")
  }

  // Hoja 5: Vista Completa (todo en una fila por unidad)
  const completaData = ipes.map((ipe) => {
    const presentacionesSummary = ipe.presentaciones
      ?.map((p: any, idx: number) => `[P${idx + 1}] ${p.tema} - ${p.subtema}`)
      .join(" | ")
    const ejerciciosSummary = ipe.ejercicios
      ? `${ipe.ejercicios.tema} (${ipe.ejercicios.codigo_actividad})`
      : "Sin ejercicios"

    return {
      Unidad: ipe.unidad,
      Semana: ipe.introduccion?.semana || "N/A",
      Curso: ipe.introduccion?.curso || "N/A",
      "Nombre Sesión": ipe.introduccion?.nombre_de_la_sesion || "N/A",
      "Logro Semana": ipe.introduccion?.logro_de_la_semana || "N/A",
      "Importancia Logro": ipe.introduccion?.importancia_del_logro || "N/A",
      "Situación Inicial": ipe.introduccion?.situacion_inicial || "N/A",
      "Pregunta Cuestionadora": ipe.introduccion?.pregunta_cuestionadora || "N/A",
      "Tipo Recurso Intro": ipe.introduccion?.tipo_recurso || "N/A",
      "Tiempo Intro (min)": ipe.introduccion?.tiempo_estimado || "N/A",
      "Presentaciones (resumen)": presentacionesSummary || "Sin presentaciones",
      "Ejercicios (resumen)": ejerciciosSummary,
    }
  })

  const completaSheet = XLSX.utils.json_to_sheet(completaData)
  XLSX.utils.book_append_sheet(workbook, completaSheet, "Vista Completa")

  // Descargar archivo
  XLSX.writeFile(workbook, `IPES_Completo_${new Date().toISOString().split("T")[0]}.xlsx`)
}

export function exportEsquemaCursoToExcel(esquemaCurso: any) {
  const workbook = XLSX.utils.book_new()

  // Hoja 1: Información General del Curso
  const infoGeneralData = [
    {
      Campo: "Código del Curso",
      Valor: esquemaCurso.cod_curso || "N/A",
    },
    {
      Campo: "Nombre del Curso",
      Valor: esquemaCurso.curso || "N/A",
    },
    {
      Campo: "Contexto del Curso",
      Valor: esquemaCurso.contexto_curso || "N/A",
    },
  ]

  const infoSheet = XLSX.utils.json_to_sheet(infoGeneralData)
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Información General")

  // Hoja 2: Unidades
  const unidadesData = esquemaCurso.esquemas_unidad.map((unidad: any) => ({
    "Número Unidad": unidad.numero_unidad,
    Título: unidad.titulo_unidad || "N/A",
    "Logro de Aprendizaje": unidad.logro_de_aprendizaje_unidad,
    "Horas de Estudio": unidad.semana_tema_horas_de_estudio || "N/A",
    "Cantidad Semanas": unidad.semanas?.length || 0,
  }))

  const unidadesSheet = XLSX.utils.json_to_sheet(unidadesData)
  XLSX.utils.book_append_sheet(workbook, unidadesSheet, "Unidades")

  // Hoja 3: Semanas
  const semanasData: any[] = []
  esquemaCurso.esquemas_unidad.forEach((unidad: any) => {
    unidad.semanas?.forEach((semana: any) => {
      semanasData.push({
        Unidad: unidad.numero_unidad,
        "Título Unidad": unidad.titulo_unidad || "N/A",
        "Número Semana": semana.numero_semana,
        "Nombre de la Sesión": semana.nombre_de_la_sesion,
        "Logro de Aprendizaje": semana.logro_de_aprendizaje_semana,
        "Cantidad Temas": semana.temas?.length || 0,
      })
    })
  })

  const semanasSheet = XLSX.utils.json_to_sheet(semanasData)
  XLSX.utils.book_append_sheet(workbook, semanasSheet, "Semanas")

  // Hoja 4: Temas
  const temasData: any[] = []
  esquemaCurso.esquemas_unidad.forEach((unidad: any) => {
    unidad.semanas?.forEach((semana: any) => {
      semana.temas?.forEach((tema: any) => {
        temasData.push({
          Unidad: unidad.numero_unidad,
          Semana: semana.numero_semana,
          Sesión: semana.nombre_de_la_sesion,
          "Título Tema": tema.titulo_tema || "N/A",
          "Logro de Aprendizaje": tema.logro_de_aprendizaje_tema,
          "Verbo Logro": tema.semana_tema_verbo_logro_semana || "N/A",
          "Cantidad Subtemas": tema.subtemas?.length || 0,
        })
      })
    })
  })

  const temasSheet = XLSX.utils.json_to_sheet(temasData)
  XLSX.utils.book_append_sheet(workbook, temasSheet, "Temas")

  // Hoja 5: Subtemas
  const subtemasData: any[] = []
  esquemaCurso.esquemas_unidad.forEach((unidad: any) => {
    unidad.semanas?.forEach((semana: any) => {
      semana.temas?.forEach((tema: any) => {
        tema.subtemas?.forEach((subtema: any) => {
          subtemasData.push({
            Unidad: unidad.numero_unidad,
            Semana: semana.numero_semana,
            Tema: tema.titulo_tema || "N/A",
            "Título Subtema": subtema.titulo_subtema,
            "Logro de Aprendizaje": subtema.logro_de_aprendizaje_subtema,
            "Cantidad Apartados": subtema.apartados?.length || 0,
          })
        })
      })
    })
  })

  const subtemasSheet = XLSX.utils.json_to_sheet(subtemasData)
  XLSX.utils.book_append_sheet(workbook, subtemasSheet, "Subtemas")

  // Hoja 6: Apartados (Detalle completo)
  const apartadosData: any[] = []
  esquemaCurso.esquemas_unidad.forEach((unidad: any) => {
    unidad.semanas?.forEach((semana: any) => {
      semana.temas?.forEach((tema: any) => {
        tema.subtemas?.forEach((subtema: any) => {
          subtema.apartados?.forEach((apartado: string, idx: number) => {
            apartadosData.push({
              Unidad: unidad.numero_unidad,
              Semana: semana.numero_semana,
              Tema: tema.titulo_tema || "N/A",
              Subtema: subtema.titulo_subtema,
              "Número Apartado": idx + 1,
              Apartado: apartado,
            })
          })
        })
      })
    })
  })

  if (apartadosData.length > 0) {
    const apartadosSheet = XLSX.utils.json_to_sheet(apartadosData)
    XLSX.utils.book_append_sheet(workbook, apartadosSheet, "Apartados")
  }

  // Hoja 7: Vista Completa Jerárquica (todas las columnas)
  const completaData: any[] = []
  esquemaCurso.esquemas_unidad.forEach((unidad: any) => {
    unidad.semanas?.forEach((semana: any) => {
      semana.temas?.forEach((tema: any) => {
        tema.subtemas?.forEach((subtema: any) => {
          completaData.push({
            "Código Curso": esquemaCurso.cod_curso || "N/A",
            Curso: esquemaCurso.curso || "N/A",
            Unidad: unidad.numero_unidad,
            "Título Unidad": unidad.titulo_unidad || "N/A",
            "Logro Unidad": unidad.logro_de_aprendizaje_unidad,
            Semana: semana.numero_semana,
            Sesión: semana.nombre_de_la_sesion,
            "Logro Semana": semana.logro_de_aprendizaje_semana,
            Tema: tema.titulo_tema || "N/A",
            "Logro Tema": tema.logro_de_aprendizaje_tema,
            Subtema: subtema.titulo_subtema,
            "Logro Subtema": subtema.logro_de_aprendizaje_subtema,
            "Apartados (concatenados)": subtema.apartados?.join(" | ") || "",
          })
        })
      })
    })
  })

  const completaSheet = XLSX.utils.json_to_sheet(completaData)
  XLSX.utils.book_append_sheet(workbook, completaSheet, "Vista Completa")

  // Descargar archivo
  const nombreCurso = esquemaCurso.curso?.substring(0, 30).replace(/[^\w\s]/gi, "") || "Curso"
  XLSX.writeFile(workbook, `${nombreCurso}_${new Date().toISOString().split("T")[0]}.xlsx`)
}

export function exportEsquemaActividadesToExcel(esquemaActividades: any) {
  const workbook = XLSX.utils.book_new()

  // Hoja principal con todas las actividades
  const actividadesData = esquemaActividades.actividades.map((act: any) => ({
    Semana: act.numero_semana,
    Código: act.codigo_actividad,
    Actividad: act.titulo_actividad,
    Tipo: act.tipo_actividad,
    "Dedicación (min)": act.tiempo_de_dedicacion,
    Formato: act.formato_entrega,
    Instrumento: act.instrumento,
    Flexible: act.flexible,
    Producto: act.producto_evidencia,
    Contexto: act.contexto,
    Logro: act.logro_actividad,
    Descripción: act.descripcion_actividad,
  }))

  const actividadesSheet = XLSX.utils.json_to_sheet(actividadesData)
  XLSX.utils.book_append_sheet(workbook, actividadesSheet, "Actividades")

  // Hoja de resumen por tipo de actividad
  const actividadesPorTipo: Record<string, any[]> = {}
  esquemaActividades.actividades.forEach((act: any) => {
    if (!actividadesPorTipo[act.tipo_actividad]) {
      actividadesPorTipo[act.tipo_actividad] = []
    }
    actividadesPorTipo[act.tipo_actividad].push(act)
  })

  Object.entries(actividadesPorTipo).forEach(([tipo, actividades]) => {
    const tipoData = actividades.map((act: any) => ({
      Semana: act.numero_semana,
      Código: act.codigo_actividad,
      Actividad: act.titulo_actividad,
      "Dedicación (min)": act.tiempo_de_dedicacion,
      Logro: act.logro_actividad,
    }))
    const tipoSheet = XLSX.utils.json_to_sheet(tipoData)
    const sheetName = tipo.substring(0, 30) // Límite de longitud del nombre de hoja
    XLSX.utils.book_append_sheet(workbook, tipoSheet, sheetName)
  })

  // Descargar archivo
  XLSX.writeFile(workbook, `Esquema_Actividades_${new Date().toISOString().split("T")[0]}.xlsx`)
}
