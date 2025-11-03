export type EditorTab = {
  id: string;
  secretId: string;
  content: string;
  isBinary: boolean;
  isTooLarge?: boolean;
  binarySize?: number;
};


