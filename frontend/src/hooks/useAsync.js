import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook genérico para operações assíncronas com loading/error/data.
 * @param {Function} asyncFn - Função assíncrona a ser executada
 * @param {Object} options - { immediate: boolean, deps: [] }
 */
export function useAsync(asyncFn, options = {}) {
  const { immediate = false, deps = [] } = options;
  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await asyncFn(...args);
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: err }));
      }
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncFn]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return { ...state, execute, reset };
}
