import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import debug utilities (chỉ trong development)
if (import.meta.env.DEV) {
  import('./lib/debugUtils');
}

createRoot(document.getElementById("root")!).render(<App />);
