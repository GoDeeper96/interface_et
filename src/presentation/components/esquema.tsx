"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Button,
  Input,
  Combobox,
  Option,
} from "@fluentui/react-components"
import { exportEsquemaCursoToExcel } from "../utils/export-excel"
import {
  ArrowDownload20Regular,
  ChevronRight20Regular,
  ChevronDown20Regular,
  Edit20Regular,
  Save20Regular,
  Dismiss20Regular,
  Add20Regular,
  Delete20Regular,
} from "@fluentui/react-icons"
import { useDocumentStore } from "../../infrastructure/store/document-store"

interface ExpandedState {
  unidades: Set<number>
  semanas: Set<string>
  temas: Set<string>
  subtemas: Set<string>
}

interface EditingCell {
  path: string // e.g., "unidad-0-titulo_unidad"
  value: string
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

  const [isEditing, setIsEditing] = useState(false)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [localEsquema, setLocalEsquema] = useState<any>(null)
  const updateEsquemaCurso = useDocumentStore((state) => state.updateEsquemaCurso)

  useEffect(() => {
    if (esquemaCurso) {
      setLocalEsquema(JSON.parse(JSON.stringify(esquemaCurso)))
    }
  }, [esquemaCurso])

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

  const handleStartEdit = (path: string, currentValue: string) => {
    if (!isEditing) return
    setEditingCell({ path, value: currentValue })
  }

