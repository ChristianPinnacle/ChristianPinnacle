import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { trpc, trpcClient } from "./lib/trpc";
import { PinGate } from "./components/PinGate";
import App from "./App";
import "./index.css";

registerSW({ immediate: true });

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PinGate>
          <App />
        </PinGate>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
