import { useEffect, useState } from "react";
import { SidebarProfiles } from "../shared/SidebarProfiles";
import { TopBar } from "../shared/TopBar";
import { EditorPanel } from "../shared/EditorPanel";
import { LogsStatus } from "../shared/LogsStatus";
import { RightPanel } from "../shared/RightPanel";
import { api } from "../services/tauriApi";

export function DashboardPage() {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [defaultProfile, setDefaultProfile] = useState<string | null>(null);
  const [showSecretsTree, setShowSecretsTree] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
  const [secretId, setSecretId] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [allNames, setAllNames] = useState<string[]>([]);

  const [profiles, setProfiles] = useState<string[]>([]);

  const pushLog = (msg: string) =>
    setLogs((prev) => [...prev, msg].slice(-500));

  useEffect(() => {
    (async () => {
      try {
        const df = await api.loadDefaultProfile();
        setDefaultProfile(df);
        const ps = await api.loadProfiles();
        setProfiles(ps);
        if (df) {
          const cached = await api.loadCachedSecretNames(df);
          if (cached && cached.length > 0) {
            setAllNames(cached);
            setShowSecretsTree(true);
            setStatus(`Loaded ${cached.length} cached secrets`);
            pushLog(`Loaded ${cached.length} cached secrets`);
          }
        }
      } catch (e) {
        setStatus(`Init error: ${String(e)}`);
      }
    })();
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0">
      <aside className="w-72 bg-base-100 border-r border-base-300 p-4 overflow-y-auto">
        <SidebarProfiles
          profiles={profiles}
          selectedProfile={selectedProfile ?? defaultProfile ?? "default"}
          onSelect={(p) => setSelectedProfile(p)}
          onSetDefault={async () => {
            await api.saveDefaultProfile(selectedProfile ?? "default");
            setDefaultProfile(selectedProfile);
            setStatus("Saved default profile");
            pushLog("Saved default profile");
          }}
          onListSecrets={async () => {
            setShowSecretsTree(true);
            const p = selectedProfile ?? defaultProfile;
            if (!p) {
              setStatus("No profile selected");
              pushLog("No profile selected");
              return;
            }
            setStatus("Listing secrets...");
            pushLog("Listing secrets...");
            const cached = await api.loadCachedSecretNames(p);
            if (cached && cached.length) {
              setAllNames(cached);
              setStatus(`Loaded ${cached.length} cached secrets`);
              pushLog(`Loaded ${cached.length} cached secrets`);
            } else {
              const names = await api.listSecrets(p);
              await api.saveCachedSecretNames(p, names);
              setAllNames(names);
              setStatus(`Loaded ${names.length} secrets`);
              pushLog(`Loaded ${names.length} secrets`);
            }
          }}
          onForceReload={async () => {
            setShowSecretsTree(true);
            const p = selectedProfile ?? defaultProfile;
            if (!p) {
              setStatus("No profile selected");
              pushLog("No profile selected");
              return;
            }
            setStatus("Reloading secrets from AWS...");
            pushLog("Force reloading secrets...");
            const names = await api.listSecrets(p);
            await api.saveCachedSecretNames(p, names);
            setAllNames(names);
            setStatus(`Loaded ${names.length} secrets`);
            pushLog(`Loaded ${names.length} secrets`);
          }}
          onCheckSSO={async () => {
            const p = selectedProfile ?? defaultProfile;
            if (!p) {
              setStatus("No profile selected");
              pushLog("No profile selected");
              return;
            }
            setStatus("Checking SSO...");
            pushLog("Checking SSO...");
            const ok = await api.checkSso(p);
            if (ok) {
              setStatus("SSO valid");
              pushLog("SSO valid");
              return;
            }
            await api.triggerSsoLogin(p);
            setStatus("Opened SSO login in browser...");
            pushLog("Opened SSO login in browser...");
            // Poll up to 20 times x 3s
            let valid = false;
            for (let i = 0; i < 20; i++) {
              await new Promise((r) => setTimeout(r, 3000));
              if (await api.checkSso(p)) {
                valid = true;
                break;
              }
            }
            setStatus(valid ? "SSO valid" : "SSO still invalid after waiting");
            pushLog(valid ? "SSO valid" : "SSO still invalid after waiting");
          }}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar
          secretId={secretId}
          setSecretId={setSecretId}
          isEditing={isEditing}
          isCreatingNew={isCreatingNew}
          onGet={async () => {
            const p = selectedProfile ?? defaultProfile;
            setStatus("Fetching secret...");
            pushLog(`Fetching secret: ${secretId}`);
            try {
              const res = await api.fetchSecret(p, secretId);
              if (res.string) {
                try {
                  const parsed = JSON.parse(res.string);
                  setEditorContent(JSON.stringify(parsed, null, 2));
                } catch {
                  setEditorContent(res.string);
                }
                setIsBinary(false);
              } else if (res.binary_base64) {
                setEditorContent(res.binary_base64);
                setIsBinary(true);
              } else {
                setEditorContent("");
                setIsBinary(false);
              }
              setIsEditing(false);
              setIsCreatingNew(false);
              setStatus(
                res.string
                  ? "Fetched string secret"
                  : res.binary_base64
                  ? "Fetched binary secret (base64)"
                  : "Empty secret"
              );
              pushLog("Fetched secret");
            } catch (e) {
              setEditorContent("");
              setIsBinary(false);
              setIsEditing(false);
              setIsCreatingNew(false);
              setStatus(`Error: ${String(e)}`);
              pushLog(`Fetch error: ${String(e)}`);
            }
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

        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <EditorPanel
              content={editorContent}
              onChange={setEditorContent}
              isEditing={isEditing}
              isBinary={isBinary}
              onSave={async () => {
                const p = selectedProfile ?? defaultProfile;
                setStatus(
                  isCreatingNew ? "Creating secret..." : "Updating secret..."
                );
                pushLog(
                  (isCreatingNew ? "Creating" : "Updating") +
                    ` secret: ${secretId}`
                );
                if (isCreatingNew) {
                  await api.createSecret(p, secretId, editorContent);
                  setStatus("Created secret");
                  pushLog("Created secret");
                } else {
                  await api.updateSecret(p, secretId, editorContent);
                  setStatus("Updated secret");
                  pushLog("Updated secret");
                }
                setIsEditing(false);
                setIsCreatingNew(false);
              }}
              onCancel={() => {
                setIsEditing(false);
                setIsCreatingNew(false);
                setStatus("Edit cancelled");
                pushLog("Edit mode cancelled");
              }}
            />
          </div>
          <div
            className="h-2 cursor-row-resize bg-base-300/60"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const container = e.currentTarget.parentElement as HTMLElement;
              const logsEl = container.querySelector(
                "#logs-container"
              ) as HTMLElement;
              const startHeight = logsEl.offsetHeight;
              const containerHeight = container.clientHeight;
              const onMove = (ev: MouseEvent) => {
                const dy = ev.clientY - startY;
                // Invert direction so kéo xuống -> giảm logs, kéo lên -> tăng logs (hoặc ngược lại theo yêu cầu)
                const newH = Math.min(
                  Math.max(96, startHeight - dy),
                  Math.max(96, containerHeight - 96)
                );
                logsEl.style.height = `${newH}px`;
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
          <div id="logs-container" className="h-56 min-h-[6rem]">
            <LogsStatus
              logs={logs}
              status={status}
              onClearLogs={() => setLogs([])}
              canDelete={!isCreatingNew && !!secretId}
              onDelete={() => {
                setStatus("Delete not implemented");
                pushLog("Delete clicked (not implemented)");
              }}
              autoScroll={autoScrollLogs}
              onToggleAutoScroll={setAutoScrollLogs}
            />
          </div>
        </section>
      </main>

      {showSecretsTree && (
        <aside className="w-128 bg-base-100 border-l border-base-300 p-4 pt-0 overflow-y-auto">
          <RightPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            allNames={allNames}
            results={allNames.filter((n) =>
              searchQuery.trim()
                ? n.toLowerCase().includes(searchQuery.trim().toLowerCase())
                : false
            )}
            onForceReload={async () => {
              const p = selectedProfile ?? defaultProfile;
              if (!p) {
                setStatus("No profile selected");
                pushLog("No profile selected");
                return;
              }
              setStatus("Reloading secrets from AWS...");
              pushLog("Force reloading secrets...");
              const names = await api.listSecrets(p);
              await api.saveCachedSecretNames(p, names);
              setAllNames(names);
              setStatus(`Loaded ${names.length} secrets`);
              pushLog(`Loaded ${names.length} secrets`);
            }}
            onSelect={async (name: string) => {
              setSecretId(name);
              const p = selectedProfile ?? defaultProfile;
              setStatus(`Fetching secret: ${name}`);
              pushLog(`Fetching secret: ${name}`);
              try {
                const res = await api.fetchSecret(p ?? null, name);
                if (res.string) {
                  try {
                    const parsed = JSON.parse(res.string);
                    setEditorContent(JSON.stringify(parsed, null, 2));
                  } catch {
                    setEditorContent(res.string);
                  }
                  setIsBinary(false);
                } else if (res.binary_base64) {
                  setEditorContent(res.binary_base64);
                  setIsBinary(true);
                } else {
                  setEditorContent("");
                  setIsBinary(false);
                }
                setIsEditing(false);
                setIsCreatingNew(false);
                setStatus(
                  res.string
                    ? "Fetched string secret"
                    : res.binary_base64
                    ? "Fetched binary secret (base64)"
                    : "Empty secret"
                );
                pushLog("Fetched secret");
              } catch (e) {
                setEditorContent("");
                setIsBinary(false);
                setIsEditing(false);
                setIsCreatingNew(false);
                setStatus(`Error: ${String(e)}`);
                pushLog(`Fetch error: ${String(e)}`);
              }
            }}
          />
        </aside>
      )}
    </div>
  );
}
