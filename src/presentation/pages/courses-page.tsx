import React, { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  CheckmarkCircleRegular,
  ArrowUploadRegular,
  DocumentRegular,
  EyeRegular,
  ArrowRightRegular,
  SearchRegular,
  HistoryRegular,
  LockClosedRegular,
  ChevronDownRegular,
  ChevronUpRegular,
} from "@fluentui/react-icons"
import { DocumentViewer } from "../components/document-viewer"
import type { DocumentSource } from "../components/document-viewer"
import axios from "axios"
import {
  listCourses,
  createCourse,
  updateCourse,
  linkCourseGroup,
  listCourseInputs,
  createCourseInput,
  getCourseInputUrl,
  listContextFiles,
  getContextFileUploadUrl,
  extractContextFile,
  deleteContextFile,
} from "../../infrastructure/api/courses.api"
import type { Course, CourseInput, ContextFile } from "../../infrastructure/api/courses.api"
import { LinkRegular } from "@fluentui/react-icons"
import { listAssignmentsForUser, type Assignment } from "../../infrastructure/api/assignments.api"
import { API_CONFIG } from "../../infrastructure/config/api-config"
import { usePageTour } from "../components/tour-context"
import { cursosListTourSteps } from "../constants/page-tours"
import { useAuthStore } from "../../infrastructure/store/auth-store"
import { primaryRole } from "../../router/guards"
import { listProcesses, type Modalidad } from "../../infrastructure/api/processes.api"
import { DEFAULT_ROLES } from "./admin-shared"

// Left accent bar color, keyed by modalidad — same colors
// processes-page.tsx's MODALIDAD_TAG already uses for this exact
// distinction, so a course reads the same way in both places.
const MODALIDAD_BAR_COLOR: Record<Modalidad, string> = {
  virtual_24_7:      "#B21F5F",
  remoto_presencial: "#BF500B",
}
const MODALIDAD_SHORT_LABEL: Record<Modalidad, string> = {
  virtual_24_7:      "Virtual",
  remoto_presencial: "Presencial/Remoto",
}

// A course's sílabo upload gives it its own catalog code (cod_curso) per
// modalidad — presencial and virtual versions of "the same" course are two
// unrelated rows with no structural link by default. course_group_id (set
// via the "Vincular" action below) is the only thing that ties them
// together; courses without one just render as a group of size 1, same as
// before this existed. See 2026-07-16 meeting notes,
// project_thursday_demo_e2e_scope.md.
interface CourseGroup {
  key: string
  members: Course[]
}

function groupCourses(courses: Course[]): CourseGroup[] {
  const map = new Map<string, Course[]>()
  for (const c of courses) {
    const key = c.course_group_id || c.cod_curso
    const list = map.get(key) ?? []
    list.push(c)
    map.set(key, list)
  }
  return [...map.entries()].map(([key, members]) => ({ key, members }))
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const dd  = String(d.getDate()).padStart(2, "0")
  const mm  = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const hh  = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload  = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
  })

function extractSessionId(s3_key: string): string {
  const parts = s3_key.split("/")
  return parts.length >= 2 ? parts[1] : ""
}

type InputType = "silabus" | "kickoff" | "bibliografia"

const INPUT_TYPES: { key: InputType; label: string; description: string }[] = [
  { key: "silabus",      label: "Sílabo",       description: "PDF del sílabo del curso" },
  { key: "kickoff",      label: "Kickoff",       description: "Acta de reunión de inicio" },
  { key: "bibliografia", label: "Bibliografía",  description: "Lista de referencias bibliográficas" },
]

function getParseUrl(type: InputType): string {
  if (type === "silabus")     return API_CONFIG.SILABUS_URL
  if (type === "kickoff")     return API_CONFIG.KICKOFF_URL
  return API_CONFIG.BIBLIOGRAFIA_URL
}

// ─── DocStatus ────────────────────────────────────────────────────────────────

function DocStatus({ has, label }: { has: boolean; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      fontSize: "13px", color: has ? "#107c10" : "#9ca3af",
    }}>
      {has ? (
        <CheckmarkCircleRegular style={{ fontSize: 14 }} />
      ) : (
        <span style={{
          display: "inline-block", width: 14, height: 14,
          borderRadius: "50%", border: "1.5px solid #d1d5db", flexShrink: 0,
        }} />
      )}
      <span style={{ fontWeight: has ? 600 : 400 }}>{label}</span>
    </div>
  )
}

// ─── SilabusCard ──────────────────────────────────────────────────────────────
// Sílabo is the platform's most important input — everything downstream
// (course schema, IPES generation, graded-activity data, etc.) derives from
// it. This card's job used to be "re-upload the file" first and foremost;
// now it leads with VIEWING the current document + when it was uploaded/
// last modified, with a history tree of every prior version underneath
// (et-course-inputs never deletes a row on re-upload, just deactivates it —
// see courses/handler.py::_deactivate_course_inputs — so that history was
// always there, just never surfaced). Uploading/replacing is now a
// secondary action gated on cursos.gestionar_inputs (canManage).