  const handleCellChange = (value: string) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value })
    }
  }

  const handleCellBlur = () => {
    if (editingCell && localEsquema) {
      const pathParts = editingCell.path.split("-")
      const newEsquema = JSON.parse(JSON.stringify(localEsquema))

      if (pathParts[0] === "unidad") {
        const unidadIdx = Number.parseInt(pathParts[1])
        const field = pathParts[2]
        newEsquema.esquemas_unidad[unidadIdx][field] = editingCell.value
      } else if (pathParts[0] === "semana") {
        const unidadIdx = Number.parseInt(pathParts[1])
        const semanaIdx = Number.parseInt(pathParts[2])
        const field = pathParts[3]
        newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx][field] = editingCell.value
      } else if (pathParts[0] === "tema") {
        const unidadIdx = Number.parseInt(pathParts[1])
        const semanaIdx = Number.parseInt(pathParts[2])
        const temaIdx = Number.parseInt(pathParts[3])
        const field = pathParts[4]
        newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx][field] = editingCell.value
      } else if (pathParts[0] === "subtema") {
        const unidadIdx = Number.parseInt(pathParts[1])
        const semanaIdx = Number.parseInt(pathParts[2])
        const temaIdx = Number.parseInt(pathParts[3])
        const subtemaIdx = Number.parseInt(pathParts[4])
        const field = pathParts[5]
        newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].subtemas[subtemaIdx][field] =
          editingCell.value
      } else if (pathParts[0] === "apartado") {
        const unidadIdx = Number.parseInt(pathParts[1])
        const semanaIdx = Number.parseInt(pathParts[2])
        const temaIdx = Number.parseInt(pathParts[3])
        const subtemaIdx = Number.parseInt(pathParts[4])
        const apartadoIdx = Number.parseInt(pathParts[5])
        newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].subtemas[subtemaIdx].apartados[
          apartadoIdx
        ] = editingCell.value
      }

      setLocalEsquema(newEsquema)
      setEditingCell(null)
    }
  }

  const handleSaveChanges = () => {
    if (localEsquema) {
      updateEsquemaCurso(localEsquema)
      setIsEditing(false)
      setEditingCell(null)
    }
  }

  const handleCancelEdit = () => {
    setLocalEsquema(JSON.parse(JSON.stringify(esquemaCurso)))
    setIsEditing(false)
    setEditingCell(null)
  }

  const handleExport = () => {
    exportEsquemaCursoToExcel(esquemaCurso)
  }

  const densidadOptions = ["Baja", "Media", "Alta"] as const

  const handleDensidadChange = (
    unidadIdx: number,
    semanaIdx: number,
    temaIdx: number,
    value: string,
  ) => {
    if (!localEsquema) return
    const newEsquema = JSON.parse(JSON.stringify(localEsquema))
    newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].densidad = value
    setLocalEsquema(newEsquema)
  }

  const handleAddSubtema = (unidadIdx: number, semanaIdx: number, temaIdx: number) => {
    if (!localEsquema) return
    const newEsquema = JSON.parse(JSON.stringify(localEsquema))
    const newSubtema = {
      titulo_subtema: "Nuevo Subtema",
      logro_de_aprendizaje_subtema: "",
      apartados: [],
    }
    newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].subtemas.push(newSubtema)
    setLocalEsquema(newEsquema)
  }

  const handleDeleteSubtema = (
    unidadIdx: number,
    semanaIdx: number,
    temaIdx: number,
    subtemaIdx: number,
  ) => {
    if (!localEsquema) return
    const newEsquema = JSON.parse(JSON.stringify(localEsquema))
    newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].subtemas.splice(subtemaIdx, 1)
    setLocalEsquema(newEsquema)
  }

  const handleAddApartado = (
    unidadIdx: number,
    semanaIdx: number,
    temaIdx: number,
    subtemaIdx: number,
  ) => {
    if (!localEsquema) return
    const newEsquema = JSON.parse(JSON.stringify(localEsquema))
    newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].subtemas[subtemaIdx].apartados.push(
      "Nuevo Apartado",
    )
    setLocalEsquema(newEsquema)
  }

  const handleDeleteApartado = (
    unidadIdx: number,
    semanaIdx: number,
    temaIdx: number,
    subtemaIdx: number,
    apartadoIdx: number,
  ) => {
    if (!localEsquema) return
    const newEsquema = JSON.parse(JSON.stringify(localEsquema))
    newEsquema.esquemas_unidad[unidadIdx].semanas[semanaIdx].temas[temaIdx].subtemas[subtemaIdx].apartados.splice(
      apartadoIdx,
      1,
    )
    setLocalEsquema(newEsquema)
  }

  const renderDensidadCell = (
    unidadIdx: number,
    semanaIdx: number,
    temaIdx: number,
    value: string,
  ) => {
    if (isEditing) {
      return (
        <Combobox
          value={value || "Media"}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              handleDensidadChange(unidadIdx, semanaIdx, temaIdx, data.optionValue)
            }
          }}
          style={{ minWidth: "100px" }}
        >
          {densidadOptions.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Combobox>
      )
    }
    return <span>{value || "Media"}</span>
  }

  const renderEditableCell = (path: string, value: string, style?: React.CSSProperties, isEditable = true) => {
    const isCurrentlyEditing = editingCell?.path === path

    // Only show edit interface if field is editable
    if (isEditing && !isCurrentlyEditing && isEditable) {
      return (
        <div
          onClick={() => handleStartEdit(path, value)}
          style={{
            ...style,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = "1px solid #0078d4"
            e.currentTarget.style.background = "#f3f9ff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = "1px solid transparent"
            e.currentTarget.style.background = "transparent"
          }}
        >
          {value}
        </div>
      )
    }

    if (isCurrentlyEditing && isEditable) {
      return (
        <Input
          value={editingCell.value}
          onChange={(e) => handleCellChange(e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCellBlur()
            } else if (e.key === "Escape") {
              setEditingCell(null)
            }
          }}
          autoFocus
          style={{ width: "100%" }}
        />
      )
    }

    return <div style={style}>{value}</div>
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

  const displayEsquema = localEsquema || esquemaCurso

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
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              padding: "12px 8px 12px 16px",
              background: "white",
              borderBottom: "1px solid #e0e0e0",
              position: "sticky",
              top: 0,
              zIndex: 5,
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              {!isEditing ? (
                <Button appearance="subtle" size="small" icon={<Edit20Regular />} onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              ) : (
                <>
                  <Button appearance="primary" size="small" icon={<Save20Regular />} onClick={handleSaveChanges}>
                    Guardar
                  </Button>
                  <Button appearance="subtle" size="small" icon={<Dismiss20Regular />} onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>

            <Button
              appearance="primary"
              size="small"
              icon={<ArrowDownload20Regular />}
              onClick={handleExport}
              style={{ background: "#107c10", color: "white" }}
            >
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
                  <TableHeaderCell>Densidad</TableHeaderCell>
                  {isEditing && <TableHeaderCell style={{ width: "80px" }}>Acciones</TableHeaderCell>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {displayEsquema.esquemas_unidad.map((unidad: any, unidadIdx: number) => {
                  const unidadKey = unidad.numero_unidad
                  const isUnidadExpanded = expanded.unidades.has(unidadKey)

                  return (
                    <React.Fragment key={`unidad-${unidadKey}`}>
                      <TableRow style={{ background: "#f5f5f5" }}>
                        <TableCell style={{ width: "40px", padding: "8px" }}>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={isUnidadExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                            onClick={() => toggleUnidad(unidadKey)}
                          />
                        </TableCell>
                        <TableCell style={{ fontWeight: 600 }}>Unidad {unidad.numero_unidad}</TableCell>
                        <TableCell style={{ fontWeight: 600 }}>
                          {renderEditableCell(
                            `unidad-${unidadIdx}-titulo_unidad`,
                            unidad.titulo_unidad,
                            {
                              fontWeight: 600,
                            },
                            false,
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(
                            `unidad-${unidadIdx}-logro_de_aprendizaje_unidad`,
                            unidad.logro_de_aprendizaje_unidad,
                            {},
                            false,
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                        {isEditing && <TableCell></TableCell>}
                      </TableRow>

                      {isUnidadExpanded &&
                        unidad.semanas?.map((semana: any, semanaIdx: number) => {
                          const semanaKey = `${unidadKey}-${semana.numero_semana}`
                          const isSemanaExpanded = expanded.semanas.has(semanaKey)

                          return (
                            <React.Fragment key={`semana-${semanaKey}`}>
                              <TableRow style={{ background: "#fafafa" }}>
                                <TableCell style={{ width: "40px", padding: "8px 8px 8px 32px" }}>
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
                                <TableCell>
                                  {renderEditableCell(
                                    `semana-${unidadIdx}-${semanaIdx}-nombre_de_la_sesion`,
                                    semana.nombre_de_la_sesion,
                                    {},
                                    false,
                                  )}
                                </TableCell>
                                <TableCell>
                                  {renderEditableCell(
                                    `semana-${unidadIdx}-${semanaIdx}-logro_de_aprendizaje_semana`,
                                    semana.logro_de_aprendizaje_semana,
                                    {},
                                    false,
                                  )}
                                </TableCell>
                                <TableCell></TableCell>
                                {isEditing && <TableCell></TableCell>}
                              </TableRow>

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
                                          cursor: hasSubtemas && !isEditing ? "pointer" : "default",
                                        }}
                                        onClick={hasSubtemas && !isEditing ? () => toggleTema(temaKey) : undefined}
                                        onMouseEnter={(e) => {
                                          if (hasSubtemas && !isEditing) {
                                            e.currentTarget.style.background = "#f0f0f0"
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "white"
                                        }}
                                      >
                                        <TableCell style={{ width: "40px", padding: "8px 8px 8px 56px" }}>
                                          {hasSubtemas && (
                                            <Button
                                              appearance="subtle"
                                              size="small"
                                              icon={
                                                isTemaExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />
                                              }
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                toggleTema(temaKey)
                                              }}
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell style={{ paddingLeft:"25px"}}>Tema</TableCell>
                                        <TableCell>
                                          {renderEditableCell(
                                            `tema-${unidadIdx}-${semanaIdx}-${temaIdx}-titulo_tema`,
                                            tema.titulo_tema,
                                            {},
                                            true,
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {renderEditableCell(
                                            `tema-${unidadIdx}-${semanaIdx}-${temaIdx}-logro_de_aprendizaje_tema`,
                                            tema.logro_de_aprendizaje_tema,
                                            {},
                                            true,
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {renderDensidadCell(unidadIdx, semanaIdx, temaIdx, tema.densidad)}
                                        </TableCell>
                                        {isEditing && (
                                          <TableCell>
                                            <Button
                                              appearance="subtle"
                                              size="small"
                                              icon={<Add20Regular />}
                                              title="Agregar Subtema"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleAddSubtema(unidadIdx, semanaIdx, temaIdx)
                                              }}
                                            />
                                          </TableCell>
                                        )}
                                      </TableRow>

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
                                                  cursor: hasApartados && !isEditing ? "pointer" : "default",
                                                }}
                                                onClick={
                                                  hasApartados && !isEditing
                                                    ? () => toggleSubtema(subtemaKey)
                                                    : undefined
                                                }
                                                onMouseEnter={(e) => {
                                                  if (hasApartados && !isEditing) {
                                                    e.currentTarget.style.background = "#e8e8e8"
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.background = "#fcfcfc"
                                                }}
                                              >
                                                <TableCell style={{ width: "40px", padding: "8px 8px 8px 80px" }}>
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
                                                <TableCell style={{paddingLeft:"50px"}}>Subtema</TableCell>
                                                <TableCell>
                                                  {renderEditableCell(
                                                    `subtema-${unidadIdx}-${semanaIdx}-${temaIdx}-${subIdx}-titulo_subtema`,
                                                    subtema.titulo_subtema,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderEditableCell(
                                                    `subtema-${unidadIdx}-${semanaIdx}-${temaIdx}-${subIdx}-logro_de_aprendizaje_subtema`,
                                                    subtema.logro_de_aprendizaje_subtema,
                                                  )}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                {isEditing && (
                                                  <TableCell>
                                                    <div style={{ display: "flex", gap: "4px" }}>
                                                      <Button
                                                        appearance="subtle"
                                                        size="small"
                                                        icon={<Add20Regular />}
                                                        title="Agregar Apartado"
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          handleAddApartado(unidadIdx, semanaIdx, temaIdx, subIdx)
                                                        }}
                                                      />
                                                      <Button
                                                        appearance="subtle"
                                                        size="small"
                                                        icon={<Delete20Regular />}
                                                        title="Eliminar Subtema"
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          handleDeleteSubtema(unidadIdx, semanaIdx, temaIdx, subIdx)
                                                        }}
                                                        style={{ color: "#d13438" }}
                                                      />
                                                    </div>
                                                  </TableCell>
                                                )}
                                              </TableRow>

                                              {isSubtemaExpanded &&
                                                subtema.apartados?.map((apartado: string, apIdx: number) => (
                                                  <TableRow
                                                    key={`apartado-${subtemaKey}-${apIdx}`}
                                                    style={{ background: "white" }}
                                                  >
                                                    <TableCell
                                                      style={{ width: "40px", padding: "8px 8px 8px 104px" }}
                                                    ></TableCell>
                                                    <TableCell style={{paddingLeft:"50px"}}>Apartado</TableCell>
                                                    <TableCell>
                                                      {renderEditableCell(
                                                        `apartado-${unidadIdx}-${semanaIdx}-${temaIdx}-${subIdx}-${apIdx}`,
                                                        apartado,
                                                      )}
                                                    </TableCell>
                                                    <TableCell></TableCell>
                                                    {isEditing && (
                                                      <TableCell>
                                                        <Button
                                                          appearance="subtle"
                                                          size="small"
                                                          icon={<Delete20Regular />}
                                                          title="Eliminar Apartado"
                                                          onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteApartado(unidadIdx, semanaIdx, temaIdx, subIdx, apIdx)
                                                          }}
                                                          style={{ color: "#d13438" }}
                                                        />
                                                      </TableCell>
                                                    )}
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
