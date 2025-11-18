import type { UnidadEsquema } from "./unidad_esquema"

export interface EsquemaCurso {
    cod_curso:string
    curso:string
    logro_curso:string
    contexto_curso:string
    horas_de_estudio_semanales:number
    esquemas_unidad: UnidadEsquema[]
}