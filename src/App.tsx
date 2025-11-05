import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./modules/layout/MainLayout";
import { DashboardPage } from "./modules/pages/DashboardPage";
import { ErrorBoundary } from "./modules/pages/ErrorBoundary";
import { NotFoundPage } from "./modules/pages/NotFoundPage";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import useUpdaterStore from "./modules/store/useUpdaterStore";
import UpdateModal from "./modules/shared/UpdateModal";

function App() {
  const {
    showUpdateModal,
    isDownloading,
    downloadedBytes,
    contentLength,
    isDownloaded,
    initCheck,
    startDownload,
    restartAndInstall,
    later,
    hideModal,
  } = useUpdaterStore();

  useEffect(() => {
    invoke("show_main_window").catch(console.error);
  }, []);

  useEffect(() => {
    initCheck();
  }, []);

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <UpdateModal
        open={showUpdateModal}
        onClose={hideModal}
        onYes={startDownload}
        onLater={later}
        isDownloading={isDownloading}
        downloadedBytes={downloadedBytes}
        contentLength={contentLength}
        isDownloaded={isDownloaded}
        onRestart={restartAndInstall}
      />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </div>
  );
}

export default App;
