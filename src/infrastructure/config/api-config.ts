// export const API_CONFIG = {
//   KICKOFF_URL: process.env.NEXT_PUBLIC_KICKOFF_API_URL || "https://api.example.com/upload_kickoff",
//   BIBLIOGRAFIA_URL: process.env.NEXT_PUBLIC_BIBLIOGRAFIA_API_URL || "https://api.example.com/upload_bibliografia",
//   SILABUS_URL: process.env.NEXT_PUBLIC_SILABUS_API_URL || "https://api.example.com/upload_silabus",
// }
const API_BASE_URL = "http://192.168.18.3:8000"
const API_PARSING_URL = "parsing"
const API_GENERATE_URL = "esquema"
const API_ENDPOINTS = {
  KICKOFF: `${API_BASE_URL}/${API_PARSING_URL}/kickoff`,
  BIBLIOGRAFIA: `${API_BASE_URL}/${API_PARSING_URL}/bibliografia`,
  SILABUS: `${API_BASE_URL}/${API_PARSING_URL}/silabus`,
  SCHEMA: `${API_BASE_URL}/${API_GENERATE_URL}/generar`
}

export const API_CONFIG = {
  KICKOFF_URL: API_ENDPOINTS.KICKOFF,
  BIBLIOGRAFIA_URL:  API_ENDPOINTS.BIBLIOGRAFIA,
  SILABUS_URL: API_ENDPOINTS.SILABUS,
  SCHEMA_URL : API_ENDPOINTS.SCHEMA
}
