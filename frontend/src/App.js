import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

import { Layout } from './components/layout';

// FSD pages layer — lazy-loaded (F-10)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const UploadClassicPage = lazy(() => import('./pages/UploadClassicPage'));
const LotesPage = lazy(() => import('./pages/LotesPage'));
const LoteDetailPage = lazy(() => import('./pages/LoteDetailPage'));
const PendenciasPage = lazy(() => import('./pages/PendenciasPage'));
const MapeamentosPage = lazy(() => import('./pages/MapeamentosPage'));
const LayoutsPage = lazy(() => import('./pages/LayoutsPage'));
const LayoutFormPage = lazy(() => import('./pages/LayoutFormPage'));
const LayoutDetailPage = lazy(() => import('./pages/LayoutDetailPage'));
const PerfisSaidaPage = lazy(() => import('./pages/PerfisSaidaPage'));
const LayoutsSaidaPage = lazy(() => import('./pages/LayoutsSaidaPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20" data-testid="page-loader">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/upload/classic" element={<UploadClassicPage />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/lotes/:id" element={<LoteDetailPage />} />
            <Route path="/lotes/:id/pendencias" element={<PendenciasPage />} />
            <Route path="/mapeamentos" element={<MapeamentosPage />} />
            <Route path="/layouts" element={<LayoutsPage />} />
            <Route path="/layouts/novo" element={<LayoutFormPage />} />
            <Route path="/layouts/:id" element={<LayoutDetailPage />} />
            <Route path="/layouts/:id/editar" element={<LayoutFormPage />} />
            <Route path="/layouts-saida" element={<LayoutsSaidaPage />} />
            <Route path="/perfis-saida" element={<Navigate to="/layouts-saida" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
