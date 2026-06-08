import { useEffect, useRef } from "react";
import { EditorView, lineNumbers } from "@codemirror/view";
import { json as jsonLang } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { MergeView, unifiedMergeView } from "@codemirror/merge";

type Mode = "split" | "unified";

type Props = {
  original: string;
  modified: string;
  mode: Mode;
  isDarkTheme: boolean;
};

// Inline diff view rendered in place of the editor (not a dialog). Shows the
// pristine content (before editing) vs. the current unsaved draft, either
// side-by-side (MergeView) or unified inline (unifiedMergeView). Read-only.
export function DiffView({ original, modified, mode, isDarkTheme }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const baseExtensions = [
      lineNumbers(),
      jsonLang(),
      EditorView.lineWrapping,
      EditorView.editable.of(false),
      ...(isDarkTheme ? [oneDark] : []),
    ];

    let view: MergeView | EditorView;
    if (mode === "split") {
      view = new MergeView({
        a: { doc: original, extensions: baseExtensions },
        b: { doc: modified, extensions: baseExtensions },
        parent,
        gutter: true,
      });
    } else {
      view = new EditorView({
        doc: modified,
        parent,
        extensions: [
          unifiedMergeView({ original, mergeControls: false }),
          ...baseExtensions,
        ],
      });
    }

    return () => view.destroy();
  }, [original, modified, mode, isDarkTheme]);

  return (
    <div className="flex-1 min-h-0 border border-base-300 rounded-md overflow-auto">
      <div ref={containerRef} className="h-full" />
    </div>
  );
}

export default DiffView;
