import { useEffect, useMemo, useRef, useState } from "react"
import { AlertRegular, CheckmarkCircleRegular, DismissCircleRegular, ChevronDownRegular, ChevronUpRegular } from "@fluentui/react-icons"
import { useActivityStore, type ActivityEntry } from "../../infrastructure/store/activity-store"

// "Prove of everything that has happened" — a real (not mocked) log of
// every mutating API call, success or failure, so a non-admin user has
// somewhere to check what failed and when instead of just a toast that
// vanished. An anchored dropdown (not a drawer — tried that, direct
// instruction was to revert it), same positioning convention as the
// topbar's own user menu (position:absolute under the trigger button, no
// backdrop/portal). Grouped by date, unread indicator, "solo no leídos"
// filter, same content as before — just not full-screen. All colors are
// palette CSS vars (index.css) so it adapts with the rest of the app.
function timeLabel(d: Date): string {
  return d.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", hour12: true })
}

function dayLabel(d: Date): string {
  const today = new Date()
  const yest = new Date(today); yest.setDate(yest.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return "Hoy"
  if (sameDay(d, yest)) return "Ayer"
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        width: 32, height: 18, borderRadius: 999, border: "none", padding: 2, cursor: "pointer", flexShrink: 0,
        background: on ? "var(--blue-dark)" : "var(--text-muted)",
        display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center",
        transition: "background .15s",
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--surface)", display: "block" }} />
    </button>
  )
}

function NotificationRow({ entry, onRead }: { entry: ActivityEntry; onRead: () => void }) {
  const Icon = entry.kind === "success" ? CheckmarkCircleRegular : DismissCircleRegular
  return (
    <div
      onClick={onRead}
      style={{
        padding: 16, borderBottom: "1px solid var(--border)",
        background: entry.read ? "var(--surface)" : "var(--row-bg)",
        cursor: entry.read ? "default" : "pointer",
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon style={{ fontSize: 18, color: entry.kind === "success" ? "var(--success)" : "var(--danger)", flexShrink: 0 }} />
        {!entry.read && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
        <span style={{
          flex: 1, minWidth: 0, color: "var(--text-strong)", fontSize: 16, fontFamily: "Lato",
          fontWeight: entry.read ? 400 : 700, lineHeight: "24px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.message}
        </span>
        <span style={{ color: "var(--text-secondary)", fontSize: 14, fontFamily: "Lato", flexShrink: 0, textAlign: "right" }}>
          {timeLabel(entry.timestamp)}
        </span>
      </div>
      {entry.detail && (
        <div style={{ paddingLeft: 28, color: "var(--text-secondary)", fontSize: 14, fontFamily: "Lato", lineHeight: "20px", wordBreak: "break-word" }}>
          {entry.detail}
        </div>
      )}
    </div>
  )
}

export default function ActivityBell() {
  const { entries, markRead, markAllRead, clear } = useActivityStore()
  const [open, setOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  // Per-date-group collapse — all expanded by default, matches Figma
  // ("Expanded=True"); a group is only tracked here once collapsed.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const unreadCount = entries.filter((e) => !e.read).length

  const groups = useMemo(() => {
    const visible = unreadOnly ? entries.filter((e) => !e.read) : entries
    const out: { label: string; items: ActivityEntry[] }[] = []
    for (const e of visible) {
      const label = dayLabel(e.timestamp)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(e)
      else out.push({ label, items: [e] })
    }
    return out
  }, [entries, unreadOnly])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        data-tour="notifications-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notificaciones"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, flexShrink: 0,
          cursor: "pointer", color: "var(--text-secondary)", borderRadius: 6, border: "none", background: "none", position: "relative",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--content-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <AlertRegular style={{ fontSize: 20 }} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%",
            background: "var(--blue)", border: "1.5px solid var(--surface)",
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, width: 400, maxHeight: 520,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)", zIndex: 9999, overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <span style={{ flex: 1, color: "var(--text-strong)", fontSize: 20, fontFamily: "Lato", fontWeight: 900, lineHeight: "32px" }}>Notificaciones</span>
            {entries.length > 0 && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ fontSize: 11, padding: "2px 6px" }}>Marcar leídas</button>
                <button className="btn btn-ghost btn-sm" onClick={clear} style={{ fontSize: 11, padding: "2px 6px" }}>Limpiar</button>
              </>
            )}
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px" }}>
            <Toggle on={unreadOnly} onClick={() => setUnreadOnly((v) => !v)} />
            <span style={{ color: "var(--text-primary)", fontSize: 14, fontFamily: "Lato", lineHeight: "20px" }}>Solo los no leídos</span>
          </div>

          <div style={{ overflowY: "auto" }}>
            {groups.length === 0 ? (
              <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12.5, fontFamily: "Lato" }}>
                {unreadOnly ? "No tienes notificaciones sin leer." : "Sin actividad todavía."}
              </div>
            ) : groups.map((g, i) => {
              const isCollapsed = collapsedGroups.has(g.label)
              return (
                <div key={i}>
                  <div
                    onClick={() => setCollapsedGroups((prev) => {
                      const next = new Set(prev)
                      if (next.has(g.label)) next.delete(g.label); else next.add(g.label)
                      return next
                    })}
                    style={{
                      padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                      color: "var(--text-strong)", fontSize: 16, fontFamily: "Lato", fontWeight: 700, lineHeight: "24px",
                    }}
                  >
                    <span style={{ flex: 1 }}>{g.label}</span>
                    {isCollapsed
                      ? <ChevronDownRegular style={{ fontSize: 16 }} />
                      : <ChevronUpRegular style={{ fontSize: 16 }} />}
                  </div>
                  {!isCollapsed && g.items.map((e) => (
                    <NotificationRow key={e.id} entry={e} onRead={() => !e.read && markRead(e.id)} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
