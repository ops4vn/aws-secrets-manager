import { useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  ClipboardCopy,
  Eye,
  EyeOff,
  WrapText,
  Save,
  X,
  Download,
  AlertCircle,
} from "lucide-react";

type Props = {
  label?: string;
  isActiveProd: boolean;
  viewText: string | null;
  isEditing: boolean;
  isBinary: boolean;
  content: string;
  canExport: boolean;
  onExport: () => void;
  wrap: boolean;
  setWrap: (v: boolean) => void;
  isDecoded: boolean;
  setIsDecoded: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  showSaveCancel: boolean;
  isValidBase64: (s: string) => boolean;
};

export function EditorToolbar({
  label = "Secret content:",
  isActiveProd,
  viewText,
  isEditing,
  isBinary,
  content,
  canExport,
  onExport,
  wrap,
  setWrap,
  isDecoded,
  setIsDecoded,
  onSave,
  onCancel,
  showSaveCancel,
  isValidBase64,
}: Props) {
  const [copyCopied, setCopyCopied] = useState(false);
  const [copyByKeyCopied, setCopyByKeyCopied] = useState(false);
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const keyPickerRef = useRef<HTMLDivElement | null>(null);
  const keyPickerButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const hasContent = (content ?? "").length > 0;

  return (
    <div className="flex items-center gap-2 mb-2 relative">
      <span className="opacity-70">{label}</span>
      {isActiveProd && (
        <span className="badge bg-error text-white badge-sm font-bold flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          PROD SECRET !!!
        </span>
      )}
      {viewText && (
        <span className="badge badge-ghost badge-sm ml-2">{viewText}</span>
      )}

      {hasContent && (
        <>
          <button
            className={`btn btn-xs ${copyCopied ? "btn-success" : ""}`}
            onClick={async () => {
              if (content) {
                await navigator.clipboard.writeText(content);
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

          {canExport && (
            <button
              className="btn btn-xs"
              onClick={onExport}
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
          title={isDecoded ? "Show encoded (base64)" : "Show decoded (text)"}
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
            <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
          )}
          {copyByKeyCopied ? "Copied" : "Copy by key"}
        </button>
      )}

      {!isEditing && hasContent && (
        <button
          className={`btn btn-xs ${wrap ? "btn-success" : ""}`}
          onClick={() => setWrap(!wrap)}
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
                  return <li className="px-3 py-2 opacity-60">No keys</li>;
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
                      <span className="truncate max-w-48">{path}</span>
                    </button>
                  </li>
                ));
              } catch {
                return <li className="px-3 py-2 opacity-60">Invalid JSON</li>;
              }
            })()}
          </ul>
        </div>
      )}

      {showSaveCancel && (
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
  );
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
        const v = (obj as any)[k];
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

export default EditorToolbar;
