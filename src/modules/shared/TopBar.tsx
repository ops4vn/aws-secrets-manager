import { BookOpen, Edit3, Plus } from "lucide-react";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
type Props = {
  secretId: string;
  setSecretId: (v: string) => void;
  isEditing: boolean;
  isCreatingNew: boolean;
  onGet: () => void;
  onEdit: () => void;
  onNew: () => void;
};

export function TopBar({
  secretId,
  setSecretId,
  isEditing,
  isCreatingNew,
  onGet,
  onEdit,
  onNew,
}: Props) {
  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4 gap-4">
      <div className="flex flex-1 items-center gap-3">
        <span className="whitespace-nowrap">Secret ID:</span>
        <input
          className="input input-bordered input-sm w-full max-w-xl"
          value={secretId}
          onChange={(e) => setSecretId(e.target.value)}
          placeholder="my/app/secret"
        />

        {isCreatingNew && (
          <div
            className="btn btn-success btn-xs normal-case ml-2"
            title="Create mode"
          >
            <span className="w-2 h-2 rounded-full bg-white/80 mr-2"></span>
            Create mode
          </div>
        )}
        {!isCreatingNew && isEditing && (
          <div
            className="btn btn-error btn-xs normal-case ml-2"
            title="Edit mode"
          >
            <span className="w-2 h-2 rounded-full bg-white/80 mr-2"></span>
            Edit mode
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn btn-sm"
          disabled={isEditing}
          title={isEditing ? "Cancel edit first to prevent data loss" : ""}
          onClick={onGet}
        >
          <BookOpen className="h-4 w-4 mr-1" /> Get Secret
        </button>
        <button
          className="btn btn-sm"
          disabled={isEditing || !secretId}
          title={
            !secretId
              ? "Get a secret first to edit"
              : isEditing
              ? "Already in edit mode"
              : ""
          }
          onClick={onEdit}
        >
          <Edit3 className="h-4 w-4 mr-1" /> Edit
        </button>
        <button
          className="btn btn-sm"
          disabled={isEditing}
          title={isEditing ? "Finish current edit first" : ""}
          onClick={onNew}
        >
          <Plus className="h-4 w-4 mr-1" /> New Secret
        </button>
        <KeyboardShortcutsHelp />
      </div>
    </div>
  );
}
