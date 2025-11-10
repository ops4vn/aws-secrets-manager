import { RefreshCcw, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useUpdaterStore } from "../../store/useUpdaterStore";
import { useLogsStore } from "../../store/useLogsStore";

export function VersionInfo() {
  const [appVersion, setAppVersion] = useState("unknown");
  const [isChecking, setIsChecking] = useState(false);
  const { initCheck } = useUpdaterStore();
  const { pushError } = useLogsStore();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await getVersion();
        setAppVersion(version);
      } catch (e) {
        console.error("Failed to get app version:", e);
      }
    };
    fetchVersion();
  }, []);

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    try {
      await initCheck(true);
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
          <span>App version: v{appVersion}</span>
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

