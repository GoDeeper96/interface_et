import axios from "axios"
import { API_CONFIG } from "../config/api-config"

import type { IpesPayload } from "../../application/payload/ipes.request"
import type { IpesDTO } from "../../application/dto/ipes.dto"

export const generarIpesAPI = async (payload: IpesPayload): Promise<IpesDTO> => {
    console.log("Payload IPES API: API", payload)
  const response = await axios.post(API_CONFIG.IPES_URL, {
    esquema_curso: payload.esquema_curso,
    esquema_actividad: payload.esquema_actividad,
    kick_off: payload.kick_off,
    numero_unidad: payload.numero_unidad,
    numero_semana: payload.numero_semana
  })

  return response.data
}
