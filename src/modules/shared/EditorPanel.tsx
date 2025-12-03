import { useEffect, useMemo, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { Upload } from "lucide-react";
import { isValidBase64 } from "./utils/base64Utils";
import { useProfileStore } from "../store/useProfileStore";
import { useEditorStore } from "../store/useEditorStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { EditorTabs } from "./editor/EditorTabs";
import { EditorToolbar } from "./editor/EditorToolbar";
import { BinaryImportPanel } from "./editor/BinaryImportPanel";
import { BinaryTooLargePanel } from "./editor/BinaryTooLargePanel";
import { EditorContent } from "./editor/EditorContent";
import { ArgoCDTemplateModal } from "./components/ArgoCDTemplateModal";
import { useDarkTheme } from "./hooks/useDarkTheme";
import { useEditorFocus } from "./hooks/useEditorFocus";
import { useFileImport } from "./hooks/useFileImport";
import { useArgoCDTemplate } from "./hooks/useArgoCDTemplate";
import { getTabDisplayName, isProdSecret } from "./utils/tabDisplayUtils";
import { useLogsStore } from "../store/useLogsStore";
import { useSecretsListStore } from "../store/useSecretsListStore";
import { api } from "../services/tauriApi";
import { Modal } from "./components/Modal";
import { Button } from "./components/Button";

export function EditorPanel() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const {
    tabs,
    activeTabId,
    editorContent: content,
    setEditorContent: onChange,
    isEditing,
    isCreatingNew,
    isBinary,
    isFetchingSecret,
    fetchingSecretId,
    fetchedBinaryTooLarge,
    secretId,
    save: saveEditor,
    cancelEdit: cancelEditEditor,
    switchTab,
    closeTab,
    setSecretId,
    setIsBinary,
    setImportedBinary,
    importedBinary,
    bindEvents,
    startEdit: startEditEditor,
    startCreateNew: startCreateNewEditor,
  } = useEditorStore();

  const isDarkTheme = useDarkTheme();
  const [wrap, setWrap] = useState<boolean>(false);
  const [isDecoded, setIsDecoded] = useState<boolean>(false);
  const [createArgoCDSecret, setCreateArgoCDSecret] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const editorViewRef = useRef<EditorView | null>(null);
  
  const { isDragging } = useFileImport();
  const argocdTemplate = useArgoCDTemplate();
  const { pushInfo, pushError, pushSuccess } = useLogsStore();
  const { listSecrets, listDeletedSecrets } = useSecretsListStore();

  useEffect(() => {
    bindEvents();
  }, [bindEvents]);

  useEditorFocus(isCreatingNew, content, editorViewRef);

  const viewText = useMemo(() => {
    if (isEditing) return null as string | null;

    if (isBinary) {
      return "Binary view";
    }

    try {
      JSON.parse(content);
      return "JSON view";
    } catch {
      return "Plain view";
    }
  }, [content, isEditing, isBinary]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isActiveProd = activeTab ? isProdSecret(activeTab.secretId) : false;
  const isBinaryTooLarge =
    !!fetchedBinaryTooLarge || (activeTab?.isBinary && activeTab?.isTooLarge);

  const isEditDisabled = isEditing || !secretId || isBinaryTooLarge;
  const editDisabledReason = !secretId
    ? "Get a secret first to edit"
    : isEditing
    ? "Already in edit mode"
    : isBinaryTooLarge
    ? "Cannot edit binary secret larger than 50KB"
    : "";

  const isDeleteDisabled = isEditing || !activeTabId;
  const deleteDisabledReason = !activeTabId
    ? "Select a secret tab to delete"
    : isEditing
    ? "Cancel edit first to delete"
    : "";

  const isCloneDisabled = isEditing || !secretId || isBinaryTooLarge;
  const cloneDisabledReason = !secretId
    ? "Get a secret first to clone"
    : isEditing
    ? "Finish current edit before cloning"
    : isBinaryTooLarge
    ? "Cannot clone binary secret larger than 50KB"
    : "";

  const canCopyArgoTemplate = Boolean(secretId);
  const copyTemplateDisabledReason = canCopyArgoTemplate
    ? ""
    : "Secret ID is required to copy ArgoCD template";

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
      closeTab(activeTabId);
      setShowDeleteModal(false);
      await listSecrets(profile, true);
      await listDeletedSecrets(profile);
    } catch (error) {
      pushError(`Failed to delete secret: ${String(error)}`);
      setShowDeleteModal(false);
    }
  };

  const handleSave = async () => {
    const profile = selectedProfile ?? defaultProfile;
    const currentSecretId = useEditorStore.getState().secretId;
    const currentIsBinary = useEditorStore.getState().isBinary;
    const currentImportedBinary = useEditorStore.getState().importedBinary;
    const shouldShowTemplate = createArgoCDSecret && currentSecretId;
    
    try {
      await saveEditor(profile);
      
      // Nếu checkbox được chọn và save thành công, hiển thị template
      if (shouldShowTemplate) {
        argocdTemplate.showTemplate(
          currentSecretId,
          currentIsBinary,
          currentImportedBinary?.name
        );
      }
      
      // Reset checkbox sau khi save
      setCreateArgoCDSecret(false);
    } catch (error) {
      // Error đã được xử lý trong store
      console.error("Save failed:", error);
    }
  };

  const handleCopyArgoTemplate = async () => {
    const currentSecretId = useEditorStore.getState().secretId;
    const currentIsBinary = useEditorStore.getState().isBinary;
    const currentImportedBinary = useEditorStore.getState().importedBinary;

    await argocdTemplate.copyTemplateForSecret(
      currentSecretId,
      currentIsBinary,
      currentImportedBinary?.name
    );
  };

  const handleCloneSecret = () => {
    if (!secretId) return;

    const currentState = useEditorStore.getState();
    const currentContent = currentState.editorContent;
    const currentIsBinary = currentState.isBinary;
    const currentImportedBinary = currentState.importedBinary;

    startCreateNewEditor();

    const clonedContent =
      currentIsBinary && currentImportedBinary
        ? currentImportedBinary.base64
        : currentContent;

    onChange(clonedContent);
    setIsBinary(currentIsBinary);

    if (currentIsBinary && currentImportedBinary) {
      setImportedBinary({ ...currentImportedBinary });
    } else {
      setImportedBinary(null);
    }

    setSecretId(secretId);

    setTimeout(() => {
      const secretIdInput = document.querySelector(
        'input[placeholder="my/app/secret"]'
      ) as HTMLInputElement | null;
      secretIdInput?.focus();
      secretIdInput?.select();
    }, 100);
  };

  const handleCancel = () => {
    setCreateArgoCDSecret(false);
    cancelEditEditor();
  };

  const handleExport = async () => {
    if (!activeTab || !content) return;

    try {
      let exportContent: string;
      if (!activeTab.isBinary) {
        try {
          const parsed = JSON.parse(content);
          exportContent = JSON.stringify(parsed, null, 2);
        } catch {
          exportContent = content;
        }
      } else {
        exportContent = content;
      }

      const filePath = await save({
        defaultPath: `${activeTab.secretId.replace(/\//g, "_")}.json`,
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, exportContent);
      }
    } catch (error) {
      console.error("Failed to export secret:", error);
    }
  };

  return (
    <div
      className="p-2 overflow-hidden h-full flex flex-col relative"
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 border-4 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-lg font-bold text-primary">
              Drop JSON file here to import
            </p>
          </div>
        </div>
      )}

      {isFetchingSecret && (
        <div className="absolute inset-0 bg-base-100/70 z-40 flex items-center justify-center">
          <div className="px-4 py-3 rounded-md border border-base-300 bg-base-100 shadow flex items-center gap-3">
            <span className="loading loading-spinner loading-md" />
            <div className="text-sm">
              <div className="font-medium">Loading secret...</div>
              {fetchingSecretId && (
                <div className="opacity-70 truncate max-w-[50vw]">
                  {fetchingSecretId}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EditorTabs
        tabs={tabs}
        activeTabId={activeTabId}
        isCreatingNew={isCreatingNew}
        switchTab={switchTab}
        closeTab={closeTab}
        closeOtherTabs={useEditorStore.getState().closeOtherTabs}
        getTabDisplayName={getTabDisplayName}
        isProdSecret={isProdSecret}
      />

      {(activeTabId || isCreatingNew) && (
        <>
          <EditorToolbar
            isActiveProd={isActiveProd}
            viewText={viewText}
            isEditing={isEditing}
            isBinary={isBinary}
            content={content}
            canExport={!!activeTab}
            onExport={handleExport}
            wrap={wrap}
            setWrap={(v) => setWrap(v)}
            isDecoded={isDecoded}
            setIsDecoded={(v) => setIsDecoded(v)}
            onSave={handleSave}
            onCancel={handleCancel}
            showSaveCancel={isEditing && !importedBinary}
            isValidBase64={isValidBase64}
            createArgoCDSecret={createArgoCDSecret}
            setCreateArgoCDSecret={setCreateArgoCDSecret}
            isCreatingNew={isCreatingNew}
            onEdit={!isEditing ? startEditEditor : undefined}
            onClone={!isEditing ? handleCloneSecret : undefined}
            cloneDisabled={isCloneDisabled}
            cloneDisabledReason={cloneDisabledReason}
            editDisabled={isEditDisabled}
            editDisabledReason={editDisabledReason}
            onDelete={!isEditing ? handleDeleteClick : undefined}
            deleteDisabled={isDeleteDisabled}
            deleteDisabledReason={deleteDisabledReason}
            onCopyTemplate={handleCopyArgoTemplate}
            copyTemplateDisabled={!canCopyArgoTemplate}
            copyTemplateDisabledReason={copyTemplateDisabledReason}
          />

          {isEditing && importedBinary ? (
            <BinaryImportPanel
              name={importedBinary.name}
              size={importedBinary.size}
              onSave={handleSave}
              onCancel={() => {
                setImportedBinary(null);
                setSecretId("");
                setIsBinary(false);
                handleCancel();
              }}
              createArgoCDSecret={createArgoCDSecret}
              setCreateArgoCDSecret={setCreateArgoCDSecret}
            />
          ) : fetchedBinaryTooLarge && !isEditing ? (
            <BinaryTooLargePanel
              name={fetchedBinaryTooLarge.name}
              size={fetchedBinaryTooLarge.size}
              secretId={useEditorStore.getState().secretId}
              profile={selectedProfile ?? defaultProfile}
            />
          ) : (
            <EditorContent
              content={content}
              isEditing={isEditing}
              isBinary={isBinary}
              isDarkTheme={isDarkTheme}
              wrap={wrap}
              isDecoded={isDecoded}
              onChange={onChange}
              editorViewRef={editorViewRef}
            />
          )}
        </>
      )}

      {!activeTabId && !isCreatingNew && tabs.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-base-content/50">
          <div className="text-center">
            <p className="text-lg mb-2">No secret selected</p>
            <p className="text-sm">
              Select a secret from the list to view its content
            </p>
          </div>
        </div>
      )}

      {/* ArgoCD External Secret Template Modal */}
      <ArgoCDTemplateModal
        open={argocdTemplate.showModal}
        template={argocdTemplate.template}
        onClose={argocdTemplate.closeModal}
        onCopy={argocdTemplate.copyTemplate}
        onExport={argocdTemplate.exportTemplate}
      />

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
          Are you sure you want to delete secret{" "}
          <strong>"{secretId}"</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
