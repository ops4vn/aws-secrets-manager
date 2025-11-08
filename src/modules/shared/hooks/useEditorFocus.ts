import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";

export function useEditorFocus(
  isCreatingNew: boolean,
  content: string,
  editorViewRef: React.MutableRefObject<EditorView | null>
) {
  useEffect(() => {
    if (isCreatingNew && content === '{\n  ""\n}') {
      const cursorPos = 5;
      const timeoutId = setTimeout(() => {
        if (editorViewRef.current) {
          editorViewRef.current.focus();
          const { state } = editorViewRef.current;
          const transaction = state.update({
            selection: { anchor: cursorPos, head: cursorPos }
          });
          editorViewRef.current.dispatch(transaction);
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isCreatingNew, content, editorViewRef]);
}

