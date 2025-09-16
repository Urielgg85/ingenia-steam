import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./App.jsx";
import Editor from "./pages/Editor.jsx";
import Preview from "./pages/Preview.jsx";
import Player from "./pages/Player.jsx";
import Importer from "./pages/Importer.jsx";
import Auth from "./pages/Auth.jsx";
import { SessionProvider } from "./lib/session.jsx";

function Root() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/create" element={<Editor />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/play" element={<Player />} />
          <Route path="/import" element={<Importer />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
