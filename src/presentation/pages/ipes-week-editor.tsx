import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { HistoryRegular, InfoRegular, FullScreenMaximizeRegular, FullScreenMinimizeRegular, SparkleRegular, DismissRegular } from "@fluentui/react-icons"
import {
  ensureInitialVersion, getTimeline, getVersionContent, saveCurrentVersionContent, revertToVersion,
  submitObservationBatch, REVIEW_STATUS_LABEL,
} from "../../infrastructure/api/versions.api"
import type { VersionSummary, VersionContent, VersionTimeline as VersionTimelineData, Observation, ObservationInput } from "../../infrastructure/api/versions.api"
import { regenerateIpesWeek } from "../../infrastructure/api/weeks.api"
import { Cabecera, cabeceraFromRawIpes, type CabeceraData } from "./ipes-cabecera"
import VersionTimeline from "../components/version-timeline"
import AiAssistButton from "../components/ai-assist-button"
import ObservationFlag from "../components/observation-flag"
import SplitterHandle from "../components/splitter-handle"
import ColumnSplitters from "../components/column-splitters"
import AutoGrowTextarea from "../components/auto-grow-textarea"
import { TIPO_OPTIONS, TIPO_RECURSO_INFO, TIPO_RECURSO_COLOR, FACTOR_MAP, ACTIVITY_FACTOR } from "../constants/tipo-recurso"
import WeekNavControl from "../components/week-nav-control"
import { usePageTour } from "../components/tour-context"
import { ipesEditorTourSteps } from "../constants/page-tours"
import { useAuthStore } from "../../infrastructure/store/auth-store"

const TOAST_EXIT_MS = 220

// ── Types ────────────────────────────────────────────────────────────────────
// Matches the updated IPES format (NuevoIPES.xlsm) — the pedagogical section
// names changed from Introducción/Presentación/Ejercicios/Summary to
// Inicio/Transformación/Práctica/Cierre. Field order within each section
// follows the xlsm row order exactly, since that's the tool the team already
// knows. Field names keep the backend's existing Spanish keys
// (introduccion/presentaciones/ejercicios in domain/output/ipes.ts) where
// they already exist; new fields the backend doesn't generate yet (Cierre,
// tipos de enseñanza, tiempo de sesión) are UI-only for now, filled in by
// hand until generation catches up — see the note left for the team about
// prompt gaps.

// TIPO_OPTIONS/TIPO_RECURSO_INFO/TIPO_RECURSO_COLOR/FACTOR_MAP/ACTIVITY_FACTOR
// moved to ../constants/tipo-recurso — shared with mb-week-editor.tsx so
// Material Base's resource tags use the exact same colors (see import above).

// Real catalog from RxF!H3:H28 (25 named activities) — previously only
// exposed as a flat Calificada/No Calificada toggle. Each activity is
// pre-classified AC/ANC (RxF!I3:I28); that classification is DERIVED from
// which activity is picked, not chosen independently — matches the xlsm
// exactly and resolves the ambiguity the team debated in the meeting about
// what "tipo de actividad" should mean.
const ACTIVITY_CATALOG: Record<string, "AC" | "ANC"> = {
  "Actividad en H5P":                    "ANC",
  "Actividad en Storyline":              "ANC",
  "Análisis de Caso":                    "AC",
  "Avance de Informe":                   "AC",
  "Avance de Portafolio":                "AC",
  "Avance de Proyecto Final":            "AC",
  "Avance de Trabajo de Investigación":  "AC",
  "Control de Lectura":                  "AC",
  "Cuestionario de autoevaluación":      "ANC",
  "Debate":                              "AC",
  "Examen de Entrada":                   "AC",
  "Examen Final":                        "AC",
  "Examen Parcial":                      "AC",
  "Exposición":                          "AC",
  "Foro":                                "ANC",
  "Informe Final":                       "AC",
  "Laboratorio Calificado":              "AC",
  "Participación":                       "AC",
  "Portafolio Final":                    "AC",
  "Práctica Calificada":                 "AC",
  "Proyecto Final":                      "AC",
  "Simulación":                          "AC",
  "Tarea":                               "ANC",
  "Tarea Académica":                     "AC",
  "Trabajo de Investigación":            "AC",
}
const ACTIVITY_OPTIONS = Object.keys(ACTIVITY_CATALOG)

const ACTIVITY_CLASS_LABEL: Record<"AC" | "ANC", string> = { AC: "Calificada", ANC: "No calificada" }

const FIELD_DEFS: Record<string, string> = {
  situacion_inicial:           "El caso, pregunta o escenario que activa lo que el estudiante ya sabe antes de enseñar algo nuevo.",
  proposito_situacion_inicial: "Qué se busca lograr con esa situación inicial — normalmente identificar o reflexionar, no todavía enseñar.",
  tipo_recurso_inicio:         "Formato del recurso de inicio.",
  tiempo_inicio:               "Duración estimada del recurso de inicio.",
  subtema:                     "El recorte específico del tema que cubre este recurso — un tema suele tener varios subtemas.",
  proposito_del_recurso:       "Qué logra el estudiante con este recurso en particular — usa verbo + tema + condición (ej. 'Reconocer la perspectiva biológica…').",
  tipo_recurso:                "Formato de este recurso.",
  tiempo_recurso:              "Duración estimada de este recurso.",
  detalles_del_recurso:        "Descripción del contenido: organización, ejemplos, casos, imágenes — lo que el redactor necesita para producirlo.",
  tipo_actividad:              "El tipo específico de actividad (Foro, Tarea, Examen Final…) — si es calificada o no se determina automáticamente según cuál elijas.",
  proposito_actividad:         "Qué logra el estudiante con esta actividad — verbo + tema + condición.",
  tiempo_actividad:            "Duración estimada de la actividad.",
  detalle_actividad:           "Descripción detallada: tipo de ejercicio, ejemplos, criterios de evaluación si corresponde.",
  requiere_cierre_adicional:   "Marca si esta semana necesita un recurso o actividad extra además del resumen de cierre.",
  proposito_cierre:            "Qué logra el estudiante con el recurso adicional de cierre, si esta semana lo necesita.",
  resumen_cierre:              "Las ideas clave de la semana que se mostrarán en el HTML de cierre — el repaso final que ve el estudiante.",
}

interface Recurso {
  tema: string
  subtema: string
  proposito_del_recurso: string
  tipo_recurso: string
  tiempo_estimado: number   // seconds
  detalles_del_recurso: string
}

// A week can have more than one activity — Práctica is a list, same shape as
// Transformación's recursos, not a single scalar set of fields.
interface Actividad {
  tipo_actividad: string
  proposito_actividad: string
  tiempo_actividad: number   // seconds
  detalle_actividad: string
}

interface IPESData {
  // Cabecera — shared with mb-week-editor.tsx via ipes-cabecera.tsx
  cabecera: CabeceraData
  horas_estudio_semanales: number

  semana: number

  // Inicio (ex-Introducción)
  situacion_inicial: string
  proposito_situacion_inicial: string
  tipo_recurso_inicio: string
  tiempo_inicio: number

  // Transformación (ex-Presentación) — grouped by tema
  recursos: Recurso[]

  // Práctica (ex-Ejercicios) — a week can have more than one activity
  actividades: Actividad[]

  // Cierre (ex-Summary) — not generated by the backend yet, filled by hand
  requiere_cierre_adicional: boolean
  nombre_actividad_cierre: string
  proposito_cierre: string
  tipo_recurso_cierre: string
  resumen_cierre: string
}

interface Props {
  iterationId: string
  weekNumber: number
  // Distinguishes multiple sessions/IPs within one week for presencial/remoto
  // (a week there can have several sessions); virtual 24/7 leaves this at its
  // default of 1 and never shows a session selector.
  sessionNumber?: number
  // Total sessions this week is split across (see getSessionCount in
  // weeks.api.ts) — needed by "Generar Sesión con IA" so the backend can
  // time-slice the week's content across sessions instead of regenerating
  // the whole week again for every session.
  sessionCount?: number
  readonly?: boolean
  onChange?: (hasChanges: boolean) => void
  // Only "ea"/"admin" can observe (mirrors compuerta-panel.tsx's canReview) —
  // needed here (not just in the Compuerta tab) so a reviewer can flag a
  // SPECIFIC field while looking at the actual content, not a flat side list.
  userRole?: string
  // Lifted to the parent (iteration-weeks-view.tsx) — this component is
  // remounted (key includes week/session) whenever the week changes, so
  // local focus-mode state would reset to false the moment the user
  // navigated weeks from inside it. weekCount/onNavigateWeek drive the
  // prev/next/goto-week controls shown while focused.
  focusMode?: boolean
  onToggleFocusMode?: () => void
  onNavigateWeek?: (week: number) => void
  weekCount?: number
  unitsByWeek?: Record<number, string>
  // Reports this session's live "tiempo de dedicación" total up to the
  // parent (iteration-weeks-view.tsx), which now renders it in the main
  // header (below "Logro de la unidad") instead of inside this editor's own
  // Cabecera — see SessionTimeRow in ipes-cabecera.tsx.
  onDedicacionChange?: (totalSegundos: number) => void
  // Surfaces the "Solicitar Revisión" action in this editor's own toolbar
  // (the send-to-review flow itself still lives in compuerta-panel.tsx,
  // reached via the Compuerta tab — this just jumps there) — added so the
  // action has a visible spot now that Guardar is hidden, see 2026-07-24.
  onRequestReview?: () => void
}

