import axios from "axios"

import { API_CONFIG } from "../config/api-config"

import type { SchemaDTO } from "../../application/dto/schema.dto"
import type { SchemaPayload } from "../../application/payload/schema.request"


export const generarSchemaAPI = async(payload:SchemaPayload):Promise<SchemaDTO>=>{
  console.log(payload)
  console.log("es el payload")
const response = await axios.post(API_CONFIG.SCHEMA_URL, {
    silabus:payload.silabus,
    kickoff:payload.kickoff,
    bibliografia:payload.bibliografia,
    cod_curso:payload.cod_curso
  })
  console.log(response)
  return response.data
}