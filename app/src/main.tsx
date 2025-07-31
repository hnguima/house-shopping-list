import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// import "./index.css";
import App from "./App.tsx";

// Defer console patching and i18n to not block initial render
setTimeout(() => {
  import("./utils/consolePatch"); // Import console patching after initial render
  import("./i18n"); // Defer i18n initialization
}, 0);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
