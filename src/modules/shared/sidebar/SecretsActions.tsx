import { List, RefreshCcw } from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { useSecretsListStore } from "../../store/useSecretsListStore";

export function SecretsActions() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { listSecrets } = useSecretsListStore();

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-primary btn-sm flex-1"
        onClick={() => {
          const profile = selectedProfile ?? defaultProfile;
          listSecrets(profile, false);
        }}
      >
        <List className="h-4 w-4 mr-1" /> List Secrets
      </button>
      <button
        className="btn btn-primary btn-sm flex-1"
        onClick={() => {
          const profile = selectedProfile ?? defaultProfile;
          listSecrets(profile, true);
        }}
      >
        <RefreshCcw className="h-4 w-4 mr-1" /> Force Reload
      </button>
    </div>
  );
}

