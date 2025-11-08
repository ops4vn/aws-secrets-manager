import { Button } from "../components/Button";

type Props = {
  name: string;
  size: number;
  onSave: () => void;
  onCancel: () => void;
  createArgoCDSecret?: boolean;
  setCreateArgoCDSecret?: (v: boolean) => void;
};

export function BinaryImportPanel({ 
  name, 
  size, 
  onSave, 
  onCancel,
  createArgoCDSecret = false,
  setCreateArgoCDSecret,
}: Props) {
  return (
    <div className="border border-base-300 rounded-md p-4 bg-base-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Binary file to upload</div>
          <div className="text-sm opacity-80 mt-1">
            <span className="mr-3">Name: {name}</span>
            <span>Size: {(size / 1024).toFixed(2)} KB</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {setCreateArgoCDSecret && (
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={createArgoCDSecret}
                onChange={(e) => setCreateArgoCDSecret(e.target.checked)}
              />
              <span className="label-text text-xs">Create ArgoCD External Secret</span>
            </label>
          )}
          <Button size="sm" variant="success" onClick={onSave}>
            Push secret
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
      <div className="mt-3 text-xs opacity-70">
        The binary will be uploaded as base64-decoded bytes to AWS Secrets Manager.
      </div>
    </div>
  );
}

export default BinaryImportPanel;


