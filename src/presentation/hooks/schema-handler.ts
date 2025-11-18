import { useCallback } from "react"
import { generarSchemaUseCase } from "../../application/usecases/generar-schema.use-case"
import { useDocumentStore } from "../../infrastructure/store/document-store"

interface UseSchemaHandlerProps {
  onMessage: (text: string, type: "success" | "error") => void
}

export const useSchemaHandler = ({ onMessage }: UseSchemaHandlerProps) => {
  const { updateMiniStep, addApiResponse, steps, updateMainStep,setGeneratingSchema } = useDocumentStore()

  const handleGenerateSchema = useCallback(
    async (stepIdx: number, miniStepIdx: number) => {
      const { formValues } = useDocumentStore.getState()

      // 🚨 Validación de datos mínimos
      if (!formValues?.cod_curso) {
        onMessage("Error: Falta cod_curso para generar esquema", "error")
        
        return
      }
      setGeneratingSchema(true)
      updateMiniStep(stepIdx, miniStepIdx, { uploading: true })

      try {
        // 🔥 Extraer datos de cada miniStep
        const silabus = steps[0].miniSteps[0].data
        const kickoff = steps[0].miniSteps[1].data
        const bibliografia = steps[0].miniSteps[2].data

        // Validar
        if (!kickoff || !bibliografia || !silabus) {
          onMessage("Faltan documentos procesados (KickOff, Bibliografía o Silabus)", "error")
          updateMiniStep(stepIdx, miniStepIdx, {
            uploading: false,
            completed: false,
            validationStatus: "error",
          })
          setGeneratingSchema(false)
          return
        }

        // 🎯 Construimos el payload completo
        const payload = {
          //cod_curso: formValues.cod_curso,
          kickoff,
          bibliografia,
          silabus,
        }

        // Enviar a la API
        const apiResponse = await generarSchemaUseCase(payload)

        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: apiResponse.success,
          validationStatus: apiResponse.success ? "success" : "error",
          data: apiResponse.data,
        })

        // 👉 Si se generó correctamente, marcamos el main step
        if (apiResponse.success) {
          updateMainStep(stepIdx, { completed: true })
          onMessage("Esquema generado correctamente", "success")
        } else {
          onMessage(apiResponse.error || "Error al generar esquema", "error")
        }

        addApiResponse(apiResponse)
      } catch (error) {
        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: false,
          validationStatus: "error",
        })

        onMessage(
          `Error al generar esquema: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`,
          "error",
        )
      } finally{
        setGeneratingSchema(false)
      }
    },
    [steps, updateMiniStep, updateMainStep, addApiResponse, onMessage],
  )

  return { handleGenerateSchema }
}
