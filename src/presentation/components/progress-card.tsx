"use client"

import type React from "react"
import { Card, Button, Text, Title2, ProgressBar } from "@fluentui/react-components"
import { ArrowLeftRegular, ArrowRightRegular } from "@fluentui/react-icons"
import { CheckmarkCircleFilled, DismissCircleFilled, CircleFilled } from "@fluentui/react-icons"
import type { MainStep } from "../../domain/workflow/step"

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
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  steps,
  currentStepIndex,
  currentMiniStepIndex,
  completedMiniSteps,
  totalMiniSteps,
 
  onPreviousClick,
  onNextClick,
  onMiniStepSelect,
}) => {
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

  const progressValue = totalMiniSteps > 0 ? (completedMiniSteps / totalMiniSteps) * 100 : 0
  const currentMiniStep = steps[currentStepIndex]?.miniSteps[currentMiniStepIndex]

  const canGoNext =
    currentMiniStep?.validationStatus === "success" &&
    currentMiniStepIndex < steps[currentStepIndex].miniSteps.length - 1

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
      <Title2 style={{ marginBottom: "16px", color: "#0078d4", flexShrink: 0 }}>Progreso General</Title2>

      <Text weight="semibold" size={300} style={{ marginBottom: "12px", color: "#323130" }}>
        Paso {currentStepIndex + 1}/{steps.length}
      </Text>

      <ProgressBar value={progressValue} max={100} style={{ marginBottom: "16px" }} />
      <Text size={200} style={{ color: "#666", marginBottom: "24px" }}>
        {completedMiniSteps}/{totalMiniSteps} requerimientos completados
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
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
        <Button
          icon={<ArrowLeftRegular />}
          onClick={onPreviousClick}
          disabled={currentMiniStepIndex === 0}
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
