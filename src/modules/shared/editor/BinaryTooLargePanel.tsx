import { useState } from "react";
import { Download } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { api } from "../../services/tauriApi";
import { useLogsStore } from "../../store/useLogsStore";
import { Button } from "../components/Button";

type Props = {
  name: string;
  size: number;
  secretId: string;
  profile: string | null;
};

export function BinaryTooLargePanel({ name, size, secretId, profile }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const { pushInfo, pushSuccess, pushError } = useLogsStore();

  const handleExport = async () => {
    setIsExporting(true);
    pushInfo("Fetching binary secret...");

    try {
      // Fetch secret from AWS
      const secretContent = await api.fetchSecret(profile, secretId);
      
      if (!secretContent.binary_base64) {
        pushError("Secret does not contain binary data");
        setIsExporting(false);
        return;
      }

      pushInfo("Decoding binary data...");

      // Decode base64 to binary
      const binaryString = atob(secretContent.binary_base64);
      const binaryBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryBytes[i] = binaryString.charCodeAt(i);
      }

      // Show save dialog
      const fileName = secretId.split("/").pop() || secretId.replace(/\//g, "_");
      const fileExtension = fileName.split(".").pop() || "";
      const filePath = await save({
        defaultPath: `${fileName}.${fileExtension}`,
        filters: [
          { name: "All Files", extensions: [fileExtension] },
        ],
      });

      if (filePath) {
        pushInfo("Saving file...");
        await writeFile(filePath, binaryBytes);
        pushSuccess(`Exported binary secret to ${filePath}`);
      }
    } catch (e) {
      pushError(`Failed to export binary: ${String(e)}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="border border-base-300 rounded-md p-4 bg-base-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Binary secret (content hidden)</div>
          <div className="text-sm opacity-80 mt-1">
            <span className="mr-3">Name: {name}</span>
            <span>Size: {(size / 1024).toFixed(2)} KB</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={handleExport}
          disabled={isExporting}
          loading={isExporting}
          title="Export binary to file"
        >
          <Download className="h-4 w-4 mr-1" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </div>
      <div className="mt-3 text-xs opacity-70">
        This binary is larger than 50KB, so content is not displayed. You can export it to a file.
      </div>
    </div>
  );
}

export default BinaryTooLargePanel;


