"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Card,
  CardHeader,
  CardPreview,
  Button,
  Text,
  Label,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components"
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
  const [width, setWidth] = useState(380)
  const [isResizing, setIsResizing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = e.clientX - startXRef.current
      const newWidth = startWidthRef.current + deltaX

      if (newWidth < 200) {
        setIsCollapsed(true)
        setWidth(60)
      } else if (newWidth >= 300 && newWidth <= 800) {
        setIsCollapsed(false)
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    startWidthRef.current = width
    setIsResizing(true)
  }

  const handleDoubleClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false)
      setWidth(380)
    } else {
      setIsCollapsed(true)
      setWidth(60)
    }
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

  const renderField = (field: any, path = "") => {
    const fullKey = `${path}-${field.field}`

    if (field.children && field.children.length > 0) {
      return (
        <Accordion collapsible multiple key={fullKey}>
          <AccordionItem value={fullKey} key={`${fullKey}-item`}>
            <AccordionHeader>{field.label}</AccordionHeader>
            <AccordionPanel>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {field.children.map((child: any, index: number) => renderField(child, `${fullKey}-${index}`))}
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

  if (isCollapsed) {
    return (
      <div
        ref={cardRef}
        style={{
          position: "relative",
          width: "60px",
          minWidth: "60px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "100%",
            backgroundColor: "#f3f2f1",
            border: "2px solid #edebe9",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
          onClick={handleDoubleClick}
        >
          <div
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              fontSize: "14px",
              fontWeight: 600,
              color: "#323130",
              userSelect: "none",
              letterSpacing: "1px",
            }}
          >
            Subir archivo
          </div>
        </div>

        <div
          onMouseDown={handleResizeStart}
          onDoubleClick={handleDoubleClick}
          style={{
            position: "absolute",
            top: 0,
            right: "-5px",
            width: "10px",
            height: "100%",
            cursor: "col-resize",
            backgroundColor: "transparent",
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "4px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "2px",
              height: "40px",
              backgroundColor: "#8a8886",
              borderRadius: "2px",
              opacity: isResizing ? 1 : 0.3,
              transition: "opacity 0.2s",
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        width: `${width}px`,
        minWidth: "300px",
        maxWidth: "800px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      <Card
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "auto",
          border: "2px solid #edebe9",
          boxSizing: "border-box",
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

      <div
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        style={{
          position: "absolute",
          top: 0,
          right: "-5px",
          width: "10px",
          height: "100%",
          cursor: "col-resize",
          backgroundColor: "transparent",
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "4px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "2px",
            height: "40px",
            backgroundColor: "#8a8886",
            borderRadius: "2px",
            opacity: isResizing ? 1 : 0.3,
            transition: "opacity 0.2s",
          }}
        />
      </div>
    </div>
  )
}
