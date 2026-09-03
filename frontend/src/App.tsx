import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

import { MainLayout } from "./layouts/MainLayout";
import { DocumentIntelligencePage } from "./pages/DocumentIntelligencePage";
import { AlertCenterPage } from "./pages/AlertCenterPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { GraphDevPage } from "./pages/GraphDevPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CaseProvider } from "./context/CaseContext";
import { CaseOverviewPage } from "./pages/CaseOverviewPage";
import { CasesPage } from "./pages/CasesPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { EntitiesPage } from "./pages/EntitiesPage";
import { EntityProfilePage } from "./pages/EntityProfilePage";
import { EvidencePage } from "./pages/EvidencePage";
import { TimelinePage } from "./pages/TimelinePage";
import { LoadingState } from "./components/AsyncState";
import { AuthProvider, RequireAuth } from "./context/AuthContext";
import { CaseIntelligencePage } from "./pages/CaseIntelligencePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";

const NetworkExplorerPage = lazy(() => import("./pages/NetworkExplorerPage").then((module) => ({ default: module.NetworkExplorerPage })));
const MapPage = lazy(() => import("./pages/MapPage").then((module) => ({ default: module.MapPage })));

export function App() {
  return (
    <AuthProvider><CaseProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RequireAuth><MainLayout><HomePage /></MainLayout></RequireAuth>} />
        <Route path="/cases" element={<RequireAuth><MainLayout><CasesPage /></MainLayout></RequireAuth>} />
        <Route path="/cases/:caseId" element={<RequireAuth><MainLayout><CaseOverviewPage /></MainLayout></RequireAuth>} />
        <Route path="/cases/:caseId/intelligence" element={<RequireAuth><MainLayout><CaseIntelligencePage /></MainLayout></RequireAuth>} />
        <Route path="/network" element={<RequireAuth><MainLayout><Suspense fallback={<LoadingState label="Loading graph visualization..."/>}><NetworkExplorerPage /></Suspense></MainLayout></RequireAuth>} />
        <Route path="/entities" element={<RequireAuth><MainLayout><EntitiesPage /></MainLayout></RequireAuth>} />
        <Route path="/entities/:entityId" element={<RequireAuth><MainLayout><EntityProfilePage /></MainLayout></RequireAuth>} />
        <Route path="/evidence" element={<RequireAuth><MainLayout><EvidencePage /></MainLayout></RequireAuth>} />
        <Route path="/documents" element={<RequireAuth><MainLayout><DocumentsPage /></MainLayout></RequireAuth>} />
        <Route path="/documents/ingest" element={<RequireAuth><MainLayout><DocumentIntelligencePage /></MainLayout></RequireAuth>} />
        <Route path="/documents/:id" element={<RequireAuth><MainLayout><DocumentDetailPage /></MainLayout></RequireAuth>} />
        <Route path="/alerts" element={<RequireAuth><MainLayout><AlertCenterPage /></MainLayout></RequireAuth>} />
        <Route path="/timeline" element={<RequireAuth><MainLayout><TimelinePage /></MainLayout></RequireAuth>} />
        <Route path="/map" element={<RequireAuth><MainLayout><Suspense fallback={<LoadingState label="Loading map visualization..."/>}><MapPage /></Suspense></MainLayout></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><MainLayout><ProfilePage /></MainLayout></RequireAuth>} />
        <Route path="/dev/graph" element={<RequireAuth><MainLayout><GraphDevPage /></MainLayout></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CaseProvider></AuthProvider>
  );
}
