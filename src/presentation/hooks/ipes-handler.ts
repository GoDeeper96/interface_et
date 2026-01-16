"use client"

import { useCallback } from "react"
import { generarIpesUseCase } from "../../application/usecases/generar-ipes.use-case"
import { useDocumentStore } from "../../infrastructure/store/document-store"

interface UseIpesHandlerProps {
  onMessage: (text: string, type: "success" | "error" | "warning") => void
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
    addIpesVersion,
    ipesVersions,
  } = useDocumentStore()

  const handleGenerateIpes = useCallback(
    async (stepIdx: number, miniStepIdx: number) => {
      const stepKey = `step${stepIdx}_mini${miniStepIdx}`
      const { stepLoadingStates } = useDocumentStore.getState()

      if (stepLoadingStates[stepKey]) {
        console.log(`[v0] IPES generation already in progress for ${stepKey}, skipping`)
        return
      }

      const { formValues } = useDocumentStore.getState()

      // Validación básica
      if (!formValues?.cod_curso) {
        onMessage("Falta cod_curso para generar IPES", "error")
        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          validationStatus: "error",
        })
        return
      }

      const abortController = new AbortController()

      setAbortController(stepKey, abortController)
      setStepLoading(stepKey, true)

      const startTime = performance.now()

      // Activar estado global
      setGeneratingIpes(true)
      setIpesGenerated(false)

      updateMiniStep(stepIdx, miniStepIdx, {
        uploading: true,
        validationStatus: "pending",
        completed: false,
        data: null, // Limpiar datos previos
      })

      try {
        const esquemaCurso = steps[1].miniSteps[0].data?.esquemaCurso
        const esquemaActividad = steps[1].miniSteps[0].data?.esquemaActividad
        const kickOff = steps[0].miniSteps[1].data

        console.log("[v0] IPES retry - esquemaCurso:", esquemaCurso)
        console.log("[v0] IPES retry - esquemaActividad:", esquemaActividad)
        console.log("[v0] IPES retry - kickOff:", kickOff)

        if (!esquemaCurso || !esquemaActividad || !kickOff) {
          console.log("[v0] Missing required data for IPES generation")
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
        console.log("[v0] IPES Payload:", payload)
        const apiResponse = await generarIpesUseCase(payload, abortController.signal)

        if (abortController.signal.aborted) {
          console.log("[v0] IPES generation was cancelled")
          return
        }

        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000 // Convert to seconds
        setRequestTiming(stepKey, duration)

        const success = apiResponse.success

        console.log("[v0] IPES API Response success:", success)
        console.log("[v0] IPES API Response data:", apiResponse.data)

        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: success,
          validationStatus: success ? "success" : "error",
          data: success ? apiResponse.data : null,
        })

        if (success) {
          updateMainStep(stepIdx, { completed: true })
          setIpesGenerated(true)

          const currentVersions = useDocumentStore.getState().ipesVersions
          if (currentVersions.length > 0 && apiResponse.data?.ipes) {
            addIpesVersion(apiResponse.data.ipes, `Regeneración ${new Date().toLocaleString()}`)
            console.log("[v0] New IPES version created after retry")
          }

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
      setGeneratingIpes,
      setIpesGenerated,
      addIpesVersion,
    ],
  )

  return { handleGenerateIpes }
}
