"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
  Skeleton,
  SkeletonItem,
  Input,
} from "@fluentui/react-components"
import { exportIpesToExcel } from "../utils/export-excel"
import {
  ArrowDownload20Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  Edit20Regular,
  Save20Regular,
  Dismiss20Regular,
} from "@fluentui/react-icons"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import { IpesVersionManager } from "./ipes-version-manager"

export function IpesTable({ ipes }: { ipes: any[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalData, setModalData] = useState<any>(null)
  const [modalType, setModalType] = useState<"introduccion" | "presentaciones" | "ejercicios" | null>(null)

  const [expandedUnidades, setExpandedUnidades] = useState<Set<number>>(new Set())
  const [expandedSesiones, setExpandedSesiones] = useState<Set<string>>(new Set())
  const [expandedIntroduccion, setExpandedIntroduccion] = useState<Set<string>>(new Set())
  const [expandedPresentaciones, setExpandedPresentaciones] = useState<Set<string>>(new Set())
  const [expandedEjercicios, setExpandedEjercicios] = useState<Set<string>>(new Set())

  const addIpesVersion = useDocumentStore((state) => state.addIpesVersion)
  const updateIpesVersion = useDocumentStore((state) => state.updateIpesVersion)
  const getCurrentIpesVersion = useDocumentStore((state) => state.getCurrentIpesVersion)
  const currentVersionId = useDocumentStore((state) => state.currentIpesVersionId)
  const ipesVersions = useDocumentStore((state) => state.ipesVersions)

  // Also track when ipes prop changes to create new version
  const versionInitialized = useRef(false)
  const lastIpesRef = useRef<any[] | null>(null)

  useEffect(() => {
    if (!ipes || ipes.length === 0) return

    // Check if this is completely new data (different from what we have)
    const ipesString = JSON.stringify(ipes)
    const lastIpesString = lastIpesRef.current ? JSON.stringify(lastIpesRef.current) : null

    if (ipesString !== lastIpesString) {
      console.log("[v0] IPES data changed, updating...")
      lastIpesRef.current = ipes

      if (!versionInitialized.current && ipesVersions.length === 0) {
        // First time initialization
        addIpesVersion(ipes, "Versión inicial")
        versionInitialized.current = true
        console.log("[v0] Created initial IPES version")
      } else if (versionInitialized.current && ipesVersions.length > 0) {
        // Data changed after initial load (retry case) - create new version
        addIpesVersion(ipes, `Regeneración ${new Date().toLocaleString()}`)
        console.log("[v0] Created new IPES version after retry")
      }
    }
  }, [ipes, ipesVersions.length, addIpesVersion])

  // Use current version data if available, otherwise use props
  const currentVersion = getCurrentIpesVersion()
  const displayIpes = currentVersion?.data || ipes

  // State for editing
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedIpes, setEditedIpes] = useState<any[]>([])
  const updateIpesData = useDocumentStore((state) => state.updateIpesData)

  if (!ipes || ipes.length === 0) {
    return (
      <div style={{ marginTop: "24px", padding: "24px" }}>
        <Skeleton>
          <SkeletonItem style={{ width: "100%", height: "40px", marginBottom: "16px" }} />
          <SkeletonItem style={{ width: "100%", height: "60px", marginBottom: "12px" }} />
          <SkeletonItem style={{ width: "100%", height: "60px", marginBottom: "12px" }} />
          <SkeletonItem style={{ width: "100%", height: "60px", marginBottom: "12px" }} />
          <SkeletonItem style={{ width: "100%", height: "60px", marginBottom: "12px" }} />
          <SkeletonItem style={{ width: "100%", height: "60px" }} />
        </Skeleton>
        <div
          style={{
            textAlign: "center",
            marginTop: "32px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          No hay datos de IPES disponibles
        </div>
      </div>
    )
  }

  const handleEditClick = () => {
    setEditedIpes(JSON.parse(JSON.stringify(displayIpes)))
    setIsEditMode(true)
  }

  const handleSaveClick = () => {
    updateIpesData(editedIpes)
    if (currentVersionId) {
      updateIpesVersion(currentVersionId, editedIpes)
    }
    setIsEditMode(false)
    setEditedIpes([]) // Clear edited state after saving
  }

  const handleCancelClick = () => {
    setEditedIpes([])
    setIsEditMode(false)
  }

  const updateEditedField = (unidadNum: number, sesionIndex: number, path: string[], value: any) => {
    const newEditedIpes = [...editedIpes]
    const ipeIndex = newEditedIpes.findIndex((ipe, idx) => {
      // Find the correct IPES object based on its original position within the grouped data
      // This assumes the order of ipes within a unidad doesn't change, which is true for the current grouping logic.
      const originalIpeForThisSession = Object.values(displayIpesAgrupadas)[unidadNum - 1]?.[sesionIndex]
      return ipe === originalIpeForThisSession
    })

    if (ipeIndex >= 0) {
      let target: any = newEditedIpes[ipeIndex]
      for (let i = 0; i < path.length - 1; i++) {
        if (!target[path[i]]) target[path[i]] = {} // Ensure nested objects exist
        target = target[path[i]]
      }
      target[path[path.length - 1]] = value
      setEditedIpes(newEditedIpes)
    }
  }

  const updatePresentacionField = (
    unidadNum: number,
    sesionIndex: number,
    presIndex: number,
    field: string,
    value: any,
  ) => {
    const newEditedIpes = [...editedIpes]
    const ipeIndex = newEditedIpes.findIndex((ipe, idx) => {
      const originalIpeForThisSession = Object.values(displayIpesAgrupadas)[unidadNum - 1]?.[sesionIndex]
      return ipe === originalIpeForThisSession
    })

    if (ipeIndex >= 0 && newEditedIpes[ipeIndex].presentaciones && newEditedIpes[ipeIndex].presentaciones[presIndex]) {
      newEditedIpes[ipeIndex].presentaciones[presIndex][field] = value
      setEditedIpes(newEditedIpes)
    }
  }

  const updateEjerciciosField = (unidadNum: number, sesionIndex: number, field: string, value: any) => {
    const newEditedIpes = [...editedIpes]
    const ipeIndex = newEditedIpes.findIndex((ipe, idx) => {
      const originalIpeForThisSession = Object.values(displayIpesAgrupadas)[unidadNum - 1]?.[sesionIndex]
      return ipe === originalIpeForThisSession
    })

    if (ipeIndex >= 0 && newEditedIpes[ipeIndex].ejercicios) {
      newEditedIpes[ipeIndex].ejercicios[field] = value
      setEditedIpes(newEditedIpes)
    }
  }

  const updateIntroduccionField = (unidadNum: number, sesionIndex: number, field: string, value: any) => {
    const newEditedIpes = [...editedIpes]
    const ipeIndex = newEditedIpes.findIndex((ipe, idx) => {
      const originalIpeForThisSession = Object.values(displayIpesAgrupadas)[unidadNum - 1]?.[sesionIndex]
      return ipe === originalIpeForThisSession
    })

    if (ipeIndex >= 0 && newEditedIpes[ipeIndex].introduccion) {
      newEditedIpes[ipeIndex].introduccion[field] = value
      setEditedIpes(newEditedIpes)
    }
  }

  const dataToDisplay = isEditMode ? editedIpes : displayIpes

  // Re-group data based on potentially edited data
  const displayIpesAgrupadas = dataToDisplay.reduce((acc: any, ipe: any) => {
    const unidadNum = ipe.unidad
    if (!acc[unidadNum]) {
      acc[unidadNum] = []
    }
    acc[unidadNum].push(ipe)
    return acc
  }, {})

  const toggleUnidad = (unidadNum: number) => {
    const newExpanded = new Set(expandedUnidades)
    if (newExpanded.has(unidadNum)) {
      newExpanded.delete(unidadNum)
    } else {
      newExpanded.add(unidadNum)
    }
    setExpandedUnidades(newExpanded)
  }

  // Changed from sesionId to generic key
  const toggleSesion = (key: string) => {
    const newExpanded = new Set(expandedSesiones)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSesiones(newExpanded)
  }

  // Changed from sesionId to generic key
  const toggleIntroduccion = (key: string) => {
    const newExpanded = new Set(expandedIntroduccion)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedIntroduccion(newExpanded)
  }

  // Changed from sesionId to generic key
  const togglePresentaciones = (key: string) => {
    const newExpanded = new Set(expandedPresentaciones)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedPresentaciones(newExpanded)
  }

  // Changed from sesionId to generic key
  const toggleEjercicios = (key: string) => {
    const newExpanded = new Set(expandedEjercicios)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedEjercicios(newExpanded)
  }

  const openModal = (title: string, data: any, type: "introduccion" | "presentaciones" | "ejercicios") => {
    setModalTitle(title)
    setModalData(data)
    setModalType(type)
    setModalOpen(true)
  }

  const handleExport = () => {
    exportIpesToExcel(dataToDisplay)
  }

  interface RenderDetalleActividadProps {
    texto?: string[]
  }

  function RenderDetalleActividad({ texto }: RenderDetalleActividadProps) {
    if (!texto || texto.length === 0) return null

    return (
      <ul style={{ paddingLeft: "20px", margin: 0 }}>
        {texto.map((item, idx) => (
          <li key={idx} style={{ marginBottom: "6px" }}>
            {item}
          </li>
        ))}
      </ul>
    )
  }

  const renderEditableCell = (value: any, onEdit: (newValue: string) => void, isEditable = true, multiline = false) => {
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onEdit(e.target.value)
      // Auto-resize textarea to fit content
      e.target.style.height = "auto"
      e.target.style.height = e.target.scrollHeight + "px"
    }

    if (isEditMode && isEditable) {
      if (multiline) {
        return (
          <textarea
            value={value || ""}
            onChange={handleTextareaChange}
            onFocus={(e) => {
              // Auto-resize on focus
              e.target.style.height = "auto"
              e.target.style.height = e.target.scrollHeight + "px"
            }}
            style={{
              width: "100%",
              minWidth: "400px",
              maxWidth: "800px",
              minHeight: "80px",
              maxHeight: "400px",
              padding: "10px",
              fontFamily: "inherit",
              fontSize: "13px",
              lineHeight: "1.5",
              border: "1px solid #ccc",
              borderRadius: "4px",
              resize: "vertical",
              overflow: "auto",
            }}
          />
        )
      }
      return (
        <Input
          value={value || ""}
          onChange={(e, data) => onEdit(data.value)}
          style={{ width: "100%", minWidth: "200px", maxWidth: "500px" }}
        />
      )
    }
    return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value}</span>
  }

  const renderField = (
    label: string,
    value: any,
    onEdit: (newValue: string) => void,
    isEditable = true,
    isLargeField = false,
  ) => {
    const isLargeAndEditing = isLargeField && isEditMode && isEditable

    if (isLargeAndEditing) {
      // Large fields when editing: label above, field below
      return (
        <div style={{ marginBottom: "16px" }}>
          <strong>{label}:</strong>
          <div style={{ marginTop: "8px" }}>{renderEditableCell(value, onEdit, isEditable, true)}</div>
        </div>
      )
    } else {
      // All other cases: label and field on same line
      return (
        <p style={{ marginBottom: "12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <strong style={{ minWidth: "150px", flexShrink: 0 }}>{label}:</strong>
          <span style={{ flex: 1 }}>{renderEditableCell(value, onEdit, isEditable, isLargeField)}</span>
        </p>
      )
    }
  }

  return (
    <div style={{ marginTop: "24px" }}>
      <IpesVersionManager />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {!isEditMode ? (
            <Button appearance="primary" icon={<Edit20Regular />} onClick={handleEditClick}>
              Editar
            </Button>
          ) : (
            <>
              <Button appearance="primary" icon={<Save20Regular />} onClick={handleSaveClick}>
                Guardar
              </Button>
              <Button icon={<Dismiss20Regular />} onClick={handleCancelClick}>
                Cancelar
              </Button>
            </>
          )}
        </div>
        <Button
          appearance="primary"
          icon={<ArrowDownload20Regular />}
          onClick={handleExport}
          style={{ background: "#107c10", color: "white" }}
        >
          Exportar a Excel
        </Button>
      </div>

      <div style={{ overflowX: "auto", width: "100%" }}>
        <Table style={{ minWidth: "1200px" }}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Unidad / Semana / Sesión</TableHeaderCell>
              <TableHeaderCell>Detalles</TableHeaderCell>
              <TableHeaderCell style={{ textAlign: "right" }}>Acciones</TableHeaderCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Object.keys(displayIpesAgrupadas)
              .sort((a, b) => Number(a) - Number(b))
              .map((unidadKey) => {
                const unidadNum = Number(unidadKey)
                // Get the sessions for the current unit from the dataToDisplay
                const sesiones = displayIpesAgrupadas[unidadKey] || []
                const isExpanded = expandedUnidades.has(unidadNum)

                return (
                  <>
                    {/* Fila de Unidad */}
                    <TableRow
                      key={`unidad-${unidadNum}`}
                      style={{
                        backgroundColor: "#f0f0f0",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => toggleUnidad(unidadNum)}
                    >
                      <TableCell colSpan={3} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Button
                          appearance="transparent"
                          icon={isExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleUnidad(unidadNum)
                          }}
                        />
                        Unidad {unidadNum} ({sesiones.length} sesiones)
                      </TableCell>
                    </TableRow>

                    {/* Filas de Sesiones (solo si la unidad está expandida) */}
                    {isExpanded &&
                      sesiones.map((ipe: any, index: number) => {
                        const sesionId = `u${unidadNum}-s${index}`
                        const isSesionExpanded = expandedSesiones.has(sesionId)
                        const isIntroExpanded = expandedIntroduccion.has(sesionId)
                        const isPresExpanded = expandedPresentaciones.has(sesionId)
                        const isEjerExpanded = expandedEjercicios.has(sesionId)

                        return (
                          <>
                            {/* Fila de Sesión */}
                            <TableRow
                              key={`sesion-${sesionId}`}
                              style={{ backgroundColor: "#fafafa", cursor: "pointer", fontWeight: 500 }}
                              onClick={() => toggleSesion(sesionId)}
                            >
                              <TableCell
                                style={{ paddingLeft: "48px", display: "flex", alignItems: "center", gap: "8px" }}
                              >
                                <Button
                                  appearance="transparent"
                                  icon={isSesionExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleSesion(sesionId)
                                  }}
                                />
                                Semana {ipe.introduccion?.semana || "N/A"}:{" "}
                                {ipe.introduccion?.nombre_de_la_sesion || "N/A"}
                              </TableCell>
                              <TableCell style={{ maxWidth: "400px", whiteSpace: "pre-wrap" }}>
                                {ipe.introduccion?.logro_de_la_semana || "N/A"}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>

                            {/* Sub-items de la sesión (Introducción, Presentaciones, Ejercicios) */}
                            {isSesionExpanded && (
                              <>
                                {/* Introducción */}
                                {ipe.introduccion && (
                                  <>
                                    <TableRow
                                      style={{ backgroundColor: "#ffffff", cursor: "pointer" }}
                                      onClick={() => toggleIntroduccion(sesionId)}
                                    >
                                      <TableCell
                                        style={{
                                          paddingLeft: "72px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                        }}
                                      >
                                        <Button
                                          appearance="transparent"
                                          icon={isIntroExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleIntroduccion(sesionId)
                                          }}
                                        />
                                        Introducción
                                      </TableCell>
                                      <TableCell></TableCell>
                                      <TableCell style={{ textAlign: "right" }}>
                                        <Button
                                          appearance="primary"
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openModal(
                                              `Introducción - U${ipe.unidad} S${ipe.introduccion.semana}`,
                                              ipe.introduccion,
                                              "introduccion",
                                            )
                                          }}
                                        >
                                          Ver modal
                                        </Button>
                                      </TableCell>
                                    </TableRow>

                                    {/* Contenido de Introducción expandido - Making introducción fields editable */}
                                    {isIntroExpanded && (
                                      <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                                        <TableCell colSpan={3} style={{ paddingLeft: "96px" }}>
                                          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                            {renderField("Curso", ipe.introduccion.curso, () => {}, false)}
                                            {renderField(
                                              "Logro de Aprendizaje del Curso",
                                              ipe.introduccion.logro_de_aprendizaje_curso,
                                              (value) =>
                                                updateIntroduccionField(
                                                  unidadNum,
                                                  index,
                                                  "logro_de_aprendizaje_curso",
                                                  value,
                                                ),
                                              true,
                                              true,
                                            )}
                                            {renderField(
                                              "Horas Semanales",
                                              ipe.introduccion.horas_de_estudio_semanales,
                                              (value) =>
                                                updateIntroduccionField(
                                                  unidadNum,
                                                  index,
                                                  "horas_de_estudio_semanales",
                                                  value,
                                                ),
                                            )}
                                            {renderField(
                                              "Logro de la Semana",
                                              ipe.introduccion.logro_de_la_semana,
                                              (value) =>
                                                updateIntroduccionField(unidadNum, index, "logro_de_la_semana", value),
                                              true,
                                              true,
                                            )}
                                            {renderField(
                                              "Situación Inicial",
                                              ipe.introduccion.situacion_inicial,
                                              (value) =>
                                                updateIntroduccionField(unidadNum, index, "situacion_inicial", value),
                                              true,
                                              true,
                                            )}
                                            {renderField(
                                              "Propósito de la Sesión",
                                              ipe.introduccion.proposito_de_la_sesion,
                                              (value) =>
                                                updateIntroduccionField(
                                                  unidadNum,
                                                  index,
                                                  "proposito_de_la_sesion",
                                                  value,
                                                ),
                                              true,
                                              true,
                                            )}
                                            {renderField(
                                              "Conocimientos Previos",
                                              ipe.introduccion.conocimientos_previos,
                                              (value) =>
                                                updateIntroduccionField(
                                                  unidadNum,
                                                  index,
                                                  "conocimientos_previos",
                                                  value,
                                                ),
                                              true,
                                              true,
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}

                                {/* Presentaciones - ALL FIELDS EDITABLE */}
                                {ipe.presentaciones && ipe.presentaciones.length > 0 && (
                                  <>
                                    <TableRow
                                      style={{ backgroundColor: "#ffffff", cursor: "pointer" }}
                                      onClick={() => togglePresentaciones(sesionId)}
                                    >
                                      <TableCell
                                        style={{
                                          paddingLeft: "72px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                        }}
                                      >
                                        <Button
                                          appearance="transparent"
                                          icon={isPresExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            togglePresentaciones(sesionId)
                                          }}
                                        />
                                        Presentaciones ({ipe.presentaciones.length})
                                      </TableCell>
                                      <TableCell></TableCell>
                                      <TableCell style={{ textAlign: "right" }}>
                                        <Button
                                          appearance="primary"
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openModal(
                                              `Presentaciones - U${ipe.unidad} S${ipe.introduccion?.semana || "N/A"}`,
                                              ipe.presentaciones,
                                              "presentaciones",
                                            )
                                          }}
                                        >
                                          Ver modal
                                        </Button>
                                      </TableCell>
                                    </TableRow>

                                    {isPresExpanded && (
                                      <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                                        <TableCell colSpan={3} style={{ paddingLeft: "96px" }}>
                                          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                            {ipe.presentaciones.map((pres: any, idx: number) => (
                                              <div
                                                key={idx}
                                                style={{
                                                  marginBottom: "24px",
                                                  paddingBottom: "16px",
                                                  borderBottom:
                                                    idx < ipe.presentaciones.length - 1 ? "1px solid #e0e0e0" : "none",
                                                }}
                                              >
                                                <p style={{ fontWeight: 600, marginBottom: "12px" }}>
                                                  Presentación {idx + 1}
                                                </p>

                                                <p style={{ marginBottom: "8px" }}>
                                                  <strong>Tema:</strong>{" "}
                                                  {renderEditableCell(
                                                    pres.tema,
                                                    (value) =>
                                                      updatePresentacionField(unidadNum, index, idx, "tema", value),
                                                    true,
                                                  )}
                                                </p>

                                                <p style={{ marginBottom: "8px" }}>
                                                  <strong>Subtema:</strong>{" "}
                                                  {renderEditableCell(
                                                    pres.subtema,
                                                    (value) =>
                                                      updatePresentacionField(unidadNum, index, idx, "subtema", value),
                                                    true,
                                                  )}
                                                </p>

                                                <p style={{ marginBottom: "8px" }}>
                                                  <strong>Apartado:</strong>{" "}
                                                  {renderEditableCell(
                                                    pres.apartado || "",
                                                    (value) =>
                                                      updatePresentacionField(unidadNum, index, idx, "apartado", value),
                                                    true,
                                                  )}
                                                </p>

                                                <p style={{ marginBottom: "8px" }}>
                                                  <strong>Tipo Recurso:</strong>{" "}
                                                  {renderEditableCell(
                                                    pres.tipo_recurso,
                                                    (value) =>
                                                      updatePresentacionField(
                                                        unidadNum,
                                                        index,
                                                        idx,
                                                        "tipo_recurso",
                                                        value,
                                                      ),
                                                    true,
                                                  )}
                                                </p>

                                                <p style={{ marginBottom: "8px" }}>
                                                  <strong>Tiempo Estimado:</strong>{" "}
                                                  {renderEditableCell(
                                                    pres.tiempo_estimado,
                                                    (value) =>
                                                      updatePresentacionField(
                                                        unidadNum,
                                                        index,
                                                        idx,
                                                        "tiempo_estimado",
                                                        value,
                                                      ),
                                                    true,
                                                  )}
                                                </p>

                                                <div style={{ marginBottom: "12px" }}>
                                                  <strong>Propósito del Recurso:</strong>
                                                  <div style={{ marginTop: "8px" }}>
                                                    {renderEditableCell(
                                                      pres.proposito_del_recurso,
                                                      (value) =>
                                                        updatePresentacionField(
                                                          unidadNum,
                                                          index,
                                                          idx,
                                                          "proposito_del_recurso",
                                                          value,
                                                        ),
                                                      true,
                                                      true,
                                                    )}
                                                  </div>
                                                </div>

                                                <div style={{ marginBottom: "12px" }}>
                                                  <strong>Detalles del Recurso:</strong>
                                                  <div style={{ marginTop: "8px" }}>
                                                    {renderEditableCell(
                                                      pres.detalles_del_recurso,
                                                      (value) =>
                                                        updatePresentacionField(
                                                          unidadNum,
                                                          index,
                                                          idx,
                                                          "detalles_del_recurso",
                                                          value,
                                                        ),
                                                      true,
                                                      true,
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}

                                {ipe.ejercicios && (
                                  <>
                                    <TableRow
                                      style={{ backgroundColor: "#ffffff", cursor: "pointer" }}
                                      onClick={() => toggleEjercicios(sesionId)}
                                    >
                                      <TableCell
                                        style={{
                                          paddingLeft: "72px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                        }}
                                      >
                                        <Button
                                          appearance="transparent"
                                          icon={isEjerExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleEjercicios(sesionId)
                                          }}
                                        />
                                        Ejercicios
                                      </TableCell>
                                      <TableCell></TableCell>
                                      <TableCell style={{ textAlign: "right" }}>
                                        <Button
                                          appearance="primary"
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openModal(
                                              `Ejercicios - U${ipe.unidad} S${ipe.introduccion?.semana || "N/A"}`,
                                              ipe.ejercicios,
                                              "ejercicios",
                                            )
                                          }}
                                        >
                                          Ver modal
                                        </Button>
                                      </TableCell>
                                    </TableRow>

                                    {/* Contenido de Ejercicios expandido - Making all ejercicios fields editable */}
                                    {isEjerExpanded && (
                                      <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                                        <TableCell colSpan={3} style={{ paddingLeft: "96px" }}>
                                          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                            {renderField(
                                              "Código Actividad",
                                              ipe.ejercicios.codigo_actividad,
                                              () => {},
                                              false,
                                            )}
                                            {renderField(
                                              "Tipo Actividad",
                                              ipe.ejercicios.tipo_actividad,
                                              () => {},
                                              false,
                                            )}
                                            {renderField("Tema", ipe.ejercicios.tema, (value) =>
                                              updateEjerciciosField(unidadNum, index, "tema", value),
                                            )}
                                            {renderField("Subtemas", ipe.ejercicios.subtemas, (value) =>
                                              updateEjerciciosField(unidadNum, index, "subtemas", value),
                                            )}
                                            {renderField(
                                              "Propósito de la Actividad",
                                              ipe.ejercicios.proposito_actividad,
                                              (value) =>
                                                updateEjerciciosField(unidadNum, index, "proposito_actividad", value),
                                              true,
                                              true,
                                            )}
                                            {renderField(
                                              "Detalle de la Actividad",
                                              Array.isArray(ipe.ejercicios.detalle_actividad)
                                                ? ipe.ejercicios.detalle_actividad.join("\n")
                                                : ipe.ejercicios.detalle_actividad,
                                              (value) => {
                                                const newValue = value.split("\n").filter((line: string) => line.trim())
                                                updateEjerciciosField(unidadNum, index, "detalle_actividad", newValue)
                                              },
                                              true,
                                              true,
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </>
                        )
                      })}
                  </>
                )
              })}
          </TableBody>
        </Table>
      </div>

      {/* Modal para mostrar detalles */}
      <Dialog open={modalOpen} onOpenChange={(_, d) => setModalOpen(d.open)}>
        <DialogSurface style={{ maxWidth: "800px", maxHeight: "80vh", overflowY: "scroll" }}>
          <DialogBody>
            <DialogTitle>{modalTitle}</DialogTitle>

            <DialogContent style={{ marginTop: "16px", overflowY: "auto" }}>
              {modalType === "introduccion" && modalData && (
                <div>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableHeaderCell>Curso</TableHeaderCell>
                        <TableCell>{modalData.curso}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Logro de Aprendizaje del Curso</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>{modalData.logro_de_aprendizaje_curso}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Horas Semanales</TableHeaderCell>
                        <TableCell>{modalData.horas_de_estudio_semanales}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Logro de la Unidad</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>
                          {modalData.logro_de_aprendizaje_unidad}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Importancia del Logro</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>{modalData.importancia_del_logro}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Situación Inicial</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>{modalData.situacion_inicial}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Propósito de la SI</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>{modalData.proposito_de_la_si}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Pregunta Cuestionadora</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>{modalData.pregunta_cuestionadora}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Tipo Recurso</TableHeaderCell>
                        <TableCell>{modalData.tipo_recurso}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Tiempo Estimado</TableHeaderCell>
                        <TableCell>{modalData.tiempo_estimado} min</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {modalType === "presentaciones" && modalData && (
                <div>
                  {modalData.map((pres: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "24px",
                        padding: "16px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                      }}
                    >
                      <h4 style={{ marginTop: 0 }}>Presentación {idx + 1}</h4>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableHeaderCell>Tema</TableHeaderCell>
                            <TableCell style={{ whiteSpace: "pre-wrap" }}>{pres.tema}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHeaderCell>Subtema</TableHeaderCell>
                            <TableCell style={{ whiteSpace: "pre-wrap" }}>{pres.subtema}</TableCell>
                          </TableRow>
                          {pres.apartado && (
                            <TableRow>
                              <TableHeaderCell>Apartado</TableHeaderCell>
                              <TableCell style={{ whiteSpace: "pre-wrap" }}>{pres.apartado}</TableCell>
                            </TableRow>
                          )}
                          <TableRow>
                            <TableHeaderCell>Propósito</TableHeaderCell>
                            <TableCell style={{ whiteSpace: "pre-wrap" }}>{pres.proposito_del_recurso}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHeaderCell>Tipo Recurso</TableHeaderCell>
                            <TableCell>{pres.tipo_recurso}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHeaderCell>Tiempo Estimado</TableHeaderCell>
                            <TableCell>{pres.tiempo_estimado}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHeaderCell>Detalles</TableHeaderCell>
                            <TableCell style={{ whiteSpace: "pre-wrap" }}>{pres.detalles_del_recurso}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}

              {modalType === "ejercicios" && modalData && (
                <div>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableHeaderCell>Tema</TableHeaderCell>
                        <TableCell style={{ whiteSpace: "pre-wrap" }}>{modalData.tema}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Subtemas</TableHeaderCell>
                        <TableCell>
                          <ul style={{ margin: 0, paddingLeft: "20px" }}>
                            {modalData.subtemas?.map((sub: string, idx: number) => (
                              <li key={idx}>{sub}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Propósito Actividad</TableHeaderCell>
                        <TableCell>{modalData.proposito_actividad}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Detalle actividad</TableHeaderCell>
                        <TableCell>
                          <RenderDetalleActividad texto={modalData.detalle_actividad} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Código Actividad</TableHeaderCell>
                        <TableCell>{modalData.codigo_actividad}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableHeaderCell>Tipo Actividad</TableHeaderCell>
                        <TableCell>{modalData.tipo_actividad}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
