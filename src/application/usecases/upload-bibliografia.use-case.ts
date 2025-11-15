
import { uploadBibliografiaAPI } from "../../infrastructure/api/document-upload.api"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import type { UploadRequestDTO, UploadResponseDTO } from "../dto/upload-request.dto"

export const uploadBibliografiaUseCase = async (request: UploadRequestDTO): Promise<UploadResponseDTO> => {
  try {
    const response = await uploadBibliografiaAPI(request.file)
    console.log(response)
    // useDocumentStore.getState().addApiResponse(response)

    // const store = useDocumentStore.getState()
    // store.updateMiniStep(store.currentStepIndex, store.currentMiniStepIndex, {
    //   completed: true,
    //   data: response,
    // })

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
