import type React from "react"
import { useState, useEffect } from "react"
import {
  FluentProvider,
  webLightTheme,
  MessageBar,
  MessageBarBody
} from "@fluentui/react-components"
import { DocumentRegular, BookRegular, ClipboardTaskRegular } from "@fluentui/react-icons"
import { UploadCard } from "../components/upload-card"
import { DocumentInfoCard } from "../components/document-info-card"
import { ProgressCard } from "../components/progress-card"
import { useUploadHandler } from "../hooks/use-upload-handler"
import type { MainStep } from "../../domain/workflow/step"
import { KICKOFF_REQUIRED_FIELDS } from "../../domain/workflow/kickoff-fields"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import { SILABUS_REQUIRED_FIELDS } from "../../application/services/validation/silabus-validator.service"
import { BIBLIOGRAFIA_REQUIRED_FIELDS } from "../../application/services/validation/bibliografia-validator.service"
type MessageIntent = "info" | "success" | "warning" | "error"
const UploadPage: React.FC = () => {
  const [message, setMessage] = useState<{ text: string; type: MessageIntent } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 🟢 Nuevo estado para controlar avance automático
  const [lastValidatedStep, setLastValidatedStep] = useState<string | null>(null)

  const {
    steps,
    currentStepIndex,
    currentMiniStepIndex,
    apiData,
    setSteps,
    setCurrentStepIndex,
    setCurrentMiniStepIndex,
    getCompletedMiniSteps,
    getTotalMiniSteps,
    getCompletedSteps,
  } = useDocumentStore()

  const showMessage = (text: string, type: MessageIntent) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  
  const { handleFileSelect, handleUpload } = useUploadHandler({ onMessage: showMessage })
  const handleRequirementChange = (field: string, value: string) => {
  setFormValues((prev) => ({ ...prev, [field]: value }))
}
  // Initialize steps
  useEffect(() => {
    if (steps.length === 0) {
      const initialSteps: MainStep[] = [
        {
          id: "step1",
          title: "Subir documentos de estructuramiento",
          description: "Archivos necesarios para el proyecto",
          requirementData:[{
            field:"cod_curso",
            id:"cc1",
            label:"Codigo del curso",
            type:"input"
          }],
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
              requiredFields: SILABUS_REQUIRED_FIELDS,
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
              requiredFields: KICKOFF_REQUIRED_FIELDS,
            },
            {
              id: "bibliografia",
              title: "Bibliografía",
              description: "Documentos de referencia (PDF)",
              allowedExtensions: ["pdf","xlsx","xls"],
              fileList: [],
              completed: false,
              uploading: false,
              icon: <BookRegular />,
              documentInfo: {
                purpose: "Referencias bibliográficas y fuentes de información del proyecto",
                requirements: ["Formato APA o IEEE", "Mínimo 10 referencias", "Fuentes actualizadas"],
                examples: ["Bibliografia_Proyecto.pdf", "Referencias_2024.pdf"],
              },
              validationStatus: "pending",
              fieldValidations: [],
              requiredFields: BIBLIOGRAFIA_REQUIRED_FIELDS,
            },
            
          ],
        },
        {
          id:"step2",
          title:"Generar esquema de curso y actividades",
          description:"Archivos necesarios para generar un esquema de curso y actividades",
          icon:<DocumentRegular/>,
          miniSteps:[]
        },
        {
          id:"step3",
          title:"Generar IPES",
          description:"Archivos necesarios para generar IPES",
          icon:<DocumentRegular/>,
          miniSteps:[]
        },
      ]
      setSteps(initialSteps)
    }
  }, [steps.length, setSteps])

  // 🟢 Autoavance solo una vez por validación exitosa
  // useEffect(() => {
  //   if (steps.length === 0) return

  //   const currentMiniStep = steps[currentStepIndex]?.miniSteps[currentMiniStepIndex]
  //   const stepId = currentMiniStep?.id

  //   if (
  //     currentMiniStep?.validationStatus === "success" &&
  //     stepId !== lastValidatedStep && // Evita repetir el avance
  //     currentMiniStepIndex < steps[currentStepIndex].miniSteps.length - 1
  //   ) {
  //     setLastValidatedStep(stepId)
  //     const timer = setTimeout(() => {
  //       setCurrentMiniStepIndex(currentMiniStepIndex + 1)
  //     }, 1000)
  //     return () => clearTimeout(timer)
  //   }
  // }, [steps, currentMiniStepIndex, currentStepIndex, setCurrentMiniStepIndex, lastValidatedStep])
  useEffect(() => {
  if (steps.length === 0) return

  const currentStep = steps[currentStepIndex]
  const currentMiniStep = currentStep?.miniSteps[currentMiniStepIndex]
  const stepId = currentMiniStep?.id

  // Si el miniStep actual ya fue validado con éxito
  if (currentMiniStep?.validationStatus === "success" && stepId !== lastValidatedStep) {
    setLastValidatedStep(stepId)

    const timer = setTimeout(() => {
      // Si no es el último miniStep del step actual, avanzamos al siguiente miniStep
      if (currentMiniStepIndex < currentStep.miniSteps.length - 1) {
        setCurrentMiniStepIndex(currentMiniStepIndex + 1)
      } else {
        // ⚡ Todos los miniSteps del step actual completados: pasar al siguiente step
        if (currentStepIndex < steps.length - 1) {
          setCurrentMiniStepIndex(0) // reset para el siguiente step
          // setSteps(prev => [...prev]) // opcional si quieres forzar re-render
          // Aquí se actualiza el currentStepIndex
          // Ideal si usas un setter global, ej:
          useDocumentStore.getState().setCurrentStepIndex(currentStepIndex + 1)
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }
}, [steps, currentMiniStepIndex, currentStepIndex, lastValidatedStep])
  const completedMiniSteps = getCompletedMiniSteps()
  const totalMiniSteps = getTotalMiniSteps()
  const completedSteps = getCompletedSteps()

  const currentMiniStep = steps[currentStepIndex]?.miniSteps[currentMiniStepIndex]
  console.log(apiData)
  console.log(currentMiniStep?.title)
  const apiResponse = apiData.find((item) => item.documentType === currentMiniStep?.title)
  console.log(apiResponse)
  // const handlePrevious = () => {
  //   if (currentMiniStepIndex > 0) {
  //     setCurrentMiniStepIndex(currentMiniStepIndex - 1)
  //   }
  // }

  // const handleNext = () => {
  //   if (currentMiniStepIndex < steps[currentStepIndex].miniSteps.length - 1) {
  //     setCurrentMiniStepIndex(currentMiniStepIndex + 1)
  //   }
  // }
  const handleNext = () => {
  const currentStep = steps[currentStepIndex]

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

  return (
    <FluentProvider theme={webLightTheme}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          padding: "24px",
          gap: "24px",
          backgroundColor: "#fafafa",
            boxSizing: "border-box", // ⬅️ aquí
          fontFamily: "Segoe UI, system-ui, sans-serif",
        }}
      >
        {message && (
          <MessageBar
            intent={message.type}
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 1001,
              maxWidth: "400px",
            }}
          >
            <MessageBarBody>{message.text}</MessageBarBody>
          </MessageBar>
        )}

        {/* Upload Card - Left Column */}
        {currentMiniStep && (
          <div style={{ width: "380px", display: "flex", flexDirection: "column" }}>
            <UploadCard
              miniStep={currentMiniStep}
              onFileSelect={(e) => handleFileSelect(e, currentStepIndex, currentMiniStepIndex)}
              onUpload={() => handleUpload(currentStepIndex, currentMiniStepIndex)}
            />
          </div>
        )}

        {/* Document Info Card - Center Column */}
        {currentMiniStep && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <DocumentInfoCard
              miniStep={currentMiniStep}
              apiResponse={apiResponse}
              isModalOpen={isModalOpen}
              onOpenModal={() => setIsModalOpen(true)}
              onCloseModal={() => setIsModalOpen(false)}
            />
          </div>
        )}

        {/* Progress Card - Right Column */}
        {steps.length > 0 && (
          <div style={{ width: "320px", display: "flex", flexDirection: "column" }}>
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
              requirementData={steps[currentStepIndex]?.requirementData}
              onRequirementChange={handleRequirementChange}
              formValues={formValues}
            />
          </div>
        )}
      </div>
    </FluentProvider>
  )
}

export default UploadPage
