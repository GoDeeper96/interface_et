"use client"

import { FluentProvider, webLightTheme } from "@fluentui/react-components"
import dynamic from "next/dynamic"

const UploadPage = dynamic(() => import("./upload-page"), {
  ssr: false,
  loading: () => <div>Cargando...</div>,
})

export default function UploadPageWrapper() {
  return (
    <FluentProvider theme={webLightTheme}>
      <UploadPage />
    </FluentProvider>
  )
}
