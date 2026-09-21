import { esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./lib/query-client.ts";

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4500 }} />
    </QueryClientProvider>
  </ClerkProvider>,
);
