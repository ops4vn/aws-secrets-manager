import {
  AlarmClock,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { Select } from "../components/Select";
import { Button } from "../components/Button";

export function ProfilesSection() {
  const {
    profiles,
    selectedProfile,
    defaultProfile,
    setSelectedProfile,
    ssoValid,
    ssoChecking,
    checkSsoFlow,
    saveDefault,
  } = useProfileStore();

  const hasProfile = (selectedProfile ?? defaultProfile) != null;
  const StatusIcon = ssoChecking
    ? AlarmClock
    : ssoValid === true
    ? CheckCircle2
    : ssoValid === false
    ? XCircle
    : Circle;

  const statusColor = ssoChecking
    ? "text-warning"
    : ssoValid === true
    ? "text-success"
    : ssoValid === false
    ? "text-error"
    : "text-base-content/50";

  const statusText = ssoChecking
    ? "Checking..."
    : ssoValid === true
    ? "Valid"
    : ssoValid === false
    ? "Invalid"
    : "Unknown";

  return (
    <div className="bg-base-100 border border-base-300 rounded-md p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold">Profiles</h2>
          {defaultProfile && (
            <div className="badge badge-ghost badge-xs" title="Default profile">
              Default: {defaultProfile}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          <div className="text-right leading-tight">
            <div className="font-medium">SSO</div>
            <div className="opacity-70">{statusText}</div>
          </div>
        </div>
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
              size="xs"
              value={selectedProfile ?? defaultProfile ?? profiles[0] ?? ""}
              onChange={(value) => setSelectedProfile(value)}
              className="flex-1"
              options={profiles.map((p) => ({ value: p, label: p }))}
            />
            <Button
              size="xs"
              variant="ghost"
              onClick={() => saveDefault()}
              disabled={!selectedProfile && !defaultProfile}
            >
              <Star className="h-4 w-4 mr-1" /> Set default
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="bg-[#FF9900] hover:bg-[#e58a00] text-white border-none"
              onClick={() => {
                void checkSsoFlow();
              }}
              disabled={!hasProfile || !!ssoChecking}
              loading={ssoChecking}
              title={
                !hasProfile
                  ? "Please select a profile first"
                  : ssoChecking
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
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

