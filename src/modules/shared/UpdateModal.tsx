import React from "react";

type UpdateModalProps = {
  open: boolean;
  onClose: () => void;
  onYes: () => void;
  onLater: () => void;
  isDownloading: boolean;
  downloadedBytes: number;
  contentLength: number;
  isDownloaded: boolean;
  onRestart: () => void;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n = n / 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  open,
  onClose,
  onYes,
  onLater,
  isDownloading,
  downloadedBytes,
  contentLength,
  isDownloaded,
  onRestart,
}) => {
  const percent = contentLength > 0 ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100)) : 0;

  return (
    <>
      {open && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Update available</h3>
            {!isDownloading && !isDownloaded && (
              <p className="py-4">We have new version of the app, do you want to update?</p>
            )}

            {isDownloading && !isDownloaded && (
              <div className="space-y-3 py-2">
                <progress className="progress w-full" value={percent} max={100}></progress>
                <div className="text-sm opacity-80">
                  {contentLength > 0
                    ? `${formatBytes(downloadedBytes)} / ${formatBytes(contentLength)} (${percent}%)`
                    : `${formatBytes(downloadedBytes)} downloaded`}
                </div>
              </div>
            )}

            {isDownloaded && (
              <div className="space-y-2 py-2">
                <p>Download completed. Ready to restart and install.</p>
              </div>
            )}

            <div className="modal-action">
              {!isDownloading && !isDownloaded && (
                <>
                  <button className="btn btn-primary" onClick={onYes}>Yes</button>
                  <button className="btn" onClick={onLater}>Later</button>
                </>
              )}
              {isDownloading && !isDownloaded && (
                <button className="btn" onClick={onClose}>Hide</button>
              )}
              {isDownloaded && (
                <button className="btn btn-primary" onClick={onRestart}>Restart</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateModal;


