import { useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  ClipboardCopy,
  ClipboardList,
  CopyPlus,
  Eye,
  EyeOff,
  WrapText,
  Save,
  X,
  Download,
  AlertCircle,
  Edit3,
  Trash2,
  Columns2,
  Rows2,
  Braces,
  Table,
} from "lucide-react";
import { Button } from "../components/Button";
import { extractJsonPaths } from "../utils/jsonPaths";

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
  createArgoCDSecret?: boolean;
  setCreateArgoCDSecret?: (v: boolean) => void;
  isCreatingNew?: boolean;
  onEdit?: () => void;
  onClone?: () => void;
  cloneDisabled?: boolean;
  cloneDisabledReason?: string;
  editDisabled?: boolean;
  editDisabledReason?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  onCopyTemplate?: () => void;
  copyTemplateDisabled?: boolean;
  copyTemplateDisabledReason?: string;
  diffMode?: "off" | "split" | "unified";
  onToggleDiffMode?: (mode: "split" | "unified") => void;
  diffDisabled?: boolean;
  masked?: boolean;
  onToggleMask?: () => void;
  viewMode?: "json" | "table";
  onSetViewMode?: (mode: "json" | "table") => void;
  tableDisabled?: boolean;
};

export function EditorToolbar({
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
  createArgoCDSecret = false,
  setCreateArgoCDSecret,
  isCreatingNew = false,
  onEdit,
  onClone,
  cloneDisabled = false,
  cloneDisabledReason = "",
  editDisabled = false,
  editDisabledReason = "",
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason = "",
  onCopyTemplate,
  copyTemplateDisabled = false,
  copyTemplateDisabledReason = "",
  diffMode = "off",
  onToggleDiffMode,
  diffDisabled = false,
  masked = false,
  onToggleMask,
  viewMode = "json",
  onSetViewMode,
  tableDisabled = false,
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
  const showRightAlignedActions = Boolean(
    onEdit || onClone || onDelete || showSaveCancel
  );

  return (
    <div className="flex items-center gap-2 mb-2 relative">
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
          <Button
            size="xs"
            variant={copyCopied ? "success" : "ghost"}
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
          </Button>

          {onCopyTemplate && (
            <Button
              size="xs"
              variant="ghost"
              disabled={copyTemplateDisabled}
              title={
                copyTemplateDisabled
                  ? copyTemplateDisabledReason
                  : "Copy ArgoCD External Secret template"
              }
              onClick={() => {
                if (!copyTemplateDisabled) {
                  onCopyTemplate();
                }
              }}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Copy template
            </Button>
          )}

          {canExport && (
            <Button
              size="xs"
              onClick={onExport}
              title="Export secret to JSON file"
              variant="ghost"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          )}

          {(isCreatingNew || isEditing) && !isBinary && setCreateArgoCDSecret && (
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={createArgoCDSecret}
                onChange={(e) => setCreateArgoCDSecret(e.target.checked)}
              />
              <span className="label-text text-xs">Create ArgoCD External Secret</span>
            </label>
          )}
        </>
      )}

      {hasContent && isBinary && isValidBase64(content) && (
        <Button
          size="xs"
          variant={isDecoded ? "info" : "ghost"}
          onClick={() => setIsDecoded(!isDecoded)}
          title={isDecoded ? "Show encoded (base64)" : "Show decoded (text)"}
        >
          {isDecoded ? (
            <EyeOff className="h-3.5 w-3.5 mr-1" />
          ) : (
            <Eye className="h-3.5 w-3.5 mr-1" />
          )}
          {isDecoded ? "Encoded" : "Decoded"}
        </Button>
      )}

      {!isBinary && hasContent && onSetViewMode && (
        <div className="join">
          <Button
            size="xs"
            variant={viewMode === "json" ? "info" : "ghost"}
            className="join-item"
            title="JSON view"
            onClick={() => onSetViewMode("json")}
          >
            <Braces className="h-3.5 w-3.5 mr-1" /> JSON
          </Button>
          <Button
            size="xs"
            variant={viewMode === "table" ? "info" : "ghost"}
            className="join-item"
            disabled={tableDisabled}
            title={
              tableDisabled
                ? "Table view needs a JSON object"
                : "Table view"
            }
            onClick={() => onSetViewMode("table")}
          >
            <Table className="h-3.5 w-3.5 mr-1" /> Table
          </Button>
        </div>
      )}

      {!isEditing && !isBinary && hasContent && onToggleMask && (
        <Button
          size="xs"
          variant={masked ? "ghost" : "info"}
          onClick={onToggleMask}
          title={masked ? "Reveal values" : "Hide values"}
        >
          {masked ? (
            <Eye className="h-3.5 w-3.5 mr-1" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 mr-1" />
          )}
          {masked ? "Reveal" : "Hide"}
        </Button>
      )}

      {!isEditing && !isBinary && hasContent && (
        <Button
          ref={keyPickerButtonRef}
          size="xs"
          variant={copyByKeyCopied ? "success" : "ghost"}
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
        </Button>
      )}

      {!isEditing && hasContent && (
        <Button
          size="xs"
          variant={wrap ? "success" : "ghost"}
          onClick={() => setWrap(!wrap)}
          title="Toggle wrap lines"
        >
          <WrapText className="h-3.5 w-3.5 mr-1" /> Wrap lines
        </Button>
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
      {showRightAlignedActions && (
        <div className="ml-auto flex items-center gap-2">
          {onEdit && (
            <Button
              size="xs"
              variant="ghost"
              disabled={editDisabled}
              title={editDisabled ? editDisabledReason : ""}
              onClick={() => {
                if (!editDisabled) onEdit();
              }}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}

          {onClone && (
            <Button
              size="xs"
              variant="ghost"
              disabled={cloneDisabled}
              title={cloneDisabled ? cloneDisabledReason : "Clone secret"}
              onClick={() => {
                if (!cloneDisabled) onClone();
              }}
            >
              <CopyPlus className="h-3.5 w-3.5 mr-1" /> Clone
            </Button>
          )}

          {onDelete && (
            <Button
              size="xs"
              variant="ghost"
              className="text-error"
              disabled={deleteDisabled}
              title={deleteDisabled ? deleteDisabledReason : ""}
              onClick={() => {
                if (!deleteDisabled) onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          )}

          {showSaveCancel && (
            <>
              <Button size="sm" variant="success" onClick={onSave}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          )}

          {isEditing && !isBinary && onToggleDiffMode && (
            <>
              <Button
                size="xs"
                variant={diffMode === "split" ? "info" : "ghost"}
                disabled={diffDisabled && diffMode === "off"}
                title={
                  diffDisabled && diffMode === "off"
                    ? "No changes to compare"
                    : "Side-by-side diff"
                }
                onClick={() => onToggleDiffMode("split")}
              >
                <Columns2 className="h-3.5 w-3.5 mr-1" /> Side by side
              </Button>
              <Button
                size="xs"
                variant={diffMode === "unified" ? "info" : "ghost"}
                disabled={diffDisabled && diffMode === "off"}
                title={
                  diffDisabled && diffMode === "off"
                    ? "No changes to compare"
                    : "Unified inline diff"
                }
                onClick={() => onToggleDiffMode("unified")}
              >
                <Rows2 className="h-3.5 w-3.5 mr-1" /> Inline
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EditorToolbar;
