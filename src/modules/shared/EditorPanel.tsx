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
    save: saveEditor,
    cancelEdit: cancelEditEditor,
    switchTab,
    closeTab,
    setSecretId,
    setIsBinary,
    setImportedBinary,
    importedBinary,
    bindEvents,
  } = useEditorStore();

  const isDarkTheme = useDarkTheme();
  const [wrap, setWrap] = useState<boolean>(false);
  const [isDecoded, setIsDecoded] = useState<boolean>(false);
  const [createArgoCDSecret, setCreateArgoCDSecret] = useState<boolean>(true);
  const editorViewRef = useRef<EditorView | null>(null);
  
  const { isDragging } = useFileImport();
  const argocdTemplate = useArgoCDTemplate();

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
    </div>
  );
}
