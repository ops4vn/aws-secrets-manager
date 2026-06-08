import { useMemo } from "react";
import { useKeyboardShortcuts, KeyboardShortcut } from "./useKeyboardShortcuts";
import { useEditorStore } from "../../store/useEditorStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useSecretsListStore } from "../../store/useSecretsListStore";
import { useUiStore } from "../../store/useUiStore";

// App-level keyboard shortcuts. Mounted once in MainLayout. Actions read store
// state via getState() to avoid stale closures. The modifier is cross-platform
// (Ctrl on Windows/Linux, Cmd on macOS) thanks to useKeyboardShortcuts.
export function useAppShortcuts() {
  const setGlobalSearchOpen = useUiStore((s) => s.setGlobalSearchOpen);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);

  const shortcuts = useMemo<KeyboardShortcut[]>(() => {
    const profile = () =>
      useProfileStore.getState().selectedProfile ??
      useProfileStore.getState().defaultProfile;

    return [
      {
        key: "f",
        ctrlKey: true,
        description: "Open search",
        action: () => setGlobalSearchOpen(true),
      },
      {
        key: "n",
        ctrlKey: true,
        description: "Create new secret",
        action: () => {
          const ed = useEditorStore.getState();
          if (!ed.isEditing) ed.startCreateNew();
        },
      },
      {
        key: "e",
        ctrlKey: true,
        description: "Edit current secret",
        action: () => {
          const ed = useEditorStore.getState();
          if (!ed.isEditing && ed.activeTabId) ed.startEdit();
        },
      },
      {
        key: "s",
        ctrlKey: true,
        description: "Save changes",
        action: () => {
          const ed = useEditorStore.getState();
          if (ed.isEditing) void ed.save(profile());
        },
      },
      {
        key: "r",
        ctrlKey: true,
        description: "Reload secrets",
        action: () => {
          void useSecretsListStore.getState().listSecrets(profile(), true);
        },
      },
      {
        key: "/",
        ctrlKey: true,
        description: "Show keyboard shortcuts",
        action: () => setHelpOpen(true),
      },
      {
        key: "Escape",
        description: "Cancel editing / close dialog",
        action: () => {
          const ui = useUiStore.getState();
          if (ui.helpOpen) {
            ui.setHelpOpen(false);
            return;
          }
          if (ui.globalSearchOpen) {
            ui.setGlobalSearchOpen(false);
            return;
          }
          const ed = useEditorStore.getState();
          if (ed.isEditing) ed.cancelEdit();
        },
      },
    ];
  }, [setGlobalSearchOpen, setHelpOpen]);

  useKeyboardShortcuts(shortcuts);
}
