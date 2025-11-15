import type { RequiredField } from "./step";


export const KICKOFF_REQUIRED_FIELDS: RequiredField[] = [
  { field: "ciclo_de_dictado", label: "Ciclo de estudio" },
  { field: "cursos_prerequisitos", label: "Cursos prerequisito", isOptional: true },
  { field: "cantidad_creditos", label: "Cantidad de créditos" },
  { field: "curso_evidencia", label: "Curso evidencia" },
  { field: "carpeta_institucional", label: "Carpeta institucional" },
  { field: "acuerdos_generales", label: "Acuerdos generales" },
  { field: "acuerdos_sobre_evaluaciones", label: "Acuerdos sobre evaluaciones" },
  { field: "acuerdos_finales", label: "Acuerdos finales" },
]
