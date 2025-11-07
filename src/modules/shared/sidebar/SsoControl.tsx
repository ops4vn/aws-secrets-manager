import {
  AlarmClock,
  CheckCircle2,
  Circle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { useLogsStore } from "../../store/useLogsStore";

export function SsoControl() {
  const { pushInfo, pushError, pushSuccess, pushWarn } = useLogsStore();
  const {
    ssoValid,
    ssoChecking,
    checkSsoFlow,
    triggerSsoLogin,
  } = useProfileStore();

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
        {ssoValid === false && !ssoChecking && (
          <button
            className="btn btn-link btn-xs no-underline"
            onClick={async () => {
              await triggerSsoLogin(pushWarn, pushInfo, pushError);
              setTimeout(() => {
                void checkSsoFlow(pushWarn, pushInfo, pushSuccess, pushError);
              }, 3000);
            }}
          >
            Login
          </button>
        )}
        <button
          className="btn btn-sm bg-[#FF9900] hover:bg-[#e58a00] text-white border-none"
          onClick={() =>
            checkSsoFlow(pushWarn, pushInfo, pushSuccess, pushError)
          }
          disabled={!!ssoChecking}
          title={
            ssoChecking
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
      </div>
    </div>
  );
}

