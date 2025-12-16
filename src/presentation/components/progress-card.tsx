import type React from "react"
import { Card, Button, Text, Title2, ProgressBar, Input, Field } from "@fluentui/react-components"
import { ArrowLeftRegular, ArrowRightRegular, CheckmarkCircleRegular, CheckmarkLockRegular } from "@fluentui/react-icons"
import { CheckmarkCircleFilled, DismissCircleFilled, CircleFilled,ArrowClockwiseFilled } from "@fluentui/react-icons"
import type { MainStep, RequirementData } from "../../domain/workflow/step"
import { useState } from "react"
import { useDocumentStore } from "../../infrastructure/store/document-store"
import { useSchemaHandler } from "../hooks/schema-handler"
import { useIpesHandler } from "../hooks/ipes-handler"
type MessageIntent = "info" | "success" | "warning" | "error"
interface ProgressCardProps {
  steps: MainStep[]
  currentStepIndex: number
  currentMiniStepIndex: number
  completedMiniSteps: number
  totalMiniSteps: number
  completedSteps: number
  onPreviousClick: () => void
  onNextClick: () => void
  onMiniStepSelect: (index: number) => void
  requirementData?: RequirementData[];
onRequirementChange?: (field: string, value: string) => void;
formValues?: Record<string, string>;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  steps,
  currentStepIndex,
  currentMiniStepIndex,
  completedMiniSteps,
  totalMiniSteps,
  requirementData,
  formValues,
  onRequirementChange,
  onPreviousClick,
  onNextClick,
  onMiniStepSelect,
}) => {
    const [message, setMessage] = useState<{ text: string; type: MessageIntent } | null>(null)
  
  const showMessage = (text: string, type: MessageIntent) => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }
  const getValidationIcon = (status: "pending" | "error" | "success") => {
    switch (status) {
      case "success":
        return <CheckmarkCircleFilled style={{ color: "#107c10", fontSize: "24px" }} />
      case "error":
        return <DismissCircleFilled style={{ color: "#d13438", fontSize: "24px" }} />
      case "pending":
      default:
        return <CircleFilled style={{ color: "#8a8886", fontSize: "24px" }} />
    }
  }
  const { updateField } = useDocumentStore()
    const { handleGenerateSchema } = useSchemaHandler({ onMessage: showMessage })
    const { handleGenerateIpes } = useIpesHandler({ onMessage: showMessage })
  const progressValue = totalMiniSteps > 0 ? (completedMiniSteps / totalMiniSteps) * 100 : 0
  const currentMiniStep = steps[currentStepIndex]?.miniSteps[currentMiniStepIndex]

  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
const handleSetField = (field: string) => {
  setLockedFields((prev) => ({ ...prev, [field]: true }))
}
const handleUnlockField = (field: string) => {
  setLockedFields((prev) => ({
    ...prev,
    [field]: !prev[field]
  }));
};

const isLastMiniStep =
  currentMiniStepIndex === steps[currentStepIndex].miniSteps.length - 1

const areRequirementsComplete =
  Object.values(requirementData ?? {}).every((r) =>
    (formValues?.[r.field] ?? "").trim()
  )
const getStepProgress = (step: MainStep) => {
  const total = step.miniSteps.length
  const completed = step.miniSteps.filter(s => s.validationStatus === "success").length
  return { completed, total }
}

