export type SearchOptions = {
  useRegex: boolean;
  matchWord: boolean;
  caseSensitive: boolean;
};

// Shared secret-name matcher used by both the right-panel search and the
// center global-search dialog. Lifted verbatim from RightPanel so both stay
// in sync.
export function filterSecrets(
  names: string[],
  query: string,
  opts: SearchOptions
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { useRegex, matchWord, caseSensitive } = opts;

  return names.filter((name) => {
    try {
      if (useRegex) {
        const flags = caseSensitive ? "g" : "gi";
        const regex = new RegExp(trimmed, flags);
        return regex.test(name);
      }

      const searchName = caseSensitive ? name : name.toLowerCase();
      const searchTerm = caseSensitive ? trimmed : trimmed.toLowerCase();

      if (matchWord) {
        const segments = name.split("/");
        const searchSegments = trimmed.split("/");
        if (caseSensitive) {
          return (
            segments.some((seg) => seg === trimmed) ||
            name === trimmed ||
            (segments.join("/").includes(searchSegments.join("/")) &&
              segments.some((seg) => searchSegments.includes(seg)))
          );
        }
        const lowerSegments = segments.map((s) => s.toLowerCase());
        const lowerSearchTerm = trimmed.toLowerCase();
        return (
          lowerSegments.some((seg) => seg === lowerSearchTerm) ||
          name.toLowerCase() === lowerSearchTerm
        );
      }

      return searchName.includes(searchTerm);
    } catch {
      // Invalid regex, fall back to simple includes
      return name.toLowerCase().includes(trimmed.toLowerCase());
    }
  });
}
