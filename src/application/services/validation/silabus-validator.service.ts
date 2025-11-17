import type { ValidationResult, FieldValidation,RequiredField } from "../../../domain/base/validation-results"




export const SILABUS_REQUIRED_FIELDS: RequiredField[] = [
  { field: "nombre_universidad", label: "Nombre de la universidad",isArray: false, },
  { field: "proposito", label: "Propósito del curso",isArray: false,},
  { field: "cod_curso", label: "Código del curso",isArray: false, },
  { field: "curso", label: "Nombre del curso",isArray: false, },
  { field: "fundamentacion", label: "Fundamentación",isArray: false, },
  { field: "sumilla", label: "Sumilla" ,isArray: false,},
  { field: "logro_de_aprendizaje", label: "Logro de aprendizaje" ,isArray: false,},
  { field: "duracion_curso_semanas", label: "Duración en semanas" ,isArray: false,},
  { field: "horas_de_estudio_semanales", label: "Horas semanales",isArray: false, },
  { field: "cantidad_de_semanas", label: "Cantidad de semanas" ,isArray: false,},

  {
    field: "unidades",
    label: "Unidades del sílabo",
    isArray: true,
    children: [
      { field: "numero_unidad", label: "Número de unidad" , isArray: false},
      { field: "titulo_unidad", label: "Título de unidad", isArray: false },
      { field: "logro_unidad", label: "Logro de unidad" , isArray: false},

      {
        field: "semanas",
        label: "Semanas de la unidad",
        isArray: true,
        children: [
          { field: "numero_semana", label: "Número de semana", isArray: false },
          { field: "temas_semana", label: "Temas de la semana", isArray: true },
          { field: "incluye_actividad", label: "Incluye actividad", isArray: false},
          { field: "titulo_actividad", label: "Titulo actividad" , isArray: false},
          { field: "actividad_observacion", label: "Actividad Observación", isArray: false },
          { field: "codigo_actividad", label: "Codigo actividad" , isArray: false}
        ],
      },

      {
        field: "actividades_calificadas",
        label: "Actividades calificadas",
        isArray: true,
        children: [
          { field: "numero_semana", label: "Número de semana", isArray: false },
          { field: "codigo_actividad", label: "Código de actividad" , isArray: false},
          { field: "titulo_actividad", label: "Título de actividad" , isArray: false},
          { field: "observacion_actividad", label: "Observación", isArray: false },
        ],
      },
    ],
  },
]


const isEmpty = (v: any) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && v.trim() === "")

/**
 * validateSilabus → retorna SOLO lo plano usando FieldValidation
 */
const buildNode = (schema: RequiredField, data: any): FieldValidation => {
  const value = data?.[schema.field]

  const node: FieldValidation = {
    field: schema.field,
    label: schema.label,
    isValid: schema.isArray
      ? Array.isArray(value) && value.length > 0
      : !isEmpty(value),
    children: schema.children ? [] : undefined
  }

  // Si no tiene hijos → retornar nodo plano
  if (!schema.children) return node

  // Caso array con hijos (ej. unidades, semanas, actividades_calificadas)
  if (schema.isArray) {
    const arr = Array.isArray(value) ? value : []

    arr.forEach((item, index) => {
      const childNode: FieldValidation = {
        field: schema.field,
        label: `${schema.label} ${index + 1}`, // Unidad 1, Unidad 2...
        isValid: true,
        children: []
      }

      schema.children!.forEach(childSchema => {
        childNode.children!.push(buildNode(childSchema, item))
      })

      // Validar nodo según sus hijos
      childNode.isValid = childNode.children!.every(c => c.isValid)

      node.children!.push(childNode)
    })

    return node
  }

  // Caso objeto con hijos
  schema.children.forEach(childSchema => {
    node.children!.push(buildNode(childSchema, value))
  })

  return node
}

/**
 * validateSilabus → retorna árbol completo usando FieldValidation
 */
export const validateSilabus = (silabusData: any): ValidationResult => {
  const data = silabusData ?? {}

  const fieldValidations: FieldValidation[] = SILABUS_REQUIRED_FIELDS.map(schema =>
    buildNode(schema, data)
  )

  const overallValid = fieldValidations.every(n => n.isValid)

  return {
    isValid: overallValid,
    fieldValidations
  }
}
