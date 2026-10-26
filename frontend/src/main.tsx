import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import PdfApp from "./PdfApp";
import "./theme.css";

// The PDF workspace and the legacy Python interface have separate entry modules.
const Application =
  import.meta.env.VITE_RUNTIME === "browser"
    ? PdfApp
    : lazy(() => import("./legacy/LakehouseApp"));
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Chargement / Loading…</p>}>
      <Application />
    </Suspense>
  </StrictMode>,
);
