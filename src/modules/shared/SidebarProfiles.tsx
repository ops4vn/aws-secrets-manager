import {
  AlarmClock,
  Bookmark,
  CheckCircle2,
  Circle,
  Clock,
  List,
  RefreshCcw,
  ShieldCheck,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useDashboardStore } from "../store/useDashboardStore";

// Helper to get display name for secret (last segment or unique part)
function getSecretDisplayName(secretId: string, allSecrets: string[]): string {
  // If it's a path, use last segment
  if (secretId.includes("/")) {
    const parts = secretId.split("/");
    const lastSegment = parts[parts.length - 1];

    // Check if there are multiple secrets with same last segment
    const sameLastSegment = allSecrets.filter(
      (id) => id.split("/").pop() === lastSegment
    );

    // If multiple secrets share last segment, show more context
    if (sameLastSegment.length > 1) {
      // Try to find unique suffix
      const commonPrefix = findCommonPrefix(sameLastSegment);
      if (commonPrefix && secretId.startsWith(commonPrefix)) {
        return secretId.slice(commonPrefix.length).replace(/^\//, "");
      }
      // Show last 2 segments if needed
      if (parts.length >= 2) {
        return `${parts[parts.length - 2]}/${lastSegment}`;
      }
    }

    return lastSegment;
  }
  return secretId;
}

// Helper to find common prefix
function findCommonPrefix(strings: string[]): string | null {
  if (strings.length === 0) return null;
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix.length === 0) return null;
  }
  // Ensure prefix ends at a path boundary
  const lastSlash = prefix.lastIndexOf("/");
  if (lastSlash > 0) {
    return prefix.substring(0, lastSlash + 1);
  }
  return null;
}

export function SidebarProfiles() {
  const [profileCollapsed, setProfileCollapsed] = useState(false);
  const [bookmarksCollapsed, setBookmarksCollapsed] = useState(false);
  const [recentCollapsed, setRecentCollapsed] = useState(false);
  const {
    profiles,
    selectedProfile,
    defaultProfile,
    ssoValid,
    ssoChecking,
    bookmarks,
    recentSecrets,
    setSelectedProfile,
    saveDefault,
    listSecrets,
    checkSsoFlow,
    triggerSsoLogin,
    fetchSecretById,
    addBookmark,
    removeBookmark,
  } = useDashboardStore();

  return (
    <div className="flex flex-col gap-3">
      {/* Profiles section - Collapsible */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-md">
        <input
          type="checkbox"
          checked={!profileCollapsed}
          onChange={(e) => setProfileCollapsed(!e.target.checked)}
        />
        <div className="collapse-title p-2 min-h-0 flex items-center gap-2">
          <h2 className="text-base font-semibold">Profiles</h2>
          {defaultProfile && (
            <div className="badge badge-ghost badge-xs" title="Default profile">
              Default: {defaultProfile}
            </div>
          )}
        </div>
        <div className="collapse-content">
          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text text-xs">Select profile</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                className="select select-bordered select-sm flex-1"
                value={selectedProfile ?? defaultProfile ?? "default"}
                onChange={(e) => setSelectedProfile(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary btn-sm" onClick={saveDefault}>
                <Star className="h-4 w-4 mr-1" /> Set default
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SSO control area (compact) */}
      <div className="mt-1 p-2 rounded-md border border-base-300 bg-base-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ssoChecking ? (
            <AlarmClock className="h-4 w-4 text-warning" />
          ) : ssoValid === true ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : ssoValid === false ? (
            <XCircle className="h-4 w-4 text-error" />
          ) : (
            <Circle className="h-4 w-4 opacity-50" />
          )}
          <div className="text-xs">
            <div className="font-medium">SSO</div>
            <div className="opacity-70">
              {ssoChecking
                ? "Checking..."
                : ssoValid === true
                ? "Valid"
                : ssoValid === false
                ? "Invalid"
                : "Unknown"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ssoValid === false && !ssoChecking && (
            <button
              className="btn btn-link btn-xs no-underline"
              onClick={async () => {
                await triggerSsoLogin();
                setTimeout(() => {
                  void checkSsoFlow();
                }, 3000);
              }}
            >
              Login
            </button>
          )}
          <button
            className="btn btn-sm bg-[#FF9900] hover:bg-[#e58a00] text-white border-none"
            onClick={() => checkSsoFlow()}
            disabled={!!ssoChecking}
            title={
              ssoChecking
                ? "Checking..."
                : ssoValid == null
                ? "Check SSO"
                : "Re-check"
            }
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            {ssoChecking
              ? "Checking..."
              : ssoValid == null
              ? "Check"
              : "Re-check"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn btn-primary btn-sm flex-1"
          onClick={() => listSecrets(false)}
        >
          <List className="h-4 w-4 mr-1" /> List Secrets
        </button>
        <button
          className="btn btn-primary btn-sm flex-1"
          onClick={() => listSecrets(true)}
        >
          <RefreshCcw className="h-4 w-4 mr-1" /> Force Reload
        </button>
      </div>

      {/* Bookmarks section - Collapsible */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-md">
        <input
          type="checkbox"
          checked={!bookmarksCollapsed}
          onChange={(e) => setBookmarksCollapsed(!e.target.checked)}
        />
        <div className="collapse-title p-2 min-h-0 flex items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Bookmark className="h-4 w-4" /> Bookmarks
            {bookmarks.length > 0 && (
              <span className="badge badge-xs badge-ghost ml-1">
                {bookmarks.length}
              </span>
            )}
          </h3>
        </div>
        <div className="collapse-content">
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {bookmarks.length === 0 ? (
              <div className="text-xs text-base-content/50 py-2 text-center">
                No bookmarks yet
              </div>
            ) : (
              bookmarks.map((secretId) => (
                <div
                  key={secretId}
                  className="group flex items-center justify-between p-2 rounded hover:bg-base-200 gap-2"
                >
                  <button
                    className="flex-1 text-left text-xs truncate hover:text-primary"
                    onClick={() => fetchSecretById(secretId)}
                    title={secretId}
                  >
                    {getSecretDisplayName(secretId, bookmarks)}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100"
                    onClick={() => removeBookmark(secretId)}
                    title="Remove bookmark"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Secrets section - Collapsible */}
      <div className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-md flex-1 min-h-0">
        <input
          type="checkbox"
          checked={!recentCollapsed}
          onChange={(e) => setRecentCollapsed(!e.target.checked)}
        />
        <div className="collapse-title p-2 min-h-0 flex items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Clock className="h-4 w-4" /> Recent
            {recentSecrets.length > 0 && (
              <span className="badge badge-xs badge-ghost ml-1">
                {recentSecrets.length}
              </span>
            )}
          </h3>
        </div>
        <div className="collapse-content">
          <div className="space-y-1 max-h-72 overflow-y-auto">
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
                      onClick={() => fetchSecretById(secretId)}
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
      </div>
    </div>
  );
}
