import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook para download de arquivos blob.
 * Elimina duplicação do padrão createObjectURL + click em LotesList e LoteDetail.
 */
export function useDownload() {
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(async (fetchFn, filename) => {
    setDownloading(true);
    try {
      const blob = await fetchFn();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Erro ao fazer download do arquivo');
      throw err;
    } finally {
      setDownloading(false);
    }
  }, []);

  return { download, downloading };
}
