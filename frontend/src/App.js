import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Dashboard />} />
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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
