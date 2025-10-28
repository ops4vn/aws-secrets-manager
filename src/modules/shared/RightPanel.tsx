import { FileText, Search, BookOpen } from "lucide-react";
type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  results: string[];
  onSelect: (name: string) => void;
};

export function RightPanel({
  searchQuery,
  setSearchQuery,
  results,
  onSelect,
}: Props) {
  const trimmed = searchQuery.trim();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Secrets</h2>

      <div className="flex items-center gap-2">
        <div className="join w-full">
          <input
            className="input input-bordered join-item input-sm w-full"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="join-item btn btn-sm btn-ghost no-animation pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          {trimmed && (
            <button
              className="btn btn-sm join-item"
              onClick={() => setSearchQuery("")}
            >
              ✖
            </button>
          )}
        </div>
      </div>

      <div className="divider my-1"></div>

      {trimmed ? (
        <div className="space-y-1">
          <div className="opacity-70 text-sm">
            📄 {results.length} result(s)
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {results.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 py-1 border-b border-base-200"
              >
                <FileText className="h-4 w-4" />
                <button
                  className="link link-primary text-left truncate"
                  onClick={() => onSelect(name)}
                >
                  {name}
                </button>
                <div className="ml-auto" />
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
          <div className="opacity-70 text-sm mb-2">Tree view (mock)</div>
          <ul className="menu bg-base-100 rounded-box">
            <li>
              <details open>
                <summary>app</summary>
                <ul>
                  <li>
                    <details open>
                      <summary>prod</summary>
                      <ul>
                        <li>
                          <button
                            onClick={() => onSelect("app/prod/db/password")}
                          >
                            <FileText className="inline h-3.5 w-3.5 mr-1" />{" "}
                            db/password
                          </button>
                        </li>
                      </ul>
                    </details>
                  </li>
                </ul>
              </details>
            </li>
            <li>
              <details>
                <summary>service</summary>
                <ul>
                  <li>
                    <details>
                      <summary>dev</summary>
                      <ul>
                        <li>
                          <button
                            onClick={() => onSelect("service/dev/api/key")}
                          >
                            <FileText className="inline h-3.5 w-3.5 mr-1" />{" "}
                            api/key
                          </button>
                        </li>
                      </ul>
                    </details>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
