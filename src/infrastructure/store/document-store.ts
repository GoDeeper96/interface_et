import { create } from "zustand"
import type { MainStep, MiniStep } from "../../domain/workflow/step"
import type { ApiResponse } from "../../domain/base/api-response"


interface DocumentStore {
  steps: MainStep[]
  currentStepIndex: number
  currentMiniStepIndex: number
  apiData: ApiResponse[]
  isModalOpen: boolean
    // 👉 NUEVO
  formValues: Record<string, string>
  setSteps: (steps: MainStep[]) => void
  updateMiniStep: (stepIdx: number, miniStepIdx: number, updates: Partial<MiniStep>) => void
  setCurrentStepIndex: (index: number) => void
  setCurrentMiniStepIndex: (index: number) => void
  addApiResponse: (response: ApiResponse) => void
  setIsModalOpen: (isOpen: boolean) => void
  getCompletedMiniSteps: () => number
  getTotalMiniSteps: () => number
  getCompletedSteps: () => number
  getCurrentMiniStep: () => MiniStep | undefined
   // 👉 NUEVO
  updateField: (field: string, value: string) => void
  resetForm: () => void
}
export const useDocumentStore = create<DocumentStore>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  currentMiniStepIndex: 0,
  apiData: [],
  isModalOpen: false,

  // 👉 NUEVO
  formValues: {},

  setSteps: (steps) => set({ steps }),

  updateMiniStep: (stepIdx, miniStepIdx, updates) => {
    set((state) => {
      const newSteps = [...state.steps]
      newSteps[stepIdx].miniSteps[miniStepIdx] = {
        ...newSteps[stepIdx].miniSteps[miniStepIdx],
        ...updates,
      }
      return { steps: newSteps }
    })
  },

  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  setCurrentMiniStepIndex: (index) => set({ currentMiniStepIndex: index }),

  addApiResponse: (response) => {
    set((state) => {
      const existingIndex = state.apiData.findIndex((item) => item.documentType === response.documentType)
      if (existingIndex >= 0) {
        const updated = [...state.apiData]
        updated[existingIndex] = response
        return { apiData: updated }
      }
      return { apiData: [...state.apiData, response] }
    })
  },

  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),

  getCompletedMiniSteps: () => {
    const state = get()
    return state.steps.reduce((total, step) => {
      return total + step.miniSteps.filter((miniStep) => miniStep.completed).length
    }, 0)
  },

  getTotalMiniSteps: () => {
    const state = get()
    return state.steps.reduce((total, step) => total + step.miniSteps.length, 0)
  },

  getCompletedSteps: () => {
    const state = get()
    return state.steps.filter((step) => step.miniSteps.every((miniStep) => miniStep.completed)).length
  },

  getCurrentMiniStep: () => {
    const state = get()
    return state.steps[state.currentStepIndex]?.miniSteps[state.currentMiniStepIndex]
  },

  // 👉 NUEVO: actualizar un campo
  updateField: (field, value) =>
    set((state) => ({
      formValues: {
        ...state.formValues,
        [field]: value,
      },
    })),

  // 👉 NUEVO: limpiar formulario
  resetForm: () => set({ formValues: {} }),
}))