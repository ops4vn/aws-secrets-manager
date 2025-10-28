import { useMemo, useState } from "react";
import { SidebarProfiles } from "../shared/SidebarProfiles";
import { TopBar } from "../shared/TopBar";
import { EditorPanel } from "../shared/EditorPanel";
import { LogsStatus } from "../shared/LogsStatus";
import { RightPanel } from "../shared/RightPanel";

export function DashboardPage() {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [defaultProfile, setDefaultProfile] = useState<string | null>(null);
  const [showSecretsTree, setShowSecretsTree] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [secretId, setSecretId] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const profiles = useMemo(() => ["default", "dev", "prod"], []);

  const pushLog = (msg: string) =>
    setLogs((prev) => [...prev, msg].slice(-500));

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0">
      <aside className="w-72 bg-base-100 border-r border-base-300 p-4 overflow-y-auto">
        <SidebarProfiles
          profiles={profiles}
          selectedProfile={selectedProfile ?? defaultProfile ?? "default"}
          onSelect={(p) => setSelectedProfile(p)}
          onSetDefault={() => {
            setDefaultProfile(selectedProfile);
            setStatus("Saved default profile");
            pushLog("Saved default profile");
          }}
          onListSecrets={() => {
            setShowSecretsTree(true);
            setStatus("Listing secrets (mock cache)...");
            pushLog("Listing secrets (mock)");
          }}
          onForceReload={() => {
            setShowSecretsTree(true);
            setStatus("Reloading secrets from AWS (mock)...");
            pushLog("Force reloading secrets (mock)");
          }}
          onCheckSSO={() => {
            setStatus("Checking SSO (mock)...");
            pushLog("Checking SSO (mock)");
            setTimeout(() => {
              setStatus("SSO valid (mock)");
              pushLog("SSO valid (mock)");
            }, 600);
          }}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar
          secretId={secretId}
          setSecretId={setSecretId}
          isEditing={isEditing}
          isCreatingNew={isCreatingNew}
          onGet={() => {
            setStatus("Fetching secret (mock)...");
            pushLog(`Fetching secret: ${secretId}`);
            setTimeout(() => {
              setEditorContent('{"hello":"world"}');
              setIsEditing(false);
              setIsCreatingNew(false);
              setStatus("Fetched string secret (mock)");
              pushLog("Fetched secret (mock)");
            }, 500);
          }}
          onEdit={() => {
            setIsEditing(true);
            setIsCreatingNew(false);
            setStatus("Edit mode enabled");
            pushLog("Switched to edit mode");
          }}
          onNew={() => {
            setIsCreatingNew(true);
            setIsEditing(true);
            setEditorContent("");
            setSecretId("");
            setStatus("Create new secret mode");
            pushLog("Switched to create new secret mode");
          }}
        />

        <section className="flex-1 grid grid-cols-1 min-h-0">
          <EditorPanel
            content={editorContent}
            onChange={setEditorContent}
            isEditing={isEditing}
            onSave={() => {
              setStatus(
                isCreatingNew
                  ? "Creating secret (mock)..."
                  : "Updating secret (mock)..."
              );
              pushLog(
                (isCreatingNew ? "Creating" : "Updating") +
                  ` secret: ${secretId}`
              );
              setTimeout(() => {
                setIsEditing(false);
                setIsCreatingNew(false);
                setStatus(
                  isCreatingNew
                    ? "Created secret (mock)"
                    : "Updated secret (mock)"
                );
                pushLog(
                  isCreatingNew
                    ? "Created secret (mock)"
                    : "Updated secret (mock)"
                );
              }, 600);
            }}
            onCancel={() => {
              setIsEditing(false);
              setIsCreatingNew(false);
              setStatus("Edit cancelled");
              pushLog("Edit mode cancelled");
            }}
          />
        </section>

        <div className="border-t border-base-300">
          <LogsStatus
            logs={logs}
            status={status}
            onClearLogs={() => setLogs([])}
            canDelete={!isCreatingNew && !!secretId}
            onDelete={() => {
              setStatus("Delete clicked (mock)");
              pushLog("Delete clicked (mock)");
            }}
          />
        </div>
      </main>

      {showSecretsTree && (
        <aside className="w-96 bg-base-100 border-l border-base-300 p-4 overflow-y-auto">
          <RightPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            results={[
              "app/prod/db/password",
              "service/dev/api/key",
              "another/secret",
            ]}
            onSelect={(name: string) => {
              setSecretId(name);
              setStatus(`Fetching secret: ${name}`);
              pushLog(`Fetching secret: ${name}`);
            }}
          />
        </aside>
      )}
    </div>
  );
}
