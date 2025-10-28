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
} from "lucide-react";

type Props = {
  content: string;
  onChange: (v: string) => void;
  isEditing: boolean;
  isBinary?: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function EditorPanel({
  content,
  onChange,
  isEditing,
  isBinary = false,
  onSave,
  onCancel,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    typeof document !== "undefined" &&
      document.documentElement?.dataset?.theme === "dark"
  );
  const [wrap, setWrap] = useState<boolean>(false);
  const [showKeyPicker, setShowKeyPicker] = useState<boolean>(false);
  const [copyByKeyCopied, setCopyByKeyCopied] = useState<boolean>(false);

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
    if (isBinary) return "Base64 view";
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
    return (
      <pre
        className={`overflow-auto max-h-[48vh] p-3 rounded-md bg-base-100 border border-base-300 text-sm ${
          wrap ? "whitespace-pre-wrap break-words" : ""
        }`}
      >
        {content}
      </pre>
    );
  }, [content, isEditing, isBinary, wrap]);
  return (
    <div className="p-4 overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 relative">
        <span className="opacity-70">Secret content:</span>
        {viewText && (
          <span className="badge badge-ghost badge-sm ml-2">{viewText}</span>
        )}
        {hasContent && (
          <button
            className="btn btn-xs"
            onClick={() => {
              const text =
                isEditing && textareaRef.current
                  ? textareaRef.current.value
                  : content;
              if (text) navigator.clipboard.writeText(text);
            }}
          >
            <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy
          </button>
        )}
        {!isEditing && !isBinary && hasContent && (
          <>
            <button
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
            <button
              className={`btn btn-xs ${wrap ? "btn-success" : ""}`}
              onClick={() => setWrap((w) => !w)}
              title="Toggle wrap lines"
            >
              <WrapText className="h-3.5 w-3.5 mr-1" /> Wrap lines
            </button>
            {showKeyPicker && (
              <div className="absolute z-20 top-8 left-40 w-80 max-h-64 overflow-auto bg-base-100 border border-base-300 rounded-md shadow">
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
          </>
        )}

        {isEditing && (
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

      {isEditing ? (
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
