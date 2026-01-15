import { create } from "zustand"
import type { MainStep, MiniStep } from "../../domain/workflow/step"
import type { ApiResponse } from "../../domain/base/api-response"

export interface IpesVersion {
  id: string
  version: number
  data: any[]
  createdAt: Date
  isApproved: boolean
  notes?: string
}

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

  // Timing functionality for requests
  requestTimings: Record<string, number>
  setRequestTiming: (stepKey: string, duration: number) => void

  // Loading state tracking per step
  loadingSteps: Record<string, boolean>
  setStepLoading: (stepKey: string, isLoading: boolean) => void

  // Cancellation support
  abortControllers: Record<string, AbortController>
  setAbortController: (stepKey: string, controller: AbortController) => void
  cancelStep: (stepKey: string) => void

  updateEsquemaCurso: (esquemaCurso: any) => void
  updateIpesData: (ipesData: any[]) => void

  ipesVersions: IpesVersion[]
  currentIpesVersionId: string | null
  addIpesVersion: (data: any[], notes?: string) => string
  updateIpesVersion: (versionId: string, data: any[]) => void
  approveIpesVersion: (versionId: string) => void
  setCurrentIpesVersion: (versionId: string) => void
  getCurrentIpesVersion: () => IpesVersion | undefined
  deleteIpesVersion: (versionId: string) => void
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
  setSchemaGenerated: (value) => set({ schemaGenerated: value }),

  // ------- Flags del workflow de IPES -------
  isGeneratingIpes: false,
  setGeneratingIpes: (value) => set({ isGeneratingIpes: value }),

  ipesGenerated: false,
  setIpesGenerated: (value) => set({ ipesGenerated: value }),

  // Timing functionality for requests
  requestTimings: {},
  setRequestTiming: (stepKey, duration) =>
    set((state) => ({
      requestTimings: {
        ...state.requestTimings,
        [stepKey]: duration,
      },
    })),

  // Loading state tracking per step
  loadingSteps: {},
  setStepLoading: (stepKey, isLoading) =>
    set((state) => ({
      loadingSteps: {
        ...state.loadingSteps,
        [stepKey]: isLoading,
      },
    })),

  // Cancellation support
  abortControllers: {},
  setAbortController: (stepKey, controller) =>
    set((state) => ({
      abortControllers: {
        ...state.abortControllers,
        [stepKey]: controller,
      },
    })),

  cancelStep: (stepKey) => {
    const state = get()
    const controller = state.abortControllers[stepKey]
    if (controller) {
      controller.abort()
      set((state) => {
        const newControllers = { ...state.abortControllers }
        delete newControllers[stepKey]
        return {
          abortControllers: newControllers,
          loadingSteps: {
            ...state.loadingSteps,
            [stepKey]: false,
          },
        }
      })
    }
  },

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

  updateEsquemaCurso: (esquemaCurso) =>
    set((state) => {
      const newSteps = [...state.steps]
      if (newSteps[1]?.miniSteps[0]) {
        newSteps[1].miniSteps[0] = {
          ...newSteps[1].miniSteps[0],
          data: {
            ...newSteps[1].miniSteps[0].data,
            esquemaCurso: esquemaCurso,
          },
        }
      }
      return { steps: newSteps }
    }),

  updateIpesData: (ipesData) =>
    set((state) => {
      const newSteps = [...state.steps]
      if (newSteps[2]?.miniSteps[0]) {
        newSteps[2].miniSteps[0] = {
          ...newSteps[2].miniSteps[0],
          data: {
            ...newSteps[2].miniSteps[0].data,
            ipes: ipesData,
          },
        }
      }
      return { steps: newSteps }
    }),

  ipesVersions: [],
  currentIpesVersionId: null,

  addIpesVersion: (data, notes) => {
    const state = get()
    const newVersion: IpesVersion = {
      id: `v${Date.now()}`,
      version: state.ipesVersions.length + 1,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      createdAt: new Date(),
      isApproved: false,
      notes,
    }
    set((state) => ({
      ipesVersions: [...state.ipesVersions, newVersion],
      currentIpesVersionId: newVersion.id,
    }))
    return newVersion.id
  },

  updateIpesVersion: (versionId, data) => {
    set((state) => ({
      ipesVersions: state.ipesVersions.map((v) =>
        v.id === versionId ? { ...v, data: JSON.parse(JSON.stringify(data)) } : v,
      ),
    }))
  },

  approveIpesVersion: (versionId) => {
    set((state) => ({
      ipesVersions: state.ipesVersions.map((v) => (v.id === versionId ? { ...v, isApproved: true } : v)),
    }))
  },

  setCurrentIpesVersion: (versionId) => {
    set({ currentIpesVersionId: versionId })
  },

  getCurrentIpesVersion: () => {
    const state = get()
    return state.ipesVersions.find((v) => v.id === state.currentIpesVersionId)
  },

  deleteIpesVersion: (versionId) => {
    set((state) => {
      const filteredVersions = state.ipesVersions.filter((v) => v.id !== versionId)
      const newCurrentId =
        state.currentIpesVersionId === versionId
          ? filteredVersions[filteredVersions.length - 1]?.id || null
          : state.currentIpesVersionId
      return {
        ipesVersions: filteredVersions,
        currentIpesVersionId: newCurrentId,
      }
    })
  },

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
