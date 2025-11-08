import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { Upload, ClipboardCopy, Download } from "lucide-react";
import { isValidBase64 } from "./utils/base64Utils";
import { useProfileStore } from "../store/useProfileStore";
import { useEditorStore } from "../store/useEditorStore";
import { useLogsStore } from "../store/useLogsStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile, readFile } from "@tauri-apps/plugin-fs";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { EditorTabs } from "./editor/EditorTabs";
import { EditorToolbar } from "./editor/EditorToolbar";
import { BinaryImportPanel } from "./editor/BinaryImportPanel";
import { BinaryTooLargePanel } from "./editor/BinaryTooLargePanel";
import { HighlightedContent } from "./editor/HighlightedContent";
import { Modal } from "./components/Modal";
import { Button } from "./components/Button";
import { generateArgoCDExternalSecretTemplate } from "./utils/argocdTemplateUtils";
import type { EditorTab } from "./types";

export function EditorPanel() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { pushSuccess, pushError } = useLogsStore();
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
    startCreateNew: startCreateNewEditor,
    setEditorContent,
    setIsBinary,
    setImportedBinary,
    importedBinary,
    bindEvents,
  } = useEditorStore();

  // Dark themes that should use oneDark theme for CodeMirror
  const DARK_THEMES = ["dark", "dracula", "dim"];

  const checkIsDarkTheme = (): boolean => {
    if (typeof document === "undefined") return false;
    const theme = document.documentElement?.dataset?.theme;
    if (!theme) return false;
    
    // Check if theme is in dark themes list
    if (DARK_THEMES.includes(theme)) return true;
    
    // Fallback: check color-scheme CSS property
    const computedStyle = window.getComputedStyle(document.documentElement);
    const colorScheme = computedStyle.colorScheme;
    return colorScheme === "dark";
  };

  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(checkIsDarkTheme());
  const [wrap, setWrap] = useState<boolean>(false);
  const [isDecoded, setIsDecoded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [createArgoCDSecret, setCreateArgoCDSecret] = useState<boolean>(true);
  const [showArgoCDTemplateModal, setShowArgoCDTemplateModal] = useState<boolean>(false);
  const [argocdTemplate, setArgoCDTemplate] = useState<string>("");
  const isProcessingFileRef = useRef<boolean>(false);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const handler = () => {
      setIsDarkTheme(checkIsDarkTheme());
    };
    const observer = new MutationObserver(handler);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    handler();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    bindEvents();
  }, [bindEvents]);

  // Focus editor and set cursor position when creating new secret
  useEffect(() => {
    if (isCreatingNew && content === '{\n  ""\n}') {
      const cursorPos = 5;
      const timeoutId = setTimeout(() => {
        if (editorViewRef.current) {
          editorViewRef.current.focus();
          const { state } = editorViewRef.current;
          const transaction = state.update({
            selection: { anchor: cursorPos, head: cursorPos }
          });
          editorViewRef.current.dispatch(transaction);
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isCreatingNew, content]);

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

  const getTabDisplayName = (
    secretId: string,
    allTabs: EditorTab[]
  ): string => {
    if (secretId.includes("/")) {
      const parts = secretId.split("/");
      const lastSegment = parts[parts.length - 1];
      const sameLastSegment = allTabs.filter(
        (t) => t.secretId.split("/").pop() === lastSegment
      );
      if (sameLastSegment.length > 1) {
        const commonPrefix = findCommonPrefix(
          sameLastSegment.map((t) => t.secretId)
        );
        if (commonPrefix && secretId.startsWith(commonPrefix)) {
          return secretId.slice(commonPrefix.length).replace(/^\//, "");
        }
        if (parts.length >= 2) {
          return `${parts[parts.length - 2]}/${lastSegment}`;
        }
      }
      return lastSegment;
    }
    return secretId;
  };

  const findCommonPrefix = (strings: string[]): string | null => {
    if (strings.length === 0) return null;
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (!strings[i].startsWith(prefix) && prefix.length > 0) {
        prefix = prefix.slice(0, -1);
      }
      if (prefix.length === 0) return null;
    }
    const lastSlash = prefix.lastIndexOf("/");
    if (lastSlash > 0) {
      return prefix.substring(0, lastSlash + 1);
    }
    return null;
  };

  const isProdSecret = (secretId: string): boolean => {
    return /prod/i.test(secretId);
  };

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
        const template = generateArgoCDExternalSecretTemplate(
          currentSecretId,
          currentIsBinary,
          currentImportedBinary?.name
        );
        setArgoCDTemplate(template);
        setShowArgoCDTemplateModal(true);
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

  const handleStartCreateNew = () => {
    setCreateArgoCDSecret(false);
    startCreateNewEditor();
  };

  const handleExportArgoCDTemplate = async () => {
    if (!argocdTemplate) return;
    
    try {
      const secretId = useEditorStore.getState().secretId;
      const baseFileName = secretId ? `${secretId.replace(/\//g, "_")}-external-secret` : "external-secret";
      const fileName = `${baseFileName}.yaml`;
      
      const filePath = await save({
        defaultPath: fileName,
        filters: [
          { name: "YAML Files", extensions: ["yaml"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (filePath) {
        // Đảm bảo file path có đuôi .yaml
        const finalPath = filePath.endsWith(".yaml") ? filePath : `${filePath}.yaml`;
        await writeTextFile(finalPath, argocdTemplate);
        pushSuccess(`Exported ArgoCD template to ${finalPath}`);
      }
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
      pushError(`Failed to export ArgoCD template: ${errorMsg}`);
      console.error("Failed to export ArgoCD template:", error);
    }
  };

  const handleCopyArgoCDTemplate = async () => {
    if (!argocdTemplate) return;
    
    try {
      await navigator.clipboard.writeText(argocdTemplate);
      pushSuccess("Copied ArgoCD template to clipboard");
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
      pushError(`Failed to copy ArgoCD template: ${errorMsg}`);
      console.error("Failed to copy ArgoCD template:", error);
    }
  };

  const handleFileImport = useCallback(async (filePath: string) => {
    if (isProcessingFileRef.current) {
      return;
    }
    isProcessingFileRef.current = true;

    try {
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      let importSecretId = fileName.replace(/\.json$/, "").replace(/_/g, "/");
      let importContent = "";
      let isBin = false;

      const isJsonFile = fileName.toLowerCase().endsWith(".json");
      
      if (isJsonFile) {
        try {
          const text = await readTextFile(filePath);
          try {
            const data = JSON.parse(text);
            importSecretId = (data?.secretId as string) || importSecretId;
            if (
              data &&
              typeof data === "object" &&
              ("content" in data || "value" in data)
            ) {
              const raw = (data as any).content ?? (data as any).value;
              importContent =
                typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
              isBin = false;
            } else {
              importContent = JSON.stringify(data, null, 2);
              isBin = false;
            }
          } catch {
            // Not valid JSON, treat as binary
            const binaryData = await readFile(filePath);
            const bytes = new Uint8Array(binaryData);
            let binary = "";
            for (let i = 0; i < bytes.length; i++)
              binary += String.fromCharCode(bytes[i]);
            importContent = btoa(binary);
            isBin = true;
          }
        } catch {
          // Read as binary if text read fails
          const binaryData = await readFile(filePath);
          const bytes = new Uint8Array(binaryData);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          importContent = btoa(binary);
          isBin = true;
        }
      } else {
        // Binary file
        const binaryData = await readFile(filePath);
        const bytes = new Uint8Array(binaryData);
        let binary = "";
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i]);
        importContent = btoa(binary);
        isBin = true;
      }

      handleStartCreateNew();
      setSecretId(importSecretId);
      if (isBin) {
        // Get file size
        const binaryData = await readFile(filePath);
        setImportedBinary({
          name: fileName,
          size: binaryData.length,
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
      console.error("Failed to import file:", error);
    } finally {
      isProcessingFileRef.current = false;
    }
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let lastDropTime = 0;
    const DROP_DEBOUNCE_MS = 500;
    
    const setupFileDrop = async () => {
      const unlisten = await appWindow.onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          setIsDragging(true);
        } else if (event.payload.type === 'drop') {
          setIsDragging(false);
          const filePaths = event.payload.paths;
          if (filePaths.length === 0) return;
          
          const now = Date.now();
          if (now - lastDropTime < DROP_DEBOUNCE_MS) {
            return;
          }
          lastDropTime = now;
          
          const filePath = filePaths[0];
          handleFileImport(filePath);
        } else if (event.payload.type === 'leave') {
          setIsDragging(false);
        }
      });

      return unlisten;
    };

    let cleanup: (() => void) | null = null;
    setupFileDrop().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [handleFileImport]);

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
          ) : isEditing ? (
            <div className="border border-base-300 rounded-md overflow-hidden flex-1 min-h-0">
              <CodeMirror
                value={content}
                height="100%"
                theme={isDarkTheme ? oneDark : undefined}
                extensions={
                  [isBinary ? [] : jsonLang(), EditorView.lineWrapping] as any
                }
                basicSetup={{
                  lineNumbers: true,
                  autocompletion: true,
                  foldGutter: true,
                }}
                onChange={(val) => onChange(val)}
                onCreateEditor={(view) => {
                  editorViewRef.current = view;
                }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <HighlightedContent
                content={content}
                wrap={wrap}
                isBinary={isBinary}
                isDecoded={isDecoded}
              />
            </div>
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
      <Modal
        open={showArgoCDTemplateModal}
        onClose={() => setShowArgoCDTemplateModal(false)}
        title="ArgoCD External Secret Template"
        size="lg"
        actions={
          <>
            <Button
              onClick={handleCopyArgoCDTemplate}
              title="Copy template to clipboard"
            >
              <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button
              variant="primary"
              onClick={handleExportArgoCDTemplate}
              title="Export template to YAML file"
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowArgoCDTemplateModal(false)}
            >
              Close
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm opacity-70 mb-2">
            ArgoCD External Secret template for your secret:
          </p>
          <pre className="bg-base-200 p-3 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
            {argocdTemplate}
          </pre>
        </div>
      </Modal>
    </div>
  );
}
