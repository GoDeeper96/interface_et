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
} from "@fluentui/react-components"
import { exportEsquemaCursoToExcel } from "../utils/export-excel"
import { ArrowDownload20Regular } from "@fluentui/react-icons"

export function EsquemaTable({
  esquemaCurso,
  width,
  onWidthChange,
}: {
  esquemaCurso: any
  width: number
  onWidthChange: (width: number) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalData, setModalData] = useState<any[]>([])
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
      const deltaX = e.clientX - startXRef.current
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

  const openModal = (title: string, data: any[]) => {
    setModalTitle(title)
    setModalData(data)
    setModalOpen(true)
  }

  const handleExport = () => {
    exportEsquemaCursoToExcel(esquemaCurso)
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
          left: 0,
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
            marginLeft: "8px",
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
            Esquema del Curso
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingLeft: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", paddingRight: "8px" }}>
            <Button appearance="primary" size="small" icon={<ArrowDownload20Regular />} onClick={handleExport}>
              Exportar a Excel
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Unidad</TableHeaderCell>
                <TableHeaderCell>Título</TableHeaderCell>
                <TableHeaderCell>Logro</TableHeaderCell>
                <TableHeaderCell>Semanas</TableHeaderCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {esquemaCurso.esquemas_unidad.map((unidad: any) => (
                <TableRow key={unidad.numero_unidad}>
                  <TableCell>{unidad.numero_unidad}</TableCell>
                  <TableCell>{unidad.titulo_unidad}</TableCell>
                  <TableCell>{unidad.logro_de_aprendizaje_unidad}</TableCell>
                  <TableCell>
                    <Button
                      appearance="primary"
                      onClick={() => openModal(`Semanas de Unidad ${unidad.numero_unidad}`, unidad.semanas)}
                    >
                      Ver semanas
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(_, data) => setModalOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogContent style={{ marginTop: "16px" }}>
              {"numero_semana" in (modalData?.[0] || {}) && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Semana</TableHeaderCell>
                      <TableHeaderCell>Sesión</TableHeaderCell>
                      <TableHeaderCell>Logro</TableHeaderCell>
                      <TableHeaderCell>Temas</TableHeaderCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {modalData.map((semana: any) => (
                      <TableRow key={semana.numero_semana}>
                        <TableCell>{semana.numero_semana}</TableCell>
                        <TableCell>{semana.nombre_de_la_sesion}</TableCell>
                        <TableCell>{semana.logro_de_aprendizaje_semana}</TableCell>
                        <TableCell>
                          <Button
                            appearance="secondary"
                            onClick={() => openModal(`Temas - Semana ${semana.numero_semana}`, semana.temas)}
                          >
                            Ver temas
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {"titulo_tema" in (modalData?.[0] || {}) && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Tema</TableHeaderCell>
                      <TableHeaderCell>Logro</TableHeaderCell>
                      <TableHeaderCell>Subtemas</TableHeaderCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {modalData.map((tema: any) => (
                      <TableRow key={tema.titulo_tema}>
                        <TableCell>{tema.titulo_tema}</TableCell>
                        <TableCell>{tema.logro_de_aprendizaje_tema}</TableCell>
                        <TableCell>
                          <Button
                            appearance="secondary"
                            onClick={() => openModal(`Subtemas de ${tema.titulo_tema}`, tema.subtemas)}
                          >
                            Ver subtemas
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {"titulo_subtema" in (modalData?.[0] || {}) && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Subtema</TableHeaderCell>
                      <TableHeaderCell>Logro</TableHeaderCell>
                      <TableHeaderCell>Apartados</TableHeaderCell>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {modalData.map((sub: any) => (
                      <TableRow key={sub.titulo_subtema}>
                        <TableCell>{sub.titulo_subtema}</TableCell>
                        <TableCell>{sub.logro_de_aprendizaje_subtema}</TableCell>
                        <TableCell>
                          <Button
                            appearance="secondary"
                            onClick={() =>
                              openModal(
                                `Apartados de ${sub.titulo_subtema}`,
                                sub.apartados.map((a: string) => ({ apartado: a })),
                              )
                            }
                          >
                            Ver apartados
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {"apartado" in (modalData?.[0] || {}) && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Apartado</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalData.map((ap) => (
                      <TableRow key={ap.apartado}>
                        <TableCell>{ap.apartado}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
