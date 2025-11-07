import {
  FileText,
  Search,
  Folder,
  XCircle,
  RefreshCcw,
  LockOpen,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProfileStore } from "../store/useProfileStore";
import { useSecretsListStore } from "../store/useSecretsListStore";
import { useEditorStore } from "../store/useEditorStore";

export function RightPanel() {
  const { selectedProfile, defaultProfile } = useProfileStore();
  const {
    searchQuery,
    setSearchQuery,
    allNames,
    secretMetadata,
    listSecrets,
  } = useSecretsListStore();
  const { fetchSecretById, setSecretId } = useEditorStore();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [localQuery, setLocalQuery] = useState<string>(searchQuery);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const trimmed = useMemo(() => localQuery.trim(), [localQuery]);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(localQuery), 250);
    return () => clearTimeout(id);
  }, [localQuery, setSearchQuery]);

  const results = trimmed
    ? allNames.filter((n) => n.toLowerCase().includes(trimmed.toLowerCase()))
    : [];

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

  return (
    <div className="flex flex-col gap-3" ref={panelRef}>
      <div className="sticky top-0 z-20 bg-base-100/95 supports-backdrop-filter:bg-base-100/80 backdrop-blur border-base-300 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-primary text-md font-semibold">Secrets</h2>
          <div className="flex items-center gap-1">
            <button
              className={`btn btn-ghost btn-xs ${
                showSearch ? "btn-active" : ""
              }`}
              title="Search"
              onClick={() => handleSetSearchShow()}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              className="btn btn-ghost btn-xs"
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
            </button>
            <button
              className="btn btn-ghost btn-xs text-error"
              title="Force reload"
              onClick={() => {
                const profile = selectedProfile ?? defaultProfile;
                listSecrets(profile, true);
              }}
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="flex items-center gap-2 mt-2">
            <div className="join w-full">
              <input
                className="input focus:outline-none focus:border-primary join-item input-sm w-full"
                placeholder="Search..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                ref={searchInputRef}
                autoComplete="false"
              />
              {trimmed && (
                <button
                  aria-label="Clear search"
                  className="join-item btn btn-sm btn-ghost"
                  onClick={() => setLocalQuery("")}
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
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
            {results.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 py-2 px-2 border-b border-base-200 hover:bg-base-200/50 rounded"
              >
                <FileText className="h-4 w-4" />
                <button
                  className="text-left text-base-content hover:text-primary w-full whitespace-normal wrap-break-word"
                  onClick={() => handleSelect(name)}
                >
                  <span className="text-sm text-base-content/80">{name}</span>
                </button>
                {secretMetadata[name] === true && (
                  <span className="badge badge-xs badge-warning">BINARY</span>
                )}
                {secretMetadata[name] === false && (
                  <span className="badge badge-xs badge-info">JSON</span>
                )}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleSelect(name)}
                >
                  <LockOpen className="h-3.5 w-3.5 mr-1" /> Get
                </button>
              </div>
            ))}
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