const getStepStatus = (step: MainStep) => {
  const total = step.miniSteps.length
  const completed = step.miniSteps.filter(s => s.validationStatus === "success").length
  
  if (completed === total) return "success"
  if (completed > 0) return "pending"
  return "pending"
}
const executeStep = (stepId, miniStepId)=>{
  if(stepId==="step3") return handleGenerateIpes(2,0)
}
const canGoNext =
  // Si NO es el último miniStep → requiere validación success
  (!isLastMiniStep &&
    currentMiniStep?.validationStatus === "success" &&
    areRequirementsComplete)
  ||
  // Si YA ES el último miniStep → permitir avanzar al siguiente paso
  (isLastMiniStep &&
  currentMiniStep?.validationStatus === "success" &&
  areRequirementsComplete)
    console.log(steps)
  // console.log(steps)
  // console.log(formValues)
  // console.log(requirementData)
  return (
    <Card
      style={{
        flex: 1,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <Title2 style={{ marginBottom: "16px", color: "#0078d4", flexShrink: 0 }}>Progreso</Title2>

      <Text weight="semibold" size={300} style={{ marginBottom: "12px", color: "#323130" }}>
        Pasos completados {currentStepIndex + 1}/{steps.length}
      </Text>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
      {steps.map((step, idx) => {
        const { completed, total } = getStepProgress(step)
        const status = getStepStatus(step)

        return (
          <div
            key={step.id}
            style={{
              display: "flex",
              alignItems: "center",
            
              gap: "8px",
              padding: "4px 0",
              opacity: idx === currentStepIndex ? 1 : 0.7,
            }}
          >
            <div style={{ width: "20px",alignItems: "center",display:"flex" }}>
              {getValidationIcon(status)}
            </div>

            <Text
              size={200}
              style={{
                flex: 1,
                color: idx === currentStepIndex ? "#0078d4" : "#323130",
                fontWeight: idx === currentStepIndex ? 600 : 400,
              }}
            >
              {step.title}
            </Text>

            <Text size={200} style={{ opacity: 0.6 }}>
              {completed}/{total}
            </Text>
          </div>
        )
      })}
    </div>
      <ProgressBar value={progressValue} max={100} style={{ marginBottom: "16px" }} />
      
        {requirementData && requirementData.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <Text weight="semibold" size={300} style={{ marginBottom: "8px" }}>
            Requerimientos de información
          </Text>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {requirementData.map((req) => (
              <div key={req.id} style={{margin: "1rem",marginRight:"0.5rem",marginLeft:"0.5rem" }}>
                {/* <Label htmlFor={req.id}>{req.label}</Label> */}

                {req.type === "input" && (
                  <Field label={req.label} required>
                  <Input
                      id={req.id}
                      style={{ width: "100%" }}
                      value={formValues?.[req.field] ?? ""}
                      onChange={(e) => {
                          const value = e.target.value
                          updateField(req.field, value)
                          onRequirementChange?.(req.field, value)
                        }}
                      disabled={lockedFields[req.field] === true}
                      contentAfter={
                        <span
                          onClick={() => {
                            if (lockedFields[req.field]) {
                              handleUnlockField(req.field)
                            } else {
                              handleSetField(req.field)
                            }
                          }}
                          style={{
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {lockedFields[req.field] ? (
                            <CheckmarkLockRegular
                              style={{ fontSize: "20px", color: "#888888ff" }}
                            />
                          ) : (
                            <CheckmarkCircleRegular
                              style={{ fontSize: "20px", color: "#11da0aff" }}
                            />
                          )}
                        </span>
                      }
                    />
                
                  </Field>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Text weight="semibold" size={300} style={{ marginBottom: "12px", color: "#323130" }}>
        Requerimientos Completados {completedMiniSteps}/{totalMiniSteps} 
      </Text>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, marginBottom: "24px" }}>
        {steps[currentStepIndex].miniSteps.map((miniStep, idx) => (
          <div
            key={miniStep.id}
            style={{
              padding: "12px",
              backgroundColor: idx === currentMiniStepIndex ? "#e6f2ff" : "#f9f9f9",
              borderRadius: "4px",
              border: `1px solid ${idx === currentMiniStepIndex ? "#0078d4" : "#edebe9"}`,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
            }}
            onClick={() => {
              if (idx === 0 || steps[currentStepIndex].miniSteps[idx - 1].validationStatus === "success") {
                onMiniStepSelect(idx)
              }
            }}
          >
            {getValidationIcon(miniStep.validationStatus)}
            <div style={{ flex: 1 }}>
              <Text weight="semibold" size={300}>
                {miniStep.title}
              </Text>
              <Text size={200} style={{ color: "#666", display: "block" }}>
                {miniStep.description}
              </Text>
            </div>
            <div>
              <Button 
              appearance="subtle" 
              size="small" 
              onClick={()=>{executeStep(steps[currentStepIndex].id,miniStep.id)}}
              icon={<ArrowClockwiseFilled style={{ fontSize: "20px", color: "#888888ff" }}
              />}/>

              
              {/* <ArrowClockwiseFilled style={{ fontSize: "20px", color: "#888888ff" }}/> */}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
        <Button
          icon={<ArrowLeftRegular />}
          onClick={onPreviousClick}
          // disabled={currentMiniStepIndex === 0||}
          style={{ flex: 1 }}
        >
          Anterior
        </Button>
        <Button
          icon={<ArrowRightRegular />}
          iconPosition="after"
          onClick={onNextClick}
          disabled={!canGoNext}
          appearance="primary"
          style={{ flex: 1 }}
        >
          Siguiente
        </Button>
      </div>
    </Card>
  )
}
