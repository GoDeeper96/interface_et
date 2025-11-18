export interface Apartado{
    titulo_apartado:string
    logro_de_aprendizaje_apartado:string
}

export interface SubtemaEsquema{
    titulo_subtema:string
    logro_de_aprendizaje_subtema:string
    apartados: string[]
}

export interface TemaEsquema {
    titulo_tema:string
    logro_de_aprendizaje_tema:string
    subtemas: SubtemaEsquema[]
}

export interface SemanaEsquema{
    numero_semana: number
    nombre_de_la_sesion: string
    logro_de_aprendizaje_semana: string
    verbo_de_logro_de_aprendizaje_Semana: string
    temas: TemaEsquema[]
}