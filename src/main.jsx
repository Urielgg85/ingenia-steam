import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import { SessionProvider } from "./lib/session.jsx";
import { RequireCreate, RequireAdmin } from "./lib/route-guards.jsx";

import App from "./App.jsx";
import Editor from "./pages/Editor.jsx";
import Player from "./pages/Player.jsx";      // 👈 Wizard paso a paso
import Preview from "./pages/Preview.jsx";    // 👈 Vista de lista/lectura
import Auth from "./pages/Auth.jsx";
import Importer from "./pages/Importer.jsx";  // asegúrate que el archivo se llama igual
import AdminRequests from "./pages/AdminRequests.jsx";

function Root() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />

          {/* Wizard */}
          <Route path="/play" element={<Player />} />

          {/* Solo lectura / vista completa */}
          <Route path="/preview" element={<Preview />} />

          <Route
            path="/create"
            element={
              <RequireCreate>
                <Editor />
              </RequireCreate>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/import"
            element={
              <RequireCreate>
                <Importer />
              </RequireCreate>
            }
          />
          <Route
            path="/admin/solicitudes"
            element={
              <RequireAdmin>
                <AdminRequests />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
