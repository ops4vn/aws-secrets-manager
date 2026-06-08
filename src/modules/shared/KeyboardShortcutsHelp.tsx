import { Modal } from "./components/Modal";
import { Button } from "./components/Button";

type ShortcutRow = { keys: string[]; description: string };

// "Mod" renders as ⌘ on macOS, Ctrl elsewhere.
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
  ? "⌘"
  : "Ctrl";

const NAVIGATION: ShortcutRow[] = [
  { keys: [MOD, "F"], description: "Open search" },
  { keys: [MOD, "N"], description: "Create new secret" },
  { keys: [MOD, "E"], description: "Edit current secret" },
  { keys: [MOD, "R"], description: "Reload secrets" },
  { keys: [MOD, "/"], description: "Show this help" },
];

const EDITOR: ShortcutRow[] = [
  { keys: [MOD, "S"], description: "Save changes" },
  { keys: [MOD, "Z"], description: "Undo" },
  { keys: [MOD, "Y"], description: "Redo" },
  { keys: ["Esc"], description: "Cancel editing / close dialog" },
];

function ShortcutList({ rows }: { rows: ShortcutRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-sm">{row.description}</span>
          <span className="flex gap-1">
            {row.keys.map((k, j) => (
              <kbd key={j} className="kbd kbd-sm">
                {k}
              </kbd>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsHelp({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
      actions={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-2">Navigation</h3>
          <ShortcutList rows={NAVIGATION} />
        </div>
        <div>
          <h3 className="text-base font-semibold mb-2">Editor</h3>
          <ShortcutList rows={EDITOR} />
        </div>
      </div>
    </Modal>
  );
}

export default KeyboardShortcutsHelp;
