"use client"

import { useState } from "react"
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Badge,
  Input,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@fluentui/react-components"
import { Checkmark20Regular, ChevronDown20Regular, Delete20Regular, DocumentCopy20Regular } from "@fluentui/react-icons"
import { useDocumentStore } from "../../infrastructure/store/document-store"

export function IpesVersionManager() {
  const ipesVersions = useDocumentStore((state) => state.ipesVersions)
  const currentVersionId = useDocumentStore((state) => state.currentIpesVersionId)
  const addIpesVersion = useDocumentStore((state) => state.addIpesVersion)
  const setCurrentIpesVersion = useDocumentStore((state) => state.setCurrentIpesVersion)
  const approveIpesVersion = useDocumentStore((state) => state.approveIpesVersion)
  const deleteIpesVersion = useDocumentStore((state) => state.deleteIpesVersion)
  const getCurrentIpesVersion = useDocumentStore((state) => state.getCurrentIpesVersion)

  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false)
  const [newVersionNotes, setNewVersionNotes] = useState("")

  const currentVersion = getCurrentIpesVersion()

  const handleCreateNewVersion = () => {
    if (currentVersion) {
      addIpesVersion(currentVersion.data, newVersionNotes)
      setNewVersionNotes("")
      setShowNewVersionDialog(false)
    }
  }

  const handleApproveVersion = () => {
    if (currentVersionId) {
      approveIpesVersion(currentVersionId)
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            appearance="subtle"
            icon={<ChevronDown20Regular />}
            iconPosition="after"
            style={{ minWidth: "200px", justifyContent: "space-between" }}
          >
            {currentVersion ? (
              <span>
                Versión {currentVersion.version}
                {currentVersion.isApproved && (
                  <Badge appearance="filled" color="success" style={{ marginLeft: "8px" }}>
                    Aprobada
                  </Badge>
                )}
              </span>
            ) : (
              "Sin versión"
            )}
          </Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {ipesVersions.map((version) => (
              <MenuItem
                key={version.id}
                onClick={() => setCurrentIpesVersion(version.id)}
                icon={version.isApproved ? <Checkmark20Regular /> : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>Versión {version.version}</span>
                  {version.isApproved && (
                    <Badge appearance="filled" color="success" size="small">
                      Aprobada
                    </Badge>
                  )}
                  {version.notes && <span style={{ fontSize: "12px", color: "#666" }}>- {version.notes}</span>}
                </div>
              </MenuItem>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>

      <Button
        appearance="primary"
        icon={<DocumentCopy20Regular />}
        onClick={() => setShowNewVersionDialog(true)}
        disabled={!currentVersion}
      >
        Nueva Versión
      </Button>

      <Button
        appearance="primary"
        icon={<Checkmark20Regular />}
        onClick={handleApproveVersion}
        disabled={!currentVersion || currentVersion.isApproved}
        style={{
          backgroundColor: currentVersion?.isApproved ? "#107c10" : undefined,
        }}
      >
        {currentVersion?.isApproved ? "Aprobada" : "Aprobar Versión"}
      </Button>

      {currentVersion && !currentVersion.isApproved && ipesVersions.length > 1 && (
        <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => deleteIpesVersion(currentVersionId!)}>
          Eliminar
        </Button>
      )}

      <Dialog open={showNewVersionDialog} onOpenChange={(_, data) => setShowNewVersionDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Crear Nueva Versión de IPES</DialogTitle>
            <DialogContent>
              <div style={{ marginTop: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                  Notas de la versión (opcional)
                </label>
                <Input
                  value={newVersionNotes}
                  onChange={(e, data) => setNewVersionNotes(data.value)}
                  placeholder="Ej: Correcciones de revisión 1"
                  style={{ width: "100%" }}
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowNewVersionDialog(false)}>
                Cancelar
              </Button>
              <Button appearance="primary" onClick={handleCreateNewVersion}>
                Crear Versión
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
