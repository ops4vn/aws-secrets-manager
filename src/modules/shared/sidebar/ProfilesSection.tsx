import { Star } from "lucide-react";
import { useState } from "react";
import { useProfileStore } from "../../store/useProfileStore";

export function ProfilesSection() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    profiles,
    selectedProfile,
    defaultProfile,
    setSelectedProfile,
    saveDefault,
  } = useProfileStore();

  return (
    <div className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-md">
      <input
        type="checkbox"
        checked={!collapsed}
        onChange={(e) => setCollapsed(!e.target.checked)}
      />
      <div className="collapse-title p-2 min-h-0 flex items-center gap-2">
        <h2 className="text-xs font-semibold">Profiles</h2>
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
            <button
              className="btn btn-primary btn-sm"
              onClick={() => saveDefault()}
            >
              <Star className="h-4 w-4 mr-1" /> Set default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

