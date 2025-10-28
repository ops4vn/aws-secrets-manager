import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./modules/layout/MainLayout";
import { DashboardPage } from "./modules/pages/DashboardPage";

function App() {
  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
