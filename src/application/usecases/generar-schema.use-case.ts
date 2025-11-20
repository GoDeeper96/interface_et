import { generarSchemaAPI } from "../../infrastructure/api/schema.api"
import type { SchemaDTO } from "../dto/schema.dto"
import type { SchemaPayload } from "../payload/schema.request"

export const generarSchemaUseCase = async (
  request: SchemaPayload
): Promise<SchemaDTO> => {
  try {
    console.log("holaaa")
    console.log(request)
    const response = await generarSchemaAPI(request)

    return {
      success: true,
      message: "Esquema generado correctamente",
      documentType: "Esquema",
      filename: "-",           // puedes cambiarlo si deseas
      data: response,                    // response completo
      esquemaCurso: response.esquemaCurso,
      esquemaActividades: response.esquemaActividades
    }
  } catch (error) {
    return {
      success: false,
      message: "Error al generar el esquema",
      documentType: "Esquema",
      filename: "-",
      data: {},
      esquemaCurso: {} as any,
      esquemaActividades: {} as any,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
