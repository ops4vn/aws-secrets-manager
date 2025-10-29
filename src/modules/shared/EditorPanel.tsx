import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  ClipboardCopy,
  Save,
  X,
  WrapText,
  ClipboardList,
  ClipboardCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import { decodeBase64, isValidBase64 } from "./utils/base64Utils";
import { useDashboardStore } from "../store/useDashboardStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export function EditorPanel() {
  const {
    tabs,
    activeTabId,
    editorContent: content,
    setEditorContent: onChange,
    isEditing,
    isCreatingNew,
    isBinary,
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const keyPickerRef = useRef<HTMLDivElement | null>(null);
  const keyPickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    typeof document !== "undefined" &&
      document.documentElement?.dataset?.theme === "dark"
  );
  const [wrap, setWrap] = useState<boolean>(false);
  const [showKeyPicker, setShowKeyPicker] = useState<boolean>(false);
  const [copyByKeyCopied, setCopyByKeyCopied] = useState<boolean>(false);
  const [copyCopied, setCopyCopied] = useState<boolean>(false);
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

  // Close key picker when clicking outside
  useEffect(() => {
    if (!showKeyPicker) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        keyPickerRef.current &&
        !keyPickerRef.current.contains(target) &&
        keyPickerButtonRef.current &&
        !keyPickerButtonRef.current.contains(target)
      ) {
        setShowKeyPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showKeyPicker]);

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
  const hasContent = (content ?? "").length > 0;
  const highlighted = useMemo(() => {
    if (isEditing) return null;
    if (!content) return null;
    try {
      const parsed = JSON.parse(content);
      const pretty = JSON.stringify(parsed, null, 2);
      return (
        <pre
          className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${
            wrap ? "whitespace-pre-wrap break-words" : ""
          }`}
        >
          {renderJsonHighlighted(pretty)}
        </pre>
      );
    } catch {}
    if (isBinary) {
      // If it's binary and valid base64, show decoded/encoded based on toggle
      if (isValidBase64(content)) {
        if (isDecoded) {
          try {
            const decodedContent = decodeBase64(content);
            return (
              <pre
                className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${
                  wrap ? "whitespace-pre-wrap break-words" : ""
                }`}
              >
                {decodedContent}
              </pre>
            );
          } catch (error) {
            return (
              <pre
                className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm text-error ${
                  wrap ? "whitespace-pre-wrap break-words" : ""
                }`}
              >
                Error decoding base64:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </pre>
            );
          }
        } else {
          // Show encoded (base64) with chunking for better readability
          return (
            <pre
              className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-xs leading-5 ${
                wrap ? "whitespace-pre-wrap break-words" : ""
              }`}
            >
              {chunkBase64(content).map((seg, idx) => (
                <span
                  key={idx}
                  className={
                    idx % 2 === 0 ? "text-primary" : "text-base-content/70"
                  }
                >
                  {seg}
                </span>
              ))}
            </pre>
          );
        }
      } else {
        // Not valid base64, show as regular binary
        return (
          <pre
            className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-xs leading-5 ${
              wrap ? "whitespace-pre-wrap break-words" : ""
            }`}
          >
            {chunkBase64(content).map((seg, idx) => (
              <span
                key={idx}
                className={
                  idx % 2 === 0 ? "text-primary" : "text-base-content/70"
                }
              >
                {seg}
              </span>
            ))}
          </pre>
        );
      }
    }
    return (
      <pre
        className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${
          wrap ? "whitespace-pre-wrap break-words" : ""
        }`}
      >
        {content}
      </pre>
    );
  }, [content, isEditing, isBinary, wrap, isDecoded]);

  // Helper to get display name for tab (last segment or unique part)
  const getTabDisplayName = (
    secretId: string,
    allTabs: typeof tabs
  ): string => {
    // If it's a path, use last segment
    if (secretId.includes("/")) {
      const parts = secretId.split("/");
      const lastSegment = parts[parts.length - 1];

      // Check if there are multiple tabs with same last segment
      const sameLastSegment = allTabs.filter(
        (t) => t.secretId.split("/").pop() === lastSegment
      );

      // If multiple tabs share last segment, show more context
      if (sameLastSegment.length > 1) {
        // Try to find unique suffix
        const commonPrefix = findCommonPrefix(
          sameLastSegment.map((t) => t.secretId)
        );
        if (commonPrefix && secretId.startsWith(commonPrefix)) {
          return secretId.slice(commonPrefix.length).replace(/^\//, "");
        }
        // Show last 2 segments if needed
        if (parts.length >= 2) {
          return `${parts[parts.length - 2]}/${lastSegment}`;
        }
      }

      return lastSegment;
    }
    return secretId;
  };

  // Helper to find common prefix
  const findCommonPrefix = (strings: string[]): string | null => {
    if (strings.length === 0) return null;
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (!strings[i].startsWith(prefix) && prefix.length > 0) {
        prefix = prefix.slice(0, -1);
      }
      if (prefix.length === 0) return null;
    }
    // Ensure prefix ends at a path boundary
    const lastSlash = prefix.lastIndexOf("/");
    if (lastSlash > 0) {
      return prefix.substring(0, lastSlash + 1);
    }
    return null;
  };

  // Check if secret name contains "prod" (case insensitive)
  const isProdSecret = (secretId: string): boolean => {
    return /prod/i.test(secretId);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isActiveProd = activeTab ? isProdSecret(activeTab.secretId) : false;

  // Export secret to JSON file
  const handleExport = async () => {
    if (!activeTab || !content) return;

    try {
      // Parse content to JSON object if it's valid JSON, otherwise export as-is
      let exportContent: string;
      if (!activeTab.isBinary) {
        try {
          const parsed = JSON.parse(content);
          // If parsing succeeds, export the parsed JSON object
          exportContent = JSON.stringify(parsed, null, 2);
        } catch {
          // If not valid JSON, export the content as text
          exportContent = content;
        }
      } else {
        // For binary, export the base64 content as-is
        exportContent = content;
      }

      // Show save dialog
      const filePath = await save({
        defaultPath: `${activeTab.secretId.replace(/\//g, "_")}.json`,
        filters: [
          {
            name: "JSON Files",
            extensions: ["json"],
          },
          {
            name: "All Files",
            extensions: ["*"],
          },
        ],
      });

      if (filePath) {
        // Write file to selected path - only the content, no metadata
        await writeTextFile(filePath, exportContent);
        // Could show success notification here
      }
    } catch (error) {
      console.error("Failed to export secret:", error);
      // Could show error notification here
    }
  };

  // Handle drag and drop for import
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
      // Determine if file is JSON
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
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          importContent = btoa(binary);
          isBin = true;
        }
      } else {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i]);
        importContent = btoa(binary);
        isBin = true;
      }

      // Switch to create/edit mode first (before setting content)
      startCreateNew();

      // Then set the content and secret ID
      setSecretId(importSecretId);
      if (isBin) {
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

      // Focus secret ID input after a short delay
      setTimeout(() => {
        const secretIdInput = document.querySelector(
          'input[placeholder="my/app/secret"]'
        ) as HTMLInputElement;
        secretIdInput?.focus();
        secretIdInput?.select();
      }, 100);
    } catch (error) {
      console.error("Failed to import JSON:", error);
      // Could add error notification here
    }
  };

  return (
    <div
      className="p-4 overflow-hidden h-full flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
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

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 mb-2 overflow-x-auto border-b border-base-300 pb-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-1 rounded-t cursor-pointer border-b-2 transition-colors ${
                tab.id === activeTabId
                  ? "bg-base-200 border-primary text-primary"
                  : "hover:bg-base-100 border-transparent"
              }`}
              onClick={() => switchTab(tab.id)}
              title={tab.secretId}
              onAuxClick={(e) => {
                // Middle-click closes the tab and ignores unsaved changes
                if ((e as React.MouseEvent).button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(tab.id);
                }
              }}
            >
              <span
                className={`text-sm whitespace-nowrap max-w-[200px] truncate ${
                  isProdSecret(tab.secretId) ? "text-error font-bold" : ""
                }`}
              >
                {getTabDisplayName(tab.secretId, tabs)}
              </span>
              <button
                className="btn btn-ghost btn-xs h-4 w-4 min-h-0 p-0 hover:bg-error hover:text-error-content"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(activeTabId || isCreatingNew) && (
        <>
          <div className="flex items-center gap-2 mb-2 relative">
            <span className="opacity-70">Secret content:</span>
            {isActiveProd && (
              <span className="badge badge-error badge-sm font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                PROD SECRET! PLEASE BE CAREFUL!
              </span>
            )}
            {viewText && (
              <span className="badge badge-ghost badge-sm ml-2">
                {viewText}
              </span>
            )}
            {hasContent && (
              <>
                <button
                  className={`btn btn-xs ${copyCopied ? "btn-success" : ""}`}
                  onClick={async () => {
                    const text =
                      isEditing && textareaRef.current
                        ? textareaRef.current.value
                        : content;
                    if (text) {
                      await navigator.clipboard.writeText(text);
                      setCopyCopied(true);
                      window.setTimeout(() => setCopyCopied(false), 1500);
                    }
                  }}
                >
                  {copyCopied ? (
                    <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {copyCopied ? "Copied" : "Copy"}
                </button>
                {activeTab && (
                  <button
                    className="btn btn-xs"
                    onClick={handleExport}
                    title="Export secret to JSON file"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Export
                  </button>
                )}
              </>
            )}
            {hasContent && isBinary && isValidBase64(content) && (
              <button
                className={`btn btn-xs ${isDecoded ? "btn-info" : ""}`}
                onClick={() => setIsDecoded(!isDecoded)}
                title={
                  isDecoded ? "Show encoded (base64)" : "Show decoded (text)"
                }
              >
                {isDecoded ? (
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Eye className="h-3.5 w-3.5 mr-1" />
                )}
                {isDecoded ? "Encoded" : "Decoded"}
              </button>
            )}
            {!isEditing && !isBinary && hasContent && (
              <button
                ref={keyPickerButtonRef}
                className={`btn btn-xs ${copyByKeyCopied ? "btn-success" : ""}`}
                onClick={() => {
                  setShowKeyPicker((s) => !s);
                  if (copyByKeyCopied) setCopyByKeyCopied(false);
                }}
                title="Copy by key"
              >
                {copyByKeyCopied ? (
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <ClipboardList className="h-3.5 w-3.5 mr-1" />
                )}
                {copyByKeyCopied ? "Copied" : "Copy by key"}
              </button>
            )}
            {!isEditing && hasContent && (
              <button
                className={`btn btn-xs ${wrap ? "btn-success" : ""}`}
                onClick={() => setWrap((w) => !w)}
                title="Toggle wrap lines"
              >
                <WrapText className="h-3.5 w-3.5 mr-1" /> Wrap lines
              </button>
            )}
            {!isEditing && !isBinary && hasContent && showKeyPicker && (
              <div
                ref={keyPickerRef}
                className="absolute z-20 top-8 left-40 w-80 max-h-64 overflow-auto bg-base-100 border border-base-300 rounded-md shadow"
              >
                <div className="p-2 text-xs opacity-70">
                  Select a key to copy its value
                </div>
                <ul className="menu menu-sm">
                  {(() => {
                    try {
                      const parsed = JSON.parse(content);
                      const items = extractJsonPaths(parsed).slice(0, 200);
                      if (items.length === 0)
                        return (
                          <li className="px-3 py-2 opacity-60">No keys</li>
                        );
                      return items.map(({ path, value }, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(value);
                              setShowKeyPicker(false);
                              setCopyByKeyCopied(true);
                              window.setTimeout(
                                () => setCopyByKeyCopied(false),
                                1500
                              );
                            }}
                            className="justify-start"
                            title={value}
                          >
                            <span className="truncate max-w-[12rem]">
                              {path}
                            </span>
                          </button>
                        </li>
                      ));
                    } catch {
                      return (
                        <li className="px-3 py-2 opacity-60">Invalid JSON</li>
                      );
                    }
                  })()}
                </ul>
              </div>
            )}

            {isEditing && !importedBinary && (
              <div className="ml-auto flex items-center gap-2">
                <button className="btn btn-success btn-sm" onClick={onSave}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </button>
                <button className="btn btn-ghost btn-sm" onClick={onCancel}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </button>
              </div>
            )}
          </div>

          {isEditing && importedBinary ? (
            <div className="border border-base-300 rounded-md p-4 bg-base-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Binary file to upload</div>
                  <div className="text-sm opacity-80 mt-1">
                    <span className="mr-3">Name: {importedBinary.name}</span>
                    <span>
                      Size: {(importedBinary.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-success btn-sm" onClick={onSave}>
                    <Save className="h-4 w-4 mr-1" /> Push secret
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setImportedBinary(null);
                      setIsBinary(false);
                      onCancel();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs opacity-70">
                The binary will be uploaded as base64-decoded bytes to AWS
                Secrets Manager.
              </div>
            </div>
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
            <div className="flex-1 min-h-0">{highlighted}</div>
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
    </div>
  );
}

function renderJsonHighlighted(json: string) {
  const lines = json.split("\n");
  return (
    <code className="block font-mono">
      {lines.map((line, i) => (
        <div key={i}>{highlightJsonLine(line)}</div>
      ))}
    </code>
  );
}

function highlightJsonLine(line: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex =
    /(\s*".*?"\s*:)|(\".*?\")|(-?\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
  for (let m; (m = regex.exec(line)); ) {
    if (m.index > lastIndex) {
      parts.push(
        <span key={parts.length}>{line.slice(lastIndex, m.index)}</span>
      );
    }
    const key = m[1];
    const str = m[2];
    const num = m[3];
    const boolnull = m[4];
    if (key)
      parts.push(
        <span key={parts.length} className="text-sky-600">
          {key}
        </span>
      );
    else if (str)
      parts.push(
        <span key={parts.length} className="text-emerald-600">
          {str}
        </span>
      );
    else if (num)
      parts.push(
        <span key={parts.length} className="text-amber-600">
          {num}
        </span>
      );
    else if (boolnull)
      parts.push(
        <span key={parts.length} className="text-fuchsia-600">
          {boolnull}
        </span>
      );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length)
    parts.push(<span key={parts.length}>{line.slice(lastIndex)}</span>);
  return parts;
}

function chunkBase64(s: string) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 4) out.push(s.slice(i, i + 4));
  return out;
}

type JsonPathItem = { path: string; value: string };
function extractJsonPaths(obj: any, prefix: string = ""): JsonPathItem[] {
  const items: JsonPathItem[] = [];
  if (obj !== null && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => {
        items.push(...extractJsonPaths(v, `${prefix}[${i}]`));
      });
    } else {
      Object.keys(obj).forEach((k) => {
        const p = prefix ? `${prefix}.${k}` : k;
        const v = obj[k];
        if (v !== null && typeof v === "object") {
          items.push(...extractJsonPaths(v, p));
        } else {
          items.push({ path: p, value: String(v) });
        }
      });
    }
  } else {
    items.push({ path: prefix || "$", value: String(obj) });
  }
  return items;
}
