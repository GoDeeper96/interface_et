import { useState } from "react"
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Button, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent
} from "@fluentui/react-components"

export function EsquemaActividadesTable({ esquemaActividades }: { esquemaActividades: any }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalData, setModalData] = useState<any>({})

  const openModal = (title: string, data: any) => {
    setModalTitle(title)
    setModalData(data)
    setModalOpen(true)
  }

  return (
    <div style={{ marginTop: "32px" }}>
      {/* <h3>Esquema de Actividades</h3> */}

      {/* 🔥 CONTENEDOR CON SCROLL HORIZONTAL */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        {/* 🔥 Tabla con ancho mínimo para soportar muchas columnas */}
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
                <TableCell>{act.logro_actividad}</TableCell>

                {/* Ajuste de texto largo */}
                <TableCell style={{ maxWidth: "300px", whiteSpace: "pre-wrap" }}>
                  {act.descripcion_actividad}
                </TableCell>

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

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(_, d) => setModalOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{modalTitle}</DialogTitle>

            <DialogContent style={{ marginTop: "16px" }}>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(modalData, null, 2)}
              </pre>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
