import apiClient from './client';

export const layoutsApi = {
  listar: async (params = {}) => {
    const response = await apiClient.get('/api/v1/import-layouts', { params });
    return response.data;
  },

  listarCnpjs: async () => {
    const response = await apiClient.get('/api/v1/import-layouts/cnpjs');
    return response.data;
  },

  camposDisponiveis: async () => {
    const response = await apiClient.get('/api/v1/import-layouts/campos-disponiveis');
    return response.data;
  },

  previewExcel: async (data) => {
    const response = await apiClient.post('/api/v1/import-layouts/preview-excel', data);
    return response.data;
  },

  obter: async (id) => {
    const response = await apiClient.get(`/api/v1/import-layouts/${id}`);
    return response.data;
  },

  criar: async (data) => {
    const response = await apiClient.post('/api/v1/import-layouts', data);
    return response.data;
  },

  atualizar: async (id, data) => {
    const response = await apiClient.put(`/api/v1/import-layouts/${id}`, data);
    return response.data;
  },

  clonar: async (id, data = {}) => {
    const response = await apiClient.post(`/api/v1/import-layouts/${id}/clone`, data);
    return response.data;
  },

  deletar: async (id) => {
    const response = await apiClient.delete(`/api/v1/import-layouts/${id}`);
    return response.data;
  },
};
