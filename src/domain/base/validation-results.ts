export interface FieldValidation {
  field: string
  label: string
  isValid: boolean
  isOptional?: boolean
}

export interface ValidationResult {
  isValid: boolean
  fieldValidations: FieldValidation[]
}
