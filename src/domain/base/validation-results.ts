export interface FieldValidation {
  field: string
  label: string
  isValid: boolean
  isOptional?: boolean
  children?: FieldValidation[]
}

export interface RequiredField {
  field: string
  label: string
  isArray?: boolean
  children?: RequiredField[]
}
export interface ValidationResult {
  isValid: boolean
  fieldValidations: FieldValidation[]
}
