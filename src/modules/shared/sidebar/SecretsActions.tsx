import { List, RefreshCcw } from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { useSecretsListStore } from "../../store/useSecretsListStore";
import { useLogsStore } from "../../store/useLogsStore";

export function SecretsActions() {
  const { pushInfo, pushWarn, pushSuccess } = useLogsStore();
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { listSecrets } = useSecretsListStore();

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-primary btn-sm flex-1"
        onClick={() => {
          const profile = selectedProfile ?? defaultProfile;
          listSecrets(profile, pushInfo, pushWarn, pushSuccess, false);
        }}
      >
        <List className="h-4 w-4 mr-1" /> List Secrets
      </button>
      <button
        className="btn btn-primary btn-sm flex-1"
        onClick={() => {
          const profile = selectedProfile ?? defaultProfile;
          listSecrets(profile, pushInfo, pushWarn, pushSuccess, true);
        }}
      >
        <RefreshCcw className="h-4 w-4 mr-1" /> Force Reload
      </button>
    </div>
  );
}

