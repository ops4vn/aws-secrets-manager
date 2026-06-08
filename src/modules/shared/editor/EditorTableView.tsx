import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { extractJsonPaths } from "../utils/jsonPaths";

const MASK = "••••••";

type Props = {
  content: string;
  isEditing: boolean;
  masked?: boolean;
  onChange: (value: string) => void;
};

type Row = { id: number; key: string; value: string; orig: any };

function tryParseObject(s: string): Record<string, any> | null {
  try {
    const p = JSON.parse(s);
    if (p && typeof p === "object" && !Array.isArray(p)) return p;
  } catch {
    /* ignore */
  }
  return null;
}

function isFlatObject(obj: Record<string, any>): boolean {
  return Object.values(obj).every((v) => v === null || typeof v !== "object");
}

// Table view of a JSON-object secret. Flat objects are editable (add/remove/edit
// rows, values stored as strings); nested objects render as read-only flattened
// dot-path rows (edit nested data in JSON view).
export function EditorTableView({ content, isEditing, masked = false, onChange }: Props) {
  const parsed = tryParseObject(content);
  const flat = parsed ? isFlatObject(parsed) : false;
  const editable = isEditing && flat && parsed !== null;

  // Local row state used only in editable mode. Reseeded when content changes
  // from outside (tab switch, entering edit); our own emits are skipped via ref.
  const [rows, setRows] = useState<Row[]>([]);
  const nextId = useRef(0);
  const lastEmitted = useRef<string>("");

  useEffect(() => {
    if (!editable) return;
    if (content === lastEmitted.current) return;
    const obj = tryParseObject(content);
    if (!obj) return;
    setRows(
      Object.entries(obj).map(([k, v]) => ({
        id: nextId.current++,
        key: k,
        value: v === null ? "" : String(v),
        orig: v,
      }))
    );
    lastEmitted.current = content;
  }, [content, editable]);

  if (!parsed) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-base-content/50 border border-base-300 rounded-md">
        Table view is only available for JSON objects. Use JSON view.
      </div>
    );
  }

  const emit = (next: Row[]) => {
    const obj: Record<string, any> = {};
    for (const r of next) {
      if (!r.key) continue;
      // Keep untouched non-string scalars typed; edited cells become strings.
      obj[r.key] =
        typeof r.orig !== "string" && r.value === String(r.orig ?? "")
          ? r.orig
          : r.value;
    }
    const json = JSON.stringify(obj, null, 2);
    lastEmitted.current = json;
    onChange(json);
  };

  const updateRow = (id: number, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      emit(next);
      return next;
    });
  };

  const removeRow = (id: number) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      emit(next);
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: nextId.current++, key: "", value: "", orig: "" }]);
  };

  if (editable) {
    return (
      <div className="flex-1 min-h-0 overflow-auto border border-base-300 rounded-md">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="w-1/3">Key</th>
              <th>Value</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="align-top">
                  <Input
                    size="xs"
                    value={r.key}
                    placeholder="key"
                    className="w-full font-mono"
                    onChange={(e) => updateRow(r.id, { key: e.target.value })}
                  />
                </td>
                <td>
                  <Input
                    size="xs"
                    value={r.value}
                    placeholder="value"
                    className="w-full font-mono"
                    onChange={(e) => updateRow(r.id, { value: e.target.value })}
                  />
                </td>
                <td>
                  <Button
                    size="xs"
                    variant="ghost"
                    square
                    title="Remove"
                    onClick={() => removeRow(r.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2">
          <Button size="xs" variant="ghost" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add row
          </Button>
        </div>
      </div>
    );
  }

  // Read-only: flat → key/value; nested → flattened dot-path rows.
  const readRows = flat
    ? Object.entries(parsed).map(([k, v]) => ({
        path: k,
        value: v === null ? "null" : String(v),
      }))
    : extractJsonPaths(parsed);

  return (
    <div className="flex-1 min-h-0 overflow-auto border border-base-300 rounded-md">
      {!flat && (
        <div className="text-xs text-base-content/50 px-3 pt-2">
          Nested object — read-only. Edit in JSON view.
        </div>
      )}
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="w-1/3">Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {readRows.map((r) => (
            <tr key={r.path}>
              <td className="font-mono text-sky-600 align-top break-all">{r.path}</td>
              <td className="font-mono break-all">{masked ? MASK : r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EditorTableView;
