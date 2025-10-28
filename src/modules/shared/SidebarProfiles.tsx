import { List, RefreshCcw, ShieldCheck, Star } from "lucide-react";
type Props = {
  profiles: string[];
  selectedProfile: string;
  onSelect: (profile: string) => void;
  onSetDefault: () => void;
  onListSecrets: () => void;
  onForceReload: () => void;
  onCheckSSO: () => void;
};

export function SidebarProfiles({
  profiles,
  selectedProfile,
  onSelect,
  onSetDefault,
  onListSecrets,
  onForceReload,
  onCheckSSO,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Profiles</h2>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Select profile</span>
        </label>
        <select
          className="select select-bordered"
          value={selectedProfile}
          onChange={(e) => onSelect(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary btn-sm" onClick={onSetDefault}>
        <Star className="h-4 w-4 mr-1" /> Set as default
      </button>

      <div className="divider my-1"></div>
      <button className="btn btn-outline btn-sm" onClick={onListSecrets}>
        <List className="h-4 w-4 mr-1" /> List Secrets
      </button>
      <button className="btn btn-outline btn-sm" onClick={onForceReload}>
        <RefreshCcw className="h-4 w-4 mr-1" /> Force Reload
      </button>

      <div className="divider my-1"></div>
      <button className="btn btn-secondary btn-sm" onClick={onCheckSSO}>
        <ShieldCheck className="h-4 w-4 mr-1" /> Check SSO
      </button>
    </div>
  );
}
