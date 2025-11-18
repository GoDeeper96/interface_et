
import { uploadBibliografiaAPI } from "../../infrastructure/api/document-upload.api"
import type { UploadRequestDTO, UploadResponseDTO } from "../dto/upload-request.dto"

export const uploadBibliografiaUseCase = async (request: UploadRequestDTO): Promise<UploadResponseDTO> => {
  try {
    const response = await uploadBibliografiaAPI(request.file)
   
    return {
      success: true,
      filename:request.file.name,
      message:"documento Bibliografia subido exitosamente",
      documentType: "Bibliografía",
      data: response,
    }
  } catch (error) {
    return {
      success: false,
      filename:request.file.name,
      message:"Error al subir archivo bibligorafia" + {error},
      data:[],
      documentType: "Bibliografía",
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
