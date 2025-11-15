
import { uploadSilabusAPI } from "../../infrastructure/api/document-upload.api"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import type { UploadRequestDTO, UploadResponseDTO } from "../dto/upload-request.dto"

export const uploadSilabusUseCase = async (request: UploadRequestDTO): Promise<UploadResponseDTO> => {
  try {
    const response = await uploadSilabusAPI(request.file)

    useDocumentStore.getState().addApiResponse(response)

    const store = useDocumentStore.getState()
    store.updateMiniStep(store.currentStepIndex, store.currentMiniStepIndex, {
      completed: true,
      data: response,
    })

    return {
      success: true,
      filename:request.file.name,
      message:"documento silabus subido exitosamente",
      documentType: "Silabus",
      data: response,
    }
  } catch (error) {
    return {
      success: false,
      filename:request.file.name,
      message:"Error al subir archivo Silabus"+{error},
      data:[],
      documentType: "Silabus",
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
