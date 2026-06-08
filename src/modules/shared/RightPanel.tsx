import {
  FileText,
  Search,
  Folder,
  XCircle,
  RefreshCcw,
  LockOpen,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useProfileStore } from "../store/useProfileStore";
import { useSecretsListStore } from "../store/useSecretsListStore";
import { useEditorStore } from "../store/useEditorStore";
import { api } from "../services/tauriApi";
import { useLogsStore } from "../store/useLogsStore";
import { Input } from "./components/Input";
import { Button } from "./components/Button";
import { filterSecrets } from "./utils/secretSearch";
import { SecretDetailsPanel } from "./SecretDetailsPanel";
import { HighlightedSecretName } from "./components/HighlightedSecretName";

export function RightPanel() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const {
    searchQuery,
    setSearchQuery,
    allNames,
    secretMetadata,
    deletedSecrets,
    listSecrets,
    listDeletedSecrets,
  } = useSecretsListStore();
  const { fetchSecretById, setSecretId } = useEditorStore();
  const { pushInfo, pushError, pushSuccess } = useLogsStore();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [localQuery, setLocalQuery] = useState<string>(searchQuery);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  // Search options
  const [useRegex, setUseRegex] = useState<boolean>(false);
  const [matchWord, setMatchWord] = useState<boolean>(false);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const trimmed = useMemo(() => localQuery.trim(), [localQuery]);
  // Filtering/rendering runs against the deferred query so typing stays smooth.
  const deferredTrimmed = useDeferredValue(trimmed);
  const profile = selectedProfile ?? defaultProfile;

  const MAX_RESULTS = 200;

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(localQuery), 250);
    return () => clearTimeout(id);
  }, [localQuery, setSearchQuery]);

  useEffect(() => {
    if (profile && showDeleted) {
      listDeletedSecrets(profile);
    }
  }, [profile, showDeleted, listDeletedSecrets]);

  const results = useMemo(
    () =>
      filterSecrets(allNames, deferredTrimmed, {
        useRegex,
        matchWord,
        caseSensitive,
      }),
    [deferredTrimmed, allNames, useRegex, matchWord, caseSensitive]
  );
  const shownResults = useMemo(
    () => results.slice(0, MAX_RESULTS),
    [results]
  );

  const handleSetSearchShow = useCallback(() => {
    setShowSearch((s) => {
      const newState = !s;
      if (newState) {
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 100);
      }
      return newState;
    });
  }, []);

  const handleSelect = useCallback(
    async (name: string) => {
      setSecretId(name);
      const profile = selectedProfile ?? defaultProfile;
      await fetchSecretById(name, profile);
    },
    [
      setSecretId,
      fetchSecretById,
      selectedProfile,
      defaultProfile,
    ]
  );

  const handleRestore = useCallback(
    async (secretId: string) => {
      if (!profile) {
        pushError("No profile selected");
        return;
      }
      try {
        pushInfo(`Restoring secret: ${secretId}`);
        await api.restoreSecret(profile, secretId);
        pushSuccess(`Restored secret: ${secretId}`);
        
        // Reload deleted secrets và active secrets
        await listDeletedSecrets(profile);
        await listSecrets(profile, true);
      } catch (error) {
        const errorMsg = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
        pushError(`Failed to restore secret: ${errorMsg}`);
      }
    },
    [profile, pushInfo, pushError, pushSuccess, listDeletedSecrets, listSecrets]
  );

  return (
    <div className="flex flex-col" ref={panelRef}>
      <SecretDetailsPanel />
      <div className="sticky top-0 z-20 bg-base-100/95 supports-backdrop-filter:bg-base-100/80 backdrop-blur border-base-300 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-primary text-md font-semibold">Secrets</h2>
          <div className="flex items-center gap-1">
            <Button
              size="xs"
              variant="ghost"
              square
              active={showSearch}
              title="Search"
              onClick={() => handleSetSearchShow()}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              size="xs"
              variant="ghost"
              square
              title="Collapse all"
              onClick={() => {
                const root = panelRef.current;
                if (!root) return;
                root
                  .querySelectorAll("details")
                  .forEach(
                    (d: Element) => ((d as HTMLDetailsElement).open = false)
                  );
              }}
            >
              <Folder className="h-4 w-4" />
            </Button>
            <Button
              size="xs"
              variant="ghost"
              square
              className="text-error"
              title="Force reload"
              onClick={() => {
                const profile = selectedProfile ?? defaultProfile;
                listSecrets(profile, true);
                if (showDeleted) {
                  listDeletedSecrets(profile);
                }
              }}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button
              size="xs"
              variant="ghost"
              square
              active={showDeleted}
              title="Show deleted secrets"
              onClick={() => {
                setShowDeleted(!showDeleted);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSearch && (
          <div className="mt-2 space-y-2">
            <div className="join w-full">
              <Input
                size="sm"
                isJoinItem
                placeholder="Search..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                ref={searchInputRef}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full"
              />
              {trimmed && (
                <Button
                  size="sm"
                  variant="ghost"
                  square
                  className="join-item"
                  aria-label="Clear search"
                  onClick={() => setLocalQuery("")}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* Search options */}
            <div className="flex flex-wrap gap-3 text-xs">
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
          </div>
        )}
      </div>

      {trimmed ? (
        <div className="space-y-1">
          <div className="text-sm flex items-center justify-start gap-2">
            <FileText className="inline h-3.5 w-3.5" />{" "}
            <span className="text-primary font-semibold">{results.length}</span>{" "}
            result(s)
          </div>
          <div>
            {shownResults.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 py-2 px-2 border-b border-base-200 hover:bg-base-200/50 rounded"
              >
                <FileText className="h-4 w-4" />
                <button
                  className="text-left text-base-content hover:text-primary w-full whitespace-normal wrap-break-word"
                  onClick={() => handleSelect(name)}
                >
                  <span className="text-sm text-base-content/80">
                    <HighlightedSecretName name={name} searchQuery={deferredTrimmed} />
                  </span>
                </button>
                {secretMetadata[name] === true && (
                  <span className="badge badge-xs badge-warning">BINARY</span>
                )}
                {secretMetadata[name] === false && (
                  <span className="badge badge-xs badge-info">JSON</span>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleSelect(name)}
                >
                  <LockOpen className="h-3.5 w-3.5 mr-1" /> Get
                </Button>
              </div>
            ))}
            {results.length > MAX_RESULTS && (
              <div className="text-xs text-base-content/50 px-2 py-2 text-center">
                Showing first {MAX_RESULTS} of {results.length} — refine your search
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <ul className="menu bg-base-100 rounded-box w-full">
            {groupByTree(allNames).map((node) => (
              <TreeNode
                key={node.name + node.full}
                node={node}
                onSelect={handleSelect}
                secretMetadata={secretMetadata}
              />
            ))}
          </ul>
          
          {showDeleted && (
            <div className="mt-4 border-t border-base-300 pt-4">
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-sm font-semibold text-base-content/70 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Deleted Secrets ({deletedSecrets.length})
                </h3>
              </div>
              {deletedSecrets.length === 0 ? (
                <div className="text-xs text-base-content/50 px-2 py-4 text-center">
                  No deleted secrets
                </div>
              ) : (
                <ul className="menu bg-base-100 rounded-box w-full">
                  {deletedSecrets.map((name) => (
                    <li key={name} className="w-full">
                      <div className="flex items-center gap-2 p-1.5 hover:bg-base-200/60 rounded">
                        <FileText className="h-3.5 w-3.5 text-base-content/50" />
                        <span className="text-base-content/50 text-sm flex-1 truncate">
                          {name}
                        </span>
                        <Button
                          size="xs"
                          variant="ghost"
                          square
                          className="text-success"
                          onClick={() => handleRestore(name)}
                          title="Restore secret"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Node = { name: string; full: string; children?: Node[] };

function groupByTree(names: string[]): Node[] {
  const root: any = { children: {} };
  for (const full of names) {
    const parts = full.split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      cur.children[p] = cur.children[p] || { name: p, full, children: {} };
      cur = cur.children[p];
    }
  }
  const toList = (n: any): Node[] =>
    Object.values(n.children || {}).map((c: any) => ({
      name: c.name,
      full: c.full,
      children: Object.keys(c.children || {}).length ? toList(c) : undefined,
    }));
  return toList(root);
}

function TreeNode({
  node,
  onSelect,
  secretMetadata,
}: {
  node: Node;
  onSelect: (name: string) => void;
  secretMetadata: Record<string, boolean>;
}) {
  if (!node.children || node.children.length === 0) {
    return (
      <li className="w-full">
        <button
          onClick={() => onSelect(node.full)}
          className="hover:bg-base-200/60 rounded w-full text-left p-1.5 flex items-center"
        >
          <FileText className="inline h-3.5 w-3.5 align-top" />
          <span className="text-base-content/70 whitespace-normal wrap-break-word align-top flex-1">
            {node.name}
          </span>
          {secretMetadata[node.full] === true && (
            <span className="badge badge-xs badge-warning">BINARY</span>
          )}
          {secretMetadata[node.full] === false && (
            <span className="badge badge-xs badge-info">JSON</span>
          )}
        </button>
      </li>
    );
  }
  return (
    <li className="w-full">
      <details className="group">
        <summary className="w-full p-2 flex items-center gap-2 cursor-pointer select-none">
          <Folder className="h-4 w-4" />
          <span className="text-base-content/80 whitespace-normal wrap-break-word">
            {node.name}
          </span>
        </summary>
        <ul className="pl-4">
          {node.children.map((c) => (
            <TreeNode
              key={c.name + c.full}
              node={c}
              onSelect={onSelect}
              secretMetadata={secretMetadata}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}
