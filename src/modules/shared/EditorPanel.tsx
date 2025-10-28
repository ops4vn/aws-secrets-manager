import { useRef } from "react";
import { ClipboardCopy, Save, X } from "lucide-react";

type Props = {
  content: string;
  onChange: (v: string) => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function EditorPanel({
  content,
  onChange,
  isEditing,
  onSave,
  onCancel,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <div className="p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="opacity-70">Secret content:</span>
        <button
          className="btn btn-xs"
          onClick={() => {
            if (textareaRef.current)
              navigator.clipboard.writeText(textareaRef.current.value);
          }}
        >
          <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy
        </button>

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

      <textarea
        ref={textareaRef}
        className={`textarea textarea-bordered w-full h-[48vh] font-mono ${
          !isEditing ? "pointer-events-none opacity-90" : ""
        }`}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isEditing
            ? "Enter secret content..."
            : "Read-only - click Edit to modify"
        }
        readOnly={!isEditing}
      />

      <div className="mt-1 text-xs opacity-70">
        {!isEditing
          ? "📖 Read-only - click Edit to modify"
          : "✏️ Edit mode - you can modify content"}
      </div>
    </div>
  );
}
