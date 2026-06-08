export type JsonPathItem = { path: string; value: string };

// Recursively flattens a JSON value into dot/bracket leaf paths.
// Shared by the toolbar's "copy by key" and the table view.
export function extractJsonPaths(obj: any, prefix: string = ""): JsonPathItem[] {
  const items: JsonPathItem[] = [];
  if (obj !== null && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => {
        items.push(...extractJsonPaths(v, `${prefix}[${i}]`));
      });
    } else {
      Object.keys(obj).forEach((k) => {
        const p = prefix ? `${prefix}.${k}` : k;
        const v = (obj as any)[k];
        if (v !== null && typeof v === "object") {
          items.push(...extractJsonPaths(v, p));
        } else {
          items.push({ path: p, value: String(v) });
        }
      });
    }
  } else {
    items.push({ path: prefix || "$", value: String(obj) });
  }
  return items;
}
