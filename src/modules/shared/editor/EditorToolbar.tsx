import { useState } from "react";
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
  GitCompare,
  SlidersHorizontal,
  Settings,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "../components/Button";
import {
  Dropdown,
  DropdownItem,
  DropdownDivider,
  DropdownLabel,
} from "../components/Dropdown";
import { ToolbarButton } from "./ToolbarButton";
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

  const hasContent = (content ?? "").length > 0;
  const showRightAlignedActions = Boolean(
    onEdit || onClone || onDelete || showSaveCancel
  );

  const copyAll = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopyCopied(true);
    window.setTimeout(() => setCopyCopied(false), 1500);
  };

  // Copy-by-key rows for the View menu (non-binary, valid JSON).
  const keyItems = (() => {
    if (isBinary || !hasContent) return [];
    try {
      return extractJsonPaths(JSON.parse(content)).slice(0, 200);
    } catch {
      return [];
    }
  })();

  const showOptionsMenu = Boolean(
    isEditing &&
      hasContent &&
      ((setCreateArgoCDSecret && !isBinary) || onCopyTemplate || canExport)
  );

  return (
    <div className="@container flex flex-wrap items-center gap-2 mb-2">
      {/* Status badges */}
      {isActiveProd && (
        <span className="badge bg-error text-white badge-sm font-bold flex items-center gap-1 shrink-0">
          <AlertCircle className="h-3.5 w-3.5" />
          PROD
        </span>
      )}
      {viewText && (
        <span className="badge badge-ghost badge-sm shrink-0">{viewText}</span>
      )}

      {/* Copy (always available with content) */}
      {hasContent && (
        <ToolbarButton
          icon={
            copyCopied ? (
              <ClipboardCheck className="h-3.5 w-3.5" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" />
            )
          }
          label={copyCopied ? "Copied" : "Copy"}
          title="Copy all"
          variant={copyCopied ? "success" : "ghost"}
          onClick={copyAll}
        />
      )}

      {/* JSON / Table segmented (object content) */}
      {!isBinary && hasContent && onSetViewMode && (
        <div className="join shrink-0">
          <Button
            size="xs"
            variant={viewMode === "json" ? "info" : "ghost"}
            className="join-item"
            title="JSON view"
            onClick={() => onSetViewMode("json")}
          >
            <Braces className="h-3.5 w-3.5" />
            <span className="hidden @md:inline ml-1">JSON</span>
          </Button>
          <Button
            size="xs"
            variant={viewMode === "table" ? "info" : "ghost"}
            className="join-item"
            disabled={tableDisabled}
            title={tableDisabled ? "Table view needs a JSON object" : "Table view"}
            onClick={() => onSetViewMode("table")}
          >
            <Table className="h-3.5 w-3.5" />
            <span className="hidden @md:inline ml-1">Table</span>
          </Button>
        </div>
      )}

      {/* View menu (read-only mode) */}
      {!isEditing && hasContent && (
        <Dropdown
          buttonTitle="View options"
          trigger={
            <>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden @md:inline ml-1">View</span>
            </>
          }
        >
          {!isBinary && onToggleMask && (
            <DropdownItem
              icon={
                masked ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )
              }
              onClick={onToggleMask}
            >
              {masked ? "Reveal values" : "Hide values"}
            </DropdownItem>
          )}
          <DropdownItem
            icon={<WrapText className="h-3.5 w-3.5" />}
            active={wrap}
            onClick={() => setWrap(!wrap)}
          >
            Wrap lines
          </DropdownItem>
          {isBinary && isValidBase64(content) && (
            <DropdownItem
              icon={
                isDecoded ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )
              }
              active={isDecoded}
              onClick={() => setIsDecoded(!isDecoded)}
            >
              {isDecoded ? "Show encoded (base64)" : "Show decoded (text)"}
            </DropdownItem>
          )}

          {(onCopyTemplate || canExport) && <DropdownDivider />}
          {onCopyTemplate && (
            <DropdownItem
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              disabled={copyTemplateDisabled}
              title={copyTemplateDisabled ? copyTemplateDisabledReason : undefined}
              onClick={onCopyTemplate}
            >
              Copy ArgoCD template
            </DropdownItem>
          )}
          {canExport && (
            <DropdownItem
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={onExport}
            >
              Export to JSON
            </DropdownItem>
          )}

          {keyItems.length > 0 && (
            <>
              <DropdownDivider />
              <DropdownLabel>Copy by key</DropdownLabel>
              {keyItems.map((it, idx) => (
                <DropdownItem
                  key={idx}
                  icon={<ClipboardCopy className="h-3.5 w-3.5" />}
                  title={it.value}
                  onClick={() => navigator.clipboard.writeText(it.value)}
                >
                  {it.path}
                </DropdownItem>
              ))}
            </>
          )}
        </Dropdown>
      )}

      {/* Diff menu (edit mode) */}
      {isEditing && !isBinary && onToggleDiffMode && (
        <Dropdown
          active={diffMode !== "off"}
          disabled={diffDisabled && diffMode === "off"}
          buttonTitle={
            diffDisabled && diffMode === "off"
              ? "No changes to compare"
              : "Compare changes"
          }
          trigger={
            <>
              <GitCompare className="h-3.5 w-3.5" />
              <span className="hidden @md:inline ml-1">Diff</span>
            </>
          }
        >
          <DropdownItem
            icon={<Columns2 className="h-3.5 w-3.5" />}
            active={diffMode === "split"}
            onClick={() => onToggleDiffMode("split")}
          >
            Side by side
          </DropdownItem>
          <DropdownItem
            icon={<Rows2 className="h-3.5 w-3.5" />}
            active={diffMode === "unified"}
            onClick={() => onToggleDiffMode("unified")}
          >
            Inline
          </DropdownItem>
          {diffMode !== "off" && (
            <>
              <DropdownDivider />
              <DropdownItem
                icon={<X className="h-3.5 w-3.5" />}
                onClick={() => onToggleDiffMode(diffMode)}
              >
                Stop comparing
              </DropdownItem>
            </>
          )}
        </Dropdown>
      )}

      {/* Options menu (edit mode) */}
      {showOptionsMenu && (
        <Dropdown
          buttonTitle="Options"
          trigger={
            <>
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden @md:inline ml-1">Options</span>
            </>
          }
        >
          {(isCreatingNew || isEditing) && !isBinary && setCreateArgoCDSecret && (
            <DropdownItem
              closeOnClick={false}
              active={createArgoCDSecret}
              icon={
                createArgoCDSecret ? (
                  <CheckSquare className="h-3.5 w-3.5" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )
              }
              onClick={() => setCreateArgoCDSecret(!createArgoCDSecret)}
            >
              Create ArgoCD External Secret
            </DropdownItem>
          )}
          {onCopyTemplate && (
            <DropdownItem
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              disabled={copyTemplateDisabled}
              title={copyTemplateDisabled ? copyTemplateDisabledReason : undefined}
              onClick={onCopyTemplate}
            >
              Copy ArgoCD template
            </DropdownItem>
          )}
          {canExport && (
            <DropdownItem
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={onExport}
            >
              Export to JSON
            </DropdownItem>
          )}
        </Dropdown>
      )}

      {/* Primary actions (always visible, right-aligned) */}
      {showRightAlignedActions && (
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {onEdit && (
            <ToolbarButton
              icon={<Edit3 className="h-3.5 w-3.5" />}
              label="Edit"
              title={editDisabled ? editDisabledReason : "Edit"}
              disabled={editDisabled}
              onClick={onEdit}
            />
          )}
          {onClone && (
            <ToolbarButton
              icon={<CopyPlus className="h-3.5 w-3.5" />}
              label="Clone"
              title={cloneDisabled ? cloneDisabledReason : "Clone secret"}
              disabled={cloneDisabled}
              onClick={onClone}
            />
          )}
          {onDelete && (
            <Button
              size="xs"
              variant="ghost"
              className="text-error"
              disabled={deleteDisabled}
              title={deleteDisabled ? deleteDisabledReason : "Delete"}
              onClick={() => {
                if (!deleteDisabled) onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden @md:inline ml-1">Delete</span>
            </Button>
          )}
          {showSaveCancel && (
            <>
              <Button size="sm" variant="success" onClick={onSave} title="Save">
                <Save className="h-4 w-4" />
                <span className="hidden @md:inline ml-1">Save</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel} title="Cancel">
                <X className="h-4 w-4" />
                <span className="hidden @md:inline ml-1">Cancel</span>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EditorToolbar;
