"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { DocumentRegular, ClipboardTaskRegular } from "@fluentui/react-icons"
import type { MainStep } from "../../domain/workflow/step"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import { FullScreenLoader } from "../components/loader"
import { ProgressCard } from "../components/progress-card"
import { UploadCard } from "../components/upload-card"
import { DocumentInfoCard } from "../components/document-info-card"
import { EsquemaTable } from "../components/esquema"
import { EsquemaActividadesTable } from "../components/esquema-actividades"
import { IpesTable } from "../components/ipes-table"
import { useSchemaHandler } from "../hooks/schema-handler"
import { useIpesHandler } from "../hooks/ipes-handler"
import { useUploadHandler } from "../hooks/use-upload-handler"

const UploadPage: React.FC = () => {
  const [message, setMessage] = useState<{ text: string; type: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [lastValidatedStep, setLastValidatedStep] = useState<string | null>(null)
  const [topTableHeight, setTopTableHeight] = useState(45)
  const [isResizingVertical, setIsResizingVertical] = useState(false)
  const [isTopTableCollapsed, setIsTopTableCollapsed] = useState(false)
  const [isBottomTableCollapsed, setIsBottomTableCollapsed] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [loadingSteps, setLoadingSteps] = useState<Record<string, boolean>>({})
  const [step2TopHeight, setStep2TopHeight] = useState(45)
  const [step2TopCollapsed, setStep2TopCollapsed] = useState(false)
  const [step2BottomCollapsed, setStep2BottomCollapsed] = useState(false)
  const [isResizingStep2, setIsResizingStep2] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const schemaRequestInProgress = useRef(false)
  const ipesRequestInProgress = useRef(false)

  const steps = useDocumentStore((state) => state.steps)
  const currentStepIndex = useDocumentStore((state) => state.currentStepIndex)
  const currentMiniStepIndex = useDocumentStore((state) => state.currentMiniStepIndex)
  const schemaGenerated = useDocumentStore((state) => state.schemaGenerated)
  const ipesGenerated = useDocumentStore((state) => state.ipesGenerated)
  const apiData = useDocumentStore((state) => state.apiData)
  const setSteps = useDocumentStore((state) => state.setSteps)
  const setCurrentStepIndex = useDocumentStore((state) => state.setCurrentStepIndex)
  const setCurrentMiniStepIndex = useDocumentStore((state) => state.setCurrentMiniStepIndex)
  const getCompletedMiniSteps = useDocumentStore((state) => state.getCompletedMiniSteps)
  const getTotalMiniSteps = useDocumentStore((state) => state.getTotalMiniSteps)
  const getCompletedSteps = useDocumentStore((state) => state.getCompletedSteps)

  const currentStep = steps[currentStepIndex]
  const currentMiniStep = currentStep?.miniSteps[currentMiniStepIndex]
  const completedMiniSteps = getCompletedMiniSteps()
  const totalMiniSteps = getTotalMiniSteps()
  const completedSteps = getCompletedSteps()

  // Fix: Access apiData using the correct structure
  const apiResponse = currentMiniStep ? apiData.find((item) => item.documentType === currentMiniStep.title) : undefined

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleRequirementChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const { handleGenerateSchema } = useSchemaHandler({ onMessage: showMessage })
  const { handleGenerateIpes } = useIpesHandler({ onMessage: showMessage })
  const { handleFileSelect, handleUpload } = useUploadHandler({ onMessage: showMessage })

  useEffect(() => {
    if (steps.length === 0) {
      const initialSteps: MainStep[] = [
        {
          id: "step1",
          title: "Subir documentos de estructuramiento",
          description: "Archivos necesarios para el proyecto",
          requirementData: [
            {
              field: "cod_curso",
              id: "cc1",
              label: "Codigo del curso",
              type: "input",
            },
          ],
          icon: <DocumentRegular />,
          miniSteps: [
            {
              id: "silabus",
              title: "Silabus",
              description: "Silabus del curso (Word o Excel)",
              allowedExtensions: ["docx", "xlsx", "xls"],
              fileList: [],
              completed: false,
              uploading: false,
              icon: <ClipboardTaskRegular />,
              documentInfo: {
                purpose: "Plan de estudios detallado con contenidos y evaluaciones",
                requirements: ["Objetivos de aprendizaje", "Cronograma de clases", "Sistema de evaluación"],
                examples: ["Silabus_Curso_2024.docx", "Plan_Estudios.xlsx"],
              },
              validationStatus: "pending",
              fieldValidations: [],
              requiredFields: [],
            },
            {
              id: "kickoff",
              title: "KickOff",
              description: "Archivo inicial del proyecto (Word o PDF)",
              allowedExtensions: ["docx", "pdf"],
              fileList: [],
              completed: false,
              uploading: false,
              icon: <DocumentRegular />,
              documentInfo: {
                purpose: "Documento que define el inicio del proyecto, objetivos y alcance",
                requirements: ["Debe incluir objetivos del proyecto", "Cronograma inicial", "Recursos necesarios"],
                examples: ["Kickoff_Proyecto_2024.docx", "Inicio_Proyecto.pdf"],
              },
              validationStatus: "pending",
              fieldValidations: [],
              requiredFields: [],
            },
            {
              id: "bibliografia",
              title: "Bibliografía",
              description: "Documentos de referencia (PDF)",
              allowedExtensions: ["pdf", "xlsx", "xls"],
              fileList: [],
              completed: false,
              uploading: false,
              icon: <ClipboardTaskRegular />,
              documentInfo: {
                purpose: "Referencias bibliográficas y fuentes de información del proyecto",
                requirements: ["Formato APA o IEEE", "Mínimo 10 referencias", "Fuentes actualizadas"],
                examples: ["Bibliografia_Proyecto.pdf", "Referencias_2024.pdf"],
              },
              validationStatus: "pending",
              fieldValidations: [],
              requiredFields: [],
            },
          ],
        },
        {
          id: "step2",
          title: "Generar esquema de curso y actividades",
          description: "Archivos necesarios para generar un esquema de curso y actividades",
          icon: <DocumentRegular />,
          miniSteps: [
            {
              id: "Esquema_unidad_actividades",
              title: "Esquema de Unidad y Actividades",
              description: "Revisar esquema de unidad y actividades",
              allowedExtensions: [],
              fileList: [],
              completed: false,
              uploading: false,
              icon: <ClipboardTaskRegular />,
              documentInfo: {
                purpose: "Esquema de unidad y actividades",
                requirements: ["Silabus", "Bibliografias", "Acta de traspaso de reunión"],
                examples: ["Silabus_Curso_2024.docx", "Plan_Estudios.xlsx"],
              },
              validationStatus: "pending",
              fieldValidations: [],
              requiredFields: [],
            },
          ],
        },
        {
          id: "step3",
          title: "Generar IPES",
          description: "Archivos necesarios para generar IPES",
          icon: <DocumentRegular />,
          miniSteps: [
            {
              id: "Ipes",
              title: "IPES",
              description: "Revisar IPES",
              allowedExtensions: [],
              fileList: [],
              completed: false,
              uploading: false,
              icon: <ClipboardTaskRegular />,
              documentInfo: {
                purpose: "IPES",
                requirements: ["Acta de traspaso de reunión", "Esquema de unidad", "Esquema de actividades"],
                examples: ["Silabus_Curso_2024.docx", "Plan_Estudios.xlsx"],
              },
              validationStatus: "pending",
              fieldValidations: [],
              requiredFields: [],
            },
          ],
        },
      ]
      setSteps(initialSteps)
    }
  }, [steps.length, setSteps])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingVertical || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const relativeY = e.clientY - containerRect.top
      const newHeightPercent = (relativeY / containerRect.height) * 100

      const clampedHeight = Math.max(20, Math.min(80, newHeightPercent))
      setTopTableHeight(clampedHeight)
      setIsTopTableCollapsed(clampedHeight < 25)
      setIsBottomTableCollapsed(100 - clampedHeight < 25)
    }

    const handleMouseUp = () => {
      setIsResizingVertical(false)
    }

    if (isResizingVertical) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingVertical])

  useEffect(() => {
    if (schemaGenerated || steps.length === 0 || schemaRequestInProgress.current) return

    const step1 = steps[0]
    const step2 = steps[1]
    const isOnStep2 = currentStepIndex === 1 && currentMiniStepIndex === 0
    const step1Completed = step1?.miniSteps.every((ms) => ms.validationStatus === "success")

    if (isOnStep2 && step1Completed && step2?.miniSteps[0].validationStatus === "pending") {
      schemaRequestInProgress.current = true
      setLoadingSteps((prev) => ({ ...prev, [`step2_mini0`]: true }))
      handleGenerateSchema(1, 0).finally(() => {
        schemaRequestInProgress.current = false
        setLoadingSteps((prev) => ({ ...prev, [`step2_mini0`]: false }))
      })
    }
  }, [schemaGenerated, currentStepIndex, currentMiniStepIndex, steps])

  useEffect(() => {
    if (ipesGenerated || steps.length === 0 || ipesRequestInProgress.current) return

    const step1 = steps[0]
    const step2 = steps[1]
    const step3 = steps[2]
    const isOnStep3 = currentStepIndex === 2 && currentMiniStepIndex === 0

    if (!isOnStep3) return

    const step1Completed = step1?.miniSteps.every((ms) => ms.validationStatus === "success")
    const step2Completed = step2?.miniSteps.every((ms) => ms.validationStatus === "success")

    if (step1Completed && step2Completed && step3?.miniSteps[0].validationStatus === "pending") {
      console.log("Generando IPES automáticamente...")
      ipesRequestInProgress.current = true
      setLoadingSteps((prev) => ({ ...prev, [`step3_mini0`]: true }))
      handleGenerateIpes(2, 0).finally(() => {
        ipesRequestInProgress.current = false
        setLoadingSteps((prev) => ({ ...prev, [`step3_mini0`]: false }))
      })
    }
  }, [ipesGenerated, currentStepIndex, currentMiniStepIndex, steps])

  const handleNext = () => {
    if (currentMiniStepIndex < currentStep.miniSteps.length - 1) {
      setCurrentMiniStepIndex(currentMiniStepIndex + 1)
    } else if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
      setCurrentMiniStepIndex(0)
    }
  }

  const handlePrevious = () => {
    if (currentMiniStepIndex > 0) {
      setCurrentMiniStepIndex(currentMiniStepIndex - 1)
    } else if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1]
      setCurrentStepIndex(currentStepIndex - 1)
      setCurrentMiniStepIndex(prevStep.miniSteps.length - 1)
    }
  }

  const handleMiniStepSelect = (index: number) => {
    if (index === 0 || steps[currentStepIndex].miniSteps[index - 1].validationStatus === "success") {
      setCurrentMiniStepIndex(index)
    }
  }

  const handleVerticalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingVertical(true)
  }

  const handleVerticalDoubleClick = () => {
    if (isTopTableCollapsed) {
      setTopTableHeight(45)
      setIsTopTableCollapsed(false)
      setIsBottomTableCollapsed(false)
    } else if (isBottomTableCollapsed) {
      setTopTableHeight(45)
      setIsTopTableCollapsed(false)
      setIsBottomTableCollapsed(false)
    } else {
      setTopTableHeight(10)
      setIsTopTableCollapsed(true)
      setIsBottomTableCollapsed(false)
    }
  }

  const handleStep2ResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingStep2(true)
  }

  const handleStep2HandleDoubleClick = () => {
    if (step2TopCollapsed) {
      setStep2TopHeight(45)
      setStep2TopCollapsed(false)
      setStep2BottomCollapsed(false)
    } else if (step2BottomCollapsed) {
      setStep2TopHeight(45)
      setStep2TopCollapsed(false)
      setStep2BottomCollapsed(false)
    } else {
      setStep2TopHeight(10)
      setStep2TopCollapsed(true)
      setStep2BottomCollapsed(false)
    }
  }

  const renderStepContent = () => {
    const currentStep = steps[currentStepIndex]
    const currentMiniStep = currentStep?.miniSteps[currentMiniStepIndex]

    if (!currentStep || !currentMiniStep) {
      return <div>Loading step data...</div>
    }

    if (currentStepIndex === 0) {
      return (
        <DocumentInfoCard
          miniStep={currentMiniStep}
          apiResponse={apiResponse}
          isModalOpen={isModalOpen}
          onOpenModal={() => setIsModalOpen(true)}
          onCloseModal={() => setIsModalOpen(false)}
        />
      )
    }

    if (currentStepIndex === 1 && currentMiniStepIndex === 0) {
      const stepKey = `step${currentStepIndex}_mini${currentMiniStepIndex}`
      const schemaApiResponse = apiData?.[stepKey]
      const esquemaCurso = schemaApiResponse?.data?.esquemaCurso
      const esquemaActividad = schemaApiResponse?.data?.esquemaActividad

      if (loadingSteps[stepKey]) {
        return (
          <FullScreenLoader message="Generando esquema de curso y actividades... (Tiempo estimado: 1.30 - 2.00 min)" />
        )
      }

      if (currentMiniStep.validationStatus === "error") {
        return (
          <div
            style={{
              flex: 1,
              background: "white",
              padding: "40px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ color: "#d32f2f", marginBottom: "8px" }}>Error al generar esquemas</h3>
            <p style={{ color: "#666", marginBottom: "24px" }}>
              Hubo un problema al procesar la solicitud. Por favor, intenta nuevamente.
            </p>
            <button
              onClick={() => handleGenerateSchema(1, 0)}
              style={{
                padding: "12px 24px",
                background: "#0f548c",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Reintentar
            </button>
          </div>
        )
      }

      if (!esquemaCurso || !esquemaActividad) {
        if (currentMiniStep.validationStatus === "pending" && !loadingSteps[stepKey]) {
          return <FullScreenLoader message="Preparando generación de esquemas..." />
        }
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
            }}
          >
            <p style={{ color: "#666", fontSize: "16px" }}>No hay datos de esquemas disponibles</p>
          </div>
        )
      }

      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minHeight: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexBasis: step2TopCollapsed ? "50px" : `${step2TopHeight}%`,
              flexShrink: 0,
              minHeight: step2TopCollapsed ? "50px" : "100px",
              maxHeight: step2TopCollapsed ? "50px" : undefined,
              transition: "flex-basis 0.2s ease",
              overflow: "hidden",
            }}
          >
            {step2TopCollapsed ? (
              <div
                style={{
                  padding: "12px 16px",
                  background: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onDoubleClick={handleStep2HandleDoubleClick}
              >
                <h4 style={{ margin: 0, color: "#0078d4", fontSize: "14px" }}>Esquema del Curso</h4>
              </div>
            ) : (
              <EsquemaTable data={esquemaCurso} />
            )}
          </div>

          <div
            style={{
              height: "8px",
              cursor: "ns-resize",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
              position: "relative",
              zIndex: 10,
              flex: "0 0 auto",
            }}
            onMouseDown={handleStep2ResizeMouseDown}
            onDoubleClick={handleStep2HandleDoubleClick}
            onMouseEnter={(e) => {
              if (!isResizingStep2) {
                e.currentTarget.style.background = "#e1e1e1"
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizingStep2) {
                e.currentTarget.style.background = "transparent"
              }
            }}
          >
            <div
              style={{
                width: "60px",
                height: "4px",
                background: isResizingStep2 ? "#0078d4" : "#d1d1d1",
                borderRadius: "2px",
                transition: "background-color 0.2s",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: step2TopCollapsed ? 1 : step2BottomCollapsed ? 0 : 1,
              flexBasis: step2BottomCollapsed ? "50px" : undefined,
              minHeight: step2BottomCollapsed ? "50px" : "100px",
              maxHeight: step2BottomCollapsed ? "50px" : undefined,
              overflow: "hidden",
            }}
          >
            {step2BottomCollapsed ? (
              <div
                style={{
                  padding: "12px 16px",
                  background: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onDoubleClick={handleStep2HandleDoubleClick}
              >
                <h4 style={{ margin: 0, color: "#0078d4", fontSize: "14px" }}>Esquema de Actividades</h4>
              </div>
            ) : (
              <EsquemaActividadesTable data={esquemaActividad} />
            )}
          </div>
        </div>
      )
    }

    if (currentStepIndex === 2 && currentMiniStepIndex === 0) {
      const stepKey = `step${currentStepIndex}_mini${currentMiniStepIndex}`
      const ipesApiResponse = apiData?.[stepKey]
      const ipesData = ipesApiResponse?.data?.ipes

      if (loadingSteps[stepKey]) {
        return <FullScreenLoader message="Generando IPES... (Tiempo estimado: 5 - 6 min)" />
      }

      if (currentMiniStep.validationStatus === "error") {
        return (
          <div
            style={{
              flex: 1,
              background: "white",
              padding: "40px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ color: "#d32f2f", marginBottom: "8px" }}>Error al generar IPES</h3>
            <p style={{ color: "#666", marginBottom: "24px" }}>
              Hubo un problema al procesar la solicitud. Por favor, intenta nuevamente.
            </p>
            <button
              onClick={() => handleGenerateIpes(2, 0)}
              style={{
                padding: "12px 24px",
                background: "#0f548c",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Reintentar
            </button>
          </div>
        )
      }

      if (!ipesData || ipesData.length === 0) {
        if (currentMiniStep.validationStatus === "pending" && !loadingSteps[stepKey]) {
          return <FullScreenLoader message="Preparando generación de IPES..." />
        }
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
            }}
          >
            <p style={{ color: "#666", fontSize: "16px" }}>No hay datos de IPES disponibles</p>
          </div>
        )
      }

      return (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <IpesTable ipes={ipesData} />
        </div>
      )
    }

    return null
  }

  if (!currentStep) {
    return <div></div>
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        padding: "24px",
        gap: "24px",
        backgroundColor: "#fafafa",
        boxSizing: "border-box",
        fontFamily: "Segoe UI, system-ui, sans-serif",
      }}
    >
      {message && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1001,
            maxWidth: "400px",
            padding: "16px",
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ color: message.type === "error" ? "#d32f2f" : "#333" }}>{message.text}</div>
        </div>
      )}

      {currentStep.id === "step1" && currentMiniStep && (
        <UploadCard
          miniStep={currentMiniStep}
          onFileSelect={(e) => handleFileSelect(e, currentStepIndex, currentMiniStepIndex)}
          onUpload={() => handleUpload(currentStepIndex, currentMiniStepIndex)}
        />
      )}

      {currentStep.id === "step3" && currentMiniStep && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {loadingSteps[`step2_mini0`] ? (
            <FullScreenLoader message="Generando IPES...." />
          ) : currentMiniStep.validationStatus === "error" ? (
            <div
              style={{
                flex: 1,
                background: "white",
                padding: "40px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
              <h3 style={{ color: "#d32f2f", marginBottom: "8px" }}>Error al generar IPES</h3>
              <p style={{ color: "#666", marginBottom: "24px" }}>
                Hubo un problema al procesar la solicitud. Por favor, intenta nuevamente.
              </p>
              <button
                onClick={() => handleGenerateIpes(2, 0)}
                style={{
                  padding: "12px 24px",
                  background: "#0f548c",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Reintentar
              </button>
            </div>
          ) : apiResponse?.data ? (
            <div
              style={{
                flex: 1,
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                overflowY: "auto",
                minWidth: 0,
                maxHeight: "100%",
              }}
            >
              <h3 style={{ marginTop: 0 }}>IPES - Instrumento Pedagógico de Enseñanza Superior</h3>
              <IpesTable ipes={apiResponse.data.ipes} />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                background: "white",
                padding: "40px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#666" }}>Genera los esquemas del curso para continuar con la generación de IPES</p>
            </div>
          )}
        </div>
      )}

      {currentStep.id === "step2" && currentMiniStep && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {loadingSteps[`step1_mini0`] ? (
            <FullScreenLoader message="Generando Esquema..." />
          ) : currentMiniStep.validationStatus === "error" ? (
            <div
              style={{
                flex: 1,
                background: "white",
                padding: "40px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
              <h3 style={{ color: "#d32f2f", marginBottom: "8px" }}>Error al generar Esquema</h3>
              <p style={{ color: "#666", marginBottom: "24px" }}>
                Hubo un problema al procesar la solicitud. Por favor, intenta nuevamente.
              </p>
              <button
                onClick={() => handleGenerateSchema(1, 0)}
                style={{
                  padding: "12px 24px",
                  background: "#0f548c",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Reintentar
              </button>
            </div>
          ) : apiResponse?.data ? (
            <div
              ref={containerRef}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0px",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: isTopTableCollapsed
                    ? "50px"
                    : isBottomTableCollapsed
                      ? "calc(100% - 58px)"
                      : `${topTableHeight}%`,
                  flex: isTopTableCollapsed ? "0 0 auto" : isBottomTableCollapsed ? "1 1 auto" : "0 0 auto",
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: isTopTableCollapsed ? "12px 20px" : "16px 20px",
                    borderBottom: isTopTableCollapsed ? "none" : "1px solid #eee",
                    borderRadius: "8px 8px 4px 4px",
                    background: "#0f548c",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "white",
                      fontSize: isTopTableCollapsed ? "14px" : "16px",
                      textAlign: "center",
                    }}
                  >
                    Esquema del Curso
                  </h3>
                </div>

                {!isTopTableCollapsed && (
                  <div
                    style={{
                      padding: "16px 20px",
                      overflowY: "auto",
                      flex: 1,
                    }}
                  >
                    <EsquemaTable esquemaCurso={apiResponse.data.esquemaCurso} />
                  </div>
                )}
              </div>

              <div
                onMouseDown={handleVerticalMouseDown}
                onDoubleClick={handleVerticalDoubleClick}
                style={{
                  height: "8px",
                  cursor: "row-resize",
                  background: isResizingVertical ? "#0078d4" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: isResizingVertical ? "none" : "background 0.2s",
                  position: "relative",
                  zIndex: 10,
                  flex: "0 0 auto",
                }}
                onMouseEnter={(e) => {
                  if (!isResizingVertical) {
                    e.currentTarget.style.background = "#e1e1e1"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isResizingVertical) {
                    e.currentTarget.style.background = "transparent"
                  }
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "4px",
                    background: "#d1d1d1",
                    borderRadius: "2px",
                  }}
                />
              </div>

              <div
                style={{
                  height: isBottomTableCollapsed
                    ? "50px"
                    : isTopTableCollapsed
                      ? "calc(100% - 58px)"
                      : `${100 - topTableHeight}%`,
                  flex: isBottomTableCollapsed ? "0 0 auto" : isTopTableCollapsed ? "1 1 auto" : "0 0 auto",
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: isBottomTableCollapsed ? "12px 20px" : "16px 20px",
                    borderRadius: "8px 8px 4px 4px",
                    borderBottom: isBottomTableCollapsed ? "none" : "1px solid #eee",
                    background: "#383838",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "white",
                      fontSize: isBottomTableCollapsed ? "14px" : "16px",
                      textAlign: "center",
                    }}
                  >
                    Esquema de Actividades
                  </h3>
                </div>

                {!isBottomTableCollapsed && (
                  <div
                    style={{
                      padding: "16px 20px",
                      overflowY: "auto",
                      flex: 1,
                    }}
                  >
                    <EsquemaActividadesTable esquemaActividades={apiResponse.data.esquemaActividad} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                background: "white",
                padding: "40px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#666" }}>
                Sube los documentos de estructuramiento para continuar con la generación de esquemas
              </p>
            </div>
          )}
        </div>
      )}

      {currentStep.id === "step1" && currentMiniStep && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>{renderStepContent()}</div>
      )}

      <ProgressCard
        steps={steps}
        currentStepIndex={currentStepIndex}
        currentMiniStepIndex={currentMiniStepIndex}
        completedMiniSteps={completedMiniSteps}
        totalMiniSteps={totalMiniSteps}
        completedSteps={completedSteps}
        onPreviousClick={handlePrevious}
        onNextClick={handleNext}
        onMiniStepSelect={handleMiniStepSelect}
        requirementData={currentStep?.requirementData}
        onRequirementChange={handleRequirementChange}
        formValues={formValues}
      />
    </div>
  )
}

export default UploadPage
