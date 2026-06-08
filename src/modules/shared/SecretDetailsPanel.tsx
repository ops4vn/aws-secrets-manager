import { useState } from "react";
import {
  Info,
  Tags as TagsIcon,
  X,
  Plus,
  Copy,
  History as HistoryIcon,
  GitCompare,
} from "lucide-react";
import { useProfileStore } from "../store/useProfileStore";
import { useEditorStore } from "../store/useEditorStore";
import { useSecretDetailsStore } from "../store/useSecretDetailsStore";
import { Input } from "./components/Input";
import { Button } from "./components/Button";

function fmtDate(secs: number | null): string {
  if (!secs) return "—";
  try {
    return new Date(secs * 1000).toLocaleString();
  } catch {
    return "—";
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-xs text-base-content/60 whitespace-nowrap">{label}</span>
      <span className="text-xs text-right break-all">{value}</span>
    </div>
  );
}

// Collapsible Details + Tags sections for the active secret, shown in the right
// panel. Loads describe metadata lazily on first expand.
export function SecretDetailsPanel() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const profile = selectedProfile ?? defaultProfile;
  const secretId = useEditorStore((s) => s.secretId);
  const isCreatingNew = useEditorStore((s) => s.isCreatingNew);
  const activeTabId = useEditorStore((s) => s.activeTabId);

  const {
    describe,
    loadingDescribe,
    loadDescribe,
    addTags,
    removeTag,
    versions,
    loadingVersions,
    loadVersions,
    compareVersion,
    versionDiff,
  } = useSecretDetailsStore();
  const storeSecretId = useSecretDetailsStore((s) => s.secretId);
  const detailsForActive = storeSecretId === secretId ? describe : null;
  const versionsForActive = storeSecretId === secretId ? versions : [];

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  if (!secretId || isCreatingNew || !activeTabId) return null;

  const ensureLoaded = (open: boolean) => {
    if (open) void loadDescribe(profile, secretId);
  };

  const ensureVersions = (open: boolean) => {
    if (open) void loadVersions(profile, secretId);
  };

  // Newest first.
  const sortedVersions = [...versionsForActive].sort(
    (a, b) => (b.created_date ?? 0) - (a.created_date ?? 0)
  );

  const handleAddTag = async () => {
    const k = newKey.trim();
    if (!k) return;
    await addTags(profile, secretId, [{ key: k, value: newValue }]);
    setNewKey("");
    setNewValue("");
  };

  return (
    <div className="space-y-1 mb-2 border-b border-base-300 pb-2">
      {/* Details */}
      <details
        className="group"
        onToggle={(e) => ensureLoaded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center gap-2 cursor-pointer select-none p-1.5 hover:bg-base-200/60 rounded text-sm font-semibold text-base-content/80">
          <Info className="h-4 w-4" /> Details
        </summary>
        <div className="px-1.5 pt-1">
          {loadingDescribe && !detailsForActive ? (
            <div className="text-xs opacity-60 py-2">Loading…</div>
          ) : detailsForActive ? (
            <div>
              <Row
                label="ARN"
                value={
                  detailsForActive.arn ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-primary"
                      title={detailsForActive.arn}
                      onClick={() =>
                        navigator.clipboard.writeText(detailsForActive.arn ?? "")
                      }
                    >
                      <span className="truncate max-w-[180px]">
                        {detailsForActive.arn}
                      </span>
                      <Copy className="h-3 w-3 shrink-0" />
                    </button>
                  ) : (
                    "—"
                  )
                }
              />
              {detailsForActive.description && (
                <Row label="Description" value={detailsForActive.description} />
              )}
              <Row label="Created" value={fmtDate(detailsForActive.created_date)} />
              <Row label="Last changed" value={fmtDate(detailsForActive.last_changed_date)} />
              <Row label="Last accessed" value={fmtDate(detailsForActive.last_accessed_date)} />
              <Row
                label="Rotation"
                value={
                  detailsForActive.rotation_enabled
                    ? `Enabled${
                        detailsForActive.rotation_automatically_after_days
                          ? ` (every ${detailsForActive.rotation_automatically_after_days}d)`
                          : ""
                      }`
                    : "Disabled"
                }
              />
              {detailsForActive.rotation_enabled && (
                <Row label="Next rotation" value={fmtDate(detailsForActive.next_rotation_date)} />
              )}
              {detailsForActive.last_rotated_date && (
                <Row label="Last rotated" value={fmtDate(detailsForActive.last_rotated_date)} />
              )}
              {detailsForActive.primary_region && (
                <Row label="Region" value={detailsForActive.primary_region} />
              )}
            </div>
          ) : (
            <div className="text-xs opacity-60 py-2">No data</div>
          )}
        </div>
      </details>

      {/* Tags */}
      <details
        className="group"
        onToggle={(e) => ensureLoaded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center gap-2 cursor-pointer select-none p-1.5 hover:bg-base-200/60 rounded text-sm font-semibold text-base-content/80">
          <TagsIcon className="h-4 w-4" /> Tags
          {detailsForActive && detailsForActive.tags.length > 0 && (
            <span className="badge badge-xs badge-neutral">
              {detailsForActive.tags.length}
            </span>
          )}
        </summary>
        <div className="px-1.5 pt-1 space-y-2">
          <div className="flex flex-wrap gap-1">
            {detailsForActive && detailsForActive.tags.length > 0 ? (
              detailsForActive.tags.map((t) => (
                <span
                  key={t.key}
                  className="badge badge-sm badge-outline gap-1"
                  title={`${t.key}=${t.value}`}
                >
                  <span className="truncate max-w-[140px]">
                    {t.key}
                    {t.value ? `=${t.value}` : ""}
                  </span>
                  <button
                    className="hover:text-error"
                    title="Remove tag"
                    onClick={() => removeTag(profile, secretId, t.key)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs opacity-60">No tags</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Input
              size="xs"
              placeholder="key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-24"
            />
            <Input
              size="xs"
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 min-w-0"
            />
            <Button
              size="xs"
              variant="ghost"
              square
              title="Add tag"
              disabled={!newKey.trim()}
              onClick={handleAddTag}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </details>

      {/* Version history */}
      <details
        className="group"
        onToggle={(e) => ensureVersions((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center gap-2 cursor-pointer select-none p-1.5 hover:bg-base-200/60 rounded text-sm font-semibold text-base-content/80">
          <HistoryIcon className="h-4 w-4" /> History
          {sortedVersions.length > 0 && (
            <span className="badge badge-xs badge-neutral">{sortedVersions.length}</span>
          )}
        </summary>
        <div className="px-1.5 pt-1">
          {loadingVersions && sortedVersions.length === 0 ? (
            <div className="text-xs opacity-60 py-2">Loading…</div>
          ) : sortedVersions.length === 0 ? (
            <div className="text-xs opacity-60 py-2">No versions</div>
          ) : (
            <ul className="space-y-1">
              {sortedVersions.map((v) => {
                const isCurrent = v.version_stages.includes("AWSCURRENT");
                const isActiveDiff = versionDiff?.versionId === v.version_id;
                return (
                  <li
                    key={v.version_id}
                    className="flex items-center gap-2 py-1 border-b border-base-200 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {isCurrent ? (
                          <span className="badge badge-xs badge-success">AWSCURRENT</span>
                        ) : v.version_stages.includes("AWSPREVIOUS") ? (
                          <span className="badge badge-xs badge-info">AWSPREVIOUS</span>
                        ) : null}
                        <span
                          className="text-xs font-mono truncate"
                          title={v.version_id}
                        >
                          {v.version_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-60">{fmtDate(v.created_date)}</div>
                    </div>
                    <Button
                      size="xs"
                      variant={isActiveDiff ? "info" : "ghost"}
                      square
                      title="Compare with current"
                      onClick={() => compareVersion(profile, secretId, v.version_id)}
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}

export default SecretDetailsPanel;
