import type { ApiResponse } from "../../domain/base/api-response"

export interface UploadRequestDTO {
  file: File
  documentType: "KickOff" | "Silabus" | "Bibliografía"
  
}
export interface UploadResponseDTO extends ApiResponse {
  success:boolean,
  error?:string,
  data: any | null // o los campos extra que tengas
}
// export interface UploadResponseDTO {
//   success: boolean
//   documentType: string
//   data?: Record<string, any>
//   error?: string
// }
export interface KickOffUploadDTO {
  file: File
}

export interface SilabusUploadDTO {
  file: File
}

export interface BibliografiaUploadDTO {
  file: File
}