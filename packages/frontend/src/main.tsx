import { esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const rootElement = document.getElementById("root");
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

createRoot(rootElement).render(
    <ClerkProvider
      afterSignOutUrl="/"
      localization={esES}
      publishableKey={publishableKey}
      signInUrl="/"
      signUpUrl="/"
    >
    <App />
  </ClerkProvider>,
);
