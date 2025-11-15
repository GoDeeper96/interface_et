// export const API_CONFIG = {
//   KICKOFF_URL: process.env.NEXT_PUBLIC_KICKOFF_API_URL || "https://api.example.com/upload_kickoff",
//   BIBLIOGRAFIA_URL: process.env.NEXT_PUBLIC_BIBLIOGRAFIA_API_URL || "https://api.example.com/upload_bibliografia",
//   SILABUS_URL: process.env.NEXT_PUBLIC_SILABUS_API_URL || "https://api.example.com/upload_silabus",
// }
const API_BASE_URL = "http://localhost:8000/parsing"

const API_ENDPOINTS = {
  KICKOFF: `${API_BASE_URL}/kickoff`,
  BIBLIOGRAFIA: `${API_BASE_URL}/bibliografia`,
  SILABUS: `${API_BASE_URL}/silabus`,
}

export const API_CONFIG = {
  KICKOFF_URL: API_ENDPOINTS.KICKOFF,
  BIBLIOGRAFIA_URL:  API_ENDPOINTS.BIBLIOGRAFIA,
  SILABUS_URL: API_ENDPOINTS.SILABUS,
}
