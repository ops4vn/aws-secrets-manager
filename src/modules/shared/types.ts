export type EditorTab = {
  id: string;
  secretId: string;
  content: string;
  // Pristine content as loaded from / last saved to AWS. Used for the diff view
  // and to restore content on cancel. Never mutated while editing.
  originalContent: string;
  // Per-tab edit mode so switching tabs preserves each tab's editing state + draft.
  isEditing?: boolean;
  isBinary: boolean;
  isTooLarge?: boolean;
  binarySize?: number;
};
