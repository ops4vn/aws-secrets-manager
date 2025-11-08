/**
 * Generate ArgoCD External Secret template
 */

export function generateArgoCDExternalSecretTemplate(
  secretId: string,
  isBinary: boolean,
  binaryFileName?: string
): string {
  // Extract name from secretId (last part after /)
  const nameParts = secretId.split("/");
  const secretName = nameParts[nameParts.length - 1];
  
  // Generate External Secret name (add -es suffix)
  const externalSecretName = `${secretName}-es`;
  
  // Generate target secret name
  // For binary: use secretName with -secret suffix
  // For JSON: use secretName as is
  const targetSecretName = isBinary 
    ? `${secretName}-secret`
    : secretName;
  
  // Generate secret key for binary
  // Example: secretName = "hdb-card-service-card-private-key-pem-secret"
  //          binarySecretKey should be "card-private-key-pem.txt"
  // Strategy: Use filename if available, otherwise extract from secretName
  let binarySecretKey = "data";
  if (isBinary) {
    if (binaryFileName) {
      // Use the filename as secretKey
      binarySecretKey = binaryFileName;
    } else {
      // Extract from secretName: remove common prefixes and add extension
      // If secretName ends with "-secret", remove it
      let keyName = secretName.endsWith("-secret") 
        ? secretName.slice(0, -7) // Remove "-secret"
        : secretName;
      
      // Try to extract meaningful part (last few segments)
      const parts = keyName.split("-");
      if (parts.length > 2) {
        // Take last 2-3 parts
        keyName = parts.slice(-3).join("-");
      }
      
      // Default to .txt extension if no extension found
      binarySecretKey = keyName.includes(".") ? keyName : `${keyName}.txt`;
    }
  }

  if (isBinary) {
    // Binary secret template
    return `apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ${externalSecretName}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-cluster-secret-store
    kind: ClusterSecretStore
  target:
    name: ${targetSecretName}
    creationPolicy: Owner
  data:
    - secretKey: ${binarySecretKey}
      remoteRef:
        key: ${secretId}`;
  } else {
    // JSON secret template
    return `apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ${externalSecretName}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-cluster-secret-store
    kind: ClusterSecretStore
  target:
    name: ${targetSecretName}
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: ${secretId}`;
  }
}

