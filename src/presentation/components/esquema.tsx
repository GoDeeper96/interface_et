"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Button } from "@fluentui/react-components"
import { exportEsquemaCursoToExcel } from "../utils/export-excel"
import { ArrowDownload20Regular, ChevronRight20Regular, ChevronDown20Regular } from "@fluentui/react-icons"

interface ExpandedState {
  unidades: Set<number>
  semanas: Set<string>
  temas: Set<string>
  subtemas: Set<string>
}

export function EsquemaTable({
  esquemaCurso,
  width,
  onWidthChange,
}: {
  esquemaCurso: any
  width: number
  onWidthChange: (width: number) => void
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({
    unidades: new Set(),
    semanas: new Set(),
    temas: new Set(),
    subtemas: new Set(),
  })

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

  const toggleUnidad = (unidadNum: number) => {
    setExpanded((prev) => {
      const newUnidades = new Set(prev.unidades)
      if (newUnidades.has(unidadNum)) {
        newUnidades.delete(unidadNum)
      } else {
        newUnidades.add(unidadNum)
      }
      return { ...prev, unidades: newUnidades }
    })
  }

  const toggleSemana = (key: string) => {
    setExpanded((prev) => {
      const newSemanas = new Set(prev.semanas)
      if (newSemanas.has(key)) {
        newSemanas.delete(key)
      } else {
        newSemanas.add(key)
      }
      return { ...prev, semanas: newSemanas }
    })
  }

  const toggleTema = (key: string) => {
    setExpanded((prev) => {
      const newTemas = new Set(prev.temas)
      if (newTemas.has(key)) {
        newTemas.delete(key)
      } else {
        newTemas.add(key)
      }
      return { ...prev, temas: newTemas }
    })
  }

  const toggleSubtema = (key: string) => {
    setExpanded((prev) => {
      const newSubtemas = new Set(prev.subtemas)
      if (newSubtemas.has(key)) {
        newSubtemas.delete(key)
      } else {
        newSubtemas.add(key)
      }
      return { ...prev, subtemas: newSubtemas }
    })
  }

  const handleExport = () => {
    exportEsquemaCursoToExcel(esquemaCurso)
  }

  if (!esquemaCurso || !esquemaCurso.esquemas_unidad) {
    return (
      <div
        style={{
          flex: 1,
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "8px",
        }}
      >
        <p style={{ color: "#666", fontSize: "14px" }}>Cargando esquema del curso...</p>
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
        <
        
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px 8px 12px 16px",
              background: "white",
              borderBottom: "1px solid #e0e0e0",
              position: "sticky",
              top: 0,
              zIndex: 5,
            }}
          >
            <Button appearance="transparent" style={{ background: "#107c10", color: "white" }} icon={<ArrowDownload20Regular />} onClick={handleExport}>
              Exportar a Excel
            </Button>
          </div>
            <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingLeft: "8px",
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: "40px" }}></TableHeaderCell>
                <TableHeaderCell>Nivel</TableHeaderCell>
                <TableHeaderCell>Descripción</TableHeaderCell>
                <TableHeaderCell>Logro de Aprendizaje</TableHeaderCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {esquemaCurso.esquemas_unidad.map((unidad: any) => {
                const unidadKey = unidad.numero_unidad
                const isUnidadExpanded = expanded.unidades.has(unidadKey)

                return (
                  <React.Fragment key={`unidad-${unidadKey}`}>
                    {/* Fila de Unidad */}
                    <TableRow style={{ background: "#f5f5f5" }}>
                      <TableCell>
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={isUnidadExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                          onClick={() => toggleUnidad(unidadKey)}
                        />
                      </TableCell>
                      <TableCell style={{ fontWeight: 600 }}>Unidad {unidad.numero_unidad}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{unidad.titulo_unidad}</TableCell>
                      <TableCell>{unidad.logro_de_aprendizaje_unidad}</TableCell>
                    </TableRow>

                    {/* Semanas dentro de la Unidad */}
                    {isUnidadExpanded &&
                      unidad.semanas?.map((semana: any) => {
                        const semanaKey = `${unidadKey}-${semana.numero_semana}`
                        const isSemanaExpanded = expanded.semanas.has(semanaKey)

                        return (
                          <React.Fragment key={`semana-${semanaKey}`}>
                            {/* Fila de Semana */}
                            <TableRow style={{ background: "#fafafa" }}>
                              <TableCell style={{ paddingLeft: "24px" }}>
                                <Button
                                  appearance="subtle"
                                  size="small"
                                  icon={isSemanaExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                  onClick={() => toggleSemana(semanaKey)}
                                />
                              </TableCell>
                              <TableCell>
                                Semana {semana.numero_semana} - {semana.nombre_de_la_sesion}
                              </TableCell>
                              <TableCell>{semana.nombre_de_la_sesion}</TableCell>
                              <TableCell>{semana.logro_de_aprendizaje_semana}</TableCell>
                            </TableRow>

                            {/* Temas dentro de la Semana */}
                            {isSemanaExpanded &&
                              semana.temas?.map((tema: any, temaIdx: number) => {
                                const temaKey = `${semanaKey}-tema-${temaIdx}`
                                const isTemaExpanded = expanded.temas.has(temaKey)
                                const hasSubtemas = tema.subtemas && tema.subtemas.length > 0

                                return (
                                  <React.Fragment key={`tema-${temaKey}`}>
                                    <TableRow
                                      style={{
                                        background: "white",
                                        cursor: hasSubtemas ? "pointer" : "default",
                                      }}
                                      onClick={hasSubtemas ? () => toggleTema(temaKey) : undefined}
                                      onMouseEnter={(e) => {
                                        if (hasSubtemas) {
                                          e.currentTarget.style.background = "#f0f0f0"
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "white"
                                      }}
                                    >
                                      <TableCell style={{ paddingLeft: "40px" }}>
                                        {hasSubtemas && (
                                          <Button
                                            appearance="subtle"
                                            size="small"
                                            icon={isTemaExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              toggleTema(temaKey)
                                            }}
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell>Tema</TableCell>
                                      <TableCell>{tema.titulo_tema}</TableCell>
                                      <TableCell>{tema.logro_de_aprendizaje_tema}</TableCell>
                                    </TableRow>

                                    {/* Subtemas dentro del Tema */}
                                    {isTemaExpanded &&
                                      tema.subtemas?.map((subtema: any, subIdx: number) => {
                                        const subtemaKey = `${temaKey}-subtema-${subIdx}`
                                        const isSubtemaExpanded = expanded.subtemas.has(subtemaKey)
                                        const hasApartados = subtema.apartados && subtema.apartados.length > 0

                                        return (
                                          <React.Fragment key={`subtema-${subtemaKey}`}>
                                            <TableRow
                                              style={{
                                                background: "#fcfcfc",
                                                cursor: hasApartados ? "pointer" : "default",
                                              }}
                                              onClick={hasApartados ? () => toggleSubtema(subtemaKey) : undefined}
                                              onMouseEnter={(e) => {
                                                if (hasApartados) {
                                                  e.currentTarget.style.background = "#e8e8e8"
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "#fcfcfc"
                                              }}
                                            >
                                              <TableCell style={{ paddingLeft: "50px" }}>
                                                {hasApartados && (
                                                  <Button
                                                    appearance="subtle"
                                                    size="small"
                                                    icon={
                                                      isSubtemaExpanded ? (
                                                        <ChevronDown20Regular />
                                                      ) : (
                                                        <ChevronRight20Regular />
                                                      )
                                                    }
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      toggleSubtema(subtemaKey)
                                                    }}
                                                  />
                                                )}
                                              </TableCell>
                                              <TableCell style={{ paddingLeft: "16px" }}>Subtema</TableCell>
                                              <TableCell>{subtema.titulo_subtema}</TableCell>
                                              <TableCell>{subtema.logro_de_aprendizaje_subtema}</TableCell>
                                            </TableRow>

                                            {/* Apartados dentro del Subtema */}
                                            {isSubtemaExpanded &&
                                              subtema.apartados?.map((apartado: string, apIdx: number) => (
                                                <TableRow
                                                  key={`apartado-${subtemaKey}-${apIdx}`}
                                                  style={{ background: "white" }}
                                                >
                                                  <TableCell style={{ paddingLeft: "96px" }}></TableCell>
                                                  <TableCell style={{ paddingLeft: "32px" }}>Apartado</TableCell>
                                                  <TableCell colSpan={2}>{apartado}</TableCell>
                                                </TableRow>
                                              ))}
                                          </React.Fragment>
                                        )
                                      })}
                                  </React.Fragment>
                                )
                              })}
                          </React.Fragment>
                        )
                      })}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}
    </div>
  )
}
