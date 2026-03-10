import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (!error.response) {
      toast.error('Erro de conexao. Verifique sua rede.');
    } else if (status >= 500) {
      toast.error(detail || 'Erro interno do servidor.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
