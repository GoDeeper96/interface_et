import type React from "react"
import {
  Card,
  Button,
  Text,
  Title2,
  Title3,
  Badge,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@fluentui/react-components"
import { MaximizeRegular } from "@fluentui/react-icons"
import type { MiniStep } from '../../domain/workflow/step'
import type { ApiResponse } from "../../domain/base/api-response"

interface DocumentInfoCardProps {
  miniStep: MiniStep
  apiResponse?: ApiResponse
  isModalOpen: boolean
  onOpenModal: () => void
  onCloseModal: () => void
}

export const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({
  miniStep,
  apiResponse,
  isModalOpen,
  onOpenModal,
  onCloseModal,
}) => {
  console.log("apiResponse recibido:", apiResponse)
  return (
    <>
      <Card
        style={{
          flex: 1,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexShrink: 0,
          }}
        >
          <Title2 style={{ color: "#0078d4" }}>Información del Documento</Title2>
          <Button icon={<MaximizeRegular />} appearance="subtle" onClick={onOpenModal}>
            Ver completo
          </Button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <Accordion collapsible>
            <AccordionItem value="description">
              <AccordionHeader>
                <Text weight="semibold" size={400}>
                  Descripción del documento
                </Text>
              </AccordionHeader>
              <AccordionPanel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "24px",
                    marginTop: "12px",
                  }}
                >
                  <div>
                    <Text weight="semibold" style={{ display: "block", marginBottom: "12px", color: "#323130" }}>
                      Propósito:
                    </Text>
                    <Text style={{ lineHeight: "1.5" }}>{miniStep.documentInfo.purpose}</Text>
                  </div>

                  <div>
                    <Text weight="semibold" style={{ display: "block", marginBottom: "12px", color: "#323130" }}>
                      Requisitos:
                    </Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {miniStep.documentInfo.requirements.map((req, index) => (
                        <Text key={index} size={300} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                          <span style={{ color: "#0078d4", fontWeight: "bold" }}>•</span>
                          {req}
                        </Text>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Text weight="semibold" style={{ display: "block", marginBottom: "12px", color: "#323130" }}>
                      Ejemplos de nombres:
                    </Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {miniStep.documentInfo.examples.map((example, index) => (
                        <Badge key={index} appearance="outline" style={{ alignSelf: "flex-start" }}>
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

          {apiResponse && (
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #edebe9" }}>
              <Title3 style={{ color: "#0078d4", marginBottom: "16px" }}>Resultado del Análisis</Title3>
              <div style={{ marginBottom: "12px" }}>
                <Text size={200} style={{ color: "#666" }}>
                  Archivo: {apiResponse.filename}
                </Text>
                <Badge appearance="filled" color="success" style={{ marginLeft: "12px" }}>
                  {apiResponse.message}
                </Badge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.entries(apiResponse.data).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      padding: "12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                      border: "1px solid #edebe9",
                    }}
                  >
                    <Text
                      weight="semibold"
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#0078d4",
                        textTransform: "capitalize",
                      }}
                    >
                      {key}:
                    </Text>

                    {Array.isArray(value) ? (
                      value.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {value.map((item, idx) => (
                            <Text key={idx} size={300} style={{ paddingLeft: "12px" }}>
                              • {typeof item === "object" ? JSON.stringify(item) : item}
                            </Text>
                          ))}
                        </div>
                      ) : (
                        <Text size={300} style={{ color: "#666", fontStyle: "italic" }}>
                          Sin datos
                        </Text>
                      )
                    ) : typeof value === "object" && value !== null ? (
                      <div style={{ paddingLeft: "12px" }}>
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <Text key={subKey} size={300} style={{ display: "block" }}>
                            <span style={{ fontWeight: 600 }}>{subKey}:</span> {String(subValue)}
                          </Text>
                        ))}
                      </div>
                    ) : (
                      <Text size={300}>
                        {value === null || value === undefined ? (
                          <span style={{ color: "#666", fontStyle: "italic" }}>Sin datos</span>
                        ) : (
                          String(value)
                        )}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!apiResponse && (
            <div
              style={{
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid #edebe9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "200px",
                color: "#666",
              }}
            >
              <Text>Sube un documento para ver los resultados del análisis</Text>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(_, data) => (data.open ? onOpenModal() : onCloseModal())}>
        <DialogSurface style={{ maxWidth: "900px", maxHeight: "80vh" }}>
          <DialogBody>
            <DialogTitle>Información Completa del Documento</DialogTitle>
            <DialogContent style={{ overflowY: "auto", maxHeight: "60vh" }}>
              <div style={{ marginBottom: "24px" }}>
                <Title3 style={{ color: "#0078d4", marginBottom: "16px" }}>{miniStep.title}</Title3>
                <Text style={{ display: "block", marginBottom: "12px" }}>{miniStep.description}</Text>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <Text weight="semibold" style={{ display: "block", marginBottom: "12px", color: "#323130" }}>
                    Propósito:
                  </Text>
                  <Text style={{ lineHeight: "1.5" }}>{miniStep.documentInfo.purpose}</Text>
                </div>

                <div>
                  <Text weight="semibold" style={{ display: "block", marginBottom: "12px", color: "#323130" }}>
                    Requisitos:
                  </Text>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {miniStep.documentInfo.requirements.map((req, index) => (
                      <Text key={index} size={300} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <span style={{ color: "#0078d4", fontWeight: "bold" }}>•</span>
                        {req}
                      </Text>
                    ))}
                  </div>
                </div>

                <div>
                  <Text weight="semibold" style={{ display: "block", marginBottom: "12px", color: "#323130" }}>
                    Ejemplos de nombres:
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {miniStep.documentInfo.examples.map((example, index) => (
                      <Badge key={index} appearance="outline">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {apiResponse && (
                <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #edebe9" }}>
                  <Title3 style={{ color: "#0078d4", marginBottom: "16px" }}>Resultado del Análisis</Title3>
                  <div style={{ marginBottom: "12px" }}>
                    <Text size={200} style={{ color: "#666" }}>
                      Archivo: {apiResponse.filename}
                    </Text>
                    <Badge appearance="filled" color="success" style={{ marginLeft: "12px" }}>
                      {apiResponse.message}
                    </Badge>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {Object.entries(apiResponse.data).map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          padding: "12px",
                          backgroundColor: "#f9f9f9",
                          borderRadius: "4px",
                          border: "1px solid #edebe9",
                        }}
                      >
                        <Text
                          weight="semibold"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            color: "#0078d4",
                            textTransform: "capitalize",
                          }}
                        >
                          {key}:
                        </Text>

                        {Array.isArray(value) ? (
                          value.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {value.map((item, idx) => (
                                <Text key={idx} size={300} style={{ paddingLeft: "12px" }}>
                                  • {typeof item === "object" ? JSON.stringify(item) : item}
                                </Text>
                              ))}
                            </div>
                          ) : (
                            <Text size={300} style={{ color: "#666", fontStyle: "italic" }}>
                              Sin datos
                            </Text>
                          )
                        ) : typeof value === "object" && value !== null ? (
                          <div style={{ paddingLeft: "12px" }}>
                            {Object.entries(value).map(([subKey, subValue]) => (
                              <Text key={subKey} size={300} style={{ display: "block" }}>
                                <span style={{ fontWeight: 600 }}>{subKey}:</span> {String(subValue)}
                              </Text>
                            ))}
                          </div>
                        ) : (
                          <Text size={300}>
                            {value === null || value === undefined ? (
                              <span style={{ color: "#666", fontStyle: "italic" }}>Sin datos</span>
                            ) : (
                              String(value)
                            )}
                          </Text>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={onCloseModal}>
                Cerrar
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
