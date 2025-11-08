import type { EditorTab } from "../types";

export function getTabDisplayName(
  secretId: string,
  allTabs: EditorTab[]
): string {
  if (secretId.includes("/")) {
    const parts = secretId.split("/");
    const lastSegment = parts[parts.length - 1];
    const sameLastSegment = allTabs.filter(
      (t) => t.secretId.split("/").pop() === lastSegment
    );
    if (sameLastSegment.length > 1) {
      const commonPrefix = findCommonPrefix(
        sameLastSegment.map((t) => t.secretId)
      );
      if (commonPrefix && secretId.startsWith(commonPrefix)) {
        return secretId.slice(commonPrefix.length).replace(/^\//, "");
      }
      if (parts.length >= 2) {
        return `${parts[parts.length - 2]}/${lastSegment}`;
      }
    }
    return lastSegment;
  }
  return secretId;
}

export function findCommonPrefix(strings: string[]): string | null {
  if (strings.length === 0) return null;
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix.length === 0) return null;
  }
  const lastSlash = prefix.lastIndexOf("/");
  if (lastSlash > 0) {
    return prefix.substring(0, lastSlash + 1);
  }
  return null;
}

export function isProdSecret(secretId: string): boolean {
  return /prod/i.test(secretId);
}

