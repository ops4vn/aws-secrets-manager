import { ClipboardCopy, Download } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

type Props = {
  open: boolean;
  template: string;
  onClose: () => void;
  onCopy: () => void;
  onExport: () => void;
};

export function ArgoCDTemplateModal({
  open,
  template,
  onClose,
  onCopy,
  onExport,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ArgoCD External Secret Template"
      size="lg"
      actions={
        <>
          <Button
            onClick={onCopy}
            title="Copy template to clipboard"
          >
            <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
          </Button>
          <Button
            variant="primary"
            onClick={onExport}
            title="Export template to YAML file"
          >
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm opacity-70 mb-2">
          ArgoCD External Secret template for your secret:
        </p>
        <pre className="bg-base-200 p-3 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
          {template}
        </pre>
      </div>
    </Modal>
  );
}

