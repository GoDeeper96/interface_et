
import { uploadKickOffAPI } from "../../infrastructure/api/document-upload.api"
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
      documentType: "KickOff",
      data: response,
    }
  } catch (error:any) {
    console.log(error)
    return {
      success: false,
       filename:request.file.name,
      message:"Error al subir archivo kickOff"+{error},
      data:[],
      documentType: "KickOff",
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
