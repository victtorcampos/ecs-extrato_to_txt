import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

import { Layout } from './components/layout';
import { Dashboard } from './components/dashboard';
import { UploadForm } from './components/upload';
import { LotesList, LoteDetail } from './components/lotes';
import { PendenciasResolver } from './components/pendencias';
import { MapeamentosList } from './components/mapeamentos';
import { LayoutsList, LayoutForm, LayoutDetail } from './components/layouts';
import { PerfisSaidaList } from './components/perfis-saida';

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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/upload" element={<UploadForm />} />
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
      </Layout>
    </BrowserRouter>
  );
}

export default App;
