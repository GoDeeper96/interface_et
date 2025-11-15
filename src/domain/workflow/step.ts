import type React from "react"
import type { FieldValidation } from "../base/validation-results"


export interface RequiredField {
  field: string
  label: string
  isOptional?: boolean
}

export interface DocumentInfo {
  purpose: string
  requirements: string[]
  examples: string[]
}

export interface MiniStep {
  id: string
  title: string
  description: string
  allowedExtensions: string[]
  fileList: File[]
  completed: boolean
  uploading: boolean
  data?: any
  icon: React.ReactElement
  documentInfo: DocumentInfo
  validationStatus: "pending" | "error" | "success"
  fieldValidations: FieldValidation[]
  requiredFields: RequiredField[]
}

export interface MainStep {
  id: string
  title: string
  description: string
  miniSteps: MiniStep[]
  icon: React.ReactElement
}
