import { Star } from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { Select } from "../components/Select";
import { Button } from "../components/Button";

export function ProfilesSection() {
  const {
    profiles,
    selectedProfile,
    defaultProfile,
    setSelectedProfile,
    saveDefault,
  } = useProfileStore();

  return (
    <div className="bg-base-100 border border-base-300 rounded-md p-3">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold">Profiles</h2>
        {defaultProfile && (
          <div className="badge badge-ghost badge-xs" title="Default profile">
            Default: {defaultProfile}
          </div>
        )}
      </div>
      {profiles.length === 0 ? (
        <div className="text-xs text-base-content/70">
          <p className="mb-2">
            No AWS profiles found. Please configure AWS CLI profiles first.
          </p>
          <p className="text-xs opacity-70">
            Run <code className="bg-base-200 px-1 rounded">aws configure --profile &lt;name&gt;</code> to create a profile.
          </p>
        </div>
      ) : (
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text text-xs">Select profile</span>
          </label>
          <div className="flex items-center gap-2">
            <Select
              size="sm"
              value={selectedProfile ?? defaultProfile ?? profiles[0] ?? ""}
              onChange={(value) => setSelectedProfile(value)}
              className="flex-1"
              options={profiles.map((p) => ({ value: p, label: p }))}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() => saveDefault()}
              disabled={!selectedProfile && !defaultProfile}
            >
              <Star className="h-4 w-4 mr-1" /> Set default
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

