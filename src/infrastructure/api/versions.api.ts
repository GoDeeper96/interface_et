import axios from "axios"
import { API_CONFIG } from "../config/api-config"

// Real backend-calling module for the version manager — replaces the
// localStorage-only Compuerta/Historial stubs in weeks.api.ts. A version's
// content is mutable only while review_status === "open"; the backend
// enforces that (409 otherwise), this module just surfaces it.

export type ArtifactType = "ipes" | "mb"
export type ReviewStatus = "open" | "in_review" | "changes_requested" | "approved"
export type VersionSource = "ai_generated" | "human_edit" | "revert"

export interface AuthorInfo {
  sub?: string
  email: string
  given_name?: string
  family_name?: string
  role?: string
}

export interface VersionSummary {
  version_id: string
  iteration_id: string
  artifact_type: ArtifactType
  week: number
  // Distinguishes multiple sessions/IPs within one week for presencial/remoto
  // (a week can have several sessions there); virtual 24/7 is always 1 and
  // never shows this in its UI. Defaults to 1 everywhere.
  session: number
  version_number: number
  review_status: ReviewStatus
  is_current: boolean
  source: VersionSource
  created_by: AuthorInfo | null
  based_on_version_id: string
  reverted_from_version_id: string
  observation_count: number
  created_at: string
  updated_at: string
}

export interface VersionContent extends VersionSummary {
  content: any
}

export interface Observation {
  observation_id: string
  version_id: string
  iteration_id: string
  artifact_type: ArtifactType
  week: number
  text: string
  // Anchor — which field this observation is about (field_path/field_label),
  // and optionally the exact substring the reviewer selected within it
  // (quote). The editor re-finds `quote` by searching the field's CURRENT
  // text for it ("quote anchor" — same technique web annotation tools like
  // hypothes.is use), so the highlight survives unrelated content edits
  // instead of relying on a fixed, fragile character offset. All optional —
  // older/legacy observations have none of these and just show as plain text.
  field_path?: string | null
  field_label?: string | null
  quote?: string | null
  created_by: AuthorInfo
  created_at: string
  resolved_by_version_id: string | null
  resolved_at: string | null
}

// What the composer UI builds before submitting — a plain string is still
// accepted (unanchored, legacy shape) alongside the anchored object form.
export type ObservationInput = string | { text: string; field_path?: string; field_label?: string; quote?: string }

export interface VersionTimeline {
  versions: VersionSummary[]
  observations_by_version: Record<string, Observation[]>
}

export async function ensureInitialVersion(iterationId: string, artifactType: ArtifactType, week: number, session: number = 1): Promise<VersionSummary> {
  // silent: true — a 404 here ("no source content found") is expected and
  // common right after launching a course: the native generation pipeline
  // hasn't reached this week yet. ipes-week-editor.tsx/mb-week-editor.tsx
  // already show a dedicated "still generating" state for it; the global
  // axios interceptor's error toast would be redundant (and confusing,
  // since it reads as a real failure rather than "not ready yet").
  const r = await axios.post(API_CONFIG.VERSIONS_ENSURE_URL(iterationId), { artifact_type: artifactType, week, session }, { silent: true } as any)
  return r.data
}

export async function getTimeline(iterationId: string, artifactType: ArtifactType, week: number, session: number = 1): Promise<VersionTimeline> {
  const r = await axios.get(API_CONFIG.VERSIONS_TIMELINE_URL(iterationId, artifactType, week, session))
  return r.data
}

export async function getVersionContent(iterationId: string, versionId: string): Promise<VersionContent> {
  const r = await axios.get(API_CONFIG.VERSION_URL(iterationId, versionId))
  return r.data
}

export async function saveCurrentVersionContent(iterationId: string, versionId: string, content: any): Promise<void> {
  await axios.patch(API_CONFIG.VERSION_URL(iterationId, versionId), { content })
}

