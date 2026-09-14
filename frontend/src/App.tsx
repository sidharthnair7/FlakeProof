import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { ReplayProvider } from "./hooks/useReplay";

const DashboardPage = lazy(async () => {
  const module = await import("./pages/DashboardPage");
  return { default: module.DashboardPage };
});

export function App() {
  return (
    <ReplayProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <Suspense
                fallback={
                  <main className="min-h-screen bg-[#FAFAF9] px-4 py-8 text-sm text-foreground/60">
                    Loading recorded evidence…
                  </main>
                }
              >
                <DashboardPage />
              </Suspense>
            }
          />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </ReplayProvider>
  );
}

export default App;
