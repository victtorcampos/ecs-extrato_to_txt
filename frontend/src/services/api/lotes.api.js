import apiClient from './client';

export const lotesApi = {
  criar: async (data) => {
    const response = await apiClient.post('/api/v1/lotes', data);
    return response.data;
  },

  listar: async (params = {}) => {
    const response = await apiClient.get('/api/v1/lotes', { params });
    return response.data;
  },

  obter: async (id) => {
    const response = await apiClient.get(`/api/v1/lotes/${id}`);
    return response.data;
  },

  resolverPendencias: async (id, mapeamentos) => {
    const response = await apiClient.post(`/api/v1/lotes/${id}/resolver-pendencias`, { mapeamentos });
    return response.data;
  },

  reprocessar: async (id) => {
    const response = await apiClient.post(`/api/v1/lotes/${id}/reprocessar`);
    return response.data;
  },

  downloadArquivo: async (id) => {
    const response = await apiClient.get(`/api/v1/lotes/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deletar: async (id) => {
    const response = await apiClient.delete(`/api/v1/lotes/${id}`);
    return response.data;
  },

  estatisticas: async () => {
    const response = await apiClient.get('/api/v1/lotes/estatisticas');
    return response.data;
  },
};