export async function submitForReview(iterationId: string, versionId: string): Promise<{ version_id: string; review_status: ReviewStatus }> {
  const r = await axios.post(API_CONFIG.VERSION_SUBMIT_REVIEW_URL(iterationId, versionId), {})
  return r.data
}

export async function submitObservationBatch(iterationId: string, versionId: string, observations: ObservationInput[]): Promise<{ version_id: string; observations: Observation[] }> {
  const r = await axios.post(API_CONFIG.VERSION_OBSERVATIONS_URL(iterationId, versionId), { observations })
  return r.data
}

export async function resolveAndResubmit(iterationId: string, versionId: string, content: any, sendToReview: boolean): Promise<VersionSummary> {
  const r = await axios.post(API_CONFIG.VERSION_RESOLVE_URL(iterationId, versionId), { content, send_to_review: sendToReview })
  return r.data
}

export async function approveVersion(iterationId: string, versionId: string): Promise<{ version_id: string; review_status: ReviewStatus }> {
  const r = await axios.post(API_CONFIG.VERSION_APPROVE_URL(iterationId, versionId), {})
  return r.data
}

export async function revertToVersion(iterationId: string, versionId: string): Promise<VersionSummary> {
  const r = await axios.post(API_CONFIG.VERSION_REVERT_URL(iterationId, versionId), {})
  return r.data
}

// Per-week cabecera summary — curso, unidad, logro_unidad, tipos_ensenanza,
// tiempo_sesion_segundos, logro_curso. These are course/unit/week-level
// fields (moved out of the per-session Cabecera table, see ipes-cabecera.tsx)
// — curso/logro_curso are course-level (same value on every week, rendered
// once in the page's top header), unidad/logro_unidad/tipos_ensenanza/
// tiempo_sesion_segundos are per-week. Always sourced from IPES content
// server-side, even for artifact_type "mb" (Material Base never generates its
// own cabecera). Read-only, doesn't create version rows for weeks that don't
// have one yet.
export interface CabeceraIndexEntry {
  week: number
  curso: string
  unidad: string
  logro_unidad: string
  tipos_ensenanza: string
  tiempo_sesion_segundos: number
  logro_curso: string
  // Real data (version + observations tables), session 1 only — see
  // versions/handler.py::_units_index. Powers the Unidad→Semana tree's
  // status/observation badges (iteration-weeks-view.tsx's SessionTree).
  review_status: ReviewStatus | null
  unresolved_count: number
  // Session topic (introduccion.nombre_de_la_sesion, falls back to the
  // first presentación's tema) and a real 0-100 fill-in completion %
  // (situación inicial / presentaciones / ejercicios weighted) — both read
  // from content already fetched server-side, not fabricated.
  tema: string
  completion_pct: number
  // Per-session tema — session 1 mirrors `tema` above; 2+ are probed
  // server-side (bounded, stops at the first session with no saved version
  // yet), so a week's multi-session sub-rows can show their own topic
  // instead of a bare "Sesión N". Absent/partial on older cached responses.
  session_temas?: Record<number, string>
}

export async function getCabeceraIndex(iterationId: string, artifactType: ArtifactType, weekCount: number = 18): Promise<Record<number, CabeceraIndexEntry>> {
  const r = await axios.get(API_CONFIG.UNITS_INDEX_URL(iterationId), { params: { artifact_type: artifactType, week_count: weekCount } })
  const out: Record<number, CabeceraIndexEntry> = {}
  for (const w of r.data?.weeks ?? []) out[w.week] = w
  return out
}

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  open:               "En curso",
  in_review:          "Pendiente de revisión",
  changes_requested:  "Observado",
  approved:           "Completado",
}

// Same palette as compuerta-panel.tsx's STATE_CFG colors — kept here too so
// version-timeline.tsx (which has no reason to import a page component) can
// share it without duplicating hex values.
export const REVIEW_STATUS_COLOR: Record<ReviewStatus, string> = {
  open:               "#037775",
  in_review:          "#006CC0",
  changes_requested:  "#D11C26",
  approved:           "#27793E",
}
