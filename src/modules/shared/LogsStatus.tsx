import { Copy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "../store/useDashboardStore";

export function LogsStatus() {
  const {
    logs,
    status,
    clearLogs,
    autoScrollLogs,
    setAutoScrollLogs,
    isCreatingNew,
    secretId,
    setStatus,
    pushLog,
  } = useDashboardStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [levelFilter, setLevelFilter] = useState<
    "all" | "info" | "warn" | "error" | "debug" | "success"
  >("all");
  const [textFilter, setTextFilter] = useState<string>("");
  useEffect(() => {
    if (autoScrollLogs && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScrollLogs]);
  const canDelete = !isCreatingNew && !!secretId;
  const handleDelete = () => {
    setStatus("Delete not implemented");
    pushLog("[WARN] Delete clicked (not implemented)");
  };
  const getLevel = (
    line: string
  ): "info" | "warn" | "error" | "debug" | "success" | "unknown" => {
    const m = line.match(/\[(INFO|WARN|ERROR|DEBUG|SUCCESS)\]/i);
    if (!m) return "unknown";
    const v = m[1].toLowerCase();
    if (
      v === "info" ||
      v === "warn" ||
      v === "error" ||
      v === "debug" ||
      v === "success"
    )
      return v;
    return "unknown";
  };
  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      if (levelFilter !== "all") {
        const level = getLevel(line);
        if (level !== levelFilter) return false;
      }
      if (textFilter.trim()) {
        return line.toLowerCase().includes(textFilter.trim().toLowerCase());
      }
      return true;
    });
  }, [logs, levelFilter, textFilter]);
  const levelClass = (line: string) => {
    const level = getLevel(line);
    switch (level) {
      case "error":
        return "text-error"; // red
      case "warn":
        return "text-warning"; // amber
      case "success":
        return "text-success"; // green
      case "info":
        return "text-info"; // cyan/blue
      case "debug":
        return "text-secondary"; // muted
      default:
        return "";
    }
  };
  const copyFiltered = async () => {
    try {
      await navigator.clipboard.writeText(filteredLogs.join("\n"));
      setStatus("Copied filtered logs to clipboard");
    } catch (e) {
      setStatus("Copy failed");
    }
  };
  return (
    <div className="bg-base-100 flex flex-col h-full">
      <div className="p-2 border-b border-base-300 flex items-center gap-2">
        <div className="font-semibold">Logs</div>
        <label className="label cursor-pointer gap-2 ml-1">
          <span className="label-text text-xs">Auto scroll</span>
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={autoScrollLogs}
            onChange={(e) => setAutoScrollLogs(e.target.checked)}
          />
        </label>
        <select
          className="select select-bordered select-xs ml-2"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as any)}
          title="Filter level"
        >
          <option value="all">All</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
          <option value="success">Success</option>
        </select>
        <input
          className="input input-bordered input-xs ml-2 w-48"
          placeholder="Filter text..."
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
        />
        <button
          className="btn btn-ghost btn-xs"
          onClick={copyFiltered}
          title="Copy filtered logs"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button className="btn btn-ghost btn-xs ml-2" onClick={clearLogs}>
          Clear
        </button>
        <div className="ml-auto" />
        {canDelete ? (
          <button
            className="btn btn-error btn-sm text-white"
            onClick={handleDelete}
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
        {filteredLogs.map((line, idx) => (
          <div key={idx} className="text-xs font-mono">
            <span className="opacity-50 w-8 inline-block text-right mr-2">
              {String(idx + 1).padStart(3, "0")}
            </span>
            <span className={levelClass(line)}>{line}</span>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-base-300 text-sm text-info">
        {status}
      </div>
    </div>
  );
}
