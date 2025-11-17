import axios from "axios"
import type { ApiResponse } from "../../../domain/base/api-response"


const API_BASE_URL = "http://192.168.18.3:8000/parsing"

const API_ENDPOINTS = {
  KICKOFF: `${API_BASE_URL}/kickoff`,
  BIBLIOGRAFIA: `${API_BASE_URL}/bibliografia`,
  SILABUS: `${API_BASE_URL}/silabus`,
}

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

export const uploadKickOff = async (file: File): Promise<ApiResponse> => {
  return uploadDocument(file, "KickOff", API_ENDPOINTS.KICKOFF)
}

export const uploadBibliografia = async (file: File): Promise<ApiResponse> => {
  return uploadDocument(file, "Bibliografía", API_ENDPOINTS.BIBLIOGRAFIA)
}

export const uploadSilabus = async (file: File): Promise<ApiResponse> => {
  return uploadDocument(file, "Silabus", API_ENDPOINTS.SILABUS)
}

const uploadDocument = async (file: File, documentType: string, endpoint: string): Promise<ApiResponse> => {
  const base64Content = await fileToBase64(file)

  const payload = {
    filename: file.name,
    content_base64: base64Content,
  }

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    return {
      message: response.data.message,
      data: response.data.data,
      documentType,
      filename: file.name,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`API call failed: ${error.response?.status || error.message}`)
    }
    throw error
  }
}
