"use client"

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
    setRequestTiming,
    setStepLoading,
    setAbortController,
  } = useDocumentStore()

  const handleGenerateIpes = useCallback(
    async (stepIdx: number, miniStepIdx: number) => {
      const { formValues } = useDocumentStore.getState()

      // Validación básica
      if (!formValues?.cod_curso) {
        onMessage("Falta cod_curso para generar IPES", "error")
        return
      }

      const abortController = new AbortController()
      const stepKey = `step${stepIdx}_mini${miniStepIdx}`

      setAbortController(stepKey, abortController)
      setStepLoading(stepKey, true)

      const startTime = performance.now()

      // Activar estado global
      setGeneratingIpes(true)
      setIpesGenerated(false)

      updateMiniStep(stepIdx, miniStepIdx, { uploading: true, validationStatus: "pending" })

      try {
        const esquemaCurso = steps[1].miniSteps[0].data.esquemaCurso
        const esquemaActividad = steps[1].miniSteps[0].data.esquemaActividad
        const kickOff = steps[0].miniSteps[1].data
        console.log(esquemaCurso)
        console.log(esquemaActividad)
        console.log(kickOff)
        if (!esquemaCurso || !esquemaActividad || !kickOff) {
          console.log("sueños")
          onMessage("Faltan datos para generar IPES (esquemas o kickOff)", "error")

          updateMiniStep(stepIdx, miniStepIdx, {
            uploading: false,
            completed: false,
            validationStatus: "error",
          })
          setGeneratingIpes(false)
          setStepLoading(stepKey, false)
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

        if (abortController.signal.aborted) {
          console.log("[v0] IPES generation was cancelled")
          return
        }

        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000 // Convert to seconds
        setRequestTiming(stepKey, duration)

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
          const minutes = Math.floor(duration / 60)
          const seconds = Math.floor(duration % 60)
          onMessage(`IPES generado correctamente en ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`, "success")
        } else {
          setIpesGenerated(false)
          onMessage(apiResponse.error || "Error al generar IPES", "error")
        }

        addApiResponse(apiResponse)
      } catch (error) {
        if (abortController.signal.aborted) {
          console.log("[v0] IPES generation was cancelled")
          updateMiniStep(stepIdx, miniStepIdx, {
            uploading: false,
            validationStatus: "pending",
          })
          onMessage("Generación de IPES cancelada", "warning")
          return
        }

        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000
        setRequestTiming(stepKey, duration)

        console.error("[v0] IPES generation error:", error)

        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: false,
          validationStatus: "error",
        })

        setIpesGenerated(false)

        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        onMessage(`Error al generar IPES: ${errorMessage}`, "error")
      } finally {
        setGeneratingIpes(false)
        setStepLoading(stepKey, false)
      }
    },
    [
      steps,
      updateMiniStep,
      updateMainStep,
      addApiResponse,
      onMessage,
      setRequestTiming,
      setStepLoading,
      setAbortController,
    ],
  )

  return { handleGenerateIpes }
}
