import { Trash2 } from "lucide-react";
type Props = {
  logs: string[];
  status: string;
  onClearLogs: () => void;
  canDelete: boolean;
  onDelete: () => void;
};

export function LogsStatus({
  logs,
  status,
  onClearLogs,
  canDelete,
  onDelete,
}: Props) {
  return (
    <div className="bg-base-100">
      <div className="p-2 border-b border-base-300 flex items-center">
        <div className="font-semibold">Logs</div>
        <button className="btn btn-ghost btn-xs ml-2" onClick={onClearLogs}>
          Clear
        </button>
        <div className="ml-auto" />
        {canDelete ? (
          <button className="btn btn-outline btn-xs" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </button>
        ) : (
          <button
            className="btn btn-outline btn-xs"
            disabled
            title="Cannot delete while creating new secret"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </button>
        )}
      </div>
      <div className="h-36 overflow-y-auto p-2">
        {logs.map((line, idx) => (
          <div key={idx} className="text-xs font-mono">
            <span className="opacity-50 w-8 inline-block text-right mr-2">
              {String(idx + 1).padStart(3, "0")}
            </span>
            {line}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-base-300 text-sm text-info">
        {status}
      </div>
    </div>
  );
}
