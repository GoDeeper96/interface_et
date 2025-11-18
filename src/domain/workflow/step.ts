import type React from "react"
import type { FieldValidation } from "../base/validation-results"
import type { SchemaDTO, SchemaDTO_Original } from "../../application/dto/schema.dto"


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

export interface RequirementData {
  id:string
  label: string,
  field: string,
  type:string
}

export interface MainStep {
  id: string
  title: string
  description: string
  requirementData?:RequirementData[]
  miniSteps: MiniStep[]
  icon: React.ReactElement
  output?: SchemaDTO_Original
  completed?: boolean
}
