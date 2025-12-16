import type { KickOff } from "../../domain/input/kick_off"
import type { EsquemaActividad } from "../../domain/output/esquema_actividad"
import type { EsquemaCurso } from "../../domain/output/esquema_curso"

export interface IpesPayload {
  esquema_curso: EsquemaCurso
  esquema_actividad: EsquemaActividad
  kick_off: KickOff
  numero_unidad?: number | null
  numero_semana?: number | null
}
