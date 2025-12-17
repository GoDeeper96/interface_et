import { generarIpesAPI } from "../../infrastructure/api/ipes.api"
import type { IpesDTO } from "../dto/ipes.dto"
import type { IpesPayload } from "../payload/ipes.request"


export const generarIpesUseCase = async (
  request: IpesPayload
): Promise<IpesDTO> => {
  try {
    const start = performance.now()
    const response = await generarIpesAPI(request)
    const end = performance.now()
    const durationMs = end - start

    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    const milliseconds = Math.floor(durationMs % 1000)
    const timeRequest= minutes + " min " + seconds + " sec"
    return {
      success: true,
      message: "IPES generado correctamente",
      documentType: "IPES",
      filename: "-", 
      data: response,
      ejercicios: response.ejercicios, // Lo que devuelva tu backend
      introduccion: response.introduccion, // Lo que devuelva tu backend
      presentaciones: response.presentaciones,
      timeRequest:timeRequest
      // Lo que devuelva tu backend
    }
  } catch (error) {
    return {
      success: false,
      message: "Error al generar IPES",
      documentType: "IPES",
      filename: "-",
      data: {},
      ejercicios: {} as any,
      introduccion: {} as any,
      presentaciones: [] as any,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}
