import type { ValidationResult, FieldValidation } from "../../../domain/base/validation-results"

const KICKOFF_REQUIRED_FIELDS = [
  { field: "ciclo_de_dictado", label: "Ciclo de estudio" },
  { field: "cursos_prerequisitos", label: "Cursos prerequisito", isOptional: true },
  { field: "cantidad_creditos", label: "Cantidad de créditos" },
  { field: "curso_evidencia", label: "Curso evidencia" },
  { field: "carpeta_institucional", label: "Carpeta institucional" },
  { field: "acuerdos_generales", label: "Acuerdos generales" },
  { field: "acuerdos_sobre_evaluaciones", label: "Acuerdos sobre evaluaciones" },
  { field: "acuerdos_finales", label: "Acuerdos finales" },
]

export const validateKickOff = (data: any): ValidationResult => {
  const fieldValidations: FieldValidation[] = KICKOFF_REQUIRED_FIELDS.map((field) => {
    const value = data[field.field]
    let isValid = false

    switch (field.field) {
      case "ciclo_de_dictado":
        isValid = typeof value === "number" && value > 0
        break
      case "cursos_prerequisitos":
        isValid = Array.isArray(value) && value.length > 0
        break
      case "cantidad_creditos":
        isValid = typeof value === "number" && value > 0
        break
      case "curso_evidencia":
      case "carpeta_institucional":
        isValid = typeof value === "boolean"
        break
      case "acuerdos_generales":
      case "acuerdos_sobre_evaluaciones":
      case "acuerdos_finales":
        isValid = Array.isArray(value) && value.length > 0
        break
      default:
        isValid = false
    }

    return {
      field: field.field,
      label: field.label,
      isValid,
      isOptional: field.isOptional,
    }
  })

  const isValid = fieldValidations.filter((field) => !field.isOptional).every((field) => field.isValid)

  return {
    isValid,
    fieldValidations,
  }
}
