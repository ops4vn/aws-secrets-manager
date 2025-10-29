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

      const ok = await deps.checkSso(profile);
      if (ok) {
        setSsoValid(true);
        setSsoChecking(false);
        setStatus?.("SSO valid");
        pushLog?.("SSO valid");
        return true;
      }

      await deps.triggerSsoLogin(profile);
      setStatus?.("Opened SSO login in browser...");
      pushLog?.("Opened SSO login in browser...");

      let valid = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        if (await deps.checkSso(profile)) {
          valid = true;
          break;
        }
      }
      setSsoValid(valid);
      setSsoChecking(false);
      setStatus?.(valid ? "SSO valid" : "SSO still invalid after waiting");
      pushLog?.(valid ? "SSO valid" : "SSO still invalid after waiting");
      return valid;
    },
    [deps]
  );

  return { ssoValid, ssoChecking, checkSsoFlow };
}


