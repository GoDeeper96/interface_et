import type React from "react"
import { Card, CardHeader, CardPreview, Button, Text, Label, Spinner,Accordion, AccordionItem, AccordionHeader, AccordionPanel } from "@fluentui/react-components"
import {
  ArrowUploadRegular,
  AttachRegular,
  CheckmarkCircleRegular,
  CheckmarkCircleFilled,
  DismissCircleFilled,
  CircleFilled,
} from "@fluentui/react-icons"
import type { MiniStep } from "../../domain/workflow/step"

interface UploadCardProps {
  miniStep: MiniStep
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
}
export interface RequiredField {
  field: string
  label: string
  isValid?: boolean
  isOptional?: boolean
  children?: RequiredField[]
}
export const UploadCard: React.FC<UploadCardProps> = ({ miniStep, onFileSelect, onUpload }) => {
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
    
const renderField = (field: any, path: string = "") => {
  const fullKey = `${path}-${field.field}`

  if (field.children && field.children.length > 0) {
    return (
      <Accordion collapsible multiple key={fullKey}>
        <AccordionItem value={fullKey} key={`${fullKey}-item`}>
          <AccordionHeader>{field.label}</AccordionHeader>
          <AccordionPanel>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {field.children.map((child: any, index: number) =>
                renderField(child, `${fullKey}-${index}`)
              )}
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <div
      key={fullKey}
      style={{
        padding: "12px",
        backgroundColor: "#f9f9f9",
        borderRadius: "4px",
        border: "1px solid #edebe9",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {miniStep.fieldValidations.length > 0 ? (
        field.isValid ? (
          <CheckmarkCircleFilled style={{ color: "#107c10", fontSize: "18px", flexShrink: 0 }} />
        ) : (
          <DismissCircleFilled
            style={{
              color: field.isOptional ? "#8a8886" : "#d13438",
              fontSize: "18px",
              flexShrink: 0,
            }}
          />
        )
      ) : (
        <CircleFilled style={{ color: "#8a8886", fontSize: "18px", flexShrink: 0 }} />
      )}

      <div style={{ flex: 1 }}>
        <Text size={300} style={{ color: field.isOptional ? "#8a8886" : "#303232ff" }}>
          {field.label}
        </Text>
      </div>
    </div>
  )
}

  
  // const fieldsToShow =
  //   miniStep.fieldValidations.length > 0
  //     ? miniStep.fieldValidations
  //     : miniStep.requiredFields.map((field) => ({
  //         field: field.field,
  //         label: field.label,
  //         isValid: false,
  //         isOptional: field.isOptional,
  //       }))
const normalizeFields = (fields: RequiredField[]): RequiredField[] =>
  fields.map((f) => ({
    ...f,
    isValid: f.isValid ?? false,
    isOptional: f.isOptional ?? false,
    children: f.children ? normalizeFields(f.children) : undefined,
  }))

  const fieldsToShow =
  miniStep.fieldValidations.length > 0
    ? normalizeFields(miniStep.fieldValidations)
    : normalizeFields(miniStep.requiredFields)
  return (
    <Card
      style={{
        padding: "24px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <CardHeader
        image={miniStep.icon}
        header={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Text weight="semibold" size={400}>
              {miniStep.title}
            </Text>
            {getValidationIcon(miniStep.validationStatus)}
          </div>
        }
        description={<Text size={300}>{miniStep.description}</Text>}
      />

      <CardPreview style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 0", flex: 1 }}>
          <Label htmlFor={`file-input-${miniStep.id}`}>Seleccionar archivo:</Label>
          <input
            type="file"
            id={`file-input-${miniStep.id}`}
            accept={miniStep.allowedExtensions.map((ext) => `.${ext}`).join(",")}
            onChange={onFileSelect}
            style={{ marginTop: "8px", width: "100%" }}
          />

          {miniStep.fileList.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                backgroundColor: "#f3f2f1",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AttachRegular />
              <Text size={200}>{miniStep.fileList[0].name}</Text>
            </div>
          )}

          <Button
            appearance={miniStep.completed ? "subtle" : "primary"}
            icon={
              miniStep.uploading ? (
                <Spinner size="tiny" />
              ) : miniStep.completed ? (
                <CheckmarkCircleRegular />
              ) : (
                <ArrowUploadRegular />
              )
            }
            onClick={onUpload}
            disabled={miniStep.uploading}
            style={{ marginTop: "16px", width: "100%" }}
          >
            {miniStep.uploading ? "Procesando..." : miniStep.completed ? "Volver a subir" : `Subir ${miniStep.title}`}
          </Button>

         {fieldsToShow.length > 0 && (
  <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #edebe9" }}>
    <Text weight="semibold" size={300} style={{ display: "block", marginBottom: "12px" }}>
      Datos requeridos para {miniStep.title}:
    </Text>

    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {fieldsToShow.map((field, index) => renderField(field, `root-${index}`))}
    </div>
  </div>
)}
        </div>
      </CardPreview>
    </Card>
  )
}
