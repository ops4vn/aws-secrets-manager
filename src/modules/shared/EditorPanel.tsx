import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { Upload } from "lucide-react";
import { isValidBase64 } from "./utils/base64Utils";
import { useDashboardStore } from "../store/useDashboardStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { EditorTabs } from "./editor/EditorTabs";
import { EditorToolbar } from "./editor/EditorToolbar";
import { BinaryImportPanel } from "./editor/BinaryImportPanel";
import { BinaryTooLargePanel } from "./editor/BinaryTooLargePanel";
import { HighlightedContent } from "./editor/HighlightedContent";
import type { EditorTab } from "./types";

export function EditorPanel() {
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
    save: onSave,
    cancelEdit: onCancel,
    switchTab,
    closeTab,
    setSecretId,
    startCreateNew,
    setEditorContent,
    setIsBinary,
    setImportedBinary,
    importedBinary,
  } = useDashboardStore();
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    typeof document !== "undefined" &&
      document.documentElement?.dataset?.theme === "dark"
  );
  const [wrap, setWrap] = useState<boolean>(false);
  const [isDecoded, setIsDecoded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const handler = () => {
      setIsDarkTheme(el.dataset?.theme === "dark");
    };
    const observer = new MutationObserver(handler);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    handler();
    return () => observer.disconnect();
  }, []);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (!file) return;

    try {
      let importSecretId = file.name.replace(/\.json$/, "").replace(/_/g, "/");
      let importContent = "";
      let isBin = false;

      const isJsonFile =
        file.type === "application/json" ||
        file.name.toLowerCase().endsWith(".json");
      if (isJsonFile) {
        const text = await file.text();
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
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          importContent = btoa(binary);
          isBin = true;
        }
      } else {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        importContent = btoa(binary);
        isBin = true;
      }

      startCreateNew();
      setSecretId(importSecretId);
      if (isBin) {
        setImportedBinary({ name: file.name, size: file.size, base64: importContent });
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
  };

  return (
    <div
      className="p-4 overflow-hidden h-full flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 border-4 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-lg font-bold text-primary">Drop JSON file here to import</p>
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
                <div className="opacity-70 truncate max-w-[50vw]">{fetchingSecretId}</div>
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
            onSave={onSave}
            onCancel={onCancel}
            showSaveCancel={isEditing && !importedBinary}
            isValidBase64={isValidBase64}
          />

          {isEditing && importedBinary ? (
            <BinaryImportPanel
              name={importedBinary.name}
              size={importedBinary.size}
              onSave={onSave}
              onCancel={() => {
                setImportedBinary(null);
                setIsBinary(false);
                onCancel();
              }}
            />
          ) : fetchedBinaryTooLarge && !isEditing ? (
            <BinaryTooLargePanel
              name={fetchedBinaryTooLarge.name}
              size={fetchedBinaryTooLarge.size}
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
            <p className="text-sm">Select a secret from the list to view its content</p>
          </div>
        </div>
      )}
    </div>
  );
}
