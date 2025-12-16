import { create } from "zustand"
import type { MainStep, MiniStep } from "../../domain/workflow/step"
import type { ApiResponse } from "../../domain/base/api-response"

interface DocumentStore {
  steps: MainStep[]
  currentStepIndex: number
  currentMiniStepIndex: number
  apiData: ApiResponse[]
  isModalOpen: boolean

  // Formulario
  formValues: Record<string, string>
  updateField: (field: string, value: string) => void
  resetForm: () => void

  // Steps
  setSteps: (steps: MainStep[]) => void
  updateMiniStep: (stepIdx: number, miniStepIdx: number, updates: Partial<MiniStep>) => void
  updateMainStep: (stepIdx: number, updates: Partial<MainStep>) => void

  // Navegación
  setCurrentStepIndex: (index: number) => void
  setCurrentMiniStepIndex: (index: number) => void

  // API responses
  addApiResponse: (response: ApiResponse) => void

  // Modal
  setIsModalOpen: (isOpen: boolean) => void

  // Progreso
  getCompletedMiniSteps: () => number
  getTotalMiniSteps: () => number
  getCompletedSteps: () => number
  getCurrentMiniStep: () => MiniStep | undefined

  // Flags de generación de schema
  isGeneratingSchema: boolean
  setGeneratingSchema: (value: boolean) => void

  schemaGenerated: boolean
  setSchemaGenerated: (value: boolean) => void

  // Flags de generación de IPES
  isGeneratingIpes: boolean
  setGeneratingIpes: (value: boolean) => void

  ipesGenerated: boolean
  setIpesGenerated: (value: boolean) => void
}


export const useDocumentStore = create<DocumentStore>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  currentMiniStepIndex: 0,
  apiData: [],
  isModalOpen: false,

  // Flags del workflow de schema
  isGeneratingSchema: false,
  setGeneratingSchema: (value) => set({ isGeneratingSchema: value }),

  schemaGenerated: false,
  setSchemaGenerated: (val) => set({ schemaGenerated: val }),

    // ------- Flags del workflow de IPES -------
  isGeneratingIpes: false,
  setGeneratingIpes: (value) => set({ isGeneratingIpes: value }),

  ipesGenerated: false,
  setIpesGenerated: (val) => set({ ipesGenerated: val }),
  // Formulario
  formValues: {},
  updateField: (field, value) =>
    set((state) => ({
      formValues: {
        ...state.formValues,
        [field]: value,
      },
    })),
  resetForm: () => set({ formValues: {} }),

  // Steps
  setSteps: (steps) => set({ steps }),

  updateMainStep: (stepIdx, updates) =>
    set((state) => {
      const newSteps = [...state.steps]
      newSteps[stepIdx] = { ...newSteps[stepIdx], ...updates }
      return { steps: newSteps }
    }),

  updateMiniStep: (stepIdx, miniStepIdx, updates) =>
    set((state) => {
      const newSteps = [...state.steps]
      newSteps[stepIdx].miniSteps[miniStepIdx] = {
        ...newSteps[stepIdx].miniSteps[miniStepIdx],
        ...updates,
      }
      return { steps: newSteps }
    }),

  // Navegación
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  setCurrentMiniStepIndex: (index) => set({ currentMiniStepIndex: index }),

  // API Data
  addApiResponse: (response) =>
    set((state) => {
      const existingIndex = state.apiData.findIndex((item) => item.documentType === response.documentType)
      if (existingIndex >= 0) {
        const updated = [...state.apiData]
        updated[existingIndex] = response
        return { apiData: updated }
      }
      return { apiData: [...state.apiData, response] }
    }),

  // Modal
  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),

  // Progreso
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
}))
