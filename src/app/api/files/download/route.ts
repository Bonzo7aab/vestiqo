import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { assertCanReadStorageObject } from '../../../../lib/storage/authorize-read';
import { createPresignedDownloadUrl } from '../../../../lib/storage/r2/operations';
import { normalizeStorageObjectPath, resolveStorageBucket } from '../../../../lib/storage/path-utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.searchParams.get('path')?.trim();
  const filename = request.nextUrl.searchParams.get('filename')?.trim() ?? 'download';

  if (!path) {
    return NextResponse.json({ error: 'Brak ścieżki pliku' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 });
  }

  try {
    const bucket = resolveStorageBucket(path);
    const objectKey = normalizeStorageObjectPath(path, bucket);
    await assertCanReadStorageObject(supabase, user.id, path, bucket);

    const signedUrl = await createPresignedDownloadUrl(bucket, objectKey, filename, 3600);
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Brak uprawnień';
    const status = message.includes('uprawnień') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
