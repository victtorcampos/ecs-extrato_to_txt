import apiClient from './client';

export const mapeamentosApi = {
  listar: async (params = {}) => {
    const response = await apiClient.get('/api/v1/account-mappings', { params });
    return response.data;
  },

  listarCnpjs: async () => {
    const response = await apiClient.get('/api/v1/account-mappings/cnpjs');
    return response.data;
  },

  obter: async (id) => {
    const response = await apiClient.get(`/api/v1/account-mappings/${id}`);
    return response.data;
  },

  criar: async (data) => {
    const response = await apiClient.post('/api/v1/account-mappings', data);
    return response.data;
  },

  atualizar: async (id, data) => {
    const response = await apiClient.put(`/api/v1/account-mappings/${id}`, data);
    return response.data;
  },

  atualizarEmLote: async (ids, contaPadrao) => {
    const response = await apiClient.put('/api/v1/account-mappings/bulk/update', {
      ids,
      conta_padrao: contaPadrao,
    });
    return response.data;
  },

  deletar: async (id) => {
    const response = await apiClient.delete(`/api/v1/account-mappings/${id}`);
    return response.data;
  },

  deletarEmLote: async (ids) => {
    const response = await apiClient.delete('/api/v1/account-mappings/bulk/delete', {
      data: { ids },
    });
    return response.data;
  },
};
