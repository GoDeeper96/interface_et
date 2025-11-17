
import type React from "react"
import { useCallback } from "react"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import { validateKickOff } from "../../application/services/validation/kickoff-validator.service"
import { uploadKickOffUseCase,uploadBibliografiaUseCase,uploadSilabusUseCase } from "../../application/usecases"
import { validateBibliografiaList } from "../../application/services/validation/bibliografia-validator.service"
import { validateSilabus } from "../../application/services/validation/silabus-validator.service"


interface UseUploadHandlerProps {
  onMessage: (text: string, type: "success" | "error") => void
}

export const useUploadHandler = ({ onMessage }: UseUploadHandlerProps) => {
  const { updateMiniStep, addApiResponse, steps } = useDocumentStore()

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, stepIdx: number, miniStepIdx: number) => {
      const selectedFiles = event.target.files
      if (!selectedFiles) return

      const file = selectedFiles[0]
      const miniStep = steps[stepIdx].miniSteps[miniStepIdx]
      const ext = file.name.split(".").pop()?.toLowerCase()

      if (!miniStep.allowedExtensions.includes(ext || "")) {
        console.log(miniStep.allowedExtensions)
        console.log(ext)
        onMessage(`Tipo de archivo no permitido: ${ext}`, "error")
        return
      }

      updateMiniStep(stepIdx, miniStepIdx, { fileList: [file] })
    },
    [steps, updateMiniStep, onMessage],
  )
 
  const handleUpload = useCallback(
    async (stepIdx: number, miniStepIdx: number) => {
      const miniStep = steps[stepIdx].miniSteps[miniStepIdx]
       // 🚨 Validación de cod_curso
    const { formValues } = useDocumentStore.getState()
    if (!formValues?.cod_curso) {
      onMessage("Error: Falta el código de curso (cod_curso). Por favor complétalo antes de subir archivos.", "error")
      return
    }
      if (!miniStep.fileList.length) {
        onMessage(`Selecciona un archivo para ${miniStep.title}`, "error")
        return
      }

      updateMiniStep(stepIdx, miniStepIdx, { uploading: true })

      try {
        let apiResponse

        switch (miniStep.title) {
          case "KickOff":
            apiResponse = await uploadKickOffUseCase({file:miniStep.fileList[0],documentType:"KickOff"})
        
            break
          case "Bibliografía":
            apiResponse = await uploadBibliografiaUseCase({file:miniStep.fileList[0],documentType:"Bibliografía"})
            break
          case "Silabus":
            apiResponse = await uploadSilabusUseCase({file:miniStep.fileList[0],documentType:"Silabus"})
            break
          default:
            throw new Error("Documento no soportado")
        }

        if (miniStep.title === "KickOff") {
    
          const validation = validateKickOff(apiResponse.data)
          updateMiniStep(stepIdx, miniStepIdx, {
            fieldValidations: validation.fieldValidations,
            completed: validation.isValid,
            validationStatus: validation.isValid ? "success" : "error",
            uploading: false,
          })
          if (validation.isValid) {
            onMessage(`${miniStep.title} procesado correctamente`, "success")
          }
        }
        if (miniStep.title === "Bibliografía") {
    
          const validation = validateBibliografiaList(apiResponse.data)
          updateMiniStep(stepIdx, miniStepIdx, {
            fieldValidations: validation.fieldValidations,
            completed: validation.isValid,
            validationStatus: validation.isValid ? "success" : "error",
            uploading: false,
          })
          if (validation.isValid) {
            onMessage(`${miniStep.title} procesado correctamente`, "success")
          }
        }
        if (miniStep.title === "Silabus") {
          console.log(apiResponse.data)
          const validation = validateSilabus(apiResponse.data)
          updateMiniStep(stepIdx, miniStepIdx, {
            fieldValidations: validation.fieldValidations,
            completed: validation.isValid,
            validationStatus: validation.isValid ? "success" : "error",
            uploading: false,
          })
          if (validation.isValid) {
            onMessage(`${miniStep.title} procesado correctamente`, "success")
          }
        }
        else {
          updateMiniStep(stepIdx, miniStepIdx, {
            completed: true,
            validationStatus: "success",
            uploading: false,
          })
          onMessage(`${miniStep.title} procesado correctamente`, "success")
        }

        addApiResponse(apiResponse)
      } catch (error) {
        console.log(error)
        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: false,
          validationStatus: "error",
        })
        onMessage(
          `Error al procesar ${miniStep.title}: ${error instanceof Error ? error.message : "Error desconocido"}`,
          "error",
        )
      }
    },
    [steps, updateMiniStep, addApiResponse, onMessage],
  )

  return { handleFileSelect, handleUpload }
}