function Spinner() {
  return <div className="spinner-sm-dark" />
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

function parseDuration(text: string): number {
  const parts = text.split(":").map((p) => parseInt(p, 10) || 0)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(text) || 0
}

function dedicacion(tipo: string, tiempo: number, isActivity = false): number {
  const factor = isActivity ? ACTIVITY_FACTOR : (FACTOR_MAP[tipo] ?? 1)
  return tiempo * factor
}

// ── Raw backend payload → editor shape ──────────────────────────────────────
// The backend generates introduccion/presentaciones/ejercicios (see
// domain/output/ipes.ts) — it does not generate a "cierre" section, a
// "tiempo_sesion_segundos" budget, or "tipos_ensenanza" yet, so those default
// empty/zero and are filled in by hand until generation catches up.

function fromRaw(raw: any, weekNumber: number): IPESData {
  const intro = raw?.introduccion ?? {}
  const ejercicios = raw?.ejercicios ?? {}
  const cierre = raw?.cierre ?? {}
  const tiempoActividad = Array.isArray(ejercicios.tiempo_actividad)
    ? Number(ejercicios.tiempo_actividad[0]) || 0
    : Number(ejercicios.tiempo_actividad) || 0

  return {
    cabecera: cabeceraFromRawIpes(raw),
    horas_estudio_semanales: Number(intro.horas_de_estudio_semanales) || 0,

    semana: raw?.semana ?? weekNumber,

    situacion_inicial:           intro.situacion_inicial ?? "",
    proposito_situacion_inicial: intro.proposito_de_la_si ?? "",
    tipo_recurso_inicio:         intro.tipo_recurso ?? "HTML",
    tiempo_inicio:               Number(intro.tiempo_estimado) || 0,

    recursos: (raw?.presentaciones ?? []).map((p: any) => ({
      tema:                   p.tema ?? "",
      subtema:                p.subtema ?? "",
      proposito_del_recurso:  p.proposito_del_recurso ?? "",
      tipo_recurso:           p.tipo_recurso ?? "Video Explicativo",
      tiempo_estimado:        Number(p.tiempo_estimado) || 0,
      detalles_del_recurso:   p.detalles_del_recurso ?? "",
    })),

    // Backend only ever generates one activity per week today — seed the
    // list with it; the user adds more from the editor (no AI source for
    // activity 2+, same situation as Transformación's extra recursos).
    actividades: [{
      tipo_actividad:      ejercicios.tipo_actividad ?? "",
      proposito_actividad: ejercicios.proposito_actividad ?? "",
      tiempo_actividad:    tiempoActividad,
      detalle_actividad:   ejercicios.detalle_actividad ?? "",
    }],

    requiere_cierre_adicional: !!cierre.requiere_cierre_adicional,
    nombre_actividad_cierre:   cierre.nombre_actividad_cierre ?? "",
    proposito_cierre:          cierre.proposito_cierre ?? "",
    tipo_recurso_cierre:       cierre.tipo_recurso_cierre ?? "HTML",
    resumen_cierre:            cierre.resumen_cierre ?? "",
  }
}

// Version 1 of every week is backfilled server-side straight from the original
// generation-pipeline output (introduccion/presentaciones/ejercicios shape) —
// only that raw shape needs fromRaw(). Every later version (human_edit/revert)
// was created FROM data already in IPESData shape (it's exactly what handleSave
// / handleRevert sent as `content`), so it's used as-is.
function contentToIPESData(version: VersionContent, weekNumber: number): IPESData {
  if (version.source === "ai_generated") return fromRaw(version.content, weekNumber)
  const content = version.content as any
  // Versions saved before Práctica became a list (single tipo_actividad/
  // proposito_actividad/... scalars) — migrate in place so old versions
  // still load instead of crashing on data.actividades.map(...).
  if (!Array.isArray(content.actividades)) {
    content.actividades = [{
      tipo_actividad:      content.tipo_actividad ?? "",
      proposito_actividad: content.proposito_actividad ?? "",
      tiempo_actividad:    content.tiempo_actividad ?? 0,
      detalle_actividad:   content.detalle_actividad ?? "",
    }]
  }
  return content as IPESData
}

function groupByTema(recursos: Recurso[]): { tema: string; items: number[] }[] {
  const groups: { tema: string; items: number[] }[] = []
  recursos.forEach((r, idx) => {
    const last = groups[groups.length - 1]
    if (last && last.tema === r.tema) last.items.push(idx)
    else groups.push({ tema: r.tema, items: [idx] })
  })
  return groups
}

// ── Section shell ────────────────────────────────────────────────────────────

// The xlsm shows Inicio/Transformación/Práctica/Cierre as a narrow vertical
// column running the full height of the section (e.g. B14:B16 merged for
// "Inicio") — not a wide horizontal title bar. A bar wastes almost all of its
// width on empty space next to a six-letter word; a side column uses that
// same space to hold the section instead of wasting it.
// Card body is individually resizable (drag its bottom-right corner) — same
// native resize:vertical convention as the cabecera and every textarea, so
// a whole section (e.g. a long Transformación with many recursos) can be
// shrunk to a scrollable window without shrinking the others.
// Card title runs vertically (writing-mode, not a horizontal title bar) —
// matches the xlsm's own narrow merged label columns (e.g. B14:B16 for
// "Inicio") more closely than a wide horizontal bar ever did, and leaves
// nearly all the card's width for the fields themselves. Both the label/
// content split and the card's height are real splitter bars (drag to
// resize), not native `resize` corners — width starts narrow (44px, just
// enough for the vertical label) and height starts at the content's natural
// size (undefined = auto) until the user drags it.
function Section({ label, def, showDefs, children, tourTag }: { label: string; def?: string; showDefs: boolean; children: React.ReactNode; tourTag?: string }) {
  const [labelWidth, setLabelWidth] = useState(44)
  const [bodyHeight, setBodyHeight] = useState<number | undefined>(undefined)
  const bodyRef = useRef<HTMLDivElement>(null)
  const dragBaseWidth = useRef(0)
  const dragBaseHeight = useRef(0)

  return (
    // Both splitters live INSIDE this bordered/rounded/overflow-hidden box —
    // a splitter rendered as a sibling AFTER it (outside the border) reads as
    // a stray floating bar, not part of the card.
    <div data-tour={tourTag} style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex" }}>
        <div title={def} style={{ width: labelWidth, flexShrink: 0, background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 2px" }}>
          <span style={{ writingMode: "vertical-rl", fontSize: 13.5, fontWeight: 800, color: "var(--blue-dark)", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
            {label}
          </span>
        </div>
        <SplitterHandle
          axis="x"
          title="Arrastra para ajustar el ancho del título"
          onDragStart={() => { dragBaseWidth.current = labelWidth }}
          onDrag={(delta) => setLabelWidth(Math.max(32, Math.min(160, dragBaseWidth.current + delta)))}
        />
        <div ref={bodyRef} style={{ flex: 1, minWidth: 0, padding: "16px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto", height: bodyHeight }}>
          {showDefs && def && (
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.5, fontStyle: "italic" }}>{def}</p>
          )}
          {children}
        </div>
      </div>
      <SplitterHandle
        axis="y"
        title="Arrastra para ajustar el alto de esta tarjeta"
        onDragStart={() => { dragBaseHeight.current = bodyRef.current?.getBoundingClientRect().height ?? 200 }}
        onDrag={(delta) => setBodyHeight(Math.max(80, dragBaseHeight.current + delta))}
      />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "7px 10px",
  border: "1px solid var(--border)", borderRadius: 4, fontSize: 13.5,
  fontFamily: "inherit", color: "var(--text-strong)", outline: "none", background: "var(--surface)",
  transition: "border-color .15s, box-shadow .15s",
}

// Compact, colored — the type is a closed, known list (13 options), so it never
// needs to stretch to fill a row. Color comes from TIPO_RECURSO_COLOR so a whole
// week's worth of resources reads as a pattern at a glance.
// `bare`: used inside an .xlsm-table cell — fills the cell, no extra border/
// margin (the cell itself provides the frame), but keeps the color coding.
function TipoRecursoSelect({ value, onChange, disabled, showDefs, bare }: { value: string; onChange: (v: string) => void; disabled?: boolean; showDefs: boolean; bare?: boolean }) {
  const c = TIPO_RECURSO_COLOR[value] ?? { bg: "var(--surface)", color: "var(--text-strong)" }
  const select = (
    <select
      className={bare ? "xlsm-select" : "ipes-input"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={bare
        ? { background: c.bg, color: c.color, fontWeight: 700, textAlign: "center", textAlignLast: "center" }
        : { ...inputStyle, width: "auto", minWidth: 190, maxWidth: 260, background: c.bg, color: c.color, fontWeight: 700, borderColor: c.color }}
    >
      {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  )
  if (bare) return select
  return (
    <div>
      {select}
      {showDefs && <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4, maxWidth: "60ch" }}>{TIPO_RECURSO_INFO[value]}</p>}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function IPESWeekEditor({ iterationId, weekNumber, sessionNumber = 1, sessionCount = 1, readonly, onChange, userRole, focusMode = false, onToggleFocusMode, onNavigateWeek, weekCount = 18, unitsByWeek, onDedicacionChange, onRequestReview }: Props) {
  const [data, setData]         = useState<IPESData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [dirty, setDirty]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<{ msg: string; local?: boolean; err?: boolean; closing?: boolean } | null>(null)
  const toastTimers = useRef<number[]>([])
  // Every toast now auto-dismisses (with a fade, not an instant vanish) —
  // some call sites previously left an error toast on screen indefinitely
  // until something else overwrote it. duration is how long it stays fully
  // visible before fading; TOAST_EXIT_MS below is the fade itself.
  const showToast = (t: { msg: string; local?: boolean; err?: boolean }, duration = 5000) => {
    toastTimers.current.forEach((id) => window.clearTimeout(id))
    toastTimers.current = []
    setToast(t)
    toastTimers.current.push(window.setTimeout(() => setToast((prev) => prev ? { ...prev, closing: true } : prev), duration))
    toastTimers.current.push(window.setTimeout(() => setToast(null), duration + TOAST_EXIT_MS))
  }
  useEffect(() => () => { toastTimers.current.forEach((id) => window.clearTimeout(id)) }, [])
  const [showHistory, setShowHistory] = useState(false)
  const [timeline, setTimeline] = useState<VersionTimelineData | null>(null)
  const [currentVersion, setCurrentVersion] = useState<VersionSummary | null>(null)
  // Hidden for now, per direct instruction (2026-07-24) — was "always on"
  // since 2026-07-22, flip showDefs back to true to restore that toggle.
  const [showDefs, setShowDefs] = useState(false)
  // Transformación's column widths (Temas | Subtemas | Propósito | Tipo |
  // Tiempo | Detalles) — real splitters between them (ColumnSplitters),
  // since that table's uniform grid is the one place a per-column resize
  // makes sense (Inicio/Práctica/Cierre mix label+value cells, not a grid).
  const [txColWidths, setTxColWidths] = useState([14, 16, 22, 13, 9, 24])
  const txTableWrapRef = useRef<HTMLDivElement>(null)
  const txHeaderRowRef = useRef<HTMLTableRowElement>(null)
  // Observations — pending ones accumulate locally (reviewer flags several
  // fields, then submits them all as one batch, same shape the version
  // manager already uses); "carried" ones are read from the timeline
  // (fetched eagerly now, not just when Historial opens, so fields can show
  // their flags immediately) — see carriedFor() below for which ones count.
  const [pendingObservations, setPendingObservations] = useState<{ field_path: string; field_label: string; text: string }[]>([])
  const [submittingObs, setSubmittingObs] = useState(false)

  const hasData = data !== null
  const tourSteps = useMemo(
    () => (hasData ? ipesEditorTourSteps({ setShowDefs, setShowHistory }) : null),
    [hasData],
  )
  usePageTour("ipes-editor", tourSteps)

  useEffect(() => {
    if (!focusMode) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prevOverflow }
  }, [focusMode])

  // Reports the live dedication total up to the parent (see onDedicacionChange
  // in Props) — must be an unconditional hook (declared before the `if
  // (!data...) return null` below), so this recomputes the same sum as
  // totRows/totalDedicacion further down rather than reusing those consts,
  // which are declared after that early return and wouldn't exist yet here.
  useEffect(() => {
    if (!data || !onDedicacionChange) return
    const rows = [
      { tipo: data.tipo_recurso_inicio, tiempo: data.tiempo_inicio, isActivity: false },
      ...data.recursos.map((r) => ({ tipo: r.tipo_recurso, tiempo: r.tiempo_estimado, isActivity: false })),
      ...data.actividades.map((a) => ({ tipo: a.tipo_actividad, tiempo: a.tiempo_actividad, isActivity: true })),
    ]
    onDedicacionChange(rows.reduce((sum, row) => sum + dedicacion(row.tipo, row.tiempo, row.isActivity), 0))
  }, [data, onDedicacionChange])

  // Extracted so the "regenerate this week" flow (below) can re-trigger the
  // exact same load once it detects a new AI-generated version, instead of
  // duplicating this logic.
  // silent=true is used by the auto-retry poll below (see the no_content
  // effect) — skips the loading spinner / error-state churn on every retry
  // tick so a week that's still generating doesn't flicker every few
  // seconds; only a genuine state change (content finally shows up) updates
  // the UI.
  const reload = useCallback((opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent
    if (!silent) { setLoading(true); setError(null) }
    setDirty(false); setShowHistory(false); setCurrentVersion(null); setPendingObservations([])
    ensureInitialVersion(iterationId, "ipes", weekNumber, sessionNumber)
      .then((v) => getVersionContent(iterationId, v.version_id))
      .then((v) => {
        setCurrentVersion(v)
        setData(contentToIPESData(v, weekNumber))
        if (silent) setError(null)
      })
      .catch((e) => {
        if (e?.response?.status === 404) setError("no_content")
        else if (!silent) setError(e?.message ?? "Error al cargar")
      })
      .finally(() => { if (!silent) setLoading(false) })
    getTimeline(iterationId, "ipes", weekNumber, sessionNumber).then(setTimeline).catch(() => setTimeline(null))
  }, [iterationId, weekNumber, sessionNumber])

  useEffect(() => { reload() }, [reload])

  // Auto-retry while the week's content simply hasn't been generated yet —
  // "No source content found" 404 is expected right after launching a
  // course (the native pipeline hasn't reached this week yet), not a real
  // error. Polls quietly until it shows up instead of making the user
  // refresh the page themselves.
  useEffect(() => {
    if (error !== "no_content") return
    const t = setInterval(() => reload({ silent: true }), 6000)
    return () => clearInterval(t)
  }, [error, reload])

  // ── Regenerate this session with AI ─────────────────────────────────────────
  // Replaces the per-field AI-assist icons (hidden for now, see
  // AI_ASSIST_PER_FIELD_ENABLED) with one action that regenerates the whole
  // session. Backend call is fire-and-forget (see regenerateIpesWeek/
  // weeks.api.ts) — completion is detected by polling the timeline for a
  // new version_id rather than a status field, since generation can take
  // well past API Gateway's 29s limit. sessionCount>1 time-slices the
  // week's content across sessions and grounds session N on session N-1's
  // current version (see regenerate_week/handler.py).
  const [regenerating, setRegenerating] = useState(false)
  const [regenPromptOpen, setRegenPromptOpen] = useState(false)
  const [regenPrompt, setRegenPrompt] = useState("")
  const [regenPromptPos, setRegenPromptPos] = useState<{ top: number; left: number } | null>(null)
  const regenBtnRef = useRef<HTMLButtonElement>(null)
  const regenPollTimeout = useRef<number | null>(null)
  const regenAttempts = useRef(0)

  useEffect(() => () => { if (regenPollTimeout.current) window.clearTimeout(regenPollTimeout.current) }, [])

  const regenPromptBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!regenPromptOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (regenPromptBoxRef.current?.contains(e.target as Node) || regenBtnRef.current?.contains(e.target as Node)) return
      setRegenPromptOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [regenPromptOpen])

  const openRegenPrompt = () => {
    const r = regenBtnRef.current?.getBoundingClientRect()
    if (r) {
      const width = 320
      setRegenPromptPos({
        top: Math.min(r.bottom + 6, window.innerHeight - 40),
        left: Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8),
      })
    }
    setRegenPromptOpen(true)
  }

  const regenerateWeek = async (prompt?: string) => {
    if (regenerating || !data) return
    const beforeVersionId = currentVersion?.version_id ?? null
    setRegenerating(true)
    setRegenPromptOpen(false)
    setRegenPrompt("")
    regenAttempts.current = 0
    try {
      await regenerateIpesWeek(iterationId, weekNumber, sessionNumber, prompt, sessionCount)
    } catch {
      setRegenerating(false)
      showToast({ msg: "No se pudo iniciar la regeneración", err: true }, 7000)
      return
    }
    const poll = () => {
      regenAttempts.current += 1
      getTimeline(iterationId, "ipes", weekNumber, sessionNumber)
        .then((t) => {
          const latest = t.versions[t.versions.length - 1]
          if (latest && latest.version_id !== beforeVersionId && latest.source === "ai_generated") {
            setRegenerating(false)
            reload()
            return
          }
          if (regenAttempts.current >= 45) {  // ~3 minutes at 4s/poll
            setRegenerating(false)
            showToast({ msg: "La regeneración está tardando más de lo esperado — revisa en unos minutos", err: true }, 7000)
            return
          }
          regenPollTimeout.current = window.setTimeout(poll, 4000)
        })
        .catch(() => { regenPollTimeout.current = window.setTimeout(poll, 4000) })
    }
    regenPollTimeout.current = window.setTimeout(poll, 4000)
  }

  const mark = () => { setDirty(true); onChange?.(true) }

  const patch = (fields: Partial<IPESData>) => {
    if (!data) return
    setData({ ...data, ...fields })
    mark()
  }

  const updateRecurso = (idx: number, field: keyof Recurso, value: string | number) => {
    if (!data) return
    const recursos = data.recursos.map((r, i) => i === idx ? { ...r, [field]: value } : r)
    setData({ ...data, recursos })
    mark()
  }

  const renameTemaGroup = (indices: number[], value: string) => {
    if (!data) return
    const set = new Set(indices)
    const recursos = data.recursos.map((r, i) => set.has(i) ? { ...r, tema: value } : r)
    setData({ ...data, recursos })
    mark()
  }

  const addSubtema = (afterTema: string) => {
    if (!data) return
    const nuevo: Recurso = {
      tema: afterTema, subtema: "", proposito_del_recurso: "",
      tipo_recurso: "Video Explicativo", tiempo_estimado: 360, detalles_del_recurso: "",
    }
    setData({ ...data, recursos: [...data.recursos, nuevo] })
    mark()
  }

  const addTema = () => {
    if (!data) return
    const nuevo: Recurso = {
      tema: "", subtema: "", proposito_del_recurso: "",
      tipo_recurso: "Video Explicativo", tiempo_estimado: 360, detalles_del_recurso: "",
    }
    setData({ ...data, recursos: [...data.recursos, nuevo] })
    mark()
  }

  const removeRecurso = (idx: number) => {
    if (!data) return
    setData({ ...data, recursos: data.recursos.filter((_, i) => i !== idx) })
    mark()
  }

  const updateActividad = (idx: number, field: keyof Actividad, value: string | number) => {
    if (!data) return
    const actividades = data.actividades.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setData({ ...data, actividades })
    mark()
  }

  const addActividad = () => {
    if (!data) return
    const nueva: Actividad = { tipo_actividad: "", proposito_actividad: "", tiempo_actividad: 900, detalle_actividad: "" }
    setData({ ...data, actividades: [...data.actividades, nueva] })
    mark()
  }

  const removeActividad = (idx: number) => {
    if (!data) return
    setData({ ...data, actividades: data.actividades.filter((_, i) => i !== idx) })
    mark()
  }

  const handleSave = async () => {
    if (!data || saving || !currentVersion) return
    setSaving(true)
    try {
      await saveCurrentVersionContent(iterationId, currentVersion.version_id, data)
      setDirty(false)
      onChange?.(false)
      showToast({ msg: "Guardado con éxito" }, 4000)
    } catch (e: any) {
      showToast({ msg: `Error: ${e?.message ?? "no se pudo guardar"}`, err: true }, 6000)
    } finally {
      setSaving(false)
    }
  }

  // Hoisted above the auto-save effect below (which needs it in a dependency
  // array, evaluated synchronously at render time — declaring it further
  // down, after the `if (!data || !currentVersion) return null` early return,
  // caused a real "Cannot access before initialization" crash on every open
  // of this editor, live during the 2026-07-22 demo). Optional-chained since
  // currentVersion can still be null at this point in the render.
  const isRO = !!readonly || (currentVersion?.review_status !== "open")

  // Auto-save — interval comes from the user's own setting (Settings page,
  // stored server-side in et-user-prefs, fetched once at app load into
  // auth-store; NOT re-queried per keystroke). Only fires when there's
  // something unsaved and the editor isn't read-only.
  const autosaveMinutes = useAuthStore((s) => s.autosaveMinutes)
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave
  useEffect(() => {
    if (isRO) return
    const ms = Math.max(1, autosaveMinutes) * 60_000
    const id = window.setInterval(() => {
      if (dirty && !saving) handleSaveRef.current()
    }, ms)
    return () => window.clearInterval(id)
  }, [autosaveMinutes, isRO, dirty, saving])

  const toggleHistory = () => {
    if (!showHistory) getTimeline(iterationId, "ipes", weekNumber, sessionNumber).then(setTimeline).catch(() => setTimeline(null))
    setShowHistory(!showHistory)
  }

  const handleRevert = async (v: VersionSummary) => {
    if (!window.confirm(`¿Restaurar la versión ${v.version_number}?\nLos cambios actuales no guardados se perderán.`)) return
    try {
      const reverted = await revertToVersion(iterationId, v.version_id)
      const full = await getVersionContent(iterationId, reverted.version_id)
      setCurrentVersion(full)
      setData(contentToIPESData(full, weekNumber))
      setDirty(false)
      onChange?.(false)
      setShowHistory(false)
      showToast({ msg: `Versión ${reverted.version_number} creada a partir de la versión ${v.version_number}.` }, 5000)
    } catch (e: any) {
      showToast({ msg: `Error al restaurar: ${e?.message ?? ""}`, err: true }, 6000)
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 10, color: "var(--text-secondary)" }}>
      <Spinner /> Cargando Diseño de Sesión…
    </div>
  )

  if (error === "no_content") return (
    <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px" }}>
      {/* UTP inline-notification pattern (blue left bar) — same component
          language as the "Estamos generando tu reporte" reference, not a
          generic error/empty state. This 404 is expected right after
          launching a course, not a failure — see the auto-retry effect above. */}
      <div style={{ display: "flex", maxWidth: 480, width: "100%", background: "var(--blue-light)", border: "1px solid var(--blue-mid)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: 4, flexShrink: 0, background: "var(--blue-dark)" }} />
        <div style={{ flex: 1, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="spinner-sm" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "Lato", fontSize: 14, fontWeight: 700, color: "var(--blue-dark)" }}>
              Estamos generando la información, te avisaremos cuando esté todo listo.
            </div>
            <div style={{ fontFamily: "Lato", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
              La Semana {weekNumber} todavía se está generando — esta vista se actualiza sola en cuanto esté lista.
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ margin: 24, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid #F5AAAE", borderRadius: 8, color: "var(--danger)", fontSize: 13 }}>
      {error}
    </div>
  )

  if (!data || !currentVersion) return null

  // Only a reviewer (ea/docente_revisor/admin), only while the version they're
  // looking at is actually the one in review — matches compuerta-panel.tsx's
  // canReview.
  const canObserve = (userRole === "ea" || userRole === "docente_revisor" || userRole === "admin") && currentVersion.review_status === "in_review"

  // A field's observations: ones raised against THIS version (not yet
  // resolved — case A, the reviewer's own current round) plus ones raised
  // against an EARLIER version that got resolved INTO this one (case B, the
  // elaborador looking at what to fix) — covers both without branching on
  // review_status. Local drafts (not submitted yet) show separately so the
  // count is honest about what's actually saved vs. still pending.
  const allObservations: Observation[] = timeline ? Object.values(timeline.observations_by_version).flat() : []
  const carriedFor = (fieldPath: string) => allObservations.filter((o) =>
    o.field_path === fieldPath && (o.version_id === currentVersion.version_id || o.resolved_by_version_id === currentVersion.version_id)
  )
  const pendingCountFor = (fieldPath: string) => pendingObservations.filter((o) => o.field_path === fieldPath).length
  const addObservation = (fieldPath: string, fieldLabel: string, text: string) => {
    setPendingObservations((prev) => [...prev, { field_path: fieldPath, field_label: fieldLabel, text }])
  }
  const submitPendingObservations = async () => {
    if (pendingObservations.length === 0 || submittingObs) return
    setSubmittingObs(true)
    try {
      const inputs: ObservationInput[] = pendingObservations.map((o) => ({ text: o.text, field_path: o.field_path, field_label: o.field_label }))
      await submitObservationBatch(iterationId, currentVersion.version_id, inputs)
      setPendingObservations([])
      const t = await getTimeline(iterationId, "ipes", weekNumber, sessionNumber)
      setTimeline(t)
      showToast({ msg: `${inputs.length} observación${inputs.length !== 1 ? "es" : ""} enviada${inputs.length !== 1 ? "s" : ""} ✓` }, 4000)
    } catch (e: any) {
      showToast({ msg: `Error al enviar observaciones: ${e?.message ?? ""}`, err: true }, 6000)
    } finally {
      setSubmittingObs(false)
    }
  }

  // Context already on screen (cabecera) — sent as-is to the AI-assist
  // endpoint alongside each field's own definition/current value, so the
  // model has course/unit/week grounding without the caller building it
  // per-call.
  const aiContext: Record<string, string> = {
    curso: data.cabecera.curso,
    logro_curso: data.cabecera.logro_curso,
    nombre_unidad: data.cabecera.nombre_unidad,
    logro_unidad: data.cabecera.logro_unidad,
    nombre_sesion: data.cabecera.nombre_sesion,
    logro_semana: data.cabecera.logro_semana,
    importancia: data.cabecera.importancia,
    tipos_ensenanza: data.cabecera.tipos_ensenanza,
  }

  // ── Time on task — computed from every timed field × its dedication factor ──
  const totRows = [
    { nombre: "Introducción a la semana", tipo: data.tipo_recurso_inicio, tiempo: data.tiempo_inicio, isActivity: false },
    ...data.recursos.map((r) => ({ nombre: r.subtema || r.tema || "Recurso", tipo: r.tipo_recurso, tiempo: r.tiempo_estimado, isActivity: false })),
    ...data.actividades.map((a, i) => ({ nombre: a.tipo_actividad || `Actividad ${i + 1}`, tipo: a.tipo_actividad, tiempo: a.tiempo_actividad, isActivity: true })),
  ]
  const totalDedicacion = totRows.reduce((sum, row) => sum + dedicacion(row.tipo, row.tiempo, row.isActivity), 0)

  return (
    // NOTE on layout: no forced height:100% / overflow:hidden chain. It sizes
    // to its content and the page scrolls naturally, so every field is
    // reachable regardless of how tall the content gets. In focus mode, the
    // same tree is instead pinned as a fixed full-viewport overlay (its own
    // scroll container) that visually covers the app-shell (sidebar/topbar/
    // breadcrumb) — no portal needed, position:fixed + a high z-index is
    // enough since the shell is still there, just underneath.
    <div style={focusMode
      ? { position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", display: "flex", flexDirection: "column", background: "var(--content-bg)" }
      : { display: "flex", flexDirection: "column", flex: 1, minWidth: 0, width: "100%", background: "var(--content-bg)" }
    }>
      <style>{`
        .ipes-input:focus, .ipes-input:hover:not(:disabled) { border-color: var(--blue); }
        .ipes-input:focus { box-shadow: 0 0 0 3px rgba(15,98,254,.12); }
        .ipes-fade-in { animation: ipesFadeIn .25s ease; }
        @keyframes ipesFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes focusBtnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(15,98,254,.35); }
          50%      { box-shadow: 0 0 0 5px rgba(15,98,254,0); }
        }
        .focus-mode-btn-attn { animation: focusBtnPulse 2.2s ease-in-out infinite; }
        .focus-mode-btn-attn:hover { animation-play-state: paused; }
      `}</style>

      {/* Toolbar — no "Semana N" here at all: it's already shown once, big,
          in the parent week-detail header (iteration-weeks-view.tsx), and
          repeating it here was flagged as redundant. data-tour moved to the
          toolbar itself since the span it used to sit on is gone. */}
      <div data-tour="ipes-toolbar-title" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, position: "sticky", top: 0, zIndex: 5 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{data.recursos.length} recurso{data.recursos.length !== 1 ? "s" : ""}</span>
        {dirty && !isRO && <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 700 }}>● Sin guardar</span>}
        {focusMode && onNavigateWeek && (
          <WeekNavControl currentWeek={weekNumber} weekCount={weekCount} onNavigate={onNavigateWeek} unitsByWeek={unitsByWeek} />
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Whole-session regeneration — replaces the per-field AI-assist
              icons (hidden for now). Time-slices the week's content across
              sessions when sessionCount>1, grounded on the previous
              session's current (possibly edited) content — see
              regenerate_week/handler.py. */}
          {!isRO && (
            <button
              ref={regenBtnRef}
              className="btn btn-sm ai-assist-btn"
              data-tour="ipes-generar-sesion-btn"
              onClick={openRegenPrompt}
              disabled={regenerating}
              title={sessionCount > 1
                ? `Genera el contenido de la Sesión ${sessionNumber} con IA — usa lo cubierto en la sesión anterior como contexto. Puedes agregar instrucciones opcionales.`
                : "Genera todo el contenido de esta semana con IA — reemplaza el borrador actual. Puedes agregar instrucciones opcionales."}
              style={{
                background: "var(--teal)",
                color: "#fff", border: "none", fontWeight: 700,
                boxShadow: "0 2px 8px rgba(0, 95, 76, .35)",
              }}
            >
              {regenerating ? <><Spinner /> Generando…</> : <><SparkleRegular style={{ fontSize: 14 }} /> Generar Sesión con IA</>}
            </button>
          )}
          {regenPromptOpen && regenPromptPos && createPortal(
            <div
              ref={regenPromptBoxRef}
              className="ipes-fade-in"
              style={{
                position: "fixed", top: regenPromptPos.top, left: regenPromptPos.left, zIndex: 2000,
                width: 320, background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, boxShadow: "var(--shadow-md)", padding: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text-strong)", display: "flex", alignItems: "center", gap: 6 }}>
                  <SparkleRegular style={{ fontSize: 13, color: "var(--blue)" }} /> Generar Sesión con IA
                </span>
                <button type="button" className="icon-btn" onClick={() => setRegenPromptOpen(false)} style={{ width: 20, height: 20 }}>
                  <DismissRegular style={{ fontSize: 13 }} />
                </button>
              </div>
              <textarea
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                placeholder="Instrucciones opcionales — ej. 'enfatiza casos prácticos', 'usa un tono más formal'…"
                rows={3}
                autoFocus
                maxLength={2000}
                style={{ width: "100%", boxSizing: "border-box", padding: "7px 9px", border: "1px solid var(--border)", borderRadius: 5, fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => regenerateWeek(regenPrompt)}
                style={{ width: "100%", marginTop: 8, justifyContent: "center" }}
              >
                Generar
              </button>
            </div>,
            document.body
          )}
          <button
            className={`btn btn-sm ${focusMode ? "btn-outline-primary" : "btn-ghost"}${focusMode ? "" : " focus-mode-btn-attn"}`}
            onClick={() => onToggleFocusMode?.()}
            title={focusMode ? "Salir del modo enfoque" : "Modo enfoque — solo esta semana, sin menú ni cabecera de la página"}
            data-tour="ipes-focus-btn"
          >
            {focusMode ? <FullScreenMinimizeRegular style={{ fontSize: 14 }} /> : <FullScreenMaximizeRegular style={{ fontSize: 14 }} />} {focusMode ? "Salir de enfoque" : "Modo enfoque"}
          </button>
          {/* Historial + Guardar hidden for now, per direct instruction
              (2026-07-24) — handleSave/toggleHistory/showHistory logic is
              untouched, just not rendered, so autosave (see autosaveMinutes)
              still covers persistence. Flip these back to `true` to restore. */}
          {false && (
            <button className={`btn btn-sm ${showHistory ? "btn-outline-primary" : "btn-ghost"}`} onClick={toggleHistory} data-tour="ipes-historial-btn">
              <HistoryRegular style={{ fontSize: 14 }} /> Historial {timeline && timeline.versions.length > 0 && `(${timeline.versions.length})`}
            </button>
          )}
          {canObserve && pendingObservations.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={submitPendingObservations} disabled={submittingObs}>
              {submittingObs ? <><Spinner /> Enviando…</> : `🚩 Enviar ${pendingObservations.length} observación${pendingObservations.length !== 1 ? "es" : ""}`}
            </button>
          )}
          {false ? (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!dirty || saving} data-tour="ipes-guardar-btn">
              {saving ? <><Spinner /> Guardando…</> : "Guardar"}
            </button>
          ) : readonly ? (
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Solo lectura</span>
          ) : !isRO ? (
            onRequestReview && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onRequestReview}
                data-tour="ipes-solicitar-revision-btn"
                title="Ir a la pestaña Compuerta para enviar esta sesión a revisión"
              >
                Solicitar Revisión
              </button>
            )
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{REVIEW_STATUS_LABEL[currentVersion.review_status]} — no editable</span>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          margin: "8px 20px 0", borderRadius: 8, flexShrink: 0, overflow: "hidden", display: "flex",
          transition: `opacity ${TOAST_EXIT_MS}ms ease, transform ${TOAST_EXIT_MS}ms ease`,
          opacity: toast.closing ? 0 : 1, transform: toast.closing ? "translateY(-4px)" : "translateY(0)",
        }}>
          <div style={{ width: 4, flexShrink: 0, background: toast.err ? "var(--danger)" : toast.local ? "var(--warning)" : "var(--success)" }} />
          <div style={{
            flex: 1, padding: "9px 14px", fontSize: 13, fontWeight: 600,
            background: toast.err ? "var(--danger-bg)" : toast.local ? "var(--warning-bg)" : "var(--success-bg)",
            color: toast.err ? "var(--danger)" : toast.local ? "var(--warning)" : "var(--success)",
          }}>
            {toast.err ? "✕ " : toast.local ? "⚠ " : "✓ "}{toast.msg}
          </div>
        </div>
      )}

      {/* Content + optional history panel */}
      <div style={{ display: "flex" }}>

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          <div data-tour="ipes-cabecera">
            <Cabecera
              data={data.cabecera}
              showDefs={showDefs}
              onChangeField={isRO ? undefined : (field, value) => patch({ cabecera: { ...data.cabecera, [field]: value } })}
            />
          </div>

          {/* ── Inicio (ex-Introducción) — same 3 filas que B14:H16 del xlsm:
              fila 1: label Situación inicial + label/valor Tipo de recurso
              fila 2: valor Situación inicial (párrafo, ancho completo)
              fila 3: label/valor Propósito + label/valor Tiempo ── */}
          <Section
            label="Inicio"
            def="Activa lo que el estudiante ya sabe antes de enseñar algo nuevo (saberes previos / conflicto cognitivo) — es lo primero que ve en la semana."
            showDefs={showDefs}
            tourTag="ipes-section-inicio"
          >
            <table className="xlsm-table">
              <colgroup>
                <col style={{ width: "20%" }} /><col style={{ width: "38%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "30%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="xlsm-label-cell" colSpan={2}>
                    Situación inicial:
                    {showDefs && <p className="xlsm-def" style={{ fontWeight: 400, textTransform: "none" }}>{FIELD_DEFS.situacion_inicial}</p>}
                  </td>
                  <td className="xlsm-label-cell">Tipo de recurso:</td>
                  <td>
                    <TipoRecursoSelect value={data.tipo_recurso_inicio} onChange={(v) => patch({ tipo_recurso_inicio: v })} disabled={isRO} showDefs={false} bare />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <AutoGrowTextarea className="xlsm-textarea" style={{ flex: 1 }} value={data.situacion_inicial} onChange={(e) => patch({ situacion_inicial: e.target.value })} rows={3} placeholder="Describe la situación inicial…" disabled={isRO} />
                      <span data-tour="ipes-ai-assist-example">
                        <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel="Situación inicial" fieldDefinition={FIELD_DEFS.situacion_inicial} currentValue={data.situacion_inicial} context={aiContext} onApply={(v) => patch({ situacion_inicial: v })} disabled={isRO} />
                      </span>
                      <span data-tour="ipes-observation-flag-situacion-inicial">
                        <ObservationFlag fieldLabel="Situación inicial" existing={carriedFor("situacion_inicial")} pendingCount={pendingCountFor("situacion_inicial")} onAdd={canObserve ? (t) => addObservation("situacion_inicial", "Situación inicial", t) : undefined} />
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="xlsm-label-cell">
                    Propósito de la situación inicial:
                    {showDefs && <p className="xlsm-def" style={{ fontWeight: 400, textTransform: "none" }}>{FIELD_DEFS.proposito_situacion_inicial}</p>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <AutoGrowTextarea className="xlsm-input" style={{ flex: 1, textAlign: "center" }} rows={1} value={data.proposito_situacion_inicial} onChange={(e) => patch({ proposito_situacion_inicial: e.target.value })} disabled={isRO} />
                      <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel="Propósito de la situación inicial" fieldDefinition={FIELD_DEFS.proposito_situacion_inicial} currentValue={data.proposito_situacion_inicial} context={aiContext} onApply={(v) => patch({ proposito_situacion_inicial: v })} disabled={isRO} />
                      <ObservationFlag fieldLabel="Propósito de la situación inicial" existing={carriedFor("proposito_situacion_inicial")} pendingCount={pendingCountFor("proposito_situacion_inicial")} onAdd={canObserve ? (t) => addObservation("proposito_situacion_inicial", "Propósito de la situación inicial", t) : undefined} />
                    </div>
                  </td>
                  <td className="xlsm-label-cell">Tiempo</td>
                  <td>
                    <input className="xlsm-input" type="time" step="1" value={fmtDuration(data.tiempo_inicio)} onChange={(e) => patch({ tiempo_inicio: parseDuration(e.target.value) })} disabled={isRO} />
                  </td>
                </tr>
              </tbody>
            </table>
            {showDefs && (
              <p style={{ margin: "8px 2px 0", fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic" }}>{TIPO_RECURSO_INFO[data.tipo_recurso_inicio]}</p>
            )}
          </Section>

          {/* ── Transformación (ex-Presentación) — misma tabla de columnas que
              B17:G25 del xlsm: Temas | Subtemas | Propósito | Tipo | Tiempo |
              Detalles. "Tema" ocupa una sola celda alta por grupo (igual que
              el merge C18:C25 en Excel), igual que agrupa groupByTema(). ── */}
          <Section
            label="Transformación"
            def="El contenido nuevo de la semana, organizado por tema. Cada tema agrupa uno o más subtemas — cada subtema es un recurso independiente."
            showDefs={showDefs}
            tourTag="ipes-section-transformacion"
          >
            <div ref={txTableWrapRef} style={{ position: "relative" }}>
            <table className="xlsm-table">
              <colgroup>
                <col style={{ width: `${txColWidths[0]}%` }} /><col style={{ width: `${txColWidths[1]}%` }} />
                <col style={{ width: `${txColWidths[2]}%` }} /><col style={{ width: `${txColWidths[3]}%` }} />
                <col style={{ width: `${txColWidths[4]}%` }} /><col style={{ width: `${txColWidths[5]}%` }} />
                {!isRO && <col style={{ width: 34 }} />}
              </colgroup>
              <thead>
                <tr ref={txHeaderRowRef}>
                  <th>Temas</th><th>Subtemas</th><th>Propósito del subtema</th>
                  <th>Tipo de recurso</th><th>Tiempo</th><th>Detalles del recurso</th>
                  {!isRO && <th></th>}
                </tr>
              </thead>
              <tbody>
                {groupByTema(data.recursos).map((group, gi) => group.items.map((idx, i) => {
                  const r = data.recursos[idx]
                  return (
                    <tr key={idx} className="ipes-fade-in">
                      {i === 0 && (
                        <td rowSpan={group.items.length} style={{ background: "var(--blue-light)" }}>
                          <AutoGrowTextarea className="xlsm-input" style={{ fontWeight: 700, color: "var(--blue-dark)", background: "transparent", textAlign: "center" }} rows={1} value={group.tema} onChange={(e) => renameTemaGroup(group.items, e.target.value)} disabled={isRO} placeholder="Nombre del tema…" />
                          {!isRO && (
                            <button className="btn btn-ghost btn-sm" onClick={() => addSubtema(group.tema)} style={{ margin: "0 8px 8px", fontSize: 11 }}>
                              + Subtema
                            </button>
                          )}
                        </td>
                      )}
                      <td>
                        <AutoGrowTextarea className="xlsm-input" rows={1} value={r.subtema} onChange={(e) => updateRecurso(idx, "subtema", e.target.value)} disabled={isRO} />
                        {showDefs && <p className="xlsm-def">{FIELD_DEFS.subtema}</p>}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <AutoGrowTextarea className="xlsm-input" style={{ flex: 1, textAlign: "center" }} rows={1} value={r.proposito_del_recurso} onChange={(e) => updateRecurso(idx, "proposito_del_recurso", e.target.value)} disabled={isRO} />
                          <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel={`Propósito del recurso — ${r.subtema || r.tema || "recurso"}`} fieldDefinition={FIELD_DEFS.proposito_del_recurso} currentValue={r.proposito_del_recurso} context={{ ...aiContext, tema: r.tema, subtema: r.subtema }} onApply={(v) => updateRecurso(idx, "proposito_del_recurso", v)} disabled={isRO} />
                          <ObservationFlag fieldLabel={`Propósito del recurso — ${r.subtema || r.tema || "recurso"}`} existing={carriedFor(`recursos[${idx}].proposito_del_recurso`)} pendingCount={pendingCountFor(`recursos[${idx}].proposito_del_recurso`)} onAdd={canObserve ? (t) => addObservation(`recursos[${idx}].proposito_del_recurso`, `Propósito del recurso — ${r.subtema || r.tema || "recurso"}`, t) : undefined} />
                        </div>
                        {showDefs && <p className="xlsm-def">{FIELD_DEFS.proposito_del_recurso}</p>}
                      </td>
                      <td>
                        <TipoRecursoSelect value={r.tipo_recurso} onChange={(v) => updateRecurso(idx, "tipo_recurso", v)} disabled={isRO} showDefs={false} bare />
                        {showDefs && <p className="xlsm-def">{TIPO_RECURSO_INFO[r.tipo_recurso]}</p>}
                      </td>
                      <td>
                        <input className="xlsm-input" type="time" step="1" value={fmtDuration(r.tiempo_estimado)} onChange={(e) => updateRecurso(idx, "tiempo_estimado", parseDuration(e.target.value))} disabled={isRO} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <AutoGrowTextarea className="xlsm-textarea" style={{ flex: 1, minHeight: 90 }} value={r.detalles_del_recurso} onChange={(e) => updateRecurso(idx, "detalles_del_recurso", e.target.value)} rows={4} disabled={isRO} />
                          <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel={`Detalles del recurso — ${r.subtema || r.tema || "recurso"}`} fieldDefinition={FIELD_DEFS.detalles_del_recurso} currentValue={r.detalles_del_recurso} context={{ ...aiContext, tema: r.tema, subtema: r.subtema, tipo_recurso: r.tipo_recurso }} onApply={(v) => updateRecurso(idx, "detalles_del_recurso", v)} disabled={isRO} />
                          <ObservationFlag fieldLabel={`Detalles del recurso — ${r.subtema || r.tema || "recurso"}`} existing={carriedFor(`recursos[${idx}].detalles_del_recurso`)} pendingCount={pendingCountFor(`recursos[${idx}].detalles_del_recurso`)} onAdd={canObserve ? (t) => addObservation(`recursos[${idx}].detalles_del_recurso`, `Detalles del recurso — ${r.subtema || r.tema || "recurso"}`, t) : undefined} />
                        </div>
                        {showDefs && <p className="xlsm-def">{FIELD_DEFS.detalles_del_recurso}</p>}
                      </td>
                      {!isRO && (
                        <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                          <button className="icon-btn danger" onClick={() => removeRecurso(idx)} title="Eliminar subtema" style={{ width: 24, height: 24 }}>×</button>
                        </td>
                      )}
                    </tr>
                  )
                }))}
              </tbody>
            </table>
            <ColumnSplitters widths={txColWidths} onChange={setTxColWidths} containerRef={txTableWrapRef} headerRowRef={txHeaderRowRef} />
            </div>
            {!isRO && (
              <button className="btn btn-outline-primary btn-sm" onClick={addTema} style={{ marginTop: 10 }}>
                + Nuevo tema
              </button>
            )}
          </Section>

          {/* ── Práctica (ex-Ejercicios) — misma tabla que B26:G27 del xlsm:
              una fila de encabezado + una fila de valores. ── */}
          <Section
            label="Práctica"
            def="La actividad que el estudiante resuelve aplicando lo aprendido en Transformación — puede ser calificada o no."
            showDefs={showDefs}
            tourTag="ipes-section-practica"
          >
            <table className="xlsm-table">
              <colgroup>
                <col style={{ width: "16%" }} /><col style={{ width: "28%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "44%" }} />
                {!isRO && <col style={{ width: 34 }} />}
              </colgroup>
              <thead>
                <tr>
                  <th>Tipo de actividad</th><th>Propósito de la actividad</th>
                  <th>Tiempo</th><th>Detalles de la actividad</th>
                  {!isRO && <th></th>}
                </tr>
              </thead>
              <tbody>
                {data.actividades.map((a, idx) => (
                  <tr key={idx} className="ipes-fade-in">
                    <td>
                      <select className="xlsm-select" style={{ textAlign: "center", textAlignLast: "center" }} value={a.tipo_actividad} onChange={(e) => updateActividad(idx, "tipo_actividad", e.target.value)} disabled={isRO}>
                        <option value="">Seleccionar…</option>
                        {ACTIVITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      {a.tipo_actividad && ACTIVITY_CATALOG[a.tipo_actividad] && (
                        <span
                          className="xlsm-def"
                          style={{
                            display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 10,
                            fontSize: 11, fontWeight: 700,
                            background: ACTIVITY_CATALOG[a.tipo_actividad] === "AC" ? "var(--danger-bg)" : "var(--blue-light)",
                            color: ACTIVITY_CATALOG[a.tipo_actividad] === "AC" ? "var(--danger)" : "var(--blue-dark)",
                          }}
                        >
                          {ACTIVITY_CLASS_LABEL[ACTIVITY_CATALOG[a.tipo_actividad]]}
                        </span>
                      )}
                      {showDefs && <p className="xlsm-def">{FIELD_DEFS.tipo_actividad}</p>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <AutoGrowTextarea className="xlsm-input" style={{ flex: 1, textAlign: "center" }} rows={1} value={a.proposito_actividad} onChange={(e) => updateActividad(idx, "proposito_actividad", e.target.value)} disabled={isRO} />
                        <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel={`Propósito de la actividad ${idx + 1}`} fieldDefinition={FIELD_DEFS.proposito_actividad} currentValue={a.proposito_actividad} context={{ ...aiContext, tipo_actividad: a.tipo_actividad }} onApply={(v) => updateActividad(idx, "proposito_actividad", v)} disabled={isRO} />
                        <ObservationFlag fieldLabel={`Propósito de la actividad ${idx + 1}`} existing={carriedFor(`actividades[${idx}].proposito_actividad`)} pendingCount={pendingCountFor(`actividades[${idx}].proposito_actividad`)} onAdd={canObserve ? (t) => addObservation(`actividades[${idx}].proposito_actividad`, `Propósito de la actividad ${idx + 1}`, t) : undefined} />
                      </div>
                      {showDefs && <p className="xlsm-def">{FIELD_DEFS.proposito_actividad}</p>}
                    </td>
                    <td>
                      <input className="xlsm-input" type="time" step="1" value={fmtDuration(a.tiempo_actividad)} onChange={(e) => updateActividad(idx, "tiempo_actividad", parseDuration(e.target.value))} disabled={isRO} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <AutoGrowTextarea className="xlsm-textarea" style={{ flex: 1, textAlign: "center" }} value={a.detalle_actividad} onChange={(e) => updateActividad(idx, "detalle_actividad", e.target.value)} rows={3} disabled={isRO} />
                        <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel={`Detalles de la actividad ${idx + 1}`} fieldDefinition={FIELD_DEFS.detalle_actividad} currentValue={a.detalle_actividad} context={{ ...aiContext, tipo_actividad: a.tipo_actividad }} onApply={(v) => updateActividad(idx, "detalle_actividad", v)} disabled={isRO} />
                        <ObservationFlag fieldLabel={`Detalles de la actividad ${idx + 1}`} existing={carriedFor(`actividades[${idx}].detalle_actividad`)} pendingCount={pendingCountFor(`actividades[${idx}].detalle_actividad`)} onAdd={canObserve ? (t) => addObservation(`actividades[${idx}].detalle_actividad`, `Detalles de la actividad ${idx + 1}`, t) : undefined} />
                      </div>
                      {showDefs && <p className="xlsm-def">{FIELD_DEFS.detalle_actividad}</p>}
                    </td>
                    {!isRO && (
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        {data.actividades.length > 1 && (
                          <button className="icon-btn danger" onClick={() => removeActividad(idx)} title="Eliminar actividad" style={{ width: 24, height: 24 }}>×</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!isRO && (
              <button className="btn btn-outline-primary btn-sm" onClick={addActividad} style={{ marginTop: 10 }}>
                + Nueva actividad
              </button>
            )}
          </Section>

          {/* ── Cierre (ex-Summary) — misma tabla que B28:H30 del xlsm: una
              fila de encabezado (¿Requiere adicional? | Nombre | Propósito |
              Tipo de recurso | Resumen), Resumen siempre visible aunque no
              se requiera recurso adicional (columna independiente en Excel). ── */}
          <Section
            label="Cierre"
            def="El resumen final de la semana — las ideas clave que el estudiante ve al terminar, y opcionalmente un recurso adicional si la semana lo necesita. El sistema todavía no genera esta sección: se completa a mano."
            showDefs={showDefs}
            tourTag="ipes-section-cierre"
          >
            <table className="xlsm-table">
              <colgroup>
                <col style={{ width: "13%" }} /><col style={{ width: "17%" }} />
                <col style={{ width: "18%" }} /><col style={{ width: "12%" }} /><col style={{ width: "40%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>¿Recurso adicional?</th><th>Nombre</th><th>Propósito</th>
                  <th>Tipo de recurso</th><th>Resumen — Cierre de semana</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, padding: "8px 10px", cursor: isRO ? "default" : "pointer" }}>
                      <input type="checkbox" checked={data.requiere_cierre_adicional} disabled={isRO} onChange={(e) => patch({ requiere_cierre_adicional: e.target.checked })} />
                      Sí
                    </label>
                    {showDefs && <p className="xlsm-def">{FIELD_DEFS.requiere_cierre_adicional}</p>}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    {data.requiere_cierre_adicional ? (
                      <AutoGrowTextarea className="xlsm-input" style={{ textAlign: "center" }} rows={1} value={data.nombre_actividad_cierre} onChange={(e) => patch({ nombre_actividad_cierre: e.target.value })} disabled={isRO} />
                    ) : <div style={{ padding: "8px 10px", color: "var(--text-muted)", textAlign: "center" }}>—</div>}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    {data.requiere_cierre_adicional ? (
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <AutoGrowTextarea className="xlsm-input" style={{ flex: 1, textAlign: "center" }} rows={1} value={data.proposito_cierre} onChange={(e) => patch({ proposito_cierre: e.target.value })} disabled={isRO} />
                        <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel="Propósito del cierre" fieldDefinition={FIELD_DEFS.proposito_cierre} currentValue={data.proposito_cierre} context={aiContext} onApply={(v) => patch({ proposito_cierre: v })} disabled={isRO} />
                        <ObservationFlag fieldLabel="Propósito del cierre" existing={carriedFor("proposito_cierre")} pendingCount={pendingCountFor("proposito_cierre")} onAdd={canObserve ? (t) => addObservation("proposito_cierre", "Propósito del cierre", t) : undefined} />
                      </div>
                    ) : <div style={{ padding: "8px 10px", color: "var(--text-muted)", textAlign: "center" }}>—</div>}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    {data.requiere_cierre_adicional ? (
                      <TipoRecursoSelect value={data.tipo_recurso_cierre} onChange={(v) => patch({ tipo_recurso_cierre: v })} disabled={isRO} showDefs={false} bare />
                    ) : <div style={{ padding: "8px 10px", color: "var(--text-muted)", textAlign: "center" }}>—</div>}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <AutoGrowTextarea className="xlsm-textarea" style={{ flex: 1, textAlign: "center" }} value={data.resumen_cierre} onChange={(e) => patch({ resumen_cierre: e.target.value })} rows={3} placeholder="Ideas clave que irán en el HTML de cierre de semana…" disabled={isRO} />
                      <AiAssistButton iterationId={iterationId} artifactType="ipes" week={weekNumber} fieldLabel="Resumen — Cierre de semana" fieldDefinition={FIELD_DEFS.resumen_cierre} currentValue={data.resumen_cierre} context={aiContext} onApply={(v) => patch({ resumen_cierre: v })} disabled={isRO} />
                      <span data-tour="ipes-observation-flag-example">
                        <ObservationFlag fieldLabel="Resumen — Cierre de semana" existing={carriedFor("resumen_cierre")} pendingCount={pendingCountFor("resumen_cierre")} onAdd={canObserve ? (t) => addObservation("resumen_cierre", "Resumen — Cierre de semana", t) : undefined} />
                      </span>
                    </div>
                    {showDefs && <p className="xlsm-def">{FIELD_DEFS.resumen_cierre}</p>}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* ── Time on task — tiempo de dedicación por recurso, y total vs. presupuesto de la semana ── */}
          <Section
            label="Tiempo de dedicación"
            def="Cuánto tiempo real le toma al estudiante cada recurso o actividad (tiempo × factor de dedicación) — y si la semana completa se pasa del tiempo de sesión asignado."
            showDefs={showDefs}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--content-bg)" }}>
                    {(["Nombre de la actividad", "Recurso", "Tiempo", "Factor", "Tiempo de dedicación"] as const).map((h) => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {totRows.map((row, i) => {
                    const factor = row.isActivity ? ACTIVITY_FACTOR : (FACTOR_MAP[row.tipo] ?? 1)
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-row)" }}>
                        <td style={{ padding: "6px 10px" }}>{row.nombre}</td>
                        <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>{row.tipo}</td>
                        <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{fmtDuration(row.tiempo)}</td>
                        <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>{factor}</td>
                        <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 700 }}>{fmtDuration(dedicacion(row.tipo, row.tiempo, row.isActivity))}</td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={4} style={{ padding: "8px 10px", fontWeight: 800, textAlign: "right", color: "var(--text-strong)" }}>Total</td>
                    <td style={{ padding: "8px 10px", fontWeight: 800, fontFamily: "monospace", color: data.cabecera.tiempo_sesion_segundos > 0 && totalDedicacion > data.cabecera.tiempo_sesion_segundos ? "var(--danger)" : "var(--text-strong)" }}>
                      {fmtDuration(totalDedicacion)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {data.cabecera.tiempo_sesion_segundos > 0 && totalDedicacion > data.cabecera.tiempo_sesion_segundos && (
              <div className="ipes-fade-in" style={{ padding: "8px 12px", background: "var(--danger-bg)", border: "1px solid #F5AAAE", borderRadius: 6, fontSize: 12.5, color: "var(--danger)", fontWeight: 700 }}>
                ⚠ Esta semana se pasa del tiempo de sesión asignado ({fmtDuration(data.cabecera.tiempo_sesion_segundos)}).
              </div>
            )}
          </Section>

        </div>

      </div>

      {/* Version history — a real drawer (position: fixed), not a side panel that
          scrolls away with the page. "must always be visible" applies to this
          just as much as to the Cabecera. */}
      {showHistory && (
        <>
          <div
            onClick={() => setShowHistory(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", zIndex: 30 }}
          />
          <div className="ipes-fade-in" data-tour="ipes-historial-drawer" style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 300, zIndex: 31,
            background: "var(--surface)", borderLeft: "1px solid var(--border)",
            boxShadow: "-6px 0 20px rgba(0,0,0,.12)", padding: "16px 14px", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-strong)" }}>Historial de versiones</span>
              <button className="icon-btn" onClick={() => setShowHistory(false)} title="Cerrar" style={{ width: 28, height: 28 }}>×</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
              {timeline ? `${timeline.versions.length} versión${timeline.versions.length !== 1 ? "es" : ""}` : "Cargando…"}
            </div>

            {dirty && (
              <div style={{ padding: "8px 10px", background: "var(--warning-bg)", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12, color: "var(--warning)", fontWeight: 700, marginBottom: 12 }}>
                Tienes cambios sin guardar en la versión actual.
              </div>
            )}

            <VersionTimeline
              timeline={timeline}
              onRevert={!readonly ? handleRevert : undefined}
              canRevert={currentVersion.review_status === "open"}
            />
          </div>
        </>
      )}
    </div>
  )
}
