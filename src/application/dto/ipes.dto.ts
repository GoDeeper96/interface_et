import type { ApiResponse } from "../../domain/base/api-response"
import type { EjerciciosIPES, IntroduccionIPES, PresentacionIPES } from "../../domain/output/ipes"

export interface IpesDTO_Original {
    unidad?: number | any
    introduccion: IntroduccionIPES
    presentaciones: PresentacionIPES[]
    ejercicios: EjerciciosIPES
}
export interface IpesDTO extends ApiResponse {
    unidad?: number | any
    introduccion: IntroduccionIPES
    presentaciones: PresentacionIPES[]
    ejercicios: EjerciciosIPES
    success: boolean
    error?: string
}