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

const NetworkExplorerPage = lazy(() => import("./pages/NetworkExplorerPage").then((module) => ({ default: module.NetworkExplorerPage })));
const MapPage = lazy(() => import("./pages/MapPage").then((module) => ({ default: module.MapPage })));

export function App() {
  return (
    <CaseProvider><MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:caseId" element={<CaseOverviewPage />} />
        <Route path="/network" element={<Suspense fallback={<LoadingState label="Loading graph visualization..."/>}><NetworkExplorerPage /></Suspense>} />
        <Route path="/entities" element={<EntitiesPage />} />
        <Route path="/entities/:entityId" element={<EntityProfilePage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/ingest" element={<DocumentIntelligencePage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/alerts" element={<AlertCenterPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/map" element={<Suspense fallback={<LoadingState label="Loading map visualization..."/>}><MapPage /></Suspense>} />
        <Route path="/dev/graph" element={<GraphDevPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout></CaseProvider>
  );
}
