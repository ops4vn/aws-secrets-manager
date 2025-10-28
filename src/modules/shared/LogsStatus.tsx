import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
type Props = {
  logs: string[];
  status: string;
  onClearLogs: () => void;
  canDelete: boolean;
  onDelete: () => void;
  autoScroll?: boolean;
  onToggleAutoScroll?: (v: boolean) => void;
};

export function LogsStatus({
  logs,
  status,
  onClearLogs,
  canDelete,
  onDelete,
  autoScroll = true,
  onToggleAutoScroll,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  return (
    <div className="bg-base-100 flex flex-col h-full">
      <div className="p-2 border-b border-base-300 flex items-center gap-2">
        <div className="font-semibold">Logs</div>
        <label className="label cursor-pointer gap-2 ml-1">
          <span className="label-text text-xs">Auto scroll</span>
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={autoScroll}
            onChange={(e) => onToggleAutoScroll?.(e.target.checked)}
          />
        </label>
        <button className="btn btn-ghost btn-xs ml-2" onClick={onClearLogs}>
          Clear
        </button>
        <div className="ml-auto" />
        {canDelete ? (
          <button
            className="btn btn-error btn-sm text-white"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </button>
        ) : (
          <button
            className="btn btn-error btn-sm text-white"
            disabled
            title="Cannot delete while creating new secret"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </button>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 min-h-0">
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
