import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { hasServiceKey } from "@/lib/supabase";
import { LoginScreen } from "@/pages/Login";
import { AdminLayout } from "@/pages/AdminLayout";
import { BrandsPage } from "@/pages/Brands";
import { RewardsPage } from "@/pages/Rewards";
import { RafflesPage } from "@/pages/Raffles";
import { CitiesPage } from "@/pages/Cities";
import { ConfigPage } from "@/pages/Config";
import { DashboardPage } from "@/pages/Dashboard";
import { LiveEventsPage } from "@/pages/LiveEvents";
import { MembershipsPage } from "@/pages/Memberships";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function App() {
  const [authed, setAuthed] = useState<boolean>(hasServiceKey());

  useEffect(() => {
    const onStorage = () => setAuthed(hasServiceKey());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster theme="dark" richColors position="top-center" />
        <BrowserRouter>
          {!authed ? (
            <LoginScreen onAuthed={() => setAuthed(true)} />
          ) : (
            <Routes>
              <Route element={<AdminLayout onSignOut={() => setAuthed(false)} />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/raffles" element={<RafflesPage />} />
                <Route path="/cities" element={<CitiesPage />} />
                <Route path="/live" element={<LiveEventsPage />} />
                <Route path="/memberships" element={<MembershipsPage />} />
                <Route path="/config" element={<ConfigPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
