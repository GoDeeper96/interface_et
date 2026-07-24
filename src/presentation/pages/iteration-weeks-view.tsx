import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import IPESWeekEditor from "./ipes-week-editor"
import MBWeekEditor from "./mb-week-editor"
import CompuertaPanel from "./compuerta-panel"
import {
  BotRegular, PeopleRegular, ChevronDownRegular, BookRegular, DesktopRegular, TargetRegular,
  SparkleRegular, DismissRegular, ChevronLeftRegular, ChevronRightRegular, FlagFilled, HistoryRegular,
  LockClosedRegular,
} from "@fluentui/react-icons"
import {
  getCompuertaState, setCompuertaState,
  getSessionCount, setSessionCount,
  regenerateIpesWeek,
  type CompuertaState,
} from "../../infrastructure/api/weeks.api"
import {
  getCabeceraIndex, getTimeline, getVersionContent, type CabeceraIndexEntry,
  type VersionTimeline as VersionTimelineData, type Observation,
} from "../../infrastructure/api/versions.api"
import { getIteration, listProcesses, type Iteration, type Modalidad } from "../../infrastructure/api/processes.api"
import { getCourse, listCourses } from "../../infrastructure/api/courses.api"
import { listAssignmentsForUser } from "../../infrastructure/api/assignments.api"
import { UnitSummary, WeekTierSummary } from "./ipes-cabecera"
import VersionTimelineView from "../components/version-timeline"
import { useAuthStore } from "../../infrastructure/store/auth-store"
import { primaryRole } from "../../router/guards"
import { useIterationWebSocket, type WsMessage } from "../hooks/use-iteration-websocket"

// ── Types ─────────────────────────────────────────────────────────────────

type Tab = "content" | "compuerta"

interface WeekStatus {
  compuerta: CompuertaState
  comments: number
  unresolved: number
  autoApproved: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────

const MODALIDAD_SHORT_LABEL: Record<Modalidad, string> = {
  virtual_24_7:      "Virtual",
  remoto_presencial: "Presencial/Remoto",
}

// Pulls the pieces of a sibling modality's already-generated IPES content
// that are useful as grounding context for generating the other modality —
// virtual (resource catalog) and presencial/remoto (momentos/PPT) have
// different content shapes, so this is deliberately a compact summary for
// the LLM to adapt, not a literal field-for-field copy (see
// project_thursday_demo_e2e_scope.md, 2026-07-16 meeting notes: a raw copy
// across those two shapes would produce garbage).
function summarizeIpesContentForContext(content: any, week: number, sourceCourseName: string): string {
  const lines: string[] = [
    `**Contenido ya diseñado de "${sourceCourseName}" para la Semana ${week}** (otra modalidad de este mismo curso — usa esto como referencia de temas/alcance, adapta el formato de sesión, no lo copies literal):`,
  ]
  const intro = content?.introduccion
  if (intro?.situacion_inicial) lines.push(`Situación inicial: ${intro.situacion_inicial}`)
  if (intro?.logro_de_la_semana) lines.push(`Logro de la semana: ${intro.logro_de_la_semana}`)
  const presentaciones = Array.isArray(content?.presentaciones) ? content.presentaciones : []
  if (presentaciones.length) {
    lines.push("Temas/apartados cubiertos:")
    presentaciones.forEach((p: any) => {
      const parts = [p?.tema, p?.subtema, p?.apartado].filter(Boolean).join(" — ")
      if (parts) lines.push(`- ${parts}`)
    })
  }
  return lines.join("\n")
}

// Same vocabulary/colors as compuerta-panel.tsx and course-artifacts-view.tsx's
// ArtifactStatus: open → en_curso, in_review → pendiente_revision,
// changes_requested → observado, approved → completado.
const STATE_COLOR: Record<CompuertaState, { bg: string; color: string; border: string; icon: string }> = {
  open:              { bg: "#AFFFFD", color: "#037775", border: "#7DEAE6", icon: "○" },
  in_review:         { bg: "#EBF1FF", color: "#006CC0", border: "#B9D6FF", icon: "◉" },
  changes_requested: { bg: "#FEEDED", color: "#D11C26", border: "#F7C2C4", icon: "⚠" },
  approved:          { bg: "#CBFDD4", color: "#27793E", border: "#9BEBAB", icon: "✓" },
}

const STATE_LABEL: Record<CompuertaState, string> = {
  open: "En curso",
  in_review: "Pendiente de revisión",
  changes_requested: "Observado",
  approved: "Completado",
}

// The horizontal week-carousel row is replaced by SessionTree's Unidad→
// Semana→Sesión tree (2026-07-17 redesign, Diseña+ reference layout) — kept
// here, not deleted, per direct instruction ("hide them or just comment
// them") in case the carousel view is wanted back later.
const SHOW_LEGACY_CAROUSEL = false

// ── Helpers ───────────────────────────────────────────────────────────────

function loadStatuses(iterationId: string): Record<number, WeekStatus> {
  const out: Record<number, WeekStatus> = {}
  for (let w = 1; w <= 18; w++) {
    const d = getCompuertaState(iterationId, w)
    out[w] = {
      compuerta: d.state,
      comments: d.comments.length,
      unresolved: d.comments.filter((c) => !c.resolved).length,
      autoApproved: d.history.some((h) => h.by === "IA"),
    }
  }
  return out
}

// ── Week card (carousel) ──────────────────────────────────────────────────

// unidad is no longer shown inside the card itself — the carousel now
// groups consecutive same-unit weeks under a shared "Unidad N" label above
// the row (see weekGroups in IterationWeeksView), which shows the grouping
// visually instead of repeating the unit number on every single card.
function WeekCard({
  week, status, selected, onClick,
}: { week: number; status: WeekStatus; selected: boolean; onClick: () => void }) {
  const col = STATE_COLOR[status.compuerta]
  return (
    <div
      onClick={onClick}
      style={{
        width: 128,
        flexShrink: 0,
        cursor: "pointer",
        borderRadius: 10,
        border: selected ? "2px solid var(--blue)" : "2px solid var(--border)",
        background: selected ? "#f0f6ff" : "#fff",
        padding: "8px 10px",
        boxShadow: selected ? "0 0 0 3px rgba(0,87,168,.12)" : "none",
        transition: "all .12s",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Sem.
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: selected ? "var(--blue)" : "var(--text-strong)", lineHeight: 1 }}>
            {week}
          </div>
        </div>
        {status.autoApproved && (
          <BotRegular style={{ fontSize: 11, color: "#6B7280", flexShrink: 0 }} title="Auto-aprobada por IA" />
        )}
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20,
          background: col.bg, color: col.color, border: `1px solid ${col.border}`,
        }}>
          {col.icon} {STATE_LABEL[status.compuerta]}
        </span>
      </div>
      {status.unresolved > 0 && (
        <div style={{ marginTop: 4, fontSize: 10, color: "var(--warning)", fontWeight: 700 }}>
          💬 {status.unresolved}
        </div>
      )}
    </div>
  )
}

// ── Gate diamond between weeks ────────────────────────────────────────────

function GateDiamond({ state }: { state: CompuertaState }) {
  const col = STATE_COLOR[state]
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div style={{ width: 8, height: 1, background: "var(--border)" }} />
      <div
        title={`Revisión: ${STATE_LABEL[state]}`}
        style={{
          width: 12, height: 12, transform: "rotate(45deg)",
          background: col.bg, border: `2px solid ${col.color}`,
          borderRadius: 2, flexShrink: 0,
        }}
      />
      <div style={{ width: 8, height: 1, background: "var(--border)" }} />
    </div>
  )
}

