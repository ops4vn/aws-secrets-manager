import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./modules/layout/MainLayout";
import { DashboardPage } from "./modules/pages/DashboardPage";
import { ErrorBoundary } from "./modules/pages/ErrorBoundary";
import { NotFoundPage } from "./modules/pages/NotFoundPage";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  useEffect(() => {
    invoke("show_main_window").catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
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
