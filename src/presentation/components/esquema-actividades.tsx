"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Tooltip,
} from "@fluentui/react-components"
import { ArrowDownload24Regular } from "@fluentui/react-icons"
import { exportEsquemaActividadesToExcel } from "../utils/export-excel"

const truncateText = (text: string, max = 20) => {
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function EsquemaActividadesTable({
  esquemaActividades,
  width,
  onWidthChange,
}: {
  esquemaActividades: any
  width: number
  onWidthChange: (width: number) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalTitleTotal, setModalTitleTotal] = useState("")
  const [modalTitleState, setModalTitleState] = useState(false)
  const [modalData, setModalData] = useState<any>({})
  const [isResizing, setIsResizing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }

  const handleDoubleClick = () => {
    setIsCollapsed(!isCollapsed)
    onWidthChange(isCollapsed ? 400 : 60)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startXRef.current - e.clientX
      const newWidth = Math.max(200, Math.min(1200, startWidthRef.current + deltaX))
      onWidthChange(newWidth)

      if (newWidth < 200) {
        setIsCollapsed(true)
      } else if (isCollapsed) {
        setIsCollapsed(false)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, width, onWidthChange, isCollapsed])

  const openModal = (title: string, data: any) => {
    setModalData(data)
    setModalOpen(true)
  }

  const openModalTitle = (title: string, data: any) => {
    setModalTitleTotal(title)
    setModalTitle(data)
    setModalTitleState(true)
  }

  const ClickableCell = ({
    label,
    text,
    onClick,
  }: {
    label: string
    text: string
    onClick: () => void
  }) => {
    const isTruncated = text && text.length > 20

    return (
      <div
        onClick={isTruncated ? onClick : undefined}
        title={isTruncated ? "Click para ver completo" : text}
        style={{
          maxWidth: "280px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: isTruncated ? "pointer" : "default",
          color: isTruncated ? "#2563eb" : "inherit",
        }}
      >
        {truncateText(text)}
      </div>
    )
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "8px",
          cursor: "ew-resize",
          background: isResizing ? "#0078d4" : "transparent",
          transition: "background 0.2s",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.background = "rgba(0, 120, 212, 0.1)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.background = "transparent"
          }
        }}
      >
        <div
          style={{
            width: "3px",
            height: "40px",
            background: "#0078d4",
            borderRadius: "2px",
            opacity: 0.6,
          }}
        />
      </div>

      {isCollapsed ? (
        <div
          style={{
            padding: "20px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            marginRight: "8px",
          }}
        >
          <div
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: "14px",
              fontWeight: 600,
              color: "#333",
              whiteSpace: "nowrap",
            }}
          >
            Esquema de Actividades
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "12px",
            }}
          >
            <Button
              appearance="subtle"
              icon={<ArrowDownload24Regular />}
              onClick={() => exportEsquemaActividadesToExcel(esquemaActividades)}
            >
              Exportar a Excel
            </Button>
          </div>

          <div style={{ overflowX: "auto", width: "100%" }}>
            <Table style={{ minWidth: "1600px" }}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Semana</TableHeaderCell>
                  <TableHeaderCell>Código</TableHeaderCell>
                  <TableHeaderCell>Actividad</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Dedicación (min)</TableHeaderCell>
                  <TableHeaderCell>Formato</TableHeaderCell>
                  <TableHeaderCell>Instrumento</TableHeaderCell>
                  <TableHeaderCell>Flexible</TableHeaderCell>
                  <TableHeaderCell>Producto</TableHeaderCell>
                  <TableHeaderCell>Contexto</TableHeaderCell>
                  <TableHeaderCell>Logro</TableHeaderCell>
                  <TableHeaderCell>Descripción</TableHeaderCell>
                  <TableHeaderCell>Detalles</TableHeaderCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {esquemaActividades.actividades.map((act: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{act.numero_semana}</TableCell>
                    <TableCell>{act.codigo_actividad}</TableCell>
                    <TableCell>{act.titulo_actividad}</TableCell>
                    <TableCell>{act.tipo_actividad}</TableCell>
                    <TableCell>{act.tiempo_de_dedicacion}</TableCell>
                    <TableCell>{act.formato_entrega}</TableCell>
                    <TableCell>{act.instrumento}</TableCell>
                    <TableCell>{act.flexible}</TableCell>
                    <TableCell>{act.producto_evidencia}</TableCell>
                    <TableCell>{act.contexto}</TableCell>
                    <Tooltip withArrow appearance="inverted" content={act.logro_actividad} relationship="label">
                      <TableCell>
                        <ClickableCell
                          label="Logro"
                          text={act.logro_actividad}
                          onClick={() => openModalTitle("Logro de la Actividad", act.logro_actividad)}
                        />
                      </TableCell>
                    </Tooltip>
                    <Tooltip withArrow content={act.descripcion_actividad} appearance="inverted" relationship="label">
                      <TableCell>
                        <ClickableCell
                          label="Descripción"
                          text={act.descripcion_actividad}
                          onClick={() => openModalTitle("Descripción de la Actividad", act.descripcion_actividad)}
                        />
                      </TableCell>
                    </Tooltip>

                    <TableCell>
                      <Button
                        appearance="primary"
                        onClick={() => openModal(`Detalles de ${act.titulo_actividad}`, act)}
                      >
                        Ver detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={modalTitleState} onOpenChange={(_, d) => setModalTitleState(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{modalTitleTotal}</DialogTitle>

            <DialogContent style={{ marginTop: "16px" }}>{modalTitle}</DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(_, d) => setModalOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Actividad</DialogTitle>

            <DialogContent style={{ marginTop: "16px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr",
                  rowGap: "10px",
                  columnGap: "12px",
                  fontSize: "14px",
                }}
              >
                <strong>Semana</strong>
                <span>{modalData.numero_semana}</span>

                <strong>Código</strong>
                <span>{modalData.codigo_actividad}</span>

                <strong>Actividad</strong>
                <span>{modalData.titulo_actividad}</span>

                <strong>Tipo</strong>
                <span>{modalData.tipo_actividad}</span>

                <strong>Dedicación</strong>
                <span>{modalData.tiempo_de_dedicacion} min</span>

                <strong>Formato</strong>
                <span>{modalData.formato_entrega}</span>

                <strong>Instrumento</strong>
                <span>{modalData.instrumento}</span>

                <strong>Flexible</strong>
                <span>{modalData.flexible}</span>

                <strong>Producto</strong>
                <span>{modalData.producto_evidencia}</span>

                <strong>Contexto</strong>
                <span>{modalData.contexto}</span>

                <strong>Logro</strong>
                <span style={{ whiteSpace: "pre-wrap" }}>{modalData.logro_actividad}</span>

                <strong>Descripción</strong>
                <span style={{ whiteSpace: "pre-wrap" }}>{modalData.descripcion_actividad}</span>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
