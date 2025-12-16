import type { ApiResponse } from "../../domain/base/api-response";
import type { EsquemaActividad } from "../../domain/output/esquema_actividad";
import type { EsquemaCurso } from "../../domain/output/esquema_curso";

export interface SchemaDTO_Original {
 esquemaCurso: EsquemaCurso
  esquemaActividades: EsquemaActividad
}
export interface SchemaDTO extends ApiResponse {
  esquemaCurso: EsquemaCurso
  esquemaActividad: EsquemaActividad
  success: boolean
  error?: string
}