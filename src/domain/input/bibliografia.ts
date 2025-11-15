export type TipoBibliografia = "Base" | "Complementaria"

export interface Bibliografia {
  tipo_de_bibliografia: TipoBibliografia
  autor: string
  titulo: string
  item_number: string
  soporte: string
  annio: number
  edicion: string
  editorial: string
  url: string
}
