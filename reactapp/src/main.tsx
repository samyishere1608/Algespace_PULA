import axios from "axios";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production backend requires the X-API-Key header on every request.
// Apply it globally so all direct axios calls (goal logging, reflection, etc.)
// are authenticated without changing every call site.
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey) {
    axios.defaults.headers.common.set("X-API-Key", apiKey);
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
