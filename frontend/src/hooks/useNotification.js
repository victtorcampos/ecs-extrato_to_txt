import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook wrapper para notificações toast.
 * Padroniza mensagens de sucesso/erro/info.
 */
export function useNotification() {
  const notifySuccess = useCallback((message) => {
    toast.success(message);
  }, []);

  const notifyError = useCallback((err, fallbackMsg = 'Ocorreu um erro') => {
    const msg = err?.response?.data?.detail || err?.message || fallbackMsg;
    toast.error(msg);
  }, []);

  const notifyInfo = useCallback((message) => {
    toast.info(message);
  }, []);

  return { notifySuccess, notifyError, notifyInfo };
}
