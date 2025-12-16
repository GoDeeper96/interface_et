import { generarIpesAPI } from "../../infrastructure/api/ipes.api"
import type { IpesDTO } from "../dto/ipes.dto"
import type { IpesPayload } from "../payload/ipes.request"


export const generarIpesUseCase = async (
  request: IpesPayload
): Promise<IpesDTO> => {
  try {
    const response = await generarIpesAPI(request)
    
    return {
      success: true,
      message: "IPES generado correctamente",
      documentType: "IPES",
      filename: "-", 
      data: response,
      ejercicios: response.ejercicios, // Lo que devuelva tu backend
      introduccion: response.introduccion, // Lo que devuelva tu backend
      presentaciones: response.presentaciones,
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
