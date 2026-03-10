import apiClient from './client';

export const regrasApi = {
  listar: async (layoutId, params = {}) => {
    const response = await apiClient.get(`/api/v1/import-layouts/${layoutId}/rules`, { params });
    return response.data;
  },

  obter: async (layoutId, regraId) => {
    const response = await apiClient.get(`/api/v1/import-layouts/${layoutId}/rules/${regraId}`);
    return response.data;
  },

  criar: async (layoutId, data) => {
    const response = await apiClient.post(`/api/v1/import-layouts/${layoutId}/rules`, data);
    return response.data;
  },

  atualizar: async (layoutId, regraId, data) => {
    const response = await apiClient.put(`/api/v1/import-layouts/${layoutId}/rules/${regraId}`, data);
    return response.data;
  },

  reordenar: async (layoutId, ordemIds) => {
    const response = await apiClient.put(`/api/v1/import-layouts/${layoutId}/rules/reorder`, {
      ordem_ids: ordemIds,
    });
    return response.data;
  },

  deletar: async (layoutId, regraId) => {
    const response = await apiClient.delete(`/api/v1/import-layouts/${layoutId}/rules/${regraId}`);
    return response.data;
  },
};
