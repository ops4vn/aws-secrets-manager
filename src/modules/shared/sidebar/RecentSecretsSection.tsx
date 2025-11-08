import { Bookmark, ChevronDown, ChevronUp, Clock, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useBookmarksStore } from "../../store/useBookmarksStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useEditorStore } from "../../store/useEditorStore";
import { useLogsStore } from "../../store/useLogsStore";
import { getSecretDisplayName } from "../utils/secretDisplayUtils";
import { Button } from "../components/Button";

export function RecentSecretsSection() {
  const [collapsed, setCollapsed] = useState(false);
  const { pushSuccess } = useLogsStore();
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { bookmarks, recentSecrets, addBookmark, removeBookmark, clearRecentSecrets } =
    useBookmarksStore();
  const { fetchSecretById } = useEditorStore();

  return (
    <div className={`bg-base-100 border border-base-300 rounded-md flex flex-col ${collapsed ? "h-fit" : "flex-1"} overflow-y-auto`}>
      {/* Header */}
      <div className={`p-2 min-h-0 flex items-center justify-between gap-2 ${collapsed ? "" : "border-b border-base-300"}`}>
        <div className="flex items-center gap-2 flex-1">
          <Button
            size="xs"
            variant="ghost"
            square
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
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
          <Button
            size="xs"
            variant="ghost"
            square
            className="text-error"
            onClick={async () => {
              await clearRecentSecrets();
              pushSuccess("Recent secrets cleared");
            }}
            title="Clear recent secrets"
          >
            <Trash2 className="h-3 w-3 text-error" />
          </Button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="overflow-y-auto">
          <div className="space-y-1 p-2">
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
                    <Button
                      size="xs"
                      variant="ghost"
                      square
                      className={`opacity-0 group-hover:opacity-100 ${
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
                    </Button>
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