// ── Session tree (Unidad → Semana → Sesión) ───────────────────────────────
// Replaces the horizontal week carousel as the primary "which week am I
// looking at" navigator (see SHOW_LEGACY_CAROUSEL below — the carousel code
// stays, just hidden, not deleted, per direct instruction) — follows the
// Diseña+ reference layout (2 columns: ~30% tree, rest content) shared
// 2026-07-17. Status/observation badges use the SAME review_status/
// unresolved_count values STATE_COLOR/STATE_LABEL already render elsewhere
// on this page (real data — versions/handler.py::_units_index — not the
// legacy localStorage "compuerta" the carousel's WeekCard uses), and reuses
// getSessionCount for the Sesión sub-rows instead of a separate lookup.
function SessionTree({
  weekGroups, cabeceraByWeek, selectedWeek, selectedSession, isPresencialRemoto,
  iterationId, approvedCount, weekCount, onSelect, onShowObservations, onShowHistory, allowedWeeks,
}: {
  weekGroups: { unidad: string | null; weeks: number[] }[]
  cabeceraByWeek: Record<number, CabeceraIndexEntry>
  selectedWeek: number
  selectedSession: number
  isPresencialRemoto: boolean
  iterationId: string
  approvedCount: number
  weekCount: number
  onSelect: (week: number, session: number) => void
  onShowObservations: (week: number, session: number) => void
  onShowHistory: (week: number, session: number) => void
  // null = no restriction (admin, or no explicit assignment for this
  // course). Otherwise only these week numbers are open to this user —
  // everything else renders locked instead of hidden, so it's clear the
  // week exists but isn't theirs to work on (not silently missing).
  allowedWeeks: Set<number> | null
}) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-strong)" }}>Sesiones ({weekCount})</span>
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{approvedCount} de {weekCount} completados</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {weekGroups.map((g, gi) => {
          const unitUnresolved = g.weeks.reduce((sum, w) => sum + (cabeceraByWeek[w]?.unresolved_count ?? 0), 0)
          return (
            <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)" }}>
                {g.unidad ? `Unidad ${g.unidad}` : "Semanas sin unidad asignada"}
                {unitUnresolved > 0 && (
                  <span title={`${unitUnresolved} observación${unitUnresolved > 1 ? "es" : ""} sin resolver en esta unidad`} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "var(--warning)" }}>
                    <FlagFilled style={{ fontSize: 11 }} />
                    <span style={{ fontSize: 10, fontWeight: 800 }}>{unitUnresolved}</span>
                  </span>
                )}
              </div>
              {g.weeks.map((week) => {
                const entry = cabeceraByWeek[week]
                const status = entry?.review_status ?? "open"
                const col = STATE_COLOR[status]
                const unresolved = entry?.unresolved_count ?? 0
                const completion = entry?.completion_pct ?? 0
                const tema = entry?.tema ?? ""
                const sessionCountForWeek = isPresencialRemoto ? getSessionCount(iterationId, week) : 1
                const weekSelected = selectedWeek === week
                const locked = allowedWeeks !== null && !allowedWeeks.has(week)
                return (
                  <div key={week} style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      onClick={() => !locked && onSelect(week, 1)}
                      title={locked ? "No tienes esta semana asignada" : undefined}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: "var(--radius-sm)",
                        cursor: locked ? "not-allowed" : "pointer",
                        opacity: locked ? 0.45 : 1,
                        background: weekSelected && (selectedSession === 1 || sessionCountForWeek <= 1) ? "var(--row-bg)" : "transparent",
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, flexShrink: 0, borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: locked ? "var(--border)" : col.bg, color: locked ? "var(--text-muted)" : col.color, fontSize: 11.5, fontWeight: 800,
                      }}>
                        {locked ? <LockClosedRegular style={{ fontSize: 14 }} /> : `S${week}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {/* Tema is the session title (introduccion.nombre_de_la_sesion,
                              falls back to the first presentación's tema) — the "S{week}"
                              badge to the left already conveys the week number, so
                              repeating "Semana {week}" here was redundant. Falls back to
                              "Semana {week}" only until the session has been generated
                              and has no tema yet. Doesn't touch the badge's completion
                              color-coding above (col.bg/col.color, unrelated to this label). */}
                          <span style={{ fontSize: 13, fontWeight: weekSelected ? 700 : 600, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tema || `Semana ${week}`}
                          </span>
                        </div>
                        {/* Completion % — real, weighted from actual content fields
                            (situación inicial / presentaciones / ejercicios), not the
                            review_status alone. */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${completion}%`, borderRadius: 2,
                              background: completion >= 100 ? "var(--success)" : "var(--blue)",
                              transition: "width .3s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>{completion}%</span>
                        </div>
                      </div>
                      {!locked && unresolved > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onShowObservations(week, 1) }}
                          title={`${unresolved} observación${unresolved > 1 ? "es" : ""} sin resolver — ver en un panel`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 2, color: "var(--warning)", flexShrink: 0,
                            background: "none", border: "none", cursor: "pointer", padding: 2,
                          }}
                        >
                          <FlagFilled style={{ fontSize: 13 }} />
                          <span style={{ fontSize: 10, fontWeight: 800 }}>{unresolved}</span>
                        </button>
                      )}
                      {!locked && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onShowHistory(week, 1) }}
                          title="Ver historial de versiones"
                          style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)", flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 2 }}
                        >
                          <HistoryRegular style={{ fontSize: 14 }} />
                        </button>
                      )}
                    </div>
                    {!locked && sessionCountForWeek > 1 && Array.from({ length: sessionCountForWeek }, (_, i) => i + 1).map((s) => {
                      const sessionTema = entry?.session_temas?.[s]
                      return (
                        <div
                          key={s}
                          onClick={() => onSelect(week, s)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "5px 8px 5px 38px", borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            background: weekSelected && selectedSession === s ? "var(--row-bg)" : "transparent",
                          }}
                        >
                          <div style={{
                            fontSize: 12.5, fontWeight: weekSelected && selectedSession === s ? 700 : 500, color: "var(--text-secondary)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            Sesión {s}{sessionTema ? ` — ${sessionTema}` : ""}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function IterationWeeksView() {
  // codCurso is a real route param (App.tsx: /cursos/:codCurso/:etapa/:iterationId)
  // — just wasn't being read here before.
  const { iterationId = "", codCurso = "" } = useParams<{ codCurso: string; processId: string; iterationId: string }>()
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const st        = (location.state ?? {}) as Record<string, string>
  const modalidad      = st.modalidad      ?? ""
  const artifact       = (st.artifact      ?? "ipes") as "ipes" | "mb"
  const iterationMode  = (st.iterationMode ?? "hybrid") as "hybrid" | "ai"
  const userRole       = user ? primaryRole(user) : "docente"
  const userName       = user?.email ?? ""
  // Which weeks THIS user is actually assigned to for THIS course — a user
  // can be assigned a whole course, specific weeks, or (once that exists)
  // a unit; showing every week regardless just confuses someone who was
  // only asked to work on 3 of them. null = unrestricted (admin, or no
  // explicit assignment row at all — falls back to their global role's
  // usual full access, same rule shared/auth.py::user_permissions uses).
  const [allowedWeeks, setAllowedWeeks] = useState<Set<number> | null>(null)
  useEffect(() => {
    if (!codCurso || !user?.sub || userRole === "admin") { setAllowedWeeks(null); return }
    let cancelled = false
    listAssignmentsForUser(user.sub)
      .then((all) => {
        if (cancelled) return
        const mine = all.filter((a) => a.cod_curso === codCurso)
        if (mine.length === 0 || mine.some((a) => a.week_scope === "all")) { setAllowedWeeks(null); return }
        const weeks = new Set<number>()
        mine.forEach((a) => { if (Array.isArray(a.week_scope)) a.week_scope.forEach((w) => weeks.add(w)) })
        setAllowedWeeks(weeks)
      })
      .catch(() => setAllowedWeeks(null))
    return () => { cancelled = true }
  }, [codCurso, user?.sub, userRole])

  const [statuses, setStatuses]         = useState<Record<number, WeekStatus>>(() => loadStatuses(iterationId))
  const [selectedWeek, setSelectedWeek] = useState(1)

  // Landing on week 1 by default is wrong for someone whose scope doesn't
  // include it — jump to their first assigned week instead of showing them
  // a locked page with no obvious way out.
  useEffect(() => {
    if (!allowedWeeks || allowedWeeks.size === 0 || allowedWeeks.has(selectedWeek)) return
    setSelectedWeek(Math.min(...allowedWeeks))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedWeeks])

  // Lifted up from the editors (not local to IPESWeekEditor/MBWeekEditor)
  // because the editor is remounted (key includes selectedWeek/session) on
  // every week change — local focus-mode state would silently reset to
  // false the moment the user navigated weeks from inside focus mode.
  const [focusMode, setFocusMode]       = useState(false)
  const WEEK_COUNT = 18
  // Presencial/remoto courses can have several sessions within one week
  // (virtual 24/7 is always exactly one session per week and never shows
  // this). No backend "how many sessions exist" endpoint — sessions beyond
  // the first have no AI-generated source, they're created by hand. Session
  // count is read straight from weeks.api's shared (IPES+MB) localStorage
  // counter (getSessionCount) instead of separate per-mount React state —
  // this view remounts independently for the "ipes" and "mb" artifact tabs,
  // and MB must always show the same session count IPES does for that week
  // (1 IPES session = 1 MB PPT), so they can't each track their own.
  const isPresencialRemoto = modalidad !== "" && modalidad !== "Virtual 24/7"
  const [selectedSession, setSelectedSession] = useState(1)
  const sessionCount = iterationId ? getSessionCount(iterationId, selectedWeek) : 1
  const [activeTab, setActiveTab]       = useState<Tab>("content")
  const mode                            = iterationMode
  const [compuertaRev, setCompuertaRev] = useState(0)
  const [weeksOpen, setWeeksOpen]       = useState(false)
  // SessionTree collapse — a splitter toggle so the tree can be hidden to
  // give the editor full width, or brought back. Not persisted (matches
  // weeksOpen's own precedent), resets to visible on remount.
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  // Draggable width (%) — the splitter bar itself is the drag handle, mouse
  // position relative to the 2-column row's own bounding box (splitterRowRef)
  // maps directly to a percentage, clamped to a sane range so neither side
  // can be dragged to nothing.
  // Narrower default (was 30) — reduced per direct instruction so the
  // Sesiones tree takes up less horizontal space, leaving more room for the
  // editor column. Still user-resizable via the splitter.
  const [treeWidthPct, setTreeWidthPct] = useState(20)
  const [draggingSplitter, setDraggingSplitter] = useState(false)
  const splitterRowRef = useRef<HTMLDivElement>(null)
  const TREE_MIN_PCT = 18
  const TREE_MAX_PCT = 55

  useEffect(() => {
    if (!draggingSplitter) return
    const onMove = (e: MouseEvent) => {
      const rect = splitterRowRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setTreeWidthPct(Math.min(TREE_MAX_PCT, Math.max(TREE_MIN_PCT, pct)))
    }
    const onUp = () => setDraggingSplitter(false)
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
  }, [draggingSplitter])

  // Tree-row shortcut drawers — flag icon → observations only, history icon
  // → full VersionTimeline (read-only here; the main editor's own Historial
  // tab is still where revert lives, this is a quick peek without leaving
  // the tree). Both fetch the same getTimeline() call, just render it
  // differently.
  const [treeDrawer, setTreeDrawer] = useState<{ week: number; session: number; mode: "observations" | "history" } | null>(null)
  const [treeDrawerTimeline, setTreeDrawerTimeline] = useState<VersionTimelineData | null>(null)
  useEffect(() => {
    if (!treeDrawer) { setTreeDrawerTimeline(null); return }
    let cancelled = false
    setTreeDrawerTimeline(null)
    getTimeline(iterationId, artifact, treeDrawer.week, treeDrawer.session)
      .then((t) => { if (!cancelled) setTreeDrawerTimeline(t) })
      .catch(() => { if (!cancelled) setTreeDrawerTimeline({ versions: [], observations_by_version: {} }) })
    return () => { cancelled = true }
  }, [treeDrawer, iterationId, artifact])

  const carouselRef                     = useRef<HTMLDivElement>(null)
  // {week: cabecera summary} — unidad, logro_unidad, tipos_ensenanza,
  // tiempo_sesion_segundos, logro_curso. Fetched once per iteration/artifact
  // and threaded down to the carousel's WeekCard (see WeekCard's own comment
  // for why these moved out of the per-session Cabecera table). unitsByWeek
  // (just the unidad string) is derived from this for the pre-existing
  // WeekNavControl popover, which only ever needed that one field.
  const [cabeceraByWeek, setCabeceraByWeek] = useState<Record<number, CabeceraIndexEntry>>({})
  const unitsByWeek: Record<number, string> = {}
  for (const w in cabeceraByWeek) unitsByWeek[w] = cabeceraByWeek[w].unidad
  // This session's live "tiempo de dedicación" total, reported up by
  // IPESWeekEditor (see onDedicacionChange in ipes-week-editor.tsx) —
  // Material Base has no equivalent concept, stays undefined there. Reset
  // on every week/session change so a stale total from the previous
  // week/session doesn't flash before the new editor reports in.
  const [sessionDedicacionSegundos, setSessionDedicacionSegundos] = useState<number | undefined>(undefined)
  // Course-level fields (curso, logro_curso) are the same value on every
  // week — read from whichever week's cabecera happens to be loaded first,
  // instead of tying them to selectedWeek, so the top header still shows
  // them even if the currently-selected week hasn't been generated yet.
  const courseCurso = Object.values(cabeceraByWeek).find((c) => c.curso)?.curso ?? ""
  const courseLogro = Object.values(cabeceraByWeek).find((c) => c.logro_curso)?.logro_curso ?? ""
  // Group consecutive weeks sharing the same unit into runs (same algorithm
  // as week-nav-control.tsx's popover) so the carousel can show which weeks
  // belong to which unit instead of an undifferentiated 1..18 strip.
  const weekRange = Array.from({ length: WEEK_COUNT }, (_, i) => i + 1)
  const weekGroups: { unidad: string | null; weeks: number[] }[] = []
  for (const w of weekRange) {
    const unidad = unitsByWeek[w] || null
    const last = weekGroups[weekGroups.length - 1]
    if (last && last.unidad === unidad) last.weeks.push(w)
    else weekGroups.push({ unidad, weeks: [w] })
  }
  // Same weeks, but merged by unit LABEL regardless of contiguity — for the
  // bulk drawer's unit selector (weekGroups above is deliberately
  // contiguous-only, used for the carousel's unit-boundary dividers). A
  // week occasionally gets tagged with a wrong/out-of-order unit number
  // (was an LLM-hallucination bug in the cabecera call, fixed 2026-07-16 —
  // see one_step_ipes_agent.py's identity-field guardrail) which used to
  // render as several same-labelled chips that silently fought over the
  // same toggle state; merging by label here means the drawer stays usable
  // even against old, not-yet-regenerated data.
  const unitChips: { unidad: string | null; weeks: number[] }[] = []
  for (const g of weekGroups) {
    const existing = g.unidad != null ? unitChips.find((c) => c.unidad === g.unidad) : undefined
    if (existing) existing.weeks.push(...g.weeks)
    else unitChips.push({ unidad: g.unidad, weeks: [...g.weeks] })
  }

  const refreshStatuses = useCallback(() => {
    setStatuses(loadStatuses(iterationId))
  }, [iterationId])

  // ── Bulk "Gestionar Generación con IA" — drawer + carousel-of-prompts,
  // real-time status via WebSocket (falls back to polling per week, same
  // pattern ipes-week-editor.tsx's single-session regenerate already uses).
  // selectedWeeks is the single source of truth for "what will be
  // generated" — both the unit checkboxes and the numeric range inputs just
  // write into it, so picking non-contiguous units (e.g. Unidad 1 + Unidad
  // 3) works correctly instead of assuming one contiguous range. ───────────
  type BulkStatus = "queued" | "generating" | "done" | "error"
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false)
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(() => new Set(Array.from({ length: WEEK_COUNT }, (_, i) => i + 1)))
  const [bulkFrom, setBulkFrom] = useState(1)
  const [bulkTo, setBulkTo] = useState(WEEK_COUNT)
  // Which selector drives selectedWeeks — mutually exclusive so "Unidades"
  // and "Rango de semanas" can't silently fight over the same state (used to
  // both be visible/editable at once, which was confusing: picking a unit
  // didn't visually close off the range inputs, so it looked like both were
  // "active"). Mirrors the Instrucciones tabs pattern right below it.
  const [scopeMode, setScopeMode] = useState<"all" | "unit" | "range">("all")
  // 4 scopes, coarsest to finest — "one prompt for everything" down to "one
  // prompt per session". perUnit/perWeek apply the SAME prompt to every
  // session of the weeks they cover (session 1 still generates first and
  // grounds session 2+, same as always); perSession is the only one where
  // sessions of the same week can get genuinely different instructions.
  const [promptMode, setPromptMode] = useState<"shared" | "perUnit" | "perWeek" | "perSession">("shared")
  const [sharedPrompt, setSharedPrompt] = useState("")
  const [scopedPrompts, setScopedPrompts] = useState<Record<string, string>>({})
  const [carouselIndex, setCarouselIndex] = useState(0)
  // Keyed by `${week}-${session}` now that sessions 2+ actually generate —
  // was Record<number, BulkStatus> keyed by week alone when only session 1
  // was ever real.
  const [bulkStatus, setBulkStatus] = useState<Record<string, BulkStatus>>({})

  // Flat (week, session) list for the bulk drawer's carousel — presencial/
  // remoto weeks can have more than one session (see getSessionCount, a
  // per-week user-adjustable count), so "one prompt per week" isn't quite
  // right; this walks every session of every selected week instead.
  const carouselEntries: { week: number; session: number }[] = Array.from(selectedWeeks)
    .sort((a, b) => a - b)
    .flatMap((w) => Array.from({ length: getSessionCount(iterationId, w) }, (_, i) => ({ week: w, session: i + 1 })))

  // One carousel entry per prompt-scope unit — key matches what
  // runBulkGeneration looks up in scopedPrompts for a given (week, session)
  // job. perUnit/perWeek entries cover every session of their week(s), so
  // their label never mentions a session number even if getSessionCount>1.
  const scopeEntries: { key: string; label: string }[] =
    promptMode === "perUnit"
      ? unitChips
          .filter((g) => g.weeks.some((w) => selectedWeeks.has(w)))
          .map((g) => ({ key: g.unidad ?? "sin-unidad", label: g.unidad ? `Unidad ${g.unidad}` : "Semanas sin unidad asignada" }))
      : promptMode === "perWeek"
      ? Array.from(selectedWeeks).sort((a, b) => a - b).map((w) => ({ key: String(w), label: `Semana ${w}` }))
      : promptMode === "perSession"
      ? carouselEntries.map((e) => ({
          key: `${e.week}-${e.session}`,
          label: `Semana ${e.week}${carouselEntries.some((x) => x.week === e.week && x.session > 1) ? ` — Sesión ${e.session}` : ""}`,
        }))
      : []

  // Sibling course (same course_group_id — "the same class, another
  // modalidad", see courses-page.tsx's "Vincular" action) with an existing
  // workspace to pull content from as AI context instead of generating from
  // scratch. Only useful once that sibling has actually started generating
  // — no current_iteration_id means nothing to copy yet.
  const [siblingWorkspace, setSiblingWorkspace] = useState<{ codCurso: string; courseName: string; iterationId: string; modalidad: Modalidad | null } | null>(null)
  const [copyingContext, setCopyingContext] = useState(false)

  useEffect(() => {
    if (!codCurso) return
    let cancelled = false
    getCourse(codCurso)
      .then(async (course) => {
        if (!course?.course_group_id) return
        const all = await listCourses().catch(() => [])
        const sib = all.find((c) => c.cod_curso !== codCurso && c.course_group_id === course.course_group_id)
        if (!sib) return
        const procs = await listProcesses({ cod_curso: sib.cod_curso }).catch(() => [])
        const proc = procs.find((p) => p.current_iteration_id)
        if (!proc?.current_iteration_id || cancelled) return
        setSiblingWorkspace({ codCurso: sib.cod_curso, courseName: sib.name, iterationId: proc.current_iteration_id, modalidad: proc.modalidad ?? null })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [codCurso])

  const useSiblingAsContext = async (entry: { key: string; label: string }) => {
    if (!siblingWorkspace) return
    let targetWeek: number | undefined
    if (promptMode === "perWeek") targetWeek = Number(entry.key)
    else if (promptMode === "perSession") targetWeek = Number(entry.key.split("-")[0])
    else if (promptMode === "perUnit") targetWeek = unitChips.find((g) => (g.unidad ?? "sin-unidad") === entry.key)?.weeks[0]
    if (!targetWeek) return
    setCopyingContext(true)
    try {
      const timeline = await getTimeline(siblingWorkspace.iterationId, "ipes", targetWeek, 1)
      const current = timeline.versions.find((v) => v.is_current)
      if (!current) {
        pushToast(`${siblingWorkspace.courseName} todavía no tiene contenido generado para la Semana ${targetWeek}.`, true)
        return
      }
      const versionContent = await getVersionContent(siblingWorkspace.iterationId, current.version_id)
      const summary = summarizeIpesContentForContext(versionContent.content, targetWeek, siblingWorkspace.courseName)
      setScopedPrompts((prev) => ({ ...prev, [entry.key]: [prev[entry.key], summary].filter(Boolean).join("\n\n") }))
    } catch {
      pushToast("No se pudo obtener el contenido de la otra modalidad.", true)
    } finally {
      setCopyingContext(false)
    }
  }

  const [bulkRunning, setBulkRunning] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; msg: string; err?: boolean; closing?: boolean }[]>([])
  const TOAST_EXIT_MS = 220
  const notifiedWeeks = useRef<Set<string>>(new Set())

  const pushToast = useCallback((msg: string, err?: boolean) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, err }])
    // Fade/slide out first, then remove — an instant disappearance read as
    // another "annoying modal" complaint even after these became toasts.
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, closing: true } : t))
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_EXIT_MS)
    }, err ? 8000 : 5000)
  }, [])

  // Native pipeline status — launchIteration (course-artifacts-view.tsx's
  // auto-launch, or the manual "Nueva iteración" dialog) kicks off its own
  // Step Functions run that generates every week on its own; this just
  // surfaces that real, already-tracked progress (iteration.status/
  // current_step/steps) instead of the app pretending nothing is
  // happening. Replaces the old approach of also firing 18 manual
  // regenerate calls, which raced the pipeline and errored on every week
  // — see project_thursday_demo_e2e_scope.md. Errors surface as a single
  // pinned/auto-dismissing toast, not a persistent list ("modal thing" —
  // 2026-07-15 feedback).
  const [pipeline, setPipeline] = useState<Iteration | null>(null)
  const pipelineNotified = useRef(false)
  const refreshPipeline = useCallback(() => {
    if (!iterationId) return
    getIteration(iterationId).then((it) => {
      setPipeline((prev) => {
        if (it && it.status === "completed" && prev?.status !== "completed" && !pipelineNotified.current) {
          pipelineNotified.current = true
          pushToast("Generación del curso completada")
          refreshStatuses()
        }
        if (it && it.status === "failed" && prev?.status !== "failed" && !pipelineNotified.current) {
          pipelineNotified.current = true
          const failedStep = Object.values(it.steps ?? {}).find((s) => s.status === "failed")
          pushToast(`No se pudo generar el curso: ${failedStep?.error ?? "error desconocido"}`, true)
        }
        return it
      })
    }).catch(() => {})
  }, [iterationId, pushToast])

  useEffect(() => { refreshPipeline() }, [refreshPipeline])

  // Poll while the pipeline is actually running — WS below is the fast
  // path, this is the guaranteed fallback (same reasoning as the per-week
  // polling further down).
  useEffect(() => {
    if (!pipeline || (pipeline.status !== "running" && pipeline.status !== "pending")) return
    const t = setInterval(refreshPipeline, 15000)
    return () => clearInterval(t)
  }, [pipeline?.status, refreshPipeline])

  // WS is the fast path; polling below is the guaranteed fallback if the
  // socket drops mid-batch — see use-iteration-websocket.ts's own doc.
  // Active whenever the native pipeline might still be running, not just
  // while the bulk drawer happens to be open — that pipeline runs on its
  // own regardless of the drawer.
  const pipelineRunning = pipeline?.status === "running" || pipeline?.status === "pending"
  useIterationWebSocket(iterationId || null, useCallback((msg: WsMessage) => {
    if (msg.type === "iteration_update" || msg.type === "step_update") { refreshPipeline(); return }
    if (msg.type !== "week_generated" || !msg.week) return
    const session = msg.session ?? 1
    const key = `${msg.week}-${session}`
    const label = `Semana ${msg.week}${session > 1 ? ` — Sesión ${session}` : ""}`
    if (msg.status === "completed" && !notifiedWeeks.current.has(key)) {
      notifiedWeeks.current.add(key)
      setBulkStatus((prev) => prev[key] ? { ...prev, [key]: "done" } : prev)
      pushToast(`${label} generada con IA`)
    } else if (msg.status === "error") {
      setBulkStatus((prev) => prev[key] ? { ...prev, [key]: "error" } : prev)
      pushToast(`${label}: no se pudo generar`, true)
    }
  }, [pushToast, refreshPipeline]), bulkDrawerOpen || bulkRunning || pipelineRunning)

  const pollWeekCompletion = async (week: number, session: number, beforeVersionId: string | null): Promise<boolean> => {
    const key = `${week}-${session}`
    for (let attempt = 0; attempt < 45; attempt++) {
      await new Promise((r) => setTimeout(r, 4000))
      if (notifiedWeeks.current.has(key)) return true  // WS already confirmed it
      try {
        const t = await getTimeline(iterationId, "ipes", week, session)
        const latest = t.versions[t.versions.length - 1]
        if (latest && latest.version_id !== beforeVersionId && latest.source === "ai_generated") return true
      } catch { /* keep polling */ }
    }
    return false
  }

  const runBulkGeneration = async () => {
    const weeks = Array.from(selectedWeeks).sort((a, b) => a - b)
    if (weeks.length === 0) return
    notifiedWeeks.current = new Set()
    setBulkRunning(true)
    const initialStatus: Record<string, BulkStatus> = {}
    weeks.forEach((w) => {
      const n = getSessionCount(iterationId, w)
      for (let s = 1; s <= n; s++) initialStatus[`${w}-${s}`] = "queued"
    })
    setBulkStatus(initialStatus)

    const CONCURRENCY = 3
    const queue = [...weeks]
    const worker = async () => {
      while (queue.length > 0) {
        const w = queue.shift()
        if (w === undefined) return
        // Sessions within a week run sequentially — session N's generation
        // reads session N-1's CURRENT version as grounding context (see
        // regenerate_week/handler.py), so it must exist first. Different
        // weeks still run concurrently via the worker pool.
        const n = getSessionCount(iterationId, w)
        for (let s = 1; s <= n; s++) {
          const key = `${w}-${s}`
          const label = `Semana ${w}${n > 1 ? ` — Sesión ${s}` : ""}`
          setBulkStatus((prev) => ({ ...prev, [key]: "generating" }))
          let beforeVersionId: string | null = null
          try {
            const t0 = await getTimeline(iterationId, "ipes", w, s)
            beforeVersionId = t0.versions[t0.versions.length - 1]?.version_id ?? null
          } catch { /* first-ever generation for this session — no prior version */ }
          try {
            const prompt =
              promptMode === "shared" ? sharedPrompt :
              promptMode === "perUnit" ? (scopedPrompts[unitsByWeek[w] ?? "sin-unidad"] || "") :
              promptMode === "perWeek" ? (scopedPrompts[String(w)] || "") :
              (scopedPrompts[key] || "")
            await regenerateIpesWeek(iterationId, w, s, prompt, n)
            const ok = await pollWeekCompletion(w, s, beforeVersionId)
            setBulkStatus((prev) => prev[key] === "done" ? prev : { ...prev, [key]: ok ? "done" : "error" })
            if (ok && !notifiedWeeks.current.has(key)) { notifiedWeeks.current.add(key); pushToast(`${label} generada con IA`) }
            if (!ok) break // don't chain a broken session's context forward
          } catch {
            setBulkStatus((prev) => ({ ...prev, [key]: "error" }))
            break
          }
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setBulkRunning(false)
  }

  // Auto-open the drawer when navigated here with that intent — see the AI
  // icon on course-artifacts-view.tsx's IPES card.
  //
  // REVERTED 2026-07-15 (same day): this used to also auto-fire
  // runBulkGeneration() on a fresh launch (autoGenerateAll flag), on the
  // wrong assumption that launchIteration() doesn't generate anything on
  // its own. It does — launchIteration kicks off its own native Step
  // Functions pipeline that generates all weeks itself via a Map state.
  // Firing 18 manual regenerate_week calls immediately after launch raced
  // against that not-yet-started pipeline (schema_con_recursos wasn't
  // written yet) and failed for every single week. See
  // project_thursday_demo_e2e_scope.md — the real fix is to show the
  // native pipeline's own progress (iteration status/steps), not to
  // duplicate its work.
  useEffect(() => {
    const st = (location.state as Record<string, any> | null)
    if (st?.openBulkDrawer) setBulkDrawerOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!iterationId) return
    getCabeceraIndex(iterationId, artifact, WEEK_COUNT).then(setCabeceraByWeek).catch(() => setCabeceraByWeek({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iterationId, artifact])

  // Clear the stale total immediately on week/session change — IPESWeekEditor
  // reports the fresh one back in shortly after remounting, but without this
  // the old week's number would flash for a frame first.
  useEffect(() => {
    setSessionDedicacionSegundos(undefined)
  }, [selectedWeek, selectedSession])

  // Keep the breadcrumb (app-shell.tsx) in sync with the selected week — there's
  // no "iteration" concept in user-facing chrome anymore, so the last crumb
  // shows "Semana N" instead, read from location.state.currentWeek.
  useEffect(() => {
    navigate(location.pathname, { replace: true, state: { ...st, currentWeek: selectedWeek } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek])

  // Scroll selected card into view when selection changes
  useEffect(() => {
    const el = carouselRef.current?.querySelector<HTMLElement>(`[data-week="${selectedWeek}"]`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [selectedWeek])

  // AI mode: auto-approve weeks that have draft content in localStorage
  useEffect(() => {
    if (mode !== "ai") return
    for (let w = 1; w <= 18; w++) {
      const d = getCompuertaState(iterationId, w)
      if (d.state !== "open") continue
      const hasIpes = !!localStorage.getItem(`ipes_draft_${iterationId}_${w}`)
      const hasMb   = !!localStorage.getItem(`mb_draft_${iterationId}_${w}_0`)
      if (hasIpes || hasMb) setCompuertaState(iterationId, w, "approved", "IA")
    }
    refreshStatuses()
  }, [mode, iterationId, refreshStatuses])

  const selectWeek = (week: number) => {
    setSelectedWeek(week)
    setSelectedSession(1)
    setActiveTab("content")
  }

  const addSession = () => {
    const next = sessionCount + 1
    setSessionCount(iterationId, selectedWeek, next)
    setSelectedSession(next)
  }

  const artifactLabel = artifact === "ipes" ? "Diseño de Sesión" : "Material Base"

  const wStatus  = statuses[selectedWeek] ?? { compuerta: "open" as CompuertaState, comments: 0, unresolved: 0, autoApproved: false }
  const col      = STATE_COLOR[wStatus.compuerta]
  const isLocked = wStatus.compuerta === "in_review" || wStatus.compuerta === "approved"
  const canEdit  = userRole === "gc" || userRole === "lxd" || userRole === "docente_elaborador" || userRole === "admin"
  const readonly = isLocked && !canEdit

  // General compuerta aggregates
  const approvedCount  = Object.values(statuses).filter(s => s.compuerta === "approved").length
  const inReviewCount  = Object.values(statuses).filter(s => s.compuerta === "in_review").length
  const changesCount   = Object.values(statuses).filter(s => s.compuerta === "changes_requested").length
  const allApproved    = approvedCount === 18
  const generalPct     = Math.round((approvedCount / 18) * 100)

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    borderBottom: activeTab === tab ? "3px solid var(--blue)" : "3px solid transparent",
    color: activeTab === tab ? "var(--blue)" : "var(--text-muted)",
    background: "none",
    fontFamily: "inherit",
    transition: "color .12s, border-color .12s",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  })

  return (
    // NOTE on layout: no forced height:100% here, and no forced
    // overflow:hidden on the sections below — this page used to trap its own
    // content in fixed-height panes nested inside the app shell's own
    // scrolling container, which clipped the editors instead of scrolling
    // them. Now the whole page flows naturally and scrolls as one.
    <div style={{ display: "flex", flexDirection: "column", background: "var(--content-bg)" }}>
      <style>{`
        @keyframes iwFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .iw-fade-in { animation: iwFadeIn .2s ease; }
        .iw-chevron { transition: transform .15s ease; }
      `}</style>

      {/* ── Top header — "principal cabecera": the one place course/modalidad
          render, in the same plain icon+"Label: value" style used for
          Curso/Modalidad in course-artifacts-view.tsx (no table, no card).
          Color rule per direct instruction: black (var(--text-strong)) ONLY
          for the artifact label and "Semana N" — everything else (Curso,
          Modalidad, Logro del curso, and Unidad/Logro-de-la-unidad in
          ipes-cabecera.tsx) uses var(--text-secondary), which is literally
          #4F6168 — the exact color course-artifacts-view.tsx's own Curso/
          Modalidad rows use, not an approximation. ── */}
      <div style={{
        padding: "14px 20px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          {/* Plain bold text, not a colored tag/pill — the pill styling read
              as noise once "IPES (Sesiones de clase)" was already the one
              remaining occurrence of the artifact name on screen. Black
              regardless of artifact (was blue/green before) — only the
              artifact label and "Semana N" are black on this page. */}
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text-strong)" }}>
            {artifactLabel}
          </span>

          {/* Híbrido/IA — taken out of the tag/pill entirely per direct
              instruction: icon + label only, no background/border/padding.
              Still uses distinct colors (bluish for Híbrido, sky-blue for
              IA) so the two remain visually distinguishable without the
              badge chrome. */}
          <span style={{
            marginLeft: "auto", flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 800,
            color: mode === "ai" ? "#0284C7" : "var(--blue)",
          }}>
            {mode === "ai"
              ? <><BotRegular style={{ fontSize: 16 }} />IA</>
              : <><PeopleRegular style={{ fontSize: 16 }} />Híbrido</>
            }
          </span>

          {/* Hidden for now per 2026-07-22 request — bulk drawer/logic below kept
              intact so this can be re-enabled by dropping the `false &&`. */}
          {false && artifact === "ipes" && canEdit && (
            <button
              className="btn btn-sm btn-outline-primary"
              data-tour="ipes-gestionar-generacion-btn"
              onClick={() => setBulkDrawerOpen(true)}
              title="Genera varias semanas/sesiones de Diseño de Sesión con IA a la vez, por unidad o rango, con un prompt compartido o uno por sesión"
              style={{ gap: 6 }}
            >
              <SparkleRegular style={{ fontSize: 14 }} /> Gestionar Generación con IA
            </button>
          )}

          {/* Solicitar Revisión — moved here next to the Híbrido/IA tag
              (2026-07-24, was in IPESWeekEditor's own per-week toolbar) so
              it reads as a course-level action. Still just jumps to the
              Compuerta tab — the actual per-session submit-to-review lives
              there (compuerta-panel.tsx); this is not yet a bulk "submit
              every week" action. */}
          {artifact === "ipes" && canEdit && (
            <button
              className="btn btn-primary"
              data-tour="ipes-solicitar-revision-btn"
              onClick={() => setActiveTab("compuerta")}
              title="Ir a la pestaña Compuerta para enviar esta sesión a revisión"
            >
              Solicitar Revisión
            </button>
          )}
        </div>

        {/* Curso/Modalidad sizing (14px, 20px icons) and weight (700/400)
            match course-artifacts-view.tsx's own Curso/Modalidad rows
            exactly — this IS the reference, not "similar to." Curso row
            includes the course code (codCurso, a real route param — was
            available but never read here) alongside the name. */}
        {courseCurso && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <BookRegular style={{ fontSize: 20, color: "#283044", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: "20px", color: "var(--text-secondary)" }}>
              Curso: {courseCurso}{codCurso && ` (${codCurso})`}
            </span>
          </div>
        )}
        {modalidad && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <DesktopRegular style={{ fontSize: 20, color: "#283044", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 400, lineHeight: "20px", color: "var(--text-secondary)" }}>Enseñanza: {modalidad}</span>
          </div>
        )}
        {courseLogro && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <TargetRegular style={{ fontSize: 20, color: "#283044", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 400, lineHeight: "20px", color: "var(--text-secondary)" }}>Logro del curso: {courseLogro}</span>
          </div>
        )}
      </div>

      {pipelineRunning && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--blue-light)", borderBottom: "1px solid var(--blue-mid)", color: "var(--blue-dark)", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <span className="spinner-sm" />
          Generando el curso — las semanas van apareciendo a medida que se completan. Puedes seguir navegando mientras tanto.
        </div>
      )}
      {pipeline?.status === "failed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--danger-bg)", borderBottom: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          No se pudo generar el curso: {Object.values(pipeline.steps ?? {}).find((s) => s.status === "failed")?.error ?? "error desconocido"}
        </div>
      )}

      {/* ── Carousel — hideable so it doesn't eat space you need for the editor ──
          Hidden behind SHOW_LEGACY_CAROUSEL (see its own comment) — replaced
          by SessionTree below, not deleted. ── */}
      {SHOW_LEGACY_CAROUSEL && (
      <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", flexShrink: 0, padding: weeksOpen ? "10px 16px 8px" : "6px 16px" }}>
        <div
          onClick={() => setWeeksOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: weeksOpen ? 8 : 0 }}
        >
          <ChevronDownRegular className="iw-chevron" style={{ fontSize: 14, color: "var(--text-muted)", transform: weeksOpen ? "rotate(180deg)" : "none" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            18 Semanas{weeksOpen ? " — selecciona una para ver el detalle" : ` — Semana ${selectedWeek} seleccionada`}
          </span>
        </div>
        {weeksOpen && (<div className="iw-fade-in">
        <div
          ref={carouselRef}
          style={{
            display: "flex",
            alignItems: "flex-start",
            overflowX: "auto",
            paddingBottom: 6,
            scrollbarWidth: "thin",
            scrollbarColor: "var(--border) transparent",
          }}
        >
          {weekGroups.map((g, gi) => (
            <div key={gi} style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase",
                letterSpacing: ".04em", marginBottom: 4, minHeight: 11, textAlign: "center",
              }}>
                {g.unidad ? `Unidad ${g.unidad}` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                {g.weeks.map((week) => (
                  <div key={week} style={{ display: "flex", alignItems: "center" }}>
                    <div data-week={week}>
                      <WeekCard
                        week={week}
                        status={statuses[week] ?? { compuerta: "open", comments: 0, unresolved: 0, autoApproved: false }}
                        selected={selectedWeek === week}
                        onClick={() => selectWeek(week)}
                      />
                    </div>
                    {week < WEEK_COUNT && (
                      <GateDiamond state={statuses[week]?.compuerta ?? "open"} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── General compuerta cap — marginTop matches the "Unidad N" label
              row's reserved height above the WeekCard row, so this still lines
              up with the cards now that the carousel aligns items to flex-start
              (needed so "Unidad N" labels can sit above their week runs). ── */}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0, marginTop: 15 }}>
            <div style={{ width: 18, height: 2, background: allApproved ? "var(--success)" : "var(--border)" }} />
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "8px 10px", flexShrink: 0,
              border: `2px solid ${allApproved ? "var(--success)" : changesCount > 0 ? "var(--warning)" : inReviewCount > 0 ? "var(--blue)" : "var(--border)"}`,
              borderRadius: 10,
              background: allApproved ? "var(--success-bg)" : changesCount > 0 ? "var(--warning-bg)" : inReviewCount > 0 ? "var(--blue-light)" : "var(--content-bg)",
              minWidth: 86,
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", textAlign: "center",
                color: allApproved ? "var(--success)" : changesCount > 0 ? "var(--warning)" : inReviewCount > 0 ? "var(--blue)" : "var(--text-muted)" }}>
                Revisión<br/>General
              </div>
              <div style={{
                width: 22, height: 22, transform: "rotate(45deg)",
                background: allApproved ? "#9BEBAB" : changesCount > 0 ? "#F5D67A" : inReviewCount > 0 ? "var(--blue-mid)" : "var(--border)",
                border: `2.5px solid ${allApproved ? "var(--success)" : changesCount > 0 ? "var(--warning)" : inReviewCount > 0 ? "var(--blue)" : "var(--border)"}`,
                borderRadius: 3,
              }} />
              <div style={{ fontSize: 11, fontWeight: 800, color: allApproved ? "var(--success)" : "var(--text-secondary)" }}>
                {allApproved ? "✓" : `${approvedCount}/18`}
              </div>
            </div>
          </div>
        </div>

        {/* Legend + progress */}
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {(Object.entries(STATE_COLOR) as [CompuertaState, (typeof STATE_COLOR)[CompuertaState]][]).map(([state, c]) => (
            <span
              key={state}
              style={{ fontSize: 10, color: c.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
            >
              <span style={{
                display: "inline-block", width: 9, height: 9, transform: "rotate(45deg)",
                background: c.bg, border: `1.5px solid ${c.color}`, borderRadius: 1, flexShrink: 0,
              }} />
              {c.icon} {STATE_LABEL[state]}
            </span>
          ))}
          <div style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <div style={{ flex: 1, height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${generalPct}%`,
                background: allApproved ? "var(--success)" : changesCount > 0 ? "var(--warning)" : "var(--blue)",
                borderRadius: 3,
                transition: "width .4s ease",
              }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: allApproved ? "var(--success)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {approvedCount}/18 aprobadas
            </span>
          </div>
        </div>

        {/* General compuerta status banner */}
        {allApproved ? (
          <div style={{
            marginTop: 8, padding: "10px 14px",
            background: "var(--success-bg)", border: "1px solid #9BEBAB", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--success)" }}>Revisión General Aprobada</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Todas las semanas fueron revisadas y aprobadas.</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", background: "#9BEBAB", padding: "4px 12px", borderRadius: 20, border: "1px solid #a5d6a7" }}>
                Siguiente fase disponible →
              </span>
            </div>
          </div>
        ) : changesCount > 0 ? (
          <div style={{
            marginTop: 8, padding: "8px 14px",
            background: "var(--warning-bg)", border: "1px solid #F5D67A", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#92400e",
          }}>
            <span>⚠</span>
            <span><strong>{changesCount} semana{changesCount > 1 ? "s" : ""}</strong> con cambios solicitados. Resuélvelos antes de aprobar la compuerta general.</span>
          </div>
        ) : inReviewCount > 0 ? (
          <div style={{
            marginTop: 8, padding: "8px 14px",
            background: "var(--blue-light)", border: "1px solid var(--blue-mid)", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--blue)",
          }}>
            <span>◉</span>
            <span><strong>{inReviewCount} semana{inReviewCount > 1 ? "s" : ""}</strong> en revisión. {approvedCount > 0 ? `${approvedCount} aprobadas.` : ""}</span>
          </div>
        ) : null}
        </div>)}
      </div>
      )}

      {/* ── Week detail — 2-column layout (Diseña+ reference, 2026-07-17):
          SessionTree (Unidad→Semana→Sesión nav + observation badges,
          replaces the carousel above) next to the existing week header/tabs/
          editor column, which is where the IPES editor's own content starts
          (Utilidad/situación inicial onward, below the cabecera chrome).
          Splitter is BOTH draggable (push left/right to resize, tracked via
          splitterRowRef's bounding box) and clickable (collapse/expand) —
          the two live on separate elements inside it so a resize-drag can't
          accidentally toggle collapse. ── */}
      <div ref={splitterRowRef} style={{ display: "flex", alignItems: "flex-start", padding: 16, userSelect: draggingSplitter ? "none" : "auto" }}>
        {!treeCollapsed && (
          <div style={{ width: `${treeWidthPct}%`, minWidth: 180, flexShrink: 0, position: "sticky", top: 16 }}>
            <SessionTree
              weekGroups={weekGroups}
              cabeceraByWeek={cabeceraByWeek}
              selectedWeek={selectedWeek}
              selectedSession={selectedSession}
              isPresencialRemoto={isPresencialRemoto}
              iterationId={iterationId}
              approvedCount={approvedCount}
              weekCount={WEEK_COUNT}
              onSelect={(week, session) => { selectWeek(week); setSelectedSession(session) }}
              onShowObservations={(week, session) => setTreeDrawer({ week, session, mode: "observations" })}
              onShowHistory={(week, session) => setTreeDrawer({ week, session, mode: "history" })}
              allowedWeeks={allowedWeeks}
            />
          </div>
        )}

        {/* Splitter — drag the bar itself to resize, click the round handle to collapse/expand */}
        <div
          onMouseDown={() => !treeCollapsed && setDraggingSplitter(true)}
          title={treeCollapsed ? "Mostrar árbol de sesiones" : "Arrastra para redimensionar"}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch",
            flexShrink: 0, width: 20, marginLeft: treeCollapsed ? 0 : 4, marginRight: 4,
            cursor: treeCollapsed ? "default" : "col-resize",
          }}
        >
          <div style={{ width: 1, flex: 1, background: draggingSplitter ? "var(--blue)" : "var(--border)" }} />
          <button
            onClick={(e) => { e.stopPropagation(); setTreeCollapsed((v) => !v) }}
            onMouseDown={(e) => e.stopPropagation()}
            title={treeCollapsed ? "Mostrar árbol de sesiones" : "Ocultar árbol de sesiones"}
            style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0, padding: 0,
              border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {treeCollapsed
              ? <ChevronRightRegular style={{ fontSize: 12, color: "var(--text-muted)" }} />
              : <ChevronLeftRegular style={{ fontSize: 12, color: "var(--text-muted)" }} />}
          </button>
          <div style={{ width: 1, flex: 1, background: draggingSplitter ? "var(--blue)" : "var(--border)" }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface)", borderRadius: "var(--radius-md)" }}>

        {/* Week header + tabs */}
        <div style={{ padding: "14px 20px 0", background: "#fff", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {/* Unidad renders ABOVE "Semana N", per direct instruction — the
              unit is the bigger grouping, so it reads first. Includes this
              session's live time total (SessionTimeRow inside UnitSummary)
              when viewing IPES — see sessionDedicacionSegundos above. */}
          {cabeceraByWeek[selectedWeek] && (
            <UnitSummary data={cabeceraByWeek[selectedWeek]} totalDedicacionSegundos={artifact === "ipes" ? sessionDedicacionSegundos : undefined} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-strong)" }}>Semana {selectedWeek}</span>

            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: col.color }}>{STATE_LABEL[wStatus.compuerta]}</span>
            </span>

            {wStatus.unresolved > 0 && (
              <span
                style={{ fontSize: 11, color: "var(--warning)", fontWeight: 700, cursor: "pointer" }}
                onClick={() => setActiveTab("compuerta")}
                title="Ver compuerta"
              >
                💬 {wStatus.unresolved} pendiente{wStatus.unresolved !== 1 ? "s" : ""}
              </span>
            )}

            {wStatus.autoApproved && (
              <span style={{
                fontSize: 11, color: "#6B7280", background: "#F3F4F6",
                padding: "2px 8px", borderRadius: 20, fontWeight: 600,
              }}>
                🤖 Auto-aprobada
              </span>
            )}

            {readonly && (
              <span style={{
                fontSize: 11, color: "var(--blue)", background: "var(--blue-light)",
                padding: "2px 8px", borderRadius: 20, fontWeight: 600,
              }}>
                🔒 Solo lectura
              </span>
            )}

            {/* Prev / Next navigation */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <button
                onClick={() => selectWeek(Math.max(1, selectedWeek - 1))}
                disabled={selectedWeek === 1}
                style={{
                  width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6,
                  background: "#fff", cursor: selectedWeek === 1 ? "not-allowed" : "pointer",
                  color: "var(--text-secondary)", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: selectedWeek === 1 ? 0.35 : 1,
                }}
              >
                ‹
              </button>
              <button
                onClick={() => selectWeek(Math.min(18, selectedWeek + 1))}
                disabled={selectedWeek === 18}
                style={{
                  width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 6,
                  background: "#fff", cursor: selectedWeek === 18 ? "not-allowed" : "pointer",
                  color: "var(--text-secondary)", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: selectedWeek === 18 ? 0.35 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Week-tier context (tipos de enseñanza / tiempo de sesión) —
              moved out of the per-session Cabecera, see ipes-cabecera.tsx
              header comment. Unit-tier context now renders above "Semana N"
              instead (see UnitSummary above). */}
          {cabeceraByWeek[selectedWeek] && <WeekTierSummary data={cabeceraByWeek[selectedWeek]} />}

          {/* Sesiones de la semana — solo presencial/remoto, un curso virtual
              siempre tiene exactamente una sesión por semana. */}
          {isPresencialRemoto && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                Sesiones de esta semana:
              </span>
              {Array.from({ length: sessionCount }, (_, i) => i + 1).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSession(s)}
                  style={{
                    padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: `1px solid ${selectedSession === s ? "var(--blue)" : "var(--border)"}`,
                    background: selectedSession === s ? "var(--blue-light)" : "#fff",
                    color: selectedSession === s ? "var(--blue-dark)" : "var(--text-secondary)",
                  }}
                >
                  Sesión {s}
                </button>
              ))}
              {!readonly && (
                <button className="btn btn-ghost btn-sm" onClick={addSession} style={{ fontSize: 12 }}>
                  + Nueva sesión
                </button>
              )}
            </div>
          )}

          {/* Tabs — "Contenido" not artifactLabel: the top header's pill badge
              already says "IPES (Sesiones de clase)"/"Material Base" once,
              repeating it here (and a third time in the editor's own toolbar
              title below) was the duplication flagged for removal. */}
          <div style={{ display: "flex" }}>
            <button style={tabStyle("content")} onClick={() => setActiveTab("content")}>
              Contenido
            </button>
            <button style={tabStyle("compuerta")} onClick={() => setActiveTab("compuerta")} data-tour="tab-compuerta">
              Revisiones
              {wStatus.unresolved > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 17, height: 17, borderRadius: "50%",
                  background: "var(--warning)", color: "#fff",
                  fontSize: 9, fontWeight: 800, flexShrink: 0,
                }}>
                  {wStatus.unresolved}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ display: "flex" }}>
          {activeTab === "content" && artifact === "ipes" && (
            <IPESWeekEditor
              key={`ipes-${iterationId}-${selectedWeek}-${selectedSession}`}
              iterationId={iterationId}
              weekNumber={selectedWeek}
              sessionNumber={selectedSession}
              sessionCount={sessionCount}
              readonly={readonly}
              userRole={userRole}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode((v) => !v)}
              onNavigateWeek={selectWeek}
              weekCount={WEEK_COUNT}
              unitsByWeek={unitsByWeek}
              onDedicacionChange={setSessionDedicacionSegundos}
            />
          )}
          {activeTab === "content" && artifact === "mb" && (
            <MBWeekEditor
              key={`mb-${iterationId}-${selectedWeek}-${selectedSession}`}
              iterationId={iterationId}
              weekNumber={selectedWeek}
              sessionNumber={selectedSession}
              readonly={readonly}
              userRole={userRole}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode((v) => !v)}
              onNavigateWeek={selectWeek}
              weekCount={WEEK_COUNT}
              unitsByWeek={unitsByWeek}
            />
          )}
          {activeTab === "compuerta" && (
            <div style={{ width: "100%", background: "var(--content-bg)" }}>
              <CompuertaPanel
                key={`cp-${iterationId}-${selectedWeek}-${selectedSession}-${compuertaRev}`}
                iterationId={iterationId}
                weekNumber={selectedWeek}
                sessionNumber={selectedSession}
                artifact={artifact}
                userRole={userRole}
                userName={userName}
                variant="inline"
                onStateChange={() => {
                  setCompuertaRev((n) => n + 1)
                  refreshStatuses()
                }}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      {bulkDrawerOpen && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => !bulkRunning && setBulkDrawerOpen(false)} />
          <div style={{ position: "relative", width: 420, maxWidth: "100%", background: "var(--surface)", height: "100%", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <SparkleRegular style={{ fontSize: 17, color: "var(--blue)" }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-strong)" }}>Gestionar Generación con IA</span>
              <button className="icon-btn" onClick={() => !bulkRunning && setBulkDrawerOpen(false)} style={{ marginLeft: "auto" }} disabled={bulkRunning}>
                <DismissRegular style={{ fontSize: 15 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Semanas</div>
                <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden", marginBottom: 10 }}>
                  {(["all", "unit", "range"] as const).map((m, i) => (
                    <button key={m} disabled={bulkRunning} onClick={() => {
                      setScopeMode(m)
                      if (m === "all") {
                        setSelectedWeeks(new Set(Array.from({ length: WEEK_COUNT }, (_, i2) => i2 + 1)))
                      } else if (m === "unit") {
                        setSelectedWeeks(new Set())
                      } else {
                        setBulkFrom(1); setBulkTo(WEEK_COUNT)
                        setSelectedWeeks(new Set(Array.from({ length: WEEK_COUNT }, (_, i2) => i2 + 1)))
                      }
                    }} style={{
                      flex: 1, padding: "7px 4px", border: "none", borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", fontSize: 11.5, fontWeight: scopeMode === m ? 700 : 400,
                      background: scopeMode === m ? "var(--blue)" : "var(--surface)",
                      color: scopeMode === m ? "white" : "var(--text-muted)",
                    }}>
                      {m === "all" ? "Todas" : m === "unit" ? "Por unidad" : "Rango"}
                    </button>
                  ))}
                </div>

                {scopeMode === "unit" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {unitChips.map((g, i) => {
                      const checked = g.weeks.every((w) => selectedWeeks.has(w))
                      return (
                        <button key={i} disabled={bulkRunning} onClick={() => {
                          setSelectedWeeks((prev) => {
                            const next = new Set(prev)
                            g.weeks.forEach((w) => checked ? next.delete(w) : next.add(w))
                            return next
                          })
                        }} style={{
                          padding: "5px 10px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          border: `1px solid ${checked ? "var(--blue)" : "var(--border)"}`,
                          background: checked ? "var(--blue-light)" : "var(--surface)",
                          color: checked ? "var(--blue-dark)" : "var(--text-muted)",
                        }}>
                          {g.unidad ? `Unidad ${g.unidad}` : `Sem. ${g.weeks[0]}–${g.weeks[g.weeks.length - 1]}`}
                        </button>
                      )
                    })}
                  </div>
                )}

                {scopeMode === "range" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem.</span>
                    <input type="number" min={1} max={WEEK_COUNT} value={bulkFrom} disabled={bulkRunning}
                      onChange={(e) => {
                        const from = Math.max(1, Math.min(WEEK_COUNT, +e.target.value))
                        setBulkFrom(from)
                        const to = Math.max(from, bulkTo)
                        setSelectedWeeks(new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i)))
                      }}
                      style={{ width: 56, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, textAlign: "center" }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>a</span>
                    <input type="number" min={1} max={WEEK_COUNT} value={bulkTo} disabled={bulkRunning}
                      onChange={(e) => {
                        const to = Math.max(1, Math.min(WEEK_COUNT, +e.target.value))
                        setBulkTo(to)
                        const from = Math.min(bulkFrom, to)
                        setSelectedWeeks(new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i)))
                      }}
                      style={{ width: 56, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, textAlign: "center" }} />
                  </div>
                )}

                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                  {selectedWeeks.size} semana{selectedWeeks.size === 1 ? "" : "s"} seleccionada{selectedWeeks.size === 1 ? "" : "s"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Instrucciones</div>
                <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden", marginBottom: 10 }}>
                  {(["shared", "perUnit", "perWeek", "perSession"] as const).map((m, i) => (
                    <button key={m} disabled={bulkRunning} onClick={() => { setPromptMode(m); setCarouselIndex(0) }} style={{
                      flex: 1, padding: "7px 4px", border: "none", borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", fontSize: 11.5, fontWeight: promptMode === m ? 700 : 400,
                      background: promptMode === m ? "var(--blue)" : "var(--surface)",
                      color: promptMode === m ? "white" : "var(--text-muted)",
                    }}>
                      {m === "shared" ? "Todas" : m === "perUnit" ? "Por unidad" : m === "perWeek" ? "Por semana" : "Por sesión"}
                    </button>
                  ))}
                </div>

                {promptMode === "shared" ? (
                  <textarea
                    value={sharedPrompt} onChange={(e) => setSharedPrompt(e.target.value)} disabled={bulkRunning}
                    placeholder="Instrucciones opcionales para todas las semanas seleccionadas…"
                    rows={4}
                    maxLength={2000}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }}
                  />
                ) : scopeEntries.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "12px 0" }}>Selecciona al menos una semana arriba.</div>
                ) : (
                  <div>
                    {(() => {
                      const idx = Math.min(carouselIndex, scopeEntries.length - 1)
                      const entry = scopeEntries[idx]
                      const isLastSessionOfWeek = promptMode === "perSession" && carouselEntries[idx]?.session > 1
                      return (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <button className="icon-btn" disabled={bulkRunning || idx <= 0}
                              onClick={() => setCarouselIndex((i) => i - 1)}>
                              <ChevronLeftRegular style={{ fontSize: 15 }} />
                            </button>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)" }}>{entry.label}</span>
                            <button className="icon-btn" disabled={bulkRunning || idx >= scopeEntries.length - 1}
                              onClick={() => setCarouselIndex((i) => i + 1)}>
                              <ChevronRightRegular style={{ fontSize: 15 }} />
                            </button>
                          </div>
                          {promptMode === "perUnit" && (
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                              Se aplica a todas las semanas (y sesiones) seleccionadas de esta unidad.
                            </div>
                          )}
                          {promptMode === "perWeek" && (
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                              Se aplica a todas las sesiones de esta semana, si tiene más de una.
                            </div>
                          )}
                          {isLastSessionOfWeek && (
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                              Usa como contexto lo generado en la sesión anterior — se genera en orden dentro de cada semana.
                            </div>
                          )}
                          {siblingWorkspace && (
                            <button
                              type="button"
                              disabled={bulkRunning || copyingContext}
                              onClick={() => useSiblingAsContext(entry)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
                                padding: "5px 10px", marginBottom: 8, borderRadius: 100, fontSize: 11.5, fontWeight: 700,
                                border: "1px solid var(--blue-mid)", background: "var(--blue-light)", color: "var(--blue-dark)",
                                cursor: copyingContext ? "wait" : "pointer",
                              }}
                            >
                              <SparkleRegular style={{ fontSize: 13 }} />
                              {copyingContext ? "Obteniendo contenido…" : `Usar como contexto de ${siblingWorkspace.modalidad ? MODALIDAD_SHORT_LABEL[siblingWorkspace.modalidad] : "la otra modalidad"}`}
                            </button>
                          )}
                          <textarea
                            value={scopedPrompts[entry.key] ?? ""}
                            onChange={(e) => setScopedPrompts((prev) => ({ ...prev, [entry.key]: e.target.value }))}
                            disabled={bulkRunning}
                            placeholder={`Instrucciones opcionales para ${entry.label.toLowerCase()}…`}
                            rows={4}
                            maxLength={2000}
                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }}
                          />
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {Object.keys(bulkStatus).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Progreso</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                    {Object.entries(bulkStatus).map(([key, s]) => {
                      const [w, sess] = key.split("-")
                      return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                        <span style={{ minWidth: 60, color: "var(--text-secondary)" }}>Semana {w}{sess !== "1" ? ` · S${sess}` : ""}</span>
                        <span style={{
                          fontWeight: 700,
                          color: s === "done" ? "#27793E" : s === "error" ? "#D11C26" : s === "generating" ? "var(--blue)" : "var(--text-muted)",
                        }}>
                          {s === "queued" ? "En cola" : s === "generating" ? "Generando…" : s === "done" ? "✓ Generada" : "✗ Error"}
                        </span>
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 16, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", gap: 6 }} onClick={runBulkGeneration} disabled={bulkRunning || selectedWeeks.size === 0}>
                {bulkRunning ? <><span className="spinner-sm" /> Generando…</> : <><SparkleRegular style={{ fontSize: 14 }} /> Generar</>}
              </button>
              <button className="btn btn-ghost" onClick={() => setBulkDrawerOpen(false)} disabled={bulkRunning}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toasts.length > 0 && createPortal(
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 4000, display: "flex", flexDirection: "column", gap: 8 }}>
          {toasts.map((t) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", maxWidth: 360,
              boxShadow: "var(--shadow-lg)",
              transition: `opacity ${TOAST_EXIT_MS}ms ease, transform ${TOAST_EXIT_MS}ms ease`,
              opacity: t.closing ? 0 : 1, transform: t.closing ? "translateX(12px)" : "translateX(0)",
            }}>
              <div style={{ width: 4, flexShrink: 0, background: t.err ? "var(--danger)" : "var(--blue)" }} />
              <div style={{
                flex: 1, background: t.err ? "var(--danger)" : "var(--text-strong)", color: "var(--text-white)",
                padding: "10px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
              }}>
                {t.err ? <DismissRegular style={{ fontSize: 14, flexShrink: 0 }} /> : <SparkleRegular style={{ fontSize: 14, color: "#7DEAE6", flexShrink: 0 }} />}
                {t.msg}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Tree-row shortcut drawer — flag icon (observations) / history icon
          (full VersionTimeline), see SessionTree. Read-only peek — the main
          editor's own Historial tab is still where revert lives. */}
      {treeDrawer && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => setTreeDrawer(null)} />
          <div style={{ position: "relative", width: 400, maxWidth: "100%", background: "var(--surface)", height: "100%", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              {treeDrawer.mode === "observations"
                ? <FlagFilled style={{ fontSize: 16, color: "var(--warning)" }} />
                : <HistoryRegular style={{ fontSize: 17, color: "var(--blue)" }} />}
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-strong)" }}>
                {treeDrawer.mode === "observations" ? "Observaciones" : "Historial"} — Semana {treeDrawer.week}
                {isPresencialRemoto && getSessionCount(iterationId, treeDrawer.week) > 1 ? ` · Sesión ${treeDrawer.session}` : ""}
              </span>
              <button className="icon-btn" onClick={() => setTreeDrawer(null)} style={{ marginLeft: "auto" }}>
                <DismissRegular style={{ fontSize: 15 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {!treeDrawerTimeline ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 13 }}>
                  <span className="spinner-sm" /> Cargando…
                </div>
              ) : treeDrawer.mode === "history" ? (
                <VersionTimelineView timeline={treeDrawerTimeline} canRevert={false} />
              ) : (
                (() => {
                  const allObs: Observation[] = Object.values(treeDrawerTimeline.observations_by_version).flat()
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  if (allObs.length === 0) {
                    return <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "24px 0" }}>Sin observaciones para esta sesión.</div>
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {allObs.map((o) => (
                        <div key={o.observation_id} style={{
                          padding: "10px 12px", borderRadius: "var(--radius-sm)",
                          background: o.resolved_at ? "var(--row-bg)" : "var(--danger-bg)",
                          border: o.resolved_at ? "none" : "1px solid #F7C2C4",
                        }}>
                          {o.field_label && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 4 }}>
                              {o.field_label}
                            </div>
                          )}
                          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-strong)", lineHeight: 1.5 }}>{o.text}</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.created_by?.given_name || o.created_by?.email || "—"}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: o.resolved_at ? "var(--success)" : "var(--danger)" }}>
                              {o.resolved_at ? "Resuelta" : "Sin resolver"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
