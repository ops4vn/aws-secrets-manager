import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { HighlightedContent } from "./HighlightedContent";

type Props = {
  content: string;
  isEditing: boolean;
  isBinary: boolean;
  isDarkTheme: boolean;
  wrap: boolean;
  isDecoded: boolean;
  onChange: (value: string) => void;
  editorViewRef: React.RefObject<EditorView | null>;
};

export function EditorContent({
  content,
  isEditing,
  isBinary,
  isDarkTheme,
  wrap,
  isDecoded,
  onChange,
  editorViewRef,
}: Props) {
  if (isEditing) {
    return (
      <div className="border border-base-300 rounded-md overflow-hidden flex-1 min-h-0">
        <CodeMirror
          value={content}
          height="100%"
          theme={isDarkTheme ? oneDark : undefined}
          extensions={
            [isBinary ? [] : jsonLang(), EditorView.lineWrapping] as any
          }
          basicSetup={{
            lineNumbers: true,
            autocompletion: true,
            foldGutter: true,
          }}
          onChange={(val) => onChange(val)}
          onCreateEditor={(view) => {
            editorViewRef.current = view;
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <HighlightedContent
        content={content}
        wrap={wrap}
        isBinary={isBinary}
        isDecoded={isDecoded}
      />
    </div>
  );
}

