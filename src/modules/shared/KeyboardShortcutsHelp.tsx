import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Editor shortcuts
  { key: "s", ctrlKey: true, description: "Save changes" },
  { key: "z", ctrlKey: true, description: "Undo" },
  { key: "y", ctrlKey: true, description: "Redo" },
  {
    key: "z",
    ctrlKey: true,
    shiftKey: true,
    description: "Redo (alternative)",
  },
  { key: "Escape", description: "Cancel editing" },

  // Main actions
  { key: "n", ctrlKey: true, description: "Create new secret" },
  { key: "e", ctrlKey: true, description: "Edit current secret" },
  { key: "g", ctrlKey: true, description: "Get secret" },
  { key: "r", ctrlKey: true, description: "Reload secrets" },
  { key: "f", ctrlKey: true, description: "Focus search" },
];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const formatKey = (shortcut: KeyboardShortcut) => {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push("Ctrl");
    if (shortcut.shiftKey) parts.push("Shift");
    if (shortcut.altKey) parts.push("Alt");
    parts.push(shortcut.key);
    return parts.join(" + ");
  };

  if (!isOpen) {
    return (
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setIsOpen(true)}
        title="Show keyboard shortcuts"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Editor</h3>
            <div className="space-y-2">
              {shortcuts.slice(0, 5).map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{shortcut.description}</span>
                  <kbd className="kbd kbd-sm">{formatKey(shortcut)}</kbd>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Main Actions</h3>
            <div className="space-y-2">
              {shortcuts.slice(5).map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{shortcut.description}</span>
                  <kbd className="kbd kbd-sm">{formatKey(shortcut)}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-base-300">
          <p className="text-sm text-base-content/70">
            Press <kbd className="kbd kbd-xs">Esc</kbd> to close this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
