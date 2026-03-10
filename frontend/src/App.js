import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

import { Layout } from './components/layout';
import { Dashboard } from './components/dashboard';

// Lazy-loaded pages (F-10)
const ImportWizard = lazy(() => import('./components/import-wizard/ImportWizard'));
const UploadFormLegacy = lazy(() => import('./components/upload/UploadForm'));
const LotesList = lazy(() => import('./components/lotes/LotesList'));
const LoteDetail = lazy(() => import('./components/lotes/LoteDetail'));
const PendenciasResolver = lazy(() => import('./components/pendencias/PendenciasResolver'));
const MapeamentosList = lazy(() => import('./components/mapeamentos/MapeamentosList'));
const LayoutsList = lazy(() => import('./components/layouts/LayoutsList'));
const LayoutForm = lazy(() => import('./components/layouts/LayoutForm'));
const LayoutDetail = lazy(() => import('./components/layouts/LayoutDetail'));
const PerfisSaidaList = lazy(() => import('./components/perfis-saida/PerfisSaidaList'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20" data-testid="page-loader">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20" data-testid="not-found-page">
      <h1 className="text-6xl font-bold text-slate-900 font-[Manrope]">404</h1>
      <p className="mt-4 text-lg text-slate-500 font-[IBM_Plex_Sans]">Página não encontrada</p>
      <a href="/" className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors" data-testid="back-home-link">
        Voltar ao início
      </a>
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/upload" element={<ImportWizard />} />
            <Route path="/upload/classic" element={<UploadFormLegacy />} />
            <Route path="/lotes" element={<LotesList />} />
            <Route path="/lotes/:id" element={<LoteDetail />} />
            <Route path="/lotes/:id/pendencias" element={<PendenciasResolver />} />
            <Route path="/mapeamentos" element={<MapeamentosList />} />
            <Route path="/layouts" element={<LayoutsList />} />
            <Route path="/layouts/novo" element={<LayoutForm />} />
            <Route path="/layouts/:id" element={<LayoutDetail />} />
            <Route path="/layouts/:id/editar" element={<LayoutForm />} />
            <Route path="/perfis-saida" element={<PerfisSaidaList />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
