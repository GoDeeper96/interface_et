export interface Ipes {
  unidad: number
  introduccion: IntroduccionIPES
  presentaciones: PresentacionIPES[]
  ejercicios: EjerciciosIPES
}

export interface IntroduccionIPES {
  curso: string
  logro_de_aprendizaje_curso: string
  horas_de_estudio_semanales: number
  unidad: number
  logro_de_aprendizaje_unidad: string
  semana: number
  nombre_de_la_sesion: string
  logro_de_la_semana: string
  importancia_del_logro: string
  situacion_inicial: string
  proposito_de_la_si: string
  pregunta_cuestionadora: string
  tipo_recurso:
    | "H5P"
    | "HTML"
    | "Lectura Complementaria"
    | "Manual"
    | "Organizador Visual"
    | "Podcast"
    | "Rise"
    | "Separata"
    | "Storyline"
    | "Video Demo"
    | "Video Explicativo"
    | "Video interactivo"
  tiempo_estimado: string
}

export interface PresentacionIPES {
  tema: string
  subtema: string
  proposito_del_recurso: string
  tipo_recurso:
    | "H5P"
    | "HTML"
    | "Lectura Complementaria"
    | "Manual"
    | "Organizador Visual"
    | "Podcast"
    | "Rise"
    | "Separata"
    | "Storyline"
    | "Video Demo"
    | "Video Explicativo"
    | "Video interactivo"
  tiempo_estimado: string
  detalles_del_recurso: string
}

export interface EjerciciosIPES {
  tema: string
  subtemas: string[]
  codigo_actividad: string
  tipo_actividad: "Calificada" | "No Calificada"
}
