import { List, RefreshCcw } from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { useSecretsListStore } from "../../store/useSecretsListStore";

export function SecretsActions() {
  const { profiles, selectedProfile, defaultProfile } = useProfileStore();
  const { listSecrets } = useSecretsListStore();

  const hasProfile = (selectedProfile ?? defaultProfile) != null;
  const profile = selectedProfile ?? defaultProfile;

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-primary btn-sm flex-1"
        onClick={() => {
          if (profile) {
            listSecrets(profile, false);
          }
        }}
        disabled={!hasProfile || profiles.length === 0}
        title={
          profiles.length === 0
            ? "No AWS profiles found. Please configure AWS CLI profiles first."
            : !hasProfile
            ? "Please select a profile first"
            : "List secrets"
        }
      >
        <List className="h-4 w-4 mr-1" /> List Secrets
      </button>
      <button
        className="btn btn-primary btn-sm flex-1"
        onClick={() => {
          if (profile) {
            listSecrets(profile, true);
          }
        }}
        disabled={!hasProfile || profiles.length === 0}
        title={
          profiles.length === 0
            ? "No AWS profiles found. Please configure AWS CLI profiles first."
            : !hasProfile
            ? "Please select a profile first"
            : "Force reload secrets"
        }
      >
        <RefreshCcw className="h-4 w-4 mr-1" /> Force Reload
      </button>
    </div>
  );
}

