import apiClient from './client';

export const perfisSaidaApi = {
  listar: async (params = {}) => {
    const response = await apiClient.get('/api/v1/output-profiles', { params });
    return response.data;
  },

  sistemasDisponiveis: async () => {
    const response = await apiClient.get('/api/v1/output-profiles/sistemas-disponiveis');
    return response.data;
  },

  obter: async (id) => {
    const response = await apiClient.get(`/api/v1/output-profiles/${id}`);
    return response.data;
  },

  criar: async (data) => {
    const response = await apiClient.post('/api/v1/output-profiles', data);
    return response.data;
  },

  atualizar: async (id, data) => {
    const response = await apiClient.put(`/api/v1/output-profiles/${id}`, data);
    return response.data;
  },

  deletar: async (id) => {
    const response = await apiClient.delete(`/api/v1/output-profiles/${id}`);
    return response.data;
  },
};
