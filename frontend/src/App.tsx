import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

import { MainLayout } from "./layouts/MainLayout";
import { LoadingState } from "./components/AsyncState";
import { CaseProvider } from "./context/CaseContext";
import { AuthProvider, RequireAuth } from "./context/AuthContext";

// Eagerly loaded (lightweight / always needed)
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { HomePage } from "./pages/HomePage";

// Lazily loaded (heavy pages — only fetched when the user navigates there)
const NetworkExplorerPage = lazy(() => import("./pages/NetworkExplorerPage").then((m) => ({ default: m.NetworkExplorerPage })));
const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));
const EntityProfilePage = lazy(() => import("./pages/EntityProfilePage").then((m) => ({ default: m.EntityProfilePage })));
const CaseIntelligencePage = lazy(() => import("./pages/CaseIntelligencePage").then((m) => ({ default: m.CaseIntelligencePage })));
const CasesPage = lazy(() => import("./pages/CasesPage").then((m) => ({ default: m.CasesPage })));
const CaseOverviewPage = lazy(() => import("./pages/CaseOverviewPage").then((m) => ({ default: m.CaseOverviewPage })));
const EntitiesPage = lazy(() => import("./pages/EntitiesPage").then((m) => ({ default: m.EntitiesPage })));
const EvidencePage = lazy(() => import("./pages/EvidencePage").then((m) => ({ default: m.EvidencePage })));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })));
const DocumentIntelligencePage = lazy(() => import("./pages/DocumentIntelligencePage").then((m) => ({ default: m.DocumentIntelligencePage })));
const DocumentDetailPage = lazy(() => import("./pages/DocumentDetailPage").then((m) => ({ default: m.DocumentDetailPage })));
const AlertCenterPage = lazy(() => import("./pages/AlertCenterPage").then((m) => ({ default: m.AlertCenterPage })));
const TimelinePage = lazy(() => import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const GraphDevPage = lazy(() => import("./pages/GraphDevPage").then((m) => ({ default: m.GraphDevPage })));

const PageLoader = <LoadingState label="Loading..." />;

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={PageLoader}>{children}</Suspense>;
}

export function App() {
  return (
    <AuthProvider><CaseProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RequireAuth><MainLayout><HomePage /></MainLayout></RequireAuth>} />
        <Route path="/cases" element={<RequireAuth><MainLayout><Lazy><CasesPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/cases/:caseId" element={<RequireAuth><MainLayout><Lazy><CaseOverviewPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/cases/:caseId/intelligence" element={<RequireAuth><MainLayout><Lazy><CaseIntelligencePage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/network" element={<RequireAuth><MainLayout><Lazy><NetworkExplorerPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/entities" element={<RequireAuth><MainLayout><Lazy><EntitiesPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/entities/:entityId" element={<RequireAuth><MainLayout><Lazy><EntityProfilePage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/evidence" element={<RequireAuth><MainLayout><Lazy><EvidencePage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/documents" element={<RequireAuth><MainLayout><Lazy><DocumentsPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/documents/ingest" element={<RequireAuth><MainLayout><Lazy><DocumentIntelligencePage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/documents/:id" element={<RequireAuth><MainLayout><Lazy><DocumentDetailPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/alerts" element={<RequireAuth><MainLayout><Lazy><AlertCenterPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/timeline" element={<RequireAuth><MainLayout><Lazy><TimelinePage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/map" element={<RequireAuth><MainLayout><Lazy><MapPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><MainLayout><Lazy><ProfilePage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="/dev/graph" element={<RequireAuth><MainLayout><Lazy><GraphDevPage /></Lazy></MainLayout></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CaseProvider></AuthProvider>
  );
}
