import { RefreshCcw, Info } from "lucide-react";
import { useState } from "react";
import { useUpdaterStore } from "../../store/useUpdaterStore";
import { useLogsStore } from "../../store/useLogsStore";

const APP_VERSION = "0.0.12";

export function VersionInfo() {
  const [isChecking, setIsChecking] = useState(false);
  const { initCheck } = useUpdaterStore();
  const { pushError } = useLogsStore();

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    try {
      await initCheck();
    } catch (e) {
      pushError("Failed to check for updates");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-2 border-t border-base-300 bg-base-100">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-base-content/70">
          <Info className="h-3 w-3" />
          <span>App version: v{APP_VERSION}</span>
        </div>
        <button
          className="btn btn-ghost btn-xs btn-square"
          onClick={handleCheckUpdate}
          disabled={isChecking}
          title="Check for updates"
        >
          <RefreshCcw
            className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}