interface SilabusCardProps {
  cod_curso: string
  allVersions: CourseInput[]   // every "silabus" CourseInput, active + inactive, any order
  canManage: boolean
  onUploaded: () => void
}

const SilabusCard: React.FC<SilabusCardProps> = ({ cod_curso, allVersions, canManage, onUploaded }) => {
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [viewerSource, setViewerSource] = useState<DocumentSource | null>(null)
  const [fetchingUrl, setFetchingUrl]   = useState<string | null>(null)   // input_id currently loading
  const [historyOpen, setHistoryOpen]   = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const sorted = [...allVersions].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
  const current = sorted.find((v) => v.is_active) ?? sorted[0]
  const older = sorted.filter((v) => v.input_id !== current?.input_id)
  const wasModified = older.length > 0

  const viewVersion = async (input: CourseInput) => {
    setFetchingUrl(input.input_id)
    try {
      const url = await getCourseInputUrl(cod_curso, input.input_id)
      setViewerSource({ kind: "url", url, fileName: input.filename })
    } finally {
      setFetchingUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const content_base64 = await fileToBase64(selectedFile)
      const parseRes = await axios.post(getParseUrl("silabus"), { content_base64, filename: selectedFile.name, cod_curso })
      const session_id = parseRes.data?.session_id ?? ""
      const s3_key = `sessions/${session_id}/${selectedFile.name}`
      const parsed = parseRes.data?.data ?? {}
      await createCourseInput(cod_curso, "silabus", selectedFile.name, s3_key, parsed)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      onUploaded()
    } catch (err: any) {
      setUploadError(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  if (!current) {
    return (
      <div style={{ border: "1px solid #e1e1e1", borderRadius: 8, background: "white", padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#242424", marginBottom: 4 }}>Sílabo</div>
        <div style={{ fontSize: 13, color: "#a19f9d", marginBottom: canManage ? 12 : 0 }}>Sin sílabo subido todavía.</div>
        {canManage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.xls" style={{ fontSize: 13, flex: 1, minWidth: 160 }}
              onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(null) }} disabled={uploading} />
            <button className="btn btn-primary btn-sm" disabled={!selectedFile || uploading} onClick={handleUpload} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {uploading ? <span className="spinner-sm" /> : <ArrowUploadRegular style={{ fontSize: 14 }} />}
              {uploading ? "Subiendo..." : "Subir"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
            <LockClosedRegular style={{ fontSize: 13 }} /> No tienes permiso para subir el sílabo de este curso.
          </div>
        )}
        {uploadError && <div style={{ marginTop: 8, fontSize: 12, color: "#d13438" }}>{uploadError}</div>}
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid #c8e6c9", borderRadius: 8, background: "#f6fbf6", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckmarkCircleRegular style={{ color: "#107c10", fontSize: 20 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#242424" }}>Sílabo</div>
          <div style={{ fontSize: 12.5, color: "#605e5c" }}>
            Subido: {formatDate(sorted[sorted.length - 1]?.uploaded_at ?? current.uploaded_at)}
            {wasModified && (
              <span style={{ marginLeft: 8, color: "var(--blue)", fontWeight: 700 }}>
                · Modificado — última versión: {formatDate(current.uploaded_at)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => viewVersion(current)}
          title="Ver sílabo actual"
          disabled={fetchingUrl === current.input_id}
          className="btn btn-primary btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          <EyeRegular style={{ fontSize: 15 }} />
          Ver sílabo
        </button>
      </div>

      <DocumentViewer open={viewerSource !== null} source={viewerSource} onClose={() => setViewerSource(null)} />

      {wasModified && (
        <div style={{ borderTop: "1px solid #dcefdc" }}>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)",
            }}
          >
            <HistoryRegular style={{ fontSize: 14 }} />
            Historial ({sorted.length} versiones)
            {historyOpen ? <ChevronUpRegular style={{ fontSize: 12, marginLeft: "auto" }} /> : <ChevronDownRegular style={{ fontSize: 12, marginLeft: "auto" }} />}
          </button>
          {historyOpen && (
            <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column" }}>
              {sorted.map((v, i) => (
                <div key={v.input_id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 14 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                      background: v.is_active ? "var(--success)" : "var(--border)",
                      boxShadow: v.is_active ? "0 0 0 3px rgba(39,121,62,.15)" : "none",
                    }} />
                    {i < sorted.length - 1 && <div style={{ width: 2, background: "var(--border)", flex: 1, minHeight: 18 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" }}>{v.filename}</span>
                      {v.is_active && <span className="badge badge-primary" style={{ fontSize: 9.5 }}>Actual</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(v.uploaded_at)}</div>
                    <button
                      onClick={() => viewVersion(v)}
                      disabled={fetchingUrl === v.input_id}
                      style={{ marginTop: 4, background: "none", border: "none", padding: 0, color: "var(--blue)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      <EyeRegular style={{ fontSize: 12 }} /> Ver esta versión
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canManage ? (
        <div style={{ borderTop: "1px solid #dcefdc", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.xls" style={{ fontSize: 13, flex: 1, minWidth: 160 }}
            onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(null) }} disabled={uploading} />
          <button className="btn btn-outline btn-sm" disabled={!selectedFile || uploading} onClick={handleUpload} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {uploading ? <span className="spinner-sm" /> : <ArrowUploadRegular style={{ fontSize: 14 }} />}
            {uploading ? "Subiendo..." : "Reemplazar sílabo"}
          </button>
        </div>
      ) : (
        <div style={{ borderTop: "1px solid #dcefdc", padding: "8px 16px", display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
          <LockClosedRegular style={{ fontSize: 12 }} /> No tienes permiso para reemplazar el sílabo de este curso.
        </div>
      )}

      {uploadError && (
        <div style={{ padding: "0 16px 10px", fontSize: 12, color: "#d13438" }}>{uploadError}</div>
      )}
    </div>
  )
}

// ─── InputDocumentCard ────────────────────────────────────────────────────────

interface InputCardProps {
  type: InputType
  label: string
  description: string
  cod_curso: string
  existing: CourseInput | undefined
  silabusInput: CourseInput | undefined
  onUploaded: () => void
  canManage: boolean
}

const InputDocumentCard: React.FC<InputCardProps> = ({
  type, label, description, cod_curso, existing, silabusInput, onUploaded, canManage,
}) => {
  const [uploading, setUploading]         = useState(false)
  const [uploadError, setUploadError]     = useState<string | null>(null)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [viewerSource, setViewerSource]   = useState<DocumentSource | null>(null)
  const [fetchingUrl, setFetchingUrl]     = useState(false)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const content_base64 = await fileToBase64(selectedFile)
      let body: Record<string, string>
      let session_id: string

      if (type === "silabus") {
        body = { content_base64, filename: selectedFile.name, cod_curso }
      } else if (type === "kickoff") {
        const sid = silabusInput ? extractSessionId(silabusInput.s3_key) : ""
        if (!sid) {
          setUploadError("Sube el sílabo primero — el kickoff se vincula a su sesión.")
          setUploading(false)
          return
        }
        body = { content_base64, filename: selectedFile.name, session_id: sid }
      } else {
        body = { content_base64, filename: selectedFile.name }
      }

      const parseRes = await axios.post(getParseUrl(type), body)
      session_id = parseRes.data?.session_id ?? ""
      if (!session_id && type === "kickoff" && silabusInput) {
        session_id = extractSessionId(silabusInput.s3_key)
      }

      const s3_key = `sessions/${session_id}/${selectedFile.name}`
      const parsed = parseRes.data?.data ?? {}

      await createCourseInput(cod_curso, type, selectedFile.name, s3_key, parsed)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      onUploaded()
    } catch (err: any) {
      setUploadError(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  const hasFile = !!existing

  return (
    <div style={{
      border: "1px solid",
      borderColor: hasFile ? "#c8e6c9" : "#e1e1e1",
      borderRadius: "8px",
      background: hasFile ? "#f6fbf6" : "white",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: "10px",
        borderBottom: hasFile || selectedFile ? "1px solid #f0f0f0" : "none",
      }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "8px",
          background: hasFile ? "#e8f5e9" : "#f3f2f1",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {hasFile ? (
            <CheckmarkCircleRegular style={{ color: "#107c10", fontSize: "20px" }} />
          ) : (
            <DocumentRegular style={{ color: "#605e5c", fontSize: "20px" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "15px", color: "#242424" }}>{label}</div>
          {hasFile ? (
            <div style={{ fontSize: "13px", color: "#605e5c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {existing!.filename}
              <span style={{ marginLeft: "8px", color: "#a19f9d" }}>{formatDate(existing!.uploaded_at)}</span>
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#a19f9d" }}>{description}</div>
          )}
        </div>
        {hasFile && (
          <button
            onClick={async () => {
              setFetchingUrl(true)
              try {
                const url = await getCourseInputUrl(cod_curso, existing!.input_id)
                setViewerSource({ kind: "url", url, fileName: existing!.filename })
              } finally { setFetchingUrl(false) }
            }}
            title="Ver documento"
            disabled={fetchingUrl}
            style={{
              background: "none", border: "none",
              cursor: fetchingUrl ? "wait" : "pointer",
              padding: "4px", color: "#0078d4",
              display: "flex", alignItems: "center", flexShrink: 0,
              borderRadius: "4px", opacity: fetchingUrl ? 0.5 : 1,
            }}
          >
            <EyeRegular style={{ fontSize: "18px" }} />
          </button>
        )}
      </div>

      <DocumentViewer open={viewerSource !== null} source={viewerSource} onClose={() => setViewerSource(null)} />

      {canManage ? (
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.xls"
            style={{ fontSize: "13px", flex: 1, minWidth: "160px" }}
            onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(null) }}
            disabled={uploading}
          />
          <button
            className={hasFile ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {uploading ? <span className="spinner-sm" /> : <ArrowUploadRegular style={{ fontSize: 14 }} />}
            {uploading ? "Subiendo..." : hasFile ? "Re-subir" : "Subir"}
          </button>
        </div>
      ) : (
        <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
          <LockClosedRegular style={{ fontSize: 12 }} /> No tienes permiso para gestionar este documento.
        </div>
      )}

      {uploadError && (
        <div style={{ padding: "0 16px 10px", fontSize: "12px", color: "#d13438" }}>{uploadError}</div>
      )}
    </div>
  )
}

// ─── ContextFilesSection ──────────────────────────────────────────────────────

const MAX_CONTEXT_FILE_MB = 10

interface ContextFilesSectionProps { cod_curso: string }

const ContextFilesSection: React.FC<ContextFilesSectionProps> = ({ cod_curso }) => {
  const [files,        setFiles]        = useState<ContextFile[]>([])
  const [loading,      setLoading]      = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  const refresh = () => {
    setLoading(true)
    listContextFiles(cod_curso)
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [cod_curso])

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadError(null)
    try {
      if (selectedFile.size > MAX_CONTEXT_FILE_MB * 1024 * 1024) {
        setUploadError(`El archivo supera el límite de ${MAX_CONTEXT_FILE_MB} MB`)
        return
      }
      const { file_id, upload_url } = await getContextFileUploadUrl(cod_curso, selectedFile.name, selectedFile.size)
      await axios.put(upload_url, selectedFile, { headers: { "Content-Type": "application/octet-stream" } })
      await extractContextFile(cod_curso, file_id)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      refresh()
    } catch (err: any) {
      setUploadError(err?.response?.data?.error ?? err?.message ?? "Error al subir archivo")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (file_id: string) => {
    try { await deleteContextFile(cod_curso, file_id); refresh() } catch { /* ignore */ }
  }

  const statusBadge = (f: ContextFile) => {
    if (f.status === "ready") return <span style={{ fontSize: "12px", color: "#107c10", fontWeight: 600 }}>Listo</span>
    if (f.status === "error") return <span style={{ fontSize: "12px", color: "#d13438", fontWeight: 600 }}>Error</span>
    return <span style={{ fontSize: "12px", color: "#797775" }}>Procesando…</span>
  }

  return (
    <section>
      <div style={{ fontWeight: 600, fontSize: "13px", color: "#605e5c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Material de referencia</span>
        {loading && <span className="spinner-sm" />}
      </div>
      <div style={{ fontSize: "13px", color: "#797775", marginBottom: "10px" }}>
        Sube PDFs, DOCX, TXT o XLSX que servirán de contexto para la generación del Material Base. Máx. {MAX_CONTEXT_FILE_MB} MB por archivo.
      </div>
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {files.map((f) => (
            <div key={f.file_id} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 12px", border: "1px solid #e1e1e1", borderRadius: "6px",
              background: f.status === "ready" ? "#f6fbf6" : "white",
            }}>
              <DocumentRegular style={{ color: "#605e5c", fontSize: "18px", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.filename}</div>
                <div style={{ fontSize: "12px", color: "#a19f9d" }}>
                  {f.char_count ? `${Math.round(f.char_count / 1000)}k chars · ` : ""}
                  {formatDate(f.created_at)}
                </div>
              </div>
              {statusBadge(f)}
              <button onClick={() => handleDelete(f.file_id)} title="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", color: "#d13438", padding: "2px 4px", borderRadius: "4px", flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.xlsx"
          style={{ fontSize: "13px", flex: 1, minWidth: "160px" }}
          onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(null) }}
          disabled={uploading}
        />
        <button
          className="btn btn-primary btn-sm"
          disabled={!selectedFile || uploading}
          onClick={handleUpload}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          {uploading ? <span className="spinner-sm" /> : <ArrowUploadRegular style={{ fontSize: 14 }} />}
          {uploading ? "Subiendo…" : "Subir"}
        </button>
      </div>
      {uploadError && <div style={{ marginTop: "6px", fontSize: "12px", color: "#d13438" }}>{uploadError}</div>}
    </section>
  )
}

// ─── CourseDetail ─────────────────────────────────────────────────────────────

interface CourseDetailProps {
  course: Course | null
  onSaved: (c: Course) => void
  onClose: () => void
  canManageInputs: boolean
}

const CourseDetail: React.FC<CourseDetailProps> = ({ course, onSaved, onClose, canManageInputs }) => {
  const isNew = course === null

  const [codCurso,   setCodCurso]   = useState(course?.cod_curso ?? "")
  const [name,       setName]       = useState(course?.name ?? "")
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [saved,      setSaved]      = useState<Course | null>(course)
  const [inputs,     setInputs]     = useState<CourseInput[]>([])
  const [loadingIns, setLoadingIns] = useState(false)

  useEffect(() => {
    setCodCurso(course?.cod_curso ?? "")
    setName(course?.name ?? "")
    setSaved(course)
    setSaveError(null)
    setInputs([])
  }, [course])

  useEffect(() => {
    if (!saved) return
    setLoadingIns(true)
    listCourseInputs(saved.cod_curso)
      .then(setInputs)
      .catch(() => setInputs([]))
      .finally(() => setLoadingIns(false))
  }, [saved])

  const handleSave = async () => {
    if (!codCurso.trim() || !name.trim()) { setSaveError("Completa todos los campos"); return }
    setSaving(true); setSaveError(null)
    try {
      const c = isNew
        ? await createCourse(codCurso.trim(), name.trim())
        : await updateCourse(codCurso.trim(), name.trim())
      setSaved(c)
      onSaved(c)
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? err?.message ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const refreshInputs = () => {
    if (!saved) return
    setLoadingIns(true)
    listCourseInputs(saved.cod_curso)
      .then(setInputs)
      .catch(() => setInputs([]))
      .finally(() => setLoadingIns(false))
  }

  const getInput = (type: InputType) => inputs.find((i) => i.type === type && i.is_active)
  const silabusInput = getInput("silabus")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0", height: "100%", fontFamily: "inherit" }}>
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid #e1e1e1",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "white", flexShrink: 0,
      }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#242424" }}>
          {isNew ? "Nuevo Curso" : saved ? `${saved.cod_curso} — ${saved.name}` : "Editar Curso"}
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <section>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#605e5c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Datos del curso
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="field">
              <label className="field-label">Código del curso *</label>
              <input className="field-input" value={codCurso} onChange={(e) => setCodCurso(e.target.value)} disabled={!isNew || saving} placeholder="Ej: INF101" />
            </div>
            <div className="field">
              <label className="field-label">Nombre *</label>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} placeholder="Ej: Fundamentos de Programación" />
            </div>
            {saveError && <span style={{ fontSize: "13px", color: "#d13438" }}>{saveError}</span>}
            <div>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {saving && <span className="spinner-sm" />}
                {saving ? "Guardando..." : isNew ? "Crear curso" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </section>

        {saved && (
          <section>
            <div style={{ fontWeight: 600, fontSize: "12px", color: "#605e5c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Documentos de entrada</span>
              {loadingIns && <span className="spinner-sm" style={{ border: "2px solid rgba(37,99,235,.2)", borderTopColor: "var(--blue)" }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {loadingIns && inputs.length === 0 ? (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className="spinner" />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Cargando documentos...</span>
                </div>
              ) : (
                INPUT_TYPES.map(({ key, label, description }) =>
                  key === "silabus" ? (
                    <SilabusCard
                      key={key}
                      cod_curso={saved.cod_curso}
                      allVersions={inputs.filter((i) => i.type === "silabus")}
                      canManage={canManageInputs}
                      onUploaded={refreshInputs}
                    />
                  ) : (
                    <InputDocumentCard
                      key={key}
                      type={key}
                      label={label}
                      description={description}
                      cod_curso={saved.cod_curso}
                      existing={getInput(key)}
                      silabusInput={silabusInput}
                      onUploaded={refreshInputs}
                      canManage={canManageInputs}
                    />
                  )
                )
              )}
            </div>
            {!silabusInput && (
              <div style={{ fontSize: "12px", color: "#a19f9d", marginTop: "8px" }}>
                Sube el sílabo primero — kickoff y bibliografía se vinculan a su sesión.
              </div>
            )}
          </section>
        )}

        {saved && <ContextFilesSection cod_curso={saved.cod_curso} />}
      </div>
    </div>
  )
}

// ─── CourseDetailModal ────────────────────────────────────────────────────────

const CourseDetailModal: React.FC<{ course: Course | null; onSaved: (c: Course) => void; onClose: () => void; canManageInputs: boolean }> = ({ course, onSaved, onClose, canManageInputs }) => (
  <div
    style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
  >
    <div style={{
      background: "white", borderRadius: "14px",
      width: "min(640px, 100%)", maxHeight: "85vh",
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    }}>
      <CourseDetail course={course} onSaved={onSaved} onClose={onClose} canManageInputs={canManageInputs} />
    </div>
  </div>
)

// ─── EmptyCoursesState ────────────────────────────────────────────────────────
// Shown when the current user has zero courses (nothing assigned to them, or
// nothing in the catalog yet for admins). Not functional yet — "Comunícate
// con DCI" is a placeholder per direct instruction, no email/chat wired up.

const EmptyCoursesState: React.FC<{ canCreate: boolean; onCreate: () => void }> = ({ canCreate, onCreate }) => (
  <div style={{
    alignSelf: "stretch", background: "white", borderRadius: 8,
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    gap: 12, padding: "56px 24px",
  }}>
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ display: "block" }}>
      <rect x="10" y="8" width="54" height="75" rx="4" fill="#F9FBFF" />
      <rect x="20" y="24" width="54" height="49" rx="4" fill="#EBF1F5" />
      <circle cx="36" cy="46" r="3" fill="#2C1232" />
      <circle cx="54" cy="46" r="3" fill="#2C1232" />
      <rect x="33" y="58" width="6.3" height="2.9" rx="1.4" fill="#E6AAB6" />
      <rect x="51" y="58" width="6.3" height="2.9" rx="1.4" fill="#E6AAB6" />
      <rect x="26" y="66" width="42" height="5" rx="2.5" fill="#B0C0CA" />
    </svg>
    <div style={{ maxWidth: 440, textAlign: "center", color: "#333333", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 400, lineHeight: "20px" }}>
      No tienes cursos asignados,<br />de ser incorrecto comunícate con el área de DCI
    </div>
    <button
      onClick={() => {}}
      className="btn btn-outline btn-sm"
      style={{ marginTop: 4 }}
    >
      Comunícate con DCI
    </button>
    {canCreate && (
      <button className="btn btn-primary btn-sm" onClick={onCreate} style={{ marginTop: 4 }}>
        + Nuevo Curso
      </button>
    )}
  </div>
)

// ─── CoursesPage ──────────────────────────────────────────────────────────────

const CoursesPage: React.FC = () => {
  const navigate = useNavigate()
  const onSelectCourse = (course: Course) => navigate(`/cursos/${course.cod_curso}`, { state: { courseName: course.name } })
  const { user } = useAuthStore()
  const role = user ? primaryRole(user) : "docente"
  // Assignments (Planificación) restrict which courses a non-admin sees —
  // previously listCourses() showed every course to everyone regardless of
  // role, so a Planificación assignment had no actual effect on visibility.
  // Admin/DDA keep full visibility (matches the same "isAdmin" set
  // processes-page.tsx already uses for cycle-level oversight actions);
  // everyone else only sees courses they're explicitly assigned to.
  const isAdmin = role === "admin" || role === "dda"
  const [courses,       setCourses]       = useState<Course[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState<string | null>(null)
  const [inputsSummary, setInputsSummary] = useState<Record<string, Record<string, boolean>>>({})
  // Modality lives on the course's process(es), not the course catalog
  // entity itself (a course can run different modalities across
  // cycles/semesters) — fetched alongside inputsSummary, same per-course
  // Promise.all pattern already used below. null = no process yet.
  const [modalityByCourse, setModalityByCourse] = useState<Record<string, Modalidad | null>>({})
  const [modalCourse,   setModalCourse]   = useState<Course | null | "new">(null)
  const [search,        setSearch]        = useState("")
  // "Tipo de enseñanza" filter — "" = todas.
  const [modalityFilter, setModalityFilter] = useState<Modalidad | "">("")
  // Group whose "Vincular con otro curso" modal is open — null = closed.
  const [linkModalGroup, setLinkModalGroup] = useState<CourseGroup | null>(null)
  // Used by canManageInputs() below to gate the sílabo modal's upload
  // controls — sílabo is the platform's most important input, so managing
  // it needs the real cursos.gestionar_inputs permission, not just "you can
  // see this course" (see 2026-07-17: this permission existed in the
  // catalog but was never actually enforced anywhere until now).
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([])

  const canManageInputs = (codCurso: string): boolean => {
    if (isAdmin) return true
    const effectiveRole = myAssignments.find((a) => a.cod_curso === codCurso)?.role ?? role
    return DEFAULT_ROLES.find((r) => r.code === effectiveRole)?.permissions.includes("cursos.gestionar_inputs") ?? false
  }

  const fetchCourses = async () => {
    setLoading(true); setLoadError(null)
    try {
      const all = await listCourses()
      let data = all
      if (!isAdmin && user?.sub) {
        const assignments = await listAssignmentsForUser(user.sub).catch(() => [])
        setMyAssignments(assignments)
        const allowed = new Set(assignments.map((a) => a.cod_curso))
        data = all.filter((c) => allowed.has(c.cod_curso))
      }
      setCourses(data)
      const summary: Record<string, Record<string, boolean>> = {}
      const modality: Record<string, Modalidad | null> = {}
      await Promise.all(
        data.map(async (c) => {
          try {
            const inp = await listCourseInputs(c.cod_curso)
            const map: Record<string, boolean> = {}
            inp.forEach((i) => { if (i.is_active) map[i.type] = true })
            summary[c.cod_curso] = map
          } catch { summary[c.cod_curso] = {} }
          try {
            const procs = await listProcesses({ cod_curso: c.cod_curso })
            modality[c.cod_curso] = procs[0]?.modalidad ?? null
          } catch { modality[c.cod_curso] = null }
        })
      )
      setInputsSummary(summary)
      setModalityByCourse(modality)
    } catch (err: any) {
      setLoadError(err?.response?.data?.message ?? err?.message ?? "Error al cargar cursos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCourses() }, [])

  // Memoized on primitives, not on `courses`/`loading` object identity — the
  // steps array must stay referentially stable across re-renders or the
  // registration effect below (and AppShell's own state update) bounce forever.
  const hasCourses = courses.length > 0
  const tourSteps = useMemo(() => (loading ? null : cursosListTourSteps(hasCourses)), [loading, hasCourses])
  usePageTour("cursos-list", tourSteps)

  const handleSaved = (c: Course) => { fetchCourses(); setModalCourse(c) }

  const modalCourseProp = modalCourse === "new" ? null : (modalCourse as Course | null)

  const groups = groupCourses(courses)
  const filteredGroups = groups.filter((g) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matches = g.members.some((c) => c.name.toLowerCase().includes(q) || c.cod_curso.toLowerCase().includes(q))
      if (!matches) return false
    }
    if (modalityFilter) {
      const matches = g.members.some((c) => modalityByCourse[c.cod_curso] === modalityFilter)
      if (!matches) return false
    }
    return true
  })
  // Within a group, prefer the presencial/remoto member as the "primary"
  // row (matches the meeting's "presencial es la base" convention) — falls
  // back to whichever member sorts first when modality isn't known yet.
  const primaryOf = (g: CourseGroup): Course =>
    g.members.find((c) => modalityByCourse[c.cod_curso] === "remoto_presencial") ?? g.members[0]

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "flex-start", gap: 16, padding: "24px 28px", boxSizing: "border-box",
      background: "var(--content-bg)", minHeight: "100%", fontFamily: "'Lato', sans-serif",
    }}>
      {/* Page title */}
      <div style={{ color: "#1B1B1B", fontSize: 24, fontFamily: "'Lato', sans-serif", fontWeight: 700, lineHeight: "32px" }}>
        Cursos
      </div>

      {/* Filter card */}
      <div style={{ alignSelf: "stretch", padding: 16, background: "white", borderRadius: 4, boxShadow: "var(--shadow-figma)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 0", minWidth: 220, maxWidth: 480, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ color: "#161D1F", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 700, lineHeight: "20px" }}>Curso</div>
            <div className="search-bar" data-tour="cursos-search" style={{ border: "1px solid #7A959F", borderRadius: 4 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ingresa y selecciona el nombre o código del curso"
              />
              <span className="search-icon"><SearchRegular style={{ fontSize: 16, color: "var(--teal)" }} /></span>
            </div>
          </div>

          <div style={{ width: 250, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ color: "#161D1F", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 700, lineHeight: "20px" }}>Tipo de enseñanza</div>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value as Modalidad | "")}
              style={{
                padding: "8px 16px", background: "white", borderRadius: 4, border: "1px solid #7A959F",
                fontSize: 14, fontFamily: "'Lato', sans-serif", color: modalityFilter ? "#1B1B1B" : "#7A959F",
                height: 38, cursor: "pointer",
              }}
            >
              <option value="">Selecciona una opción</option>
              <option value="virtual_24_7">Virtual</option>
              <option value="remoto_presencial">Presencial/Remoto</option>
            </select>
          </div>

          <button
            className="btn btn-outline"
            onClick={() => { setSearch(""); setModalityFilter("") }}
            disabled={!search && !modalityFilter}
            style={{
              height: 40, padding: "0 24px", borderRadius: 4,
              border: `1px solid ${(!search && !modalityFilter) ? "#C6C6C6" : "var(--border-input)"}`,
              color: (!search && !modalityFilter) ? "#C6C6C6" : "var(--text-primary)",
              background: "white", fontWeight: 700,
            }}
          >
            Limpiar
          </button>

          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => setModalCourse("new")}
              style={{ height: 40 }}
              data-tour="cursos-nuevo-btn"
            >
              + Nuevo Curso
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      {!loading && !loadError && courses.length > 0 && (
        <div style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 400, lineHeight: "20px" }}>
          Cursos: {filteredGroups.length} de {groups.length}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 48 }}>
          <div className="spinner" />
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Buscando resultados</span>
        </div>
      ) : loadError ? (
        <div style={{ alignSelf: "stretch", background: "var(--surface)", borderRadius: 8, padding: 32, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>
          {loadError}
        </div>
      ) : courses.length === 0 ? (
        <EmptyCoursesState canCreate={isAdmin} onCreate={() => setModalCourse("new")} />
      ) : (
        <div style={{ alignSelf: "stretch", boxShadow: "var(--shadow-figma)", overflow: "hidden", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ flex: "1 1 0", height: 48, padding: "0 16px", background: "#D5E5F0", display: "flex", alignItems: "center" }}>
              <span style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Curso</span>
            </div>
            <div style={{ flex: "1 1 0", height: 48, padding: "0 16px", background: "#D5E5F0", display: "flex", alignItems: "center" }}>
              <span style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Modalidad</span>
            </div>
            <div style={{ width: 100, height: 48, padding: "0 16px", background: "#D5E5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Sílabo</span>
            </div>
            <div style={{ width: 100, height: 48, padding: "0 16px", background: "#D5E5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Ingresar</span>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div style={{ background: "white", textAlign: "center", color: "var(--text-muted)", padding: "32px 16px" }}>
              Sin resultados para "{search}"
            </div>
          ) : filteredGroups.map((g, i) => {
            const c = primaryOf(g)
            const s = inputsSummary[c.cod_curso] ?? {}
            const modality = modalityByCourse[c.cod_curso]
            const otherMembers = g.members.filter((m) => m.cod_curso !== c.cod_curso)
            return (
              <div key={g.key} data-tour={i === 0 ? "cursos-row" : undefined} style={{ borderTop: "1px solid #E2E2E2", background: "white" }}>
                <div onClick={() => onSelectCourse(c)} style={{ display: "flex", alignItems: "center", cursor: "pointer", minHeight: 80 }}>
                  <div style={{ flex: "1 1 0", padding: 16, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                    <div style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>{c.name}</div>
                    <div style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>{c.cod_curso}</div>
                  </div>

                  <div style={{ flex: "1 1 0", padding: 16, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: modality ? MODALIDAD_BAR_COLOR[modality] : "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{ color: "#1B1B1B", fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>
                        {modality ? MODALIDAD_SHORT_LABEL[modality] : "Sin modalidad"}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLinkModalGroup(g) }}
                        title="Vincular con otro curso (misma sesión de clase, otra modalidad)"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", padding: 2, borderRadius: 4,
                          display: "inline-flex", alignItems: "center", marginLeft: 4,
                        }}
                      >
                        <LinkRegular style={{ fontSize: 15 }} />
                      </button>
                    </div>
                    {/* Sibling modalities of the same course — presencial/remoto is the
                        base above; other modalities show here as chips instead of their
                        own separate row (see 2026-07-16 meeting notes). */}
                    {otherMembers.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {otherMembers.map((m) => {
                          const mModality = modalityByCourse[m.cod_curso]
                          return (
                            <button
                              key={m.cod_curso}
                              onClick={(e) => { e.stopPropagation(); onSelectCourse(m) }}
                              title={m.name}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: "pointer",
                                border: `1px solid ${mModality ? MODALIDAD_BAR_COLOR[mModality] : "var(--border)"}`,
                                background: "var(--surface)", color: "var(--text-secondary)",
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: mModality ? MODALIDAD_BAR_COLOR[mModality] : "var(--text-muted)" }} />
                              {mModality ? MODALIDAD_SHORT_LABEL[mModality] : "Sin modalidad"} — {m.cod_curso}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ width: 100, display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setModalCourse(c) }}
                      title={s["silabus"] ? "Ver documentos" : "Sin sílabo — subir documentos"}
                      data-tour={i === 0 ? "cursos-row-silabo-btn" : undefined}
                      className="icon-btn"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: s["silabus"] ? "var(--teal)" : "var(--text-muted)",
                        padding: 8, borderRadius: 4,
                        display: "inline-flex", alignItems: "center",
                      }}
                    >
                      <EyeRegular style={{ fontSize: 22 }} />
                    </button>
                  </div>

                  <div style={{ width: 100, display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectCourse(c) }}
                      title="Ingresar al curso"
                      data-tour={i === 0 ? "cursos-row-ingresar-btn" : undefined}
                      className="icon-btn"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--teal)", padding: 8, borderRadius: 4,
                        display: "inline-flex", alignItems: "center",
                      }}
                    >
                      <ArrowRightRegular style={{ fontSize: 22 }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Document management modal */}
      {modalCourse !== null && (
        <CourseDetailModal
          course={modalCourseProp}
          onSaved={handleSaved}
          onClose={() => setModalCourse(null)}
          canManageInputs={modalCourseProp ? canManageInputs(modalCourseProp.cod_curso) : true}
        />
      )}

      {/* Link-to-another-modality modal */}
      {linkModalGroup && (
        <LinkGroupModal
          group={linkModalGroup}
          allCourses={courses}
          onLinked={() => { fetchCourses(); setLinkModalGroup(null) }}
          onClose={() => setLinkModalGroup(null)}
        />
      )}
    </div>
  )
}

// ─── LinkGroupModal ───────────────────────────────────────────────────────────
// Links two REAL, already-existing courses as modality variants of "the same"
// course — never creates or fabricates a course. Picks a target from the
// existing catalog and sets course_group_id on both to the anchor group's key
// (the primary/first member's own cod_curso, so it's stable and inspectable).

const LinkGroupModal: React.FC<{
  group: CourseGroup
  allCourses: Course[]
  onLinked: () => void
  onClose: () => void
}> = ({ group, allCourses, onLinked, onClose }) => {
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const memberCodes = new Set(group.members.map((m) => m.cod_curso))
  const candidates = allCourses.filter((c) => {
    if (memberCodes.has(c.cod_curso)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.cod_curso.toLowerCase().includes(q)
  })

  const groupKey = group.key

  const link = async (target: Course) => {
    setSaving(true); setError("")
    try {
      // Bring every current member (in case this group already has >1) plus
      // the new target under the same group_id in one go.
      await Promise.all([
        ...group.members.filter((m) => m.course_group_id !== groupKey).map((m) => linkCourseGroup(m.cod_curso, groupKey)),
        linkCourseGroup(target.cod_curso, groupKey),
      ])
      onLinked()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "No se pudo vincular")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", width: 460, maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-strong)" }}>Vincular con otra modalidad</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
            Elige el curso que es la misma clase, dictada en otra modalidad — no se crea ningún curso nuevo, solo se enlazan dos que ya existen.
          </div>
        </div>
        <div style={{ padding: "12px 20px" }}>
          <div className="search-bar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar curso por nombre o código" autoFocus />
            <span className="search-icon"><SearchRegular style={{ fontSize: 16 }} /></span>
          </div>
        </div>
        {error && <div style={{ margin: "0 20px 10px", padding: "8px 12px", background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 6, fontSize: 12.5 }}>{error}</div>}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {candidates.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 13 }}>Sin resultados</div>
          ) : candidates.map((c) => (
            <button
              key={c.cod_curso}
              disabled={saving}
              onClick={() => link(c)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}
            >
              <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-strong)" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.cod_curso}</div>
            </button>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default CoursesPage
