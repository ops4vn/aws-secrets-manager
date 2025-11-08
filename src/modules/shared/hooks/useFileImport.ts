import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile, readFile } from "@tauri-apps/plugin-fs";
import { useEditorStore } from "../../store/useEditorStore";

export function useFileImport() {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isProcessingFileRef = useRef<boolean>(false);
  const {
    setSecretId,
    startCreateNew: startCreateNewEditor,
    setEditorContent,
    setIsBinary,
    setImportedBinary,
  } = useEditorStore();

  const handleFileImport = useCallback(async (filePath: string) => {
    if (isProcessingFileRef.current) {
      return;
    }
    isProcessingFileRef.current = true;

    try {
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      let importSecretId = fileName.replace(/\.json$/, "").replace(/_/g, "/");
      let importContent = "";
      let isBin = false;

      const isJsonFile = fileName.toLowerCase().endsWith(".json");
      
      if (isJsonFile) {
        try {
          const text = await readTextFile(filePath);
          try {
            const data = JSON.parse(text);
            importSecretId = (data?.secretId as string) || importSecretId;
            if (
              data &&
              typeof data === "object" &&
              ("content" in data || "value" in data)
            ) {
              const raw = (data as any).content ?? (data as any).value;
              importContent =
                typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
              isBin = false;
            } else {
              importContent = JSON.stringify(data, null, 2);
              isBin = false;
            }
          } catch {
            // Not valid JSON, treat as binary
            const binaryData = await readFile(filePath);
            const bytes = new Uint8Array(binaryData);
            let binary = "";
            for (let i = 0; i < bytes.length; i++)
              binary += String.fromCharCode(bytes[i]);
            importContent = btoa(binary);
            isBin = true;
          }
        } catch {
          // Read as binary if text read fails
          const binaryData = await readFile(filePath);
          const bytes = new Uint8Array(binaryData);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          importContent = btoa(binary);
          isBin = true;
        }
      } else {
        // Binary file
        const binaryData = await readFile(filePath);
        const bytes = new Uint8Array(binaryData);
        let binary = "";
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i]);
        importContent = btoa(binary);
        isBin = true;
      }

      startCreateNewEditor();
      setSecretId(importSecretId);
      if (isBin) {
        // Get file size
        const binaryData = await readFile(filePath);
        setImportedBinary({
          name: fileName,
          size: binaryData.length,
          base64: importContent,
        });
        setIsBinary(true);
        setEditorContent("");
      } else {
        setImportedBinary(null);
        setIsBinary(false);
        setEditorContent(importContent);
      }

      setTimeout(() => {
        const secretIdInput = document.querySelector(
          'input[placeholder="my/app/secret"]'
        ) as HTMLInputElement;
        secretIdInput?.focus();
        secretIdInput?.select();
      }, 100);
    } catch (error) {
      console.error("Failed to import file:", error);
    } finally {
      isProcessingFileRef.current = false;
    }
  }, [setSecretId, setEditorContent, setIsBinary, setImportedBinary]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let lastDropTime = 0;
    const DROP_DEBOUNCE_MS = 500;
    
    const setupFileDrop = async () => {
      const unlisten = await appWindow.onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          setIsDragging(true);
        } else if (event.payload.type === 'drop') {
          setIsDragging(false);
          const filePaths = event.payload.paths;
          if (filePaths.length === 0) return;
          
          const now = Date.now();
          if (now - lastDropTime < DROP_DEBOUNCE_MS) {
            return;
          }
          lastDropTime = now;
          
          const filePath = filePaths[0];
          handleFileImport(filePath);
        } else if (event.payload.type === 'leave') {
          setIsDragging(false);
        }
      });

      return unlisten;
    };

    let cleanup: (() => void) | null = null;
    setupFileDrop().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [handleFileImport]);

  return {
    isDragging,
    handleFileImport,
  };
}

