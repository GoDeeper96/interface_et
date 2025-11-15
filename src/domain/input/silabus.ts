import type { Unidad } from "./unidad"


export interface Silabus {
  nombre_universidad: string
  proposito: string
  cod_curso: string
  curso: string
  fundamentacion: string
  sumilla: string
  logro_de_aprendizaje: string
  duracion_curso_semanas: number
  horas_de_estudio_semanales: number
  cantidad_de_semanas: number
  unidades: Unidad[]
}
