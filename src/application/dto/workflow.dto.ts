export interface CompleteStepRequestDTO {
  stepIndex: number
  miniStepIndex: number
}

export interface WorkflowProgressDTO {
  completedMiniSteps: number
  totalMiniSteps: number
  completedSteps: number
  totalSteps: number
  currentStepIndex: number
  currentMiniStepIndex: number
}
