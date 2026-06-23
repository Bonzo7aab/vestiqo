'use client';

import { useState, type ReactElement } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthorizedDownloadUrl } from '../../lib/storage/authorized-download';

interface StorageDocumentLinkProps {
  name: string;
  path?: string;
  /** Legacy public URL — used only when path is missing (old records). */
  url?: string;
  className?: string;
}

/**
 * Downloads a private storage object via authorized presigned URL (OPD-114).
 */
export function StorageDocumentLink({
  name,
  path,
  url,
  className,
}: StorageDocumentLinkProps): ReactElement {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClick = async (): Promise<void> => {
    setIsDownloading(true);
    try {
      let downloadUrl: string | null | undefined = url;

      if (path) {
        downloadUrl = await getAuthorizedDownloadUrl(path, name);
      }

      if (!downloadUrl) {
        toast.error('Nie udało się pobrać pliku. Zaloguj się, jeśli nie jesteś zalogowany.');
        return;
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = name;
      anchor.rel = 'noopener noreferrer';
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      toast.error('Nie udało się pobrać pliku');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isDownloading || (!path && !url)}
      className={
        className ??
        'text-sm font-medium text-primary hover:underline flex items-center gap-1 disabled:opacity-50'
      }
    >
      {name}
      {isDownloading ? (
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
      ) : (
        <Download className="w-3 h-3" aria-hidden />
      )}
    </button>
  );
}
