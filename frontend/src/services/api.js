import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Lotes API
export const lotesApi = {
  criar: async (data) => {
    const response = await api.post('/api/v1/lotes', data);
    return response.data;
  },

  listar: async (params = {}) => {
    const response = await api.get('/api/v1/lotes', { params });
    return response.data;
  },

  obter: async (id) => {
    const response = await api.get(`/api/v1/lotes/${id}`);
    return response.data;
  },

  resolverPendencias: async (id, mapeamentos) => {
    const response = await api.post(`/api/v1/lotes/${id}/resolver-pendencias`, { mapeamentos });
    return response.data;
  },

  reprocessar: async (id) => {
    const response = await api.post(`/api/v1/lotes/${id}/reprocessar`);
    return response.data;
  },

  downloadArquivo: async (id) => {
    const response = await api.get(`/api/v1/lotes/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deletar: async (id) => {
    const response = await api.delete(`/api/v1/lotes/${id}`);
    return response.data;
  },

  estatisticas: async () => {
    const response = await api.get('/api/v1/lotes/estatisticas');
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export const mapeamentosApi = {
  listar: async (params = {}) => {
    const response = await api.get('/api/v1/account-mappings', { params });
    return response.data;
  },

  listarCnpjs: async () => {
    const response = await api.get('/api/v1/account-mappings/cnpjs');
    return response.data;
  },

  obter: async (id) => {
    const response = await api.get(`/api/v1/account-mappings/${id}`);
    return response.data;
  },

  criar: async (data) => {
    const response = await api.post('/api/v1/account-mappings', data);
    return response.data;
  },

  atualizar: async (id, data) => {
    const response = await api.put(`/api/v1/account-mappings/${id}`, data);
    return response.data;
  },

  atualizarEmLote: async (ids, contaPadrao) => {
    const response = await api.put('/api/v1/account-mappings/bulk/update', {
      ids,
      conta_padrao: contaPadrao,
    });
    return response.data;
  },

  deletar: async (id) => {
    const response = await api.delete(`/api/v1/account-mappings/${id}`);
    return response.data;
  },

  deletarEmLote: async (ids) => {
    const response = await api.delete('/api/v1/account-mappings/bulk/delete', {
      data: { ids },
    });
    return response.data;
  },
};

export default api;

// Layouts de Importação API
export const layoutsApi = {
  listar: async (params = {}) => {
    const response = await api.get('/api/v1/import-layouts', { params });
    return response.data;
  },

  listarCnpjs: async () => {
    const response = await api.get('/api/v1/import-layouts/cnpjs');
    return response.data;
  },

  camposDisponiveis: async () => {
    const response = await api.get('/api/v1/import-layouts/campos-disponiveis');
    return response.data;
  },

  previewExcel: async (data) => {
    const response = await api.post('/api/v1/import-layouts/preview-excel', data);
    return response.data;
  },

  obter: async (id) => {
    const response = await api.get(`/api/v1/import-layouts/${id}`);
    return response.data;
  },

  criar: async (data) => {
    const response = await api.post('/api/v1/import-layouts', data);
    return response.data;
  },

  atualizar: async (id, data) => {
    const response = await api.put(`/api/v1/import-layouts/${id}`, data);
    return response.data;
  },

  clonar: async (id, data = {}) => {
    const response = await api.post(`/api/v1/import-layouts/${id}/clone`, data);
    return response.data;
  },

  deletar: async (id) => {
    const response = await api.delete(`/api/v1/import-layouts/${id}`);
    return response.data;
  },
};

// Regras de Processamento API
export const regrasApi = {
  listar: async (layoutId, params = {}) => {
    const response = await api.get(`/api/v1/import-layouts/${layoutId}/rules`, { params });
    return response.data;
  },

  obter: async (layoutId, regraId) => {
    const response = await api.get(`/api/v1/import-layouts/${layoutId}/rules/${regraId}`);
    return response.data;
  },

  criar: async (layoutId, data) => {
    const response = await api.post(`/api/v1/import-layouts/${layoutId}/rules`, data);
    return response.data;
  },

  atualizar: async (layoutId, regraId, data) => {
    const response = await api.put(`/api/v1/import-layouts/${layoutId}/rules/${regraId}`, data);
    return response.data;
  },

  reordenar: async (layoutId, ordemIds) => {
    const response = await api.put(`/api/v1/import-layouts/${layoutId}/rules/reorder`, {
      ordem_ids: ordemIds,
    });
    return response.data;
  },

  deletar: async (layoutId, regraId) => {
    const response = await api.delete(`/api/v1/import-layouts/${layoutId}/rules/${regraId}`);
    return response.data;
  },
};
