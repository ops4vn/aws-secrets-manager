import { Plus, Upload, Search } from "lucide-react";
import { useEditorStore } from "../store/useEditorStore";
import { useUiStore } from "../store/useUiStore";
import { useRef } from "react";
import { Button } from "./components/Button";
import { GlobalSearchModal } from "./GlobalSearchModal";

export function TopBar() {
  const {
    setSecretId,
    isEditing,
    startCreateNew: startCreateNewEditor,
    setEditorContent,
    setIsBinary,
    setImportedBinary,
  } = useEditorStore();
  const setGlobalSearchOpen = useUiStore((s) => s.setGlobalSearchOpen);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Determine if file is JSON
      let importSecretId = file.name.replace(/\.json$/, "").replace(/_/g, "/");
      let importContent = "";
      let isBinary = false;

      const isJsonFile =
        file.type === "application/json" ||
        file.name.toLowerCase().endsWith(".json");
      if (isJsonFile) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          // Extract secret ID and content
          importSecretId = (data?.secretId as string) || importSecretId;
          if (
            data &&
            typeof data === "object" &&
            ("content" in data || "value" in data)
          ) {
            const raw = (data as any).content ?? (data as any).value;
            importContent =
              typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
            isBinary = false;
          } else {
            // New format: entire JSON is the content
            importContent = JSON.stringify(data, null, 2);
            isBinary = false;
          }
        } catch {
          // Not valid JSON despite extension/MIME, treat as binary
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          importContent = btoa(binary);
          isBinary = true;
        }
      } else {
        // Binary file → base64 encode
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i]);
        importContent = btoa(binary);
        isBinary = true;
      }

      // Switch to create/edit mode first (before setting content)
      startCreateNewEditor();

      // Then set the content and secret IDs
      setSecretId(importSecretId);
      if (isBinary) {
        setImportedBinary({
          name: file.name,
          size: file.size,
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
      console.error("Failed to import JSON:", error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4 gap-4">
      <div className="flex-1" />

      <div className="flex-1 flex justify-center">
        <button
          className="btn btn-sm btn-ghost border border-base-300 normal-case font-normal text-base-content/60 w-full max-w-md justify-start gap-2"
          onClick={() => setGlobalSearchOpen(true)}
          title="Search secrets (Ctrl/⌘ + F)"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search secrets...</span>
          <kbd className="kbd kbd-sm">⌘F</kbd>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={isEditing}
          title={isEditing ? "Finish current edit first" : ""}
          onClick={() => startCreateNewEditor()}
        >
          <Plus className="h-4 w-4 mr-1" /> New JSON Secret
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isEditing}
          title={isEditing ? "Finish current edit first" : "Import JSON file"}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" /> Import Binary Secret
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileSelect}
      />

      <GlobalSearchModal />
    </div>
  );
}
