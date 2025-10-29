import {
  AlarmClock,
  CheckCircle2,
  Circle,
  List,
  RefreshCcw,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { useDashboardStore } from "../store/useDashboardStore";

export function SidebarProfiles() {
  const {
    profiles,
    selectedProfile,
    defaultProfile,
    ssoValid,
    ssoChecking,
    setSelectedProfile,
    saveDefault,
    listSecrets,
    checkSsoFlow,
  } = useDashboardStore();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Profiles</h2>
        {defaultProfile && (
          <div className="badge badge-ghost badge-sm" title="Default profile">
            Default: {defaultProfile}
          </div>
        )}
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Select profile</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={selectedProfile ?? defaultProfile ?? "default"}
          onChange={(e) => setSelectedProfile(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 w-full">
        <button className="btn btn-primary btn-sm" onClick={saveDefault}>
          <Star className="h-4 w-4 mr-1" /> Set default
        </button>
        <button
          className="btn btn-sm bg-[#FF9900] hover:bg-[#e58a00] text-white border-none"
          onClick={() => checkSsoFlow()}
          disabled={!!ssoChecking}
          title={ssoChecking ? "Checking..." : "Check SSO"}
        >
          <ShieldCheck className="h-4 w-4 mr-1" />
          {ssoChecking ? "Checking..." : "Check SSO"}
        </button>
      </div>

      <div className="mt-1 p-3 rounded-md border border-base-300 bg-base-100 flex items-center justify-between">
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
          <div className="text-sm">
            <div className="font-medium">SSO Status</div>
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
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => checkSsoFlow()}
          disabled={!!ssoChecking}
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Re-check
        </button>
      </div>

      <div className="divider my-1"></div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => listSecrets(false)}
        >
          <List className="h-4 w-4 mr-1" /> List Secrets
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => listSecrets(true)}
        >
          <RefreshCcw className="h-4 w-4 mr-1" /> Force Reload
        </button>
      </div>
    </div>
  );
}
