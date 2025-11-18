import type { SemanaEsquema } from "./semana_esquema"

export interface UnidadEsquema{
    numero_unidad: number
    titulo_unidad: string
    logro_de_aprendizaje_unidad: string
    semanas: SemanaEsquema[]
}