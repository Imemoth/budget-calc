import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/themes.css";
import "./index.css";
import { AuthProvider } from "./auth";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);
