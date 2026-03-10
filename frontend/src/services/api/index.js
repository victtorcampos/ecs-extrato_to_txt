/**
 * API Service - Barrel Export
 * Re-exporta todos os módulos de API para compatibilidade com imports existentes.
 */
import apiClient from './client';

export default apiClient;
export { lotesApi } from './lotes.api';
export { layoutsApi } from './layouts.api';
export { mapeamentosApi } from './mapeamentos.api';
export { regrasApi } from './regras.api';
export { perfisSaidaApi } from './perfis-saida.api';

export const healthCheck = async () => {
  const response = await apiClient.get('/api/health');
  return response.data;
};
