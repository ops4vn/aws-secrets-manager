import { Bookmark, ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useBookmarksStore } from "../../store/useBookmarksStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useEditorStore } from "../../store/useEditorStore";
import { useLogsStore } from "../../store/useLogsStore";
import { getSecretDisplayName } from "../utils/secretDisplayUtils";
import { Modal } from "../components/Modal";

export function BookmarksSection() {
  const [collapsed, setCollapsed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { selectedProfile, defaultProfile } = useProfileStore();
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarksStore();
  const { fetchSecretById } = useEditorStore();
  const { pushSuccess } = useLogsStore();

  return (
    <div className="bg-base-100 border border-base-300 rounded-md flex flex-col">
      {/* Header */}
      <div className="p-2 min-h-0 flex items-center justify-between gap-2 border-b border-base-300">
        <div className="flex items-center gap-2 flex-1">
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
          <h3 className="text-xs font-semibold flex items-center gap-1">
            <Bookmark className="h-4 w-4" /> Bookmarks
            {bookmarks.length > 0 && (
              <span className="badge badge-xs badge-ghost ml-1">
                {bookmarks.length}
              </span>
            )}
          </h3>
        </div>
        {bookmarks.length > 0 && (
          <button
            className="btn btn-ghost btn-xs btn-square text-error"
            onClick={() => setShowConfirmModal(true)}
            title="Clear all bookmarks"
          >
            <Trash2 className="h-3 w-3 text-error" />
          </button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="overflow-hidden">
          <div className="space-y-1 p-2 max-h-72 overflow-y-auto">
            {bookmarks.length === 0 ? (
              <div className="text-xs text-base-content/50 py-2 text-center">
                No bookmarks yet
              </div>
            ) : (
              bookmarks.map((secretId) => (
                <div
                  key={secretId}
                  className="group flex items-center justify-between p-2 rounded hover:bg-base-200 gap-2"
                >
                  <button
                    className="flex-1 text-left text-xs truncate hover:text-primary"
                    onClick={() => {
                      const profile = selectedProfile ?? defaultProfile;
                      fetchSecretById(secretId, profile);
                    }}
                    title={secretId}
                  >
                    {getSecretDisplayName(secretId, bookmarks)}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100"
                    onClick={() => removeBookmark(secretId)}
                    title="Remove bookmark"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Clear all bookmarks?"
        actions={
          <>
            <button
              className="btn btn-error"
              onClick={async () => {
                await clearBookmarks();
                pushSuccess("All bookmarks cleared");
                setShowConfirmModal(false);
              }}
            >
              Clear
            </button>
            <button
              className="btn"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to clear all bookmarks? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

