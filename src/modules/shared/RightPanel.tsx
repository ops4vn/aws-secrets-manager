import {
  FileText,
  Search,
  Folder,
  XCircle,
  BookOpen,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  results: string[];
  allNames: string[];
  onSelect: (name: string) => void;
  onForceReload: () => void;
};

export function RightPanel({
  searchQuery,
  setSearchQuery,
  results,
  allNames,
  onSelect,
  onForceReload,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Debounce input to avoid lag when filtering large lists
  const [localQuery, setLocalQuery] = useState<string>(searchQuery);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(localQuery), 250);
    return () => clearTimeout(id);
  }, [localQuery]);
  const trimmed = localQuery.trim();
  return (
    <div className="flex flex-col gap-3" ref={panelRef}>
      <div className="sticky top-0 z-20 px-4 bg-base-100/95 supports-[backdrop-filter]:bg-base-100/80 backdrop-blur border-b border-base-300 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Secrets</h2>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost btn-xs"
              title="Search"
              onClick={() => setShowSearch((s) => !s)}
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
              onClick={onForceReload}
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="flex items-center gap-2 mt-2">
            <div className="join w-full">
              <input
                className="input input-bordered join-item input-sm w-full"
                placeholder="Search..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
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

        <div className="divider my-1"></div>
      </div>

      {trimmed ? (
        <div className="space-y-1">
          <div className="opacity-70 text-sm">
            📄 {results.length} result(s)
          </div>
          <div>
            {results.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 py-2 px-2 border-b border-base-200 hover:bg-base-200/50 rounded"
              >
                <FileText className="h-4 w-4" />
                <button
                  className="text-left text-base-content hover:text-primary w-full whitespace-normal break-words"
                  onClick={() => onSelect(name)}
                >
                  <span className="text-base-content/70">{name}</span>
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onSelect(name)}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" /> Get
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="opacity-70 text-sm mb-2">Tree view</div>
          <ul className="menu bg-base-100 rounded-box w-full">
            {groupByTree(allNames).map((node) => (
              <TreeNode
                key={node.name + node.full}
                node={node}
                onSelect={onSelect}
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
}: {
  node: Node;
  onSelect: (name: string) => void;
}) {
  if (!node.children || node.children.length === 0) {
    return (
      <li className="w-full">
        <button
          onClick={() => onSelect(node.full)}
          className="hover:bg-base-200/60 rounded w-full text-left py-2 px-2"
        >
          <FileText className="inline h-3.5 w-3.5 mr-2 align-top" />
          <span className="text-base-content/70 whitespace-normal break-words align-top">
            {node.name}
          </span>
        </button>
      </li>
    );
  }
  return (
    <li className="w-full">
      <details className="group">
        <summary className="w-full py-2 px-2 flex items-center gap-2 cursor-pointer select-none">
          <Folder className="h-4 w-4" />
          <span className="text-base-content/80 whitespace-normal break-words">
            {node.name}
          </span>
        </summary>
        <ul className="pl-4">
          {node.children.map((c) => (
            <TreeNode key={c.name + c.full} node={c} onSelect={onSelect} />
          ))}
        </ul>
      </details>
    </li>
  );
}
