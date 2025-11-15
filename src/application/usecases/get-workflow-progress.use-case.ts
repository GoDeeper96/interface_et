
import { useDocumentStore } from "../../infrastructure/store/document-store"
import type { WorkflowProgressDTO } from "../dto/workflow.dto"

export const getWorkflowProgressUseCase = (): WorkflowProgressDTO => {
  const store = useDocumentStore.getState()

  return {
    completedMiniSteps: store.getCompletedMiniSteps(),
    totalMiniSteps: store.getTotalMiniSteps(),
    completedSteps: store.getCompletedSteps(),
    totalSteps: store.steps.length,
    currentStepIndex: store.currentStepIndex,
    currentMiniStepIndex: store.currentMiniStepIndex,
  }
}
