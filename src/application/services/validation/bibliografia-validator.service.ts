import type { ValidationResult, FieldValidation } from "../../../domain/base/validation-results"
import type { Bibliografia } from "../../../domain/input/bibliografia"

const BIBLIOGRAFIA_REQUIRED_FIELDS = [
  { field: "tipo_de_bibliografia", label: "Tipo de bibliografía" },
  { field: "autor", label: "Autor" },
  { field: "titulo", label: "Título" },
  { field: "item_number", label: "Item number" },
  { field: "soporte", label: "Soporte" },
  { field: "annio", label: "Año" },
  { field: "edicion", label: "Edición" },
  { field: "editorial", label: "Editorial" },
  { field: "url", label: "URL" },
]

export const validateBibliografiaList = (items: Bibliografia[]): ValidationResult => {
  const fieldValidations: FieldValidation[] = []

  // 1️⃣ Validar que el array tenga mínimo 1 elemento
  const arrayIsValid = Array.isArray(items) && items.length > 0

  fieldValidations.push({
    field: "bibliografia_list",
    label: "Listado de bibliografía",
    isValid: arrayIsValid,
    isOptional: false,
  })

  if (!arrayIsValid) {
    return {
      isValid: false,
      fieldValidations,
    }
  }

  // 2️⃣ Validar cada item del array
  items.forEach((item, index) => {
    BIBLIOGRAFIA_REQUIRED_FIELDS.forEach((field) => {
      const value = (item as any)[field.field]
      let isValid = false

      switch (field.field) {
        case "tipo_de_bibliografia":
          isValid = value === "Base" || value === "Complementaria"
          break

        case "annio":
          isValid = typeof value === "number" && value >= 0
          break

        default:
          isValid = typeof value === "string" && value.trim().length > 0
      }

      fieldValidations.push({
        field: `${field.field}_${index}`, // para distinguir errores por fila
        label: `${field.label} (fila ${index + 1})`,
        isValid,
        isOptional: false,
      })
    })
  })

  const isValid = fieldValidations.every((f) => f.isValid)

  return {
    isValid,
    fieldValidations,
  }
}
