export interface ActividadSemana{
    numero_semana: number
    tipo_actividad: "Calificada" | "No Calificada"
    codigo_actividad: string
    titulo_actividad: string
    descripcion_actividad: string
    contexto: "Peruano" | "Internacional" | "No aplica"
    producto_evidencia: string
    formato_entrega: string
    logro_actividad:string
    instrumento:string
    flexible:string
    tiempo_de_dedicacion:string
    
}