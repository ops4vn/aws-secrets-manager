import {
  AlarmClock,
  CheckCircle2,
  Circle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";

export function SsoControl() {
  const {
    profiles,
    selectedProfile,
    defaultProfile,
    ssoValid,
    ssoChecking,
    checkSsoFlow,
    triggerSsoLogin,
  } = useProfileStore();
  
  const hasProfile = (selectedProfile ?? defaultProfile) != null;

  return (
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
        {profiles.length === 0 ? (
          <span className="text-xs text-base-content/50">No profile available</span>
        ) : !hasProfile ? (
          <span className="text-xs text-base-content/50">Please select a profile</span>
        ) : (
          <>
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
              disabled={!!ssoChecking || !hasProfile}
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
            </button>
          </>
        )}
      </div>
    </div>
  );
}

