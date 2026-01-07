import type { ActividadCalificada } from "./actividad_calificada"
import type { Semana } from "./semana"

export interface Unidad {
  numero_unidad: number
  titulo_unidad: string
  logro_unidad: string
  semanas: Semana[]
  actividades_calificadas: ActividadCalificada[]
}