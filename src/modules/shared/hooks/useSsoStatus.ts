import { useCallback, useState } from "react";

type CheckDeps = {
  checkSso: (profile: string) => Promise<boolean>;
  triggerSsoLogin: (profile: string) => Promise<boolean>;
};

export function useSsoStatus(deps: CheckDeps) {
  const [ssoValid, setSsoValid] = useState<boolean | null>(null);
  const [ssoChecking, setSsoChecking] = useState<boolean>(false);

  const checkSsoFlow = useCallback(
    async (
      profile: string | null | undefined,
      setStatus?: (s: string) => void,
      pushLog?: (s: string) => void
    ) => {
      if (!profile) {
        setStatus?.("No profile selected");
        pushLog?.("No profile selected");
        return false;
      }
      setSsoChecking(true);
      setStatus?.("Checking SSO...");
      pushLog?.("Checking SSO...");

      let ok = false;
      try {
        ok = await deps.checkSso(profile);
      } catch (err: any) {
        const msg = typeof err === "string" ? err : err?.message ?? "SSO check failed";
        setStatus?.(msg);
        pushLog?.(msg);
        ok = false;
      }
      if (ok) {
        setSsoValid(true);
        setSsoChecking(false);
        setStatus?.("SSO valid");
        pushLog?.("SSO valid");
        return true;
      }

      // Không tự động mở trình duyệt. Trả về false để UI quyết định khi nào gọi triggerSsoLogin.
      setSsoValid(false);
      setSsoChecking(false);
      setStatus?.("SSO invalid");
      pushLog?.("SSO invalid");
      return false;
    },
    [deps]
  );

  return { ssoValid, ssoChecking, checkSsoFlow };
}


