import axios from "axios"

import { API_CONFIG } from "../config/api-config"
import type { ApiResponse } from "../../domain/base/api-response"

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64String = reader.result as string
      const base64Content = base64String.split(",")[1]
      resolve(base64Content)
    }
    reader.onerror = (error) => reject(error)
  })
}

export const uploadKickOffAPI = async (file: File): Promise<ApiResponse> => {
  const base64Content = await fileToBase64(file)

  const response = await axios.post(API_CONFIG.KICKOFF_URL, {
    content_base64: base64Content,
    filename: file.name,
  })
  console.log(response)
  return response.data
}

export const uploadBibliografiaAPI = async (file: File): Promise<ApiResponse> => {
  const base64Content = await fileToBase64(file)
  const response = await axios.post(API_CONFIG.BIBLIOGRAFIA_URL, {
    content_base64: base64Content,
    filename: file.name,
  })
  return response.data
}

export const uploadSilabusAPI = async (file: File): Promise<ApiResponse> => {
  const base64Content = await fileToBase64(file)
  const response = await axios.post(API_CONFIG.SILABUS_URL, {
    content_base64: base64Content,
    filename: file.name,
  })
  return response.data
}
