import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { BreadcrumbProvider } from "@/components/layout/AppBreadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Route-level code splitting keeps the first load small.
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TenderList = lazy(() => import("./pages/TenderList"));
const TenderForm = lazy(() => import("./pages/TenderForm"));
const TenderDetail = lazy(() => import("./pages/TenderDetail"));
const BulkUpload = lazy(() => import("./pages/BulkUpload"));
const KeyDates = lazy(() => import("./pages/KeyDates"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={fullScreen ? "min-h-screen flex items-center justify-center bg-background" : "flex items-center justify-center h-64"}
      role="status"
      aria-label="Loading"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullScreen />;

  if (!user) {
    // Remember where the user was heading so we can send them back after login.
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <AppLayout>
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<Spinner />}>{children}</Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullScreen />;

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== "/auth" ? from : "/"} replace />;
  }

  return <Suspense fallback={<Spinner fullScreen />}>{children}</Suspense>;
}

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullScreen />;
  if (user) {
    return (
      <AppLayout>
        <Suspense fallback={<Spinner />}>
          <NotFound />
        </Suspense>
      </AppLayout>
    );
  }
  return (
    <Suspense fallback={<Spinner fullScreen />}>
      <NotFound />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tenders" element={<ProtectedRoute><TenderList /></ProtectedRoute>} />
      <Route path="/tenders/new" element={<ProtectedRoute><TenderForm /></ProtectedRoute>} />
      <Route path="/tenders/upload" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />
      <Route path="/tenders/:id" element={<ProtectedRoute><TenderDetail /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><KeyDates /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<CatchAll />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="ttm-theme" disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BreadcrumbProvider>
              <AppRoutes />
            </BreadcrumbProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
