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

// Account Mappings API (Mapeamento de Contas)
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
