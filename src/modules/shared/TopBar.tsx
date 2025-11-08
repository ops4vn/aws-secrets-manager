import { Edit3, LockOpen, Plus, Upload, Trash2 } from "lucide-react";
// import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { useProfileStore } from "../store/useProfileStore";
import { useEditorStore } from "../store/useEditorStore";
import { useRef, useState } from "react";
import { api } from "../services/tauriApi";
import { useLogsStore } from "../store/useLogsStore";
import { useSecretsListStore } from "../store/useSecretsListStore";
import { Modal } from "./components/Modal";
import { Input } from "./components/Input";
import { Button } from "./components/Button";

export function TopBar() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const {
    secretId,
    setSecretId,
    isEditing,
    isCreatingNew,
    activeTabId,
    closeTab,
    fetchSecretById,
    startEdit: startEditEditor,
    startCreateNew: startCreateNewEditor,
    setEditorContent,
    setIsBinary,
    setImportedBinary,
  } = useEditorStore();
  const { pushInfo, pushError, pushSuccess } = useLogsStore();
  const { listSecrets, listDeletedSecrets } = useSecretsListStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Determine if file is JSON
      let importSecretId = file.name.replace(/\.json$/, "").replace(/_/g, "/");
      let importContent = "";
      let isBinary = false;

      const isJsonFile =
        file.type === "application/json" ||
        file.name.toLowerCase().endsWith(".json");
      if (isJsonFile) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          // Extract secret ID and content
          importSecretId = (data?.secretId as string) || importSecretId;
          if (
            data &&
            typeof data === "object" &&
            ("content" in data || "value" in data)
          ) {
            const raw = (data as any).content ?? (data as any).value;
            importContent =
              typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
            isBinary = false;
          } else {
            // New format: entire JSON is the content
            importContent = JSON.stringify(data, null, 2);
            isBinary = false;
          }
        } catch {
          // Not valid JSON despite extension/MIME, treat as binary
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          importContent = btoa(binary);
          isBinary = true;
        }
      } else {
        // Binary file → base64 encode
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i]);
        importContent = btoa(binary);
        isBinary = true;
      }

      // Switch to create/edit mode first (before setting content)
      startCreateNewEditor();

      // Then set the content and secret IDs
      setSecretId(importSecretId);
      if (isBinary) {
        setImportedBinary({
          name: file.name,
          size: file.size,
          base64: importContent,
        });
        setIsBinary(true);
        setEditorContent("");
      } else {
        setImportedBinary(null);
        setIsBinary(false);
        setEditorContent(importContent);
      }

      setTimeout(() => {
        const secretIdInput = document.querySelector(
          'input[placeholder="my/app/secret"]'
        ) as HTMLInputElement;
        secretIdInput?.focus();
        secretIdInput?.select();
      }, 100);
    } catch (error) {
      console.error("Failed to import JSON:", error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteClick = () => {
    if (!activeTabId || !secretId) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!activeTabId || !secretId) return;
    
    const profile = selectedProfile ?? defaultProfile;
    if (!profile) {
      pushError("No profile selected");
      setShowDeleteModal(false);
      return;
    }

    try {
      pushInfo(`Deleting secret: ${secretId}`);
      await api.deleteSecret(profile, secretId);
      pushSuccess(`Deleted secret: ${secretId}`);
      
      // Close the tab after deletion
      closeTab(activeTabId);
      setShowDeleteModal(false);
      
      // Force reload secrets list và deleted secrets
      await listSecrets(profile, true);
      await listDeletedSecrets(profile);
    } catch (error) {
      pushError(`Failed to delete secret: ${String(error)}`);
      setShowDeleteModal(false);
    }
  };
  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4 gap-4">
      <div className="flex flex-1 items-center gap-3">
        <span className="whitespace-nowrap">Secret ID:</span>
        <Input
          size="sm"
          value={secretId}
          onChange={(e) => setSecretId(e.target.value)}
          placeholder="my/app/secret"
          className="w-full max-w-xl"
        />

        {isCreatingNew && (
          <div
            className="btn btn-success btn-xs normal-case ml-2"
            title="Create mode"
          >
            <span className="w-2 h-2 rounded-full bg-white/80 mr-2"></span>
            Create mode
          </div>
        )}
        {!isCreatingNew && isEditing && (
          <div
            className="btn btn-error btn-xs normal-case ml-2"
            title="Edit mode"
          >
            <span className="w-2 h-2 rounded-full bg-white/80 mr-2"></span>
            Edit mode
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={isEditing}
          title={isEditing ? "Cancel edit first to prevent data loss" : ""}
          onClick={() => {
            const profile = selectedProfile ?? defaultProfile;
            fetchSecretById(secretId, profile);
          }}
        >
          <LockOpen className="h-4 w-4 mr-1" /> Get Secret
        </Button>
        <Button
          size="sm"
          disabled={isEditing || !secretId}
          title={
            !secretId
              ? "Get a secret first to edit"
              : isEditing
              ? "Already in edit mode"
              : ""
          }
          onClick={() => startEditEditor()}
        >
          <Edit3 className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button
          size="sm"
          variant="error"
          disabled={isEditing || !activeTabId}
          title={
            !activeTabId
              ? "Select a secret tab to delete"
              : isEditing
              ? "Cancel edit first to delete"
              : ""
          }
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
        <Button
          size="sm"
          disabled={isEditing}
          title={isEditing ? "Finish current edit first" : ""}
          onClick={() => startCreateNewEditor()}
        >
          <Plus className="h-4 w-4 mr-1" /> New Secret
        </Button>
        <Button
          size="sm"
          disabled={isEditing}
          title={isEditing ? "Finish current edit first" : "Import JSON file"}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" /> Import
        </Button>
        {/* <KeyboardShortcutsHelp /> */}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete secret?"
        actions={
          <>
            <Button variant="error" onClick={confirmDelete}>
              Delete
            </Button>
            <Button onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete secret <strong>"{secretId}"</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
