"use client"

import React, { useState } from "react"
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHeaderCell, Button } from "@fluentui/react-components"
import { ChevronDown20Regular, ChevronRight20Regular } from "@fluentui/react-icons"
import type { Unidad } from "../../domain/input/unidadv2"





interface SilabusTableProps {
  unidades: Unidad[]
}

export const SilabusTable: React.FC<SilabusTableProps> = ({ unidades }) => {
  const [expandedUnidades, setExpandedUnidades] = useState<Set<number>>(new Set())
  const [expandedSemanas, setExpandedSemanas] = useState<Set<string>>(new Set())

  const toggleUnidad = (numeroUnidad: number) => {
    setExpandedUnidades((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(numeroUnidad)) {
        newSet.delete(numeroUnidad)
      } else {
        newSet.add(numeroUnidad)
      }
      return newSet
    })
  }

  const toggleSemana = (unidadId: number, semanaId: number) => {
    const key = `${unidadId}-${semanaId}`
    setExpandedSemanas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  if (!unidades || unidades.length === 0) {
    return <div style={{ padding: "20px", textAlign: "center" }}>No hay datos de unidades disponibles</div>
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell style={{ width: "60px" }}></TableHeaderCell>
            <TableHeaderCell style={{ width: "120px" }}>Unidad/Semana</TableHeaderCell>
            <TableHeaderCell>Título / Temas</TableHeaderCell>
            <TableHeaderCell style={{ width: "150px" }}>Código Actividad</TableHeaderCell>
            <TableHeaderCell style={{ width: "200px" }}>Título Actividad</TableHeaderCell>
            <TableHeaderCell style={{ width: "200px" }}>Observación</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unidades.map((unidad) => {
            const isUnidadExpanded = expandedUnidades.has(unidad.numero_unidad)
            return (
              <React.Fragment key={unidad.numero_unidad}>
                {/* Fila de Unidad */}
                <TableRow style={{ backgroundColor: "#f0f0f0", fontWeight: "600" }}>
                  <TableCell>
                    <Button
                      appearance="transparent"
                      icon={isUnidadExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                      onClick={() => toggleUnidad(unidad.numero_unidad)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>Unidad {unidad.numero_unidad}</TableCell>
                  <TableCell colSpan={4}>{unidad.titulo_unidad}</TableCell>
                </TableRow>

                {/* Semanas dentro de la unidad */}
                {isUnidadExpanded &&
                  unidad.semanas.map((semana) => {
                    const semanaKey = `${unidad.numero_unidad}-${semana.numero_semana}`
                    const isSemanaExpanded = expandedSemanas.has(semanaKey)

                    return (
                      <React.Fragment key={semanaKey}>
                        {/* Fila de Semana */}
                        <TableRow style={{ backgroundColor: "#f8f8f8" }}>
                          <TableCell style={{ paddingLeft: "30px" }}>
                            <Button
                              appearance="transparent"
                              icon={isSemanaExpanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
                              onClick={() => toggleSemana(unidad.numero_unidad, semana.numero_semana)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>Semana {semana.numero_semana}</TableCell>
                          <TableCell>{semana.temas_semana.length} temas</TableCell>
                          <TableCell>{semana.codigo_actividad}</TableCell>
                          <TableCell>
                            {semana.titulo_actividad && semana.titulo_actividad !== "nan"
                              ? semana.titulo_actividad
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {semana.actividad_observacion && semana.actividad_observacion !== "nan"
                              ? semana.actividad_observacion
                              : "-"}
                          </TableCell>
                        </TableRow>

                        {/* Temas dentro de la semana */}
                        {isSemanaExpanded &&
                          semana.temas_semana.map((tema, idx) => (
                            <TableRow key={`${semanaKey}-tema-${idx}`} style={{ backgroundColor: "#ffffff" }}>
                              <TableCell></TableCell>
                              <TableCell style={{ paddingLeft: "60px" }}>Tema {idx + 1}</TableCell>
                              <TableCell colSpan={4}>{tema}</TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    )
                  })}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
