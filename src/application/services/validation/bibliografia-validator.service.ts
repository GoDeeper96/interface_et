import type { ValidationResult, FieldValidation,RequiredField } from "../../../domain/base/validation-results"

import type { Bibliografia } from "../../../domain/input/bibliografia"

export const BIBLIOGRAFIA_REQUIRED_FIELDS: RequiredField[] = [
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

const isEmpty = (v: any) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && v.trim() === "")

/**
 * Valida un solo item de bibliografía
 */
const buildBibliografiaNode = (
  schema: RequiredField[],
  data: Bibliografia,
  index: number
): FieldValidation => {
  const node: FieldValidation = {
    field: `bibliografia_${index}`,
    label: `Bibliografía ${index + 1}`,
    isValid: true,
    children: [],
  }

  schema.forEach((fieldSchema) => {
    const value = (data as any)[fieldSchema.field]
    let isValid = true

    switch (fieldSchema.field) {
      case "tipo_de_bibliografia":
        isValid = value === "Base" || value === "Complementaria"
        break

      case "annio":
        isValid = typeof value === "number" && value >= 0
        break

      default:
        isValid = !isEmpty(value)
        break
    }

    node.children!.push({
      field: `${fieldSchema.field}_${index}`,
      label: fieldSchema.label,
      isValid,
    })
  })

  node.isValid = node.children!.every((c) => c.isValid)
  return node
}

/**
 * Valida toda la lista de bibliografía
 */
export const validateBibliografiaList = (items: Bibliografia[]): ValidationResult => {
  const fieldValidations: FieldValidation[] = []

  // Validar si el array está bien formado
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

  // Validar cada item usando estructura jerárquica
  items.forEach((item, index) => {
    const node = buildBibliografiaNode(BIBLIOGRAFIA_REQUIRED_FIELDS, item, index)
    fieldValidations.push(node)
  })

  const isValid = fieldValidations.every((f) => f.isValid)

  return {
    isValid,
    fieldValidations,
  }
}
