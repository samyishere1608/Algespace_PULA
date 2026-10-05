// First, before any module that defines a decorated class. `class-transformer` reads its metadata
// through Reflect, which this polyfill installs, and imports are evaluated in source order — so
// whatever defines the first decorated class must come after this line. It used to live in App.tsx
// below the imports, so it only worked as long as no imported module reached a decorated class
// early; adding one more import to the graph broke exactly that assumption.
import "reflect-metadata";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
