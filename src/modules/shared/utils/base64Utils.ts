export function decodeBase64(base64String: string): string {
  try {
    // Remove any whitespace and padding
    const cleanBase64 = base64String.replace(/\s/g, '');

    // Check if it's valid base64
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      throw new Error('Invalid base64 string');
    }

    // Decode base64
    const decoded = atob(cleanBase64);

    // Try to detect if it's text or binary
    try {
      // Try to decode as UTF-8
      return decodeURIComponent(escape(decoded));
    } catch {
      // If UTF-8 decoding fails, return as binary string
      return decoded;
    }
  } catch (error) {
    throw new Error(`Failed to decode base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function encodeBase64(text: string): string {
  try {
    return btoa(encodeURIComponent(text));
  } catch (error) {
    throw new Error(`Failed to encode base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isValidBase64(str: string): boolean {
  try {
    const cleanStr = str.replace(/\s/g, '');
    return /^[A-Za-z0-9+/]*={0,2}$/.test(cleanStr) && cleanStr.length % 4 === 0;
  } catch {
    return false;
  }
}

export function detectContentType(content: string): 'text' | 'json' | 'base64' | 'binary' {
  // Check if it's valid JSON
  try {
    JSON.parse(content);
    return 'json';
  } catch {
    // Not JSON, continue checking
  }

  // Check if it's valid base64
  if (isValidBase64(content)) {
    try {
      const decoded = decodeBase64(content);
      // If decoded content is valid JSON, it's base64-encoded JSON
      try {
        JSON.parse(decoded);
        return 'base64';
      } catch {
        return 'base64';
      }
    } catch {
      return 'binary';
    }
  }

  // Check if it contains mostly printable characters
  const printableChars = content.replace(/[\x20-\x7E\s]/g, '').length;
  const printableRatio = (content.length - printableChars) / content.length;

  if (printableRatio > 0.8) {
    return 'text';
  }

  return 'binary';
}
