import { Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLogsStore } from "../store/useLogsStore";
import { Input } from "./components/Input";

export function LogsStatus() {
  const { logs, clearLogs, autoScrollLogs, setAutoScrollLogs, pushLog } =
    useLogsStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [levelFilter, setLevelFilter] = useState<
    "all" | "info" | "warn" | "error" | "debug" | "success"
  >("all");
  const [textFilter, setTextFilter] = useState<string>("");

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
      pushLog("[SUCCESS] Copied filtered logs to clipboard");
    } catch (e) {
      pushLog("[ERROR] Copy failed");
    }
  };

  useEffect(() => {
    if (autoScrollLogs && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScrollLogs]);

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
        <Input
          size="xs"
          placeholder="Filter text..."
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          className="ml-2 w-48"
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
    </div>
  );
}
