'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthorizedDownloadUrl } from '../../lib/storage/authorized-download';
import { cn } from '../ui/utils';

interface StorageDocumentLinkProps {
  name: string;
  path?: string;
  /** Legacy public URL — used only when path is missing (old records). */
  url?: string;
  className?: string;
  leadingIcon?: ReactNode;
}

/**
 * Downloads a private storage object via authorized presigned URL (OPD-114).
 */
export function StorageDocumentLink({
  name,
  path,
  url,
  className,
  leadingIcon,
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
      className={cn(
        'inline-flex min-w-0 items-center gap-2 text-left text-sm font-medium text-primary hover:underline disabled:opacity-50',
        className,
      )}
    >
      {leadingIcon}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {isDownloading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}
