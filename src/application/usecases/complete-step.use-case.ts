
import { useDocumentStore } from "../../infrastructure/store/document-store"
import type { CompleteStepRequestDTO } from "../dto/workflow.dto"

export const completeStepUseCase = (request: CompleteStepRequestDTO): boolean => {
  try {
    const store = useDocumentStore.getState()
    const currentStep = store.steps[request.stepIndex]

    if (!currentStep) {
      console.error("[v0] Step not found")
      return false
    }

    const miniStep = currentStep.miniSteps[request.miniStepIndex]

    if (!miniStep) {
      console.error("[v0] MiniStep not found")
      return false
    }

    if (!miniStep.completed) {
      console.error("[v0] MiniStep must be completed before advancing")
      return false
    }

    const allCompleted = currentStep.miniSteps.every((ms) => ms.completed)

    if (allCompleted && request.miniStepIndex === currentStep.miniSteps.length - 1) {
      if (request.stepIndex < store.steps.length - 1) {
        store.setCurrentStepIndex(request.stepIndex + 1)
        store.setCurrentMiniStepIndex(0)
      }
    } else if (request.miniStepIndex < currentStep.miniSteps.length - 1) {
      store.setCurrentMiniStepIndex(request.miniStepIndex + 1)
    }

    return true
  } catch (error) {
    console.error("[v0] Error completing step:", error)
    return false
  }
}
