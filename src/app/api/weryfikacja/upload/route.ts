import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { STORAGE_BUCKETS } from '../../../../lib/storage/buckets';
import { uploadObject } from '../../../../lib/storage/r2/operations';
import {
  buildVerificationDocumentPath,
  validateVerificationDocFile,
} from '../../../../lib/verification/document-file';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Musisz być zalogowany.' }, { status: 401 });
    }

    const formData = await request.formData();
    const documentKey = formData.get('documentKey');
    const file = formData.get('file');

    if (typeof documentKey !== 'string' || !documentKey.trim()) {
      return NextResponse.json({ error: 'Brak typu dokumentu.' }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Brak pliku do przesłania.' }, { status: 400 });
    }

    if (!/^[a-z0-9_-]+$/i.test(documentKey)) {
      return NextResponse.json({ error: 'Nieprawidłowy typ dokumentu.' }, { status: 400 });
    }

    try {
      validateVerificationDocFile(file);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Nieprawidłowy plik.' },
        { status: 400 },
      );
    }

    const path = buildVerificationDocumentPath(user.id, documentKey, file);
    await uploadObject(STORAGE_BUCKETS.VERIFICATION_DOCUMENTS, path, file);

    return NextResponse.json({ path });
  } catch (error) {
    console.error('POST /api/weryfikacja/upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się przesłać pliku.' },
      { status: 500 },
    );
  }
}
