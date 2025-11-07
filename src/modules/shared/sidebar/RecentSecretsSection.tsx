import { Bookmark, ChevronDown, ChevronUp, Clock, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useBookmarksStore } from "../../store/useBookmarksStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useEditorStore } from "../../store/useEditorStore";
import { useLogsStore } from "../../store/useLogsStore";
import { getSecretDisplayName } from "../utils/secretDisplayUtils";

export function RecentSecretsSection() {
  const [collapsed, setCollapsed] = useState(false);
  const { pushSuccess } = useLogsStore();
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { bookmarks, recentSecrets, addBookmark, removeBookmark, clearRecentSecrets } =
    useBookmarksStore();
  const { fetchSecretById } = useEditorStore();

  return (
    <div className="bg-base-100 border border-base-300 rounded-md flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="p-2 min-h-0 flex items-center justify-between gap-2 border-b border-base-300">
        <div className="flex items-center gap-2 flex-1">
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
          <h3 className="text-xs font-semibold flex items-center gap-1">
            <Clock className="h-4 w-4" /> Recent
            {recentSecrets.length > 0 && (
              <span className="badge badge-xs badge-ghost ml-1">
                {recentSecrets.length}
              </span>
            )}
          </h3>
        </div>
        {recentSecrets.length > 0 && (
          <button
            className="btn btn-ghost btn-xs btn-square text-error"
            onClick={async () => {
              await clearRecentSecrets();
              pushSuccess("Recent secrets cleared");
            }}
            title="Clear recent secrets"
          >
            <Trash2 className="h-3 w-3 text-error" />
          </button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="space-y-1 p-2 max-h-72 overflow-y-auto">
            {recentSecrets.length === 0 ? (
              <div className="text-xs text-base-content/50 py-2 text-center">
                No recent secrets
              </div>
            ) : (
              recentSecrets.map((secretId) => {
                const isBookmarked = bookmarks.includes(secretId);
                return (
                  <div
                    key={secretId}
                    className="group flex items-center justify-between p-2 rounded hover:bg-base-200 gap-2"
                  >
                    <button
                      className="flex-1 text-left text-xs truncate hover:text-primary"
                      onClick={() => {
                        const profile = selectedProfile ?? defaultProfile;
                        fetchSecretById(secretId, profile);
                      }}
                      title={secretId}
                    >
                      {getSecretDisplayName(secretId, recentSecrets)}
                    </button>
                    <button
                      className={`btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 ${
                        isBookmarked ? "opacity-100" : ""
                      }`}
                      onClick={() =>
                        isBookmarked
                          ? removeBookmark(secretId)
                          : addBookmark(secretId)
                      }
                      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      {isBookmarked ? (
                        <Bookmark className="h-3 w-3 fill-current" />
                      ) : (
                        <Star className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

