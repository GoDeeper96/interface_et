import { useCallback } from "react"
import { generarIpesUseCase } from "../../application/usecases/generar-ipes.use-case"
import { useDocumentStore } from "../../infrastructure/store/document-store"

interface UseIpesHandlerProps {
  onMessage: (text: string, type: "success" | "error") => void
}

export const useIpesHandler = ({ onMessage }: UseIpesHandlerProps) => {
  const {
    updateMiniStep,
    addApiResponse,
    steps,
    updateMainStep,
    setGeneratingIpes,
    setIpesGenerated,
  } = useDocumentStore()

  const handleGenerateIpes = useCallback(
    async (stepIdx: number, miniStepIdx: number) => {
      const { formValues } = useDocumentStore.getState()

      // Validación básica
      if (!formValues?.cod_curso) {
        onMessage("Falta cod_curso para generar IPES", "error")
        return
      }

      // Activar estado global
      setGeneratingIpes(true)
      setIpesGenerated(false)

      updateMiniStep(stepIdx, miniStepIdx, { uploading: true })

      try {
        // console.log(steps)
        // console.log(steps[1].miniSteps[0].data)
        const esquemaCurso = steps[1].miniSteps[0].data.esquemaCurso
        const esquemaActividad = steps[1].miniSteps[0].data.esquemaActividad
        const kickOff = steps[0].miniSteps[1].data
        console.log(esquemaCurso)
        console.log(esquemaActividad)
        console.log(kickOff)
        if (!esquemaCurso || !esquemaActividad || !kickOff) {
            console.log("sueños")
          onMessage(
            "Faltan datos para generar IPES (esquemas o kickOff)",
            "error"
          )

          updateMiniStep(stepIdx, miniStepIdx, {
            uploading: false,
            completed: false,
            validationStatus: "error",
          })
          setGeneratingIpes(false)
          return
        }

        const payload = {
          esquema_curso: esquemaCurso,
          esquema_actividad: esquemaActividad,
          kick_off: kickOff,
          numero_unidad: formValues.numero_unidad || null,
          numero_semana: formValues.numero_semana || null,
        }
        console.log("IPES Payload:", payload)
        const apiResponse = await generarIpesUseCase(payload)

        const success = apiResponse.success

        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: success,
          validationStatus: success ? "success" : "error",
          data: apiResponse.data,
        })

        if (success) {
          updateMainStep(stepIdx, { completed: true })
          setIpesGenerated(true)
          onMessage("IPES generado correctamente", "success")
        } else {
          setIpesGenerated(false)
          onMessage(apiResponse.error || "Error al generar IPES", "error")
        }

        addApiResponse(apiResponse)
      } catch (error) {
        console.log(error)
        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: false,
          validationStatus: "error",
        })

        setIpesGenerated(false)

        onMessage(
          `Error al generar IPES: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`,
          "error"
        )
      } finally {
        setGeneratingIpes(false)
      }
    },
    [steps, updateMiniStep, updateMainStep, addApiResponse, onMessage]
  )

  return { handleGenerateIpes }
}
