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
import { ArrowDownload20Regular } from "@fluentui/react-icons"

export function IpesTable({ ipes }: { ipes: any[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalData, setModalData] = useState<any>(null)
  const [modalType, setModalType] = useState<"introduccion" | "presentaciones" | "ejercicios" | null>(null)

  const openModal = (title: string, data: any, type: "introduccion" | "presentaciones" | "ejercicios") => {
    setModalTitle(title)
    setModalData(data)
    setModalType(type)
    setModalOpen(true)
  }

  const handleExport = () => {
    exportIpesToExcel(ipes)
  }

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <Button appearance="primary" icon={<ArrowDownload20Regular />} onClick={handleExport}>
          Exportar a Excel
        </Button>
      </div>

      {/* Contenedor con scroll horizontal */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        <Table style={{ minWidth: "1200px" }}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Unidad</TableHeaderCell>
              <TableHeaderCell>Semana</TableHeaderCell>
              <TableHeaderCell>Nombre de Sesión</TableHeaderCell>
              <TableHeaderCell>Logro de Semana</TableHeaderCell>
              <TableHeaderCell>Introducción</TableHeaderCell>
              <TableHeaderCell>Presentaciones</TableHeaderCell>
              <TableHeaderCell>Ejercicios</TableHeaderCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {ipes.map((ipe: any, index: number) => (
              <TableRow key={index}>
                <TableCell>{ipe.unidad}</TableCell>
                <TableCell>{ipe.semana}</TableCell>
                <TableCell style={{ maxWidth: "250px", whiteSpace: "pre-wrap" }}>
                  {ipe.introduccion?.nombre_de_la_sesion || "N/A"}
                </TableCell>
                <TableCell style={{ maxWidth: "300px", whiteSpace: "pre-wrap" }}>
                  {ipe.introduccion?.logro_de_la_semana || "N/A"}
                </TableCell>
                <TableCell>
                  {ipe.introduccion && (
                    <Button
                      appearance="primary"
                      onClick={() =>
                        openModal(`Introducción - U${ipe.unidad} S${ipe.semana}`, ipe.introduccion, "introduccion")
                      }
                    >
                      Ver detalle
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {ipe.presentaciones && ipe.presentaciones.length > 0 && (
                    <Button
                      appearance="primary"
                      onClick={() =>
                        openModal(
                          `Presentaciones - U${ipe.unidad} S${ipe.semana}`,
                          ipe.presentaciones,
                          "presentaciones",
                        )
                      }
                    >
                      Ver ({ipe.presentaciones.length})
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {ipe.ejercicios && (
                    <Button
                      appearance="primary"
                      onClick={() =>
                        openModal(`Ejercicios - U${ipe.unidad} S${ipe.semana}`, ipe.ejercicios, "ejercicios")
                      }
                    >
                      Ver detalle
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal para mostrar detalles */}
      <Dialog open={modalOpen} onOpenChange={(_, d) => setModalOpen(d.open)}>
        <DialogSurface style={{ maxWidth: "800px", maxHeight: "80vh" }}>
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
