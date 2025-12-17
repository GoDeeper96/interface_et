"use client"

import { useCallback } from "react"
import { generarSchemaUseCase } from "../../application/usecases/generar-schema.use-case"
import { useDocumentStore } from "../../infrastructure/store/document-store"

interface UseSchemaHandlerProps {
  onMessage: (text: string, type: "success" | "error") => void
}

export const useSchemaHandler = ({ onMessage }: UseSchemaHandlerProps) => {
  const {
    updateMiniStep,
    addApiResponse,
    steps,
    updateMainStep,
    setGeneratingSchema,
    setRequestTiming,
    setStepLoading,
    setAbortController,
  } = useDocumentStore()

  const handleGenerateSchema = useCallback(
    async (stepIdx: number, miniStepIdx: number) => {
      const { formValues } = useDocumentStore.getState()

      // 🚨 Validación de datos mínimos
      if (!formValues?.cod_curso) {
        onMessage("Error: Falta cod_curso para generar esquema", "error")
        return
      }

      const abortController = new AbortController()
      const stepKey = `step${stepIdx}_mini${miniStepIdx}`

      setAbortController(stepKey, abortController)
      setStepLoading(stepKey, true)

      const startTime = performance.now()

      setGeneratingSchema(true)
      updateMiniStep(stepIdx, miniStepIdx, { uploading: true, validationStatus: "pending" })

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
          setStepLoading(stepKey, false)
          return
        }

        // 🎯 Construimos el payload completo
        const payload = {
          kickoff,
          bibliografia,
          silabus,
          cod_curso: formValues.cod_curso,
        }

        // Enviar a la API
        const apiResponse = await generarSchemaUseCase(payload)

        if (abortController.signal.aborted) {
          console.log("[v0] Schema generation was cancelled")
          return
        }

        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000 // Convert to seconds
        setRequestTiming(stepKey, duration)

        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: apiResponse.success,
          validationStatus: apiResponse.success ? "success" : "error",
          data: apiResponse.data,
        })

        // 👉 Si se generó correctamente, marcamos el main step
        if (apiResponse.success) {
          updateMainStep(stepIdx, { completed: true })
          const minutes = Math.floor(duration / 60)
          const seconds = Math.floor(duration % 60)
          onMessage(`Esquema generado correctamente en ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`, "success")
        } else {
          onMessage(apiResponse.error || "Error al generar esquema", "error")
        }

        addApiResponse(apiResponse)
      } catch (error) {
        if (abortController.signal.aborted) {
          console.log("[v0] Schema generation was cancelled")
          updateMiniStep(stepIdx, miniStepIdx, {
            uploading: false,
            validationStatus: "pending",
          })
          onMessage("Generación de esquema cancelada", "warning")
          return
        }

        const endTime = performance.now()
        const duration = (endTime - startTime) / 1000
        setRequestTiming(stepKey, duration)

        updateMiniStep(stepIdx, miniStepIdx, {
          uploading: false,
          completed: false,
          validationStatus: "error",
        })

        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        onMessage(`Error al generar esquema: ${errorMessage}`, "error")

        console.error("[v0] Schema generation error:", error)
      } finally {
        setGeneratingSchema(false)
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

  return { handleGenerateSchema }
}
