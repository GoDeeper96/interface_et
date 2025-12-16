import { useState } from "react"
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Button, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent
} from "@fluentui/react-components"

export function EsquemaTable({ esquemaCurso }: { esquemaCurso: any }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalData, setModalData] = useState<any[]>([])

  const openModal = (title: string, data: any[]) => {
    setModalTitle(title)
    setModalData(data)
    setModalOpen(true)
  }

  return (
    <div style={{ marginTop: "24px" }}>
      {/* <h3>Esquema del Curso</h3> */}

      {/* Tabla de unidades */}
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
                  onClick={() => openModal(
                    `Semanas de Unidad ${unidad.numero_unidad}`,
                    unidad.semanas
                  )}
                >
                  Ver semanas
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* MODAL PARA HIJOS */}
      <Dialog open={modalOpen} onOpenChange={(_, data) => setModalOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogContent style={{ marginTop: "16px" }}>

              {/* Render dinámico según el nivel */}

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
                            onClick={() =>
                              openModal(
                                `Temas - Semana ${semana.numero_semana}`,
                                semana.temas
                              )
                            }
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
                            onClick={() =>
                              openModal(
                                `Subtemas de ${tema.titulo_tema}`,
                                tema.subtemas
                              )
                            }
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
                                sub.apartados.map((a: string) => ({ apartado: a }))
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
                    {modalData.map(ap => (
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
