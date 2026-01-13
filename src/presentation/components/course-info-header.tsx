"use client"

import type React from "react"
import { Card, Text } from "@fluentui/react-components"
import { BookRegular, NumberSymbolRegular } from "@fluentui/react-icons"

interface CourseInfoHeaderProps {
  courseName?: string
  courseCode?: string
}

export const CourseInfoHeader: React.FC<CourseInfoHeaderProps> = ({ courseName, courseCode }) => {
  if (!courseName && !courseCode) {
    return null
  }

  return (
    <Card
      style={{
        width: "100%",
        marginBottom: "16px",
        background: "linear-gradient(135deg, #0078d4 0%, #106ebe 100%)",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 120, 212, 0.15)",
        border: "none",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "12px 16px",
        }}
      >
        {courseCode && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <NumberSymbolRegular style={{ fontSize: "18px", color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size={100} style={{ color: "rgba(255, 255, 255, 0.85)", display: "block" }}>
                Código
              </Text>
              <Text
                size={300}
                weight="semibold"
                style={{
                  color: "white",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {courseCode}
              </Text>
            </div>
          </div>
        )}

        {courseName && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookRegular style={{ fontSize: "18px", color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size={100} style={{ color: "rgba(255, 255, 255, 0.85)", display: "block" }}>
                Nombre del Curso
              </Text>
              <Text
                size={300}
                weight="semibold"
                style={{
                  color: "white",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {courseName}
              </Text>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
