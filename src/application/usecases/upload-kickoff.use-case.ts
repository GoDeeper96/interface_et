
import { uploadKickOffAPI } from "../../infrastructure/api/document-upload.api"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import type { UploadRequestDTO, UploadResponseDTO } from "../dto/upload-request.dto"

export const uploadKickOffUseCase = async (request: UploadRequestDTO): Promise<UploadResponseDTO> => {
  try {
    const response = await uploadKickOffAPI(request.file)
 
    // useDocumentStore.getState().addApiResponse(response)
    
    // const store = useDocumentStore.getState()
    // store.updateMiniStep(store.currentStepIndex, store.currentMiniStepIndex, {
    //   completed: true,
    //   data: response,
    // })
 
    return {
      success: true,
      filename:request.file.name,
      message:"documento KickOff subido exitosamente",
      documentType: request.documentType,
      data: response,
    }
  } catch (error:any) {
    console.log(error)
    return {
      success: false,
       filename:request.file.name,
      message:"Error al subir archivo kickOff"+{error},
      data:null,
      documentType: request.documentType,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
