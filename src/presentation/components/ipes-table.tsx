"use client"

import { useState } from "react"
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
import { exportIpesToExcel } from "../utils/export-excel"
import { ArrowDownload20Regular, ChevronDown20Regular, ChevronRight20Regular } from "@fluentui/react-icons"

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

  const unidadesAgrupadas = ipes.reduce((acc: any, ipe: any) => {
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

  const toggleSesion = (sesionId: string) => {
    const newExpanded = new Set(expandedSesiones)
    if (newExpanded.has(sesionId)) {
      newExpanded.delete(sesionId)
    } else {
      newExpanded.add(sesionId)
    }
    setExpandedSesiones(newExpanded)
  }

  const toggleIntroduccion = (sesionId: string) => {
    const newExpanded = new Set(expandedIntroduccion)
    if (newExpanded.has(sesionId)) {
      newExpanded.delete(sesionId)
    } else {
      newExpanded.add(sesionId)
    }
    setExpandedIntroduccion(newExpanded)
  }

  const togglePresentaciones = (sesionId: string) => {
    const newExpanded = new Set(expandedPresentaciones)
    if (newExpanded.has(sesionId)) {
      newExpanded.delete(sesionId)
    } else {
      newExpanded.add(sesionId)
    }
    setExpandedPresentaciones(newExpanded)
  }

  const toggleEjercicios = (sesionId: string) => {
    const newExpanded = new Set(expandedEjercicios)
    if (newExpanded.has(sesionId)) {
      newExpanded.delete(sesionId)
    } else {
      newExpanded.add(sesionId)
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
    exportIpesToExcel(ipes)
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

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <Button appearance="primary" style={{ background: "#107c10", color: "white" }} icon={<ArrowDownload20Regular />} onClick={handleExport}>
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
            {Object.keys(unidadesAgrupadas)
              .sort((a, b) => Number(a) - Number(b))
              .map((unidadKey) => {
                const unidadNum = Number(unidadKey)
                const sesiones = unidadesAgrupadas[unidadKey]
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

                                    {/* Contenido de Introducción expandido */}
                                    {isIntroExpanded && (
                                      <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                                        <TableCell colSpan={3} style={{ paddingLeft: "96px" }}>
                                          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                            <p>
                                              <strong>Curso:</strong> {ipe.introduccion.curso}
                                            </p>
                                            <p>
                                              <strong>Logro de Aprendizaje del Curso:</strong>{" "}
                                              {ipe.introduccion.logro_de_aprendizaje_curso}
                                            </p>
                                            <p>
                                              <strong>Horas Semanales:</strong>{" "}
                                              {ipe.introduccion.horas_de_estudio_semanales}
                                            </p>
                                            <p>
                                              <strong>Logro de la Unidad:</strong>{" "}
                                              {ipe.introduccion.logro_de_aprendizaje_unidad}
                                            </p>
                                            <p>
                                              <strong>Importancia del Logro:</strong>{" "}
                                              {ipe.introduccion.importancia_del_logro}
                                            </p>
                                            <p>
                                              <strong>Situación Inicial:</strong> {ipe.introduccion.situacion_inicial}
                                            </p>
                                            <p>
                                              <strong>Propósito de la SI:</strong> {ipe.introduccion.proposito_de_la_si}
                                            </p>
                                            <p>
                                              <strong>Pregunta Cuestionadora:</strong>{" "}
                                              {ipe.introduccion.pregunta_cuestionadora}
                                            </p>
                                            <p>
                                              <strong>Tipo Recurso:</strong> {ipe.introduccion.tipo_recurso}
                                            </p>
                                            <p>
                                              <strong>Tiempo Estimado:</strong> {ipe.introduccion.tiempo_estimado} min
                                            </p>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}

                                {/* Presentaciones */}
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

                                    {/* Contenido de Presentaciones expandido */}
                                    {isPresExpanded && (
                                      <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                                        <TableCell colSpan={3} style={{ paddingLeft: "96px" }}>
                                          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                            {ipe.presentaciones.map((pres: any, idx: number) => (
                                              <div
                                                key={idx}
                                                style={{
                                                  marginBottom: "16px",
                                                  paddingBottom: "16px",
                                                  borderBottom:
                                                    idx < ipe.presentaciones.length - 1 ? "1px solid #e0e0e0" : "none",
                                                }}
                                              >
                                                <p style={{ fontWeight: 600 }}>Presentación {idx + 1}</p>
                                                <p>
                                                  <strong>Tema:</strong> {pres.tema}
                                                </p>
                                                <p>
                                                  <strong>Subtema:</strong> {pres.subtema}
                                                </p>
                                                <p>
                                                  <strong>Propósito:</strong> {pres.proposito_del_recurso}
                                                </p>
                                                <p>
                                                  <strong>Tipo Recurso:</strong> {pres.tipo_recurso}
                                                </p>
                                                <p>
                                                  <strong>Tiempo Estimado:</strong> {pres.tiempo_estimado}
                                                </p>
                                                <p>
                                                  <strong>Detalles:</strong> {pres.detalles_del_recurso}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}

                                {/* Ejercicios */}
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

                                    {/* Contenido de Ejercicios expandido */}
                                    {isEjerExpanded && (
                                      <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                                        <TableCell colSpan={3} style={{ paddingLeft: "96px" }}>
                                          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                                            <p>
                                              <strong>Tema:</strong> {ipe.ejercicios.tema}
                                            </p>
                                            <p>
                                              <strong>Subtemas:</strong>
                                            </p>
                                            <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                                              {ipe.ejercicios.subtemas?.map((sub: string, idx: number) => (
                                                <li key={idx}>{sub}</li>
                                              ))}
                                            </ul>
                                            <p>
                                              <strong>Código Actividad:</strong> {ipe.ejercicios.codigo_actividad}
                                            </p>
                                            <p>
                                              <strong>Tipo Actividad:</strong> {ipe.ejercicios.tipo_actividad}
                                            </p>
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
