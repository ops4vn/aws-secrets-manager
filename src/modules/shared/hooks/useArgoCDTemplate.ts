import { useState } from "react";
import { useLogsStore } from "../../store/useLogsStore";
import { useEditorStore } from "../../store/useEditorStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { generateArgoCDExternalSecretTemplate } from "../utils/argocdTemplateUtils";

export function useArgoCDTemplate() {
  const { pushSuccess, pushError } = useLogsStore();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [template, setTemplate] = useState<string>("");

  const showTemplate = (
    secretId: string,
    isBinary: boolean,
    binaryFileName?: string
  ) => {
    const generatedTemplate = generateArgoCDExternalSecretTemplate(
      secretId,
      isBinary,
      binaryFileName
    );
    setTemplate(generatedTemplate);
    setShowModal(true);
  };

  const exportTemplate = async () => {
    if (!template) return;
    
    try {
      const secretId = useEditorStore.getState().secretId;
      const baseFileName = secretId ? `${secretId.replace(/\//g, "_")}-external-secret` : "external-secret";
      const fileName = `${baseFileName}.yaml`;
      
      const filePath = await save({
        defaultPath: fileName,
        filters: [
          { name: "YAML Files", extensions: ["yaml"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (filePath) {
        // Đảm bảo file path có đuôi .yaml
        const finalPath = filePath.endsWith(".yaml") ? filePath : `${filePath}.yaml`;
        await writeTextFile(finalPath, template);
        pushSuccess(`Exported ArgoCD template to ${finalPath}`);
      }
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
      pushError(`Failed to export ArgoCD template: ${errorMsg}`);
      console.error("Failed to export ArgoCD template:", error);
    }
  };

  const copyTemplate = async () => {
    if (!template) return;
    
    try {
      await navigator.clipboard.writeText(template);
      pushSuccess("Copied ArgoCD template to clipboard");
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
      pushError(`Failed to copy ArgoCD template: ${errorMsg}`);
      console.error("Failed to copy ArgoCD template:", error);
    }
  };

  return {
    showModal,
    template,
    showTemplate,
    exportTemplate,
    copyTemplate,
    closeModal: () => setShowModal(false),
  };
}

