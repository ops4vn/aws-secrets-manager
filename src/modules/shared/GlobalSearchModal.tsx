import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Clock } from "lucide-react";
import { useProfileStore } from "../store/useProfileStore";
import { useSecretsListStore } from "../store/useSecretsListStore";
import { useEditorStore } from "../store/useEditorStore";
import { useBookmarksStore } from "../store/useBookmarksStore";
import { useUiStore } from "../store/useUiStore";
import { Modal } from "./components/Modal";
import { Input } from "./components/Input";
import { HighlightedSecretName } from "./components/HighlightedSecretName";
import { filterSecrets } from "./utils/secretSearch";

// Center-screen command-palette style search (Cmd/Ctrl+F). Same matching logic
// as the right-sidebar search; opens the selected secret in the editor. When
// the query is empty it shows Recents.
export function GlobalSearchModal() {
  const open = useUiStore((s) => s.globalSearchOpen);
  const setOpen = useUiStore((s) => s.setGlobalSearchOpen);
  const { allNames, secretMetadata } = useSecretsListStore();
  const recentSecrets = useBookmarksStore((s) => s.recentSecrets);
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { fetchSecretById, setSecretId } = useEditorStore();

  const MAX_RESULTS = 100;

  const [query, setQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [matchWord, setMatchWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep typing instant: the input reflects `query` immediately, while the
  // (expensive) filtered/rendered list is computed from the deferred value at
  // lower priority. `isStale` is true while the list is catching up.
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const isStale = query !== deferredQuery;

  const results = useMemo(() => {
    if (!trimmed) return recentSecrets;
    return filterSecrets(allNames, trimmed, { useRegex, matchWord, caseSensitive });
  }, [trimmed, allNames, recentSecrets, useRegex, matchWord, caseSensitive]);

  // Only render a bounded number of rows — rendering thousands of rows per
  // keystroke is what makes search feel laggy.
  const shown = useMemo(() => results.slice(0, MAX_RESULTS), [results]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [trimmed, useRegex, matchWord, caseSensitive]);

  const handleSelect = async (name: string) => {
    setOpen(false);
    setSecretId(name);
    const profile = selectedProfile ?? defaultProfile;
    await fetchSecretById(name, profile);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const name = shown[highlight];
      if (name) void handleSelect(name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Search secrets" size="xl">
      <div onKeyDown={onKeyDown}>
        <div className="relative">
          <Input
            ref={inputRef}
            size="sm"
            placeholder="Search secrets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full pr-8"
          />
          {isStale && (
            <span className="loading loading-spinner loading-xs absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs mt-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
            />
            <span className="text-base-content/70">Regex</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={matchWord}
              onChange={(e) => setMatchWord(e.target.checked)}
            />
            <span className="text-base-content/70">Word</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span className="text-base-content/70">Aa</span>
          </label>
        </div>

        <div
          className={`mt-3 max-h-[50vh] overflow-auto transition-opacity ${
            isStale ? "opacity-60" : ""
          }`}
        >
          {!trimmed && recentSecrets.length > 0 && (
            <div className="text-xs opacity-60 px-1 py-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Recent
            </div>
          )}
          {shown.length === 0 ? (
            <div className="text-sm opacity-60 px-2 py-6 text-center">
              {trimmed ? "No results" : "No recent secrets"}
            </div>
          ) : (
            <>
              {shown.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`flex items-center gap-2 w-full text-left px-2 py-2 rounded ${
                    idx === highlight ? "bg-base-200" : "hover:bg-base-200/50"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="text-sm flex-1 truncate">
                    <HighlightedSecretName name={name} searchQuery={trimmed} />
                  </span>
                  {secretMetadata[name] === true && (
                    <span className="badge badge-xs badge-warning">BINARY</span>
                  )}
                  {secretMetadata[name] === false && (
                    <span className="badge badge-xs badge-info">JSON</span>
                  )}
                </button>
              ))}
              {results.length > MAX_RESULTS && (
                <div className="text-xs opacity-50 px-2 py-2 text-center">
                  Showing first {MAX_RESULTS} of {results.length} — refine your
                  search
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default GlobalSearchModal;
