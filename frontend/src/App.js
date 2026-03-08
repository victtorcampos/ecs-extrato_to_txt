import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import './App.css';

import { Layout } from './components/layout';
import { Dashboard } from './components/dashboard';
import { UploadForm } from './components/upload';
import { LotesList, LoteDetail } from './components/lotes';
import { PendenciasResolver } from './components/pendencias';

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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
