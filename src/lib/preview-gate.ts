import { NextResponse, type NextRequest } from 'next/server';

export const PREVIEW_GATE_COOKIE_NAME = 'vestiqo_preview_gate';
export const PREVIEW_GATE_MAX_AGE_SECONDS = 31536000; // 1 year
const PREVIEW_GATE_PAYLOAD = 'vestiqo-preview-gate-v1';

function getPreviewPassword(): string | undefined {
  const password = process.env.PREVIEW_PASSWORD;
  if (!password) {
    return undefined;
  }
  return password;
}

function isPreviewEnvironment(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

function bytesToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  const length = Math.max(bufA.length, bufB.length, 1);
  let mismatch = bufA.length === bufB.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    mismatch |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return mismatch === 0;
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  return bytesToBase64Url(signature);
}

export async function signPreviewGateCookie(password: string): Promise<string> {
  return hmacSha256Base64Url(password, PREVIEW_GATE_PAYLOAD);
}

export async function verifyPreviewGateCookie(
  value: string,
  password: string,
): Promise<boolean> {
  if (!value || !password) {
    return false;
  }
  const expected = await signPreviewGateCookie(password);
  return timingSafeEqual(value, expected);
}

export function getPreviewGateCookieOptions(isHttps: boolean): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: PREVIEW_GATE_MAX_AGE_SECONDS,
  };
}

function previewGateHtml(hasError: boolean): string {
  const errorMarkup = hasError
    ? '<p class="error">Nieprawidłowe hasło. Spróbuj ponownie.</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Dostęp do podglądu — Vestiqo</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: #f4f6f8;
      color: #0f172a;
    }
    main {
      width: 100%;
      max-width: 24rem;
      margin: 1.5rem;
      padding: 1.75rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { margin: 0 0 1.25rem; color: #475569; line-height: 1.45; }
    label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.4rem; }
    input {
      width: 100%;
      padding: 0.65rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 1rem;
    }
    button {
      width: 100%;
      margin-top: 1rem;
      padding: 0.7rem 1rem;
      border: 0;
      border-radius: 0.5rem;
      background: #0f766e;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #0d9488; }
    .error { color: #b91c1c; margin: 0 0 1rem; }
  </style>
</head>
<body>
  <main>
    <h1>Podgląd wdrożenia</h1>
    <p>Ta wersja jest chroniona hasłem. Po poprawnym wpisaniu dostęp zostanie zapamiętany w tej przeglądarce na rok.</p>
    ${errorMarkup}
    <form method="post">
      <label for="password">Hasło</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
      <button type="submit">Wejdź</button>
    </form>
  </main>
</body>
</html>`;
}

function passwordPageResponse(hasError: boolean): NextResponse {
  return new NextResponse(previewGateHtml(hasError), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isPasswordFormPost(request: NextRequest): boolean {
  if (request.method !== 'POST') {
    return false;
  }
  const contentType = request.headers.get('content-type') ?? '';
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

/**
 * Blocks Vercel Preview traffic until PREVIEW_PASSWORD is entered.
 * Returns a response to short-circuit middleware, or null to continue.
 */
export async function handlePreviewGate(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!isPreviewEnvironment()) {
    return null;
  }

  const password = getPreviewPassword();
  if (!password) {
    return null;
  }

  const existing = request.cookies.get(PREVIEW_GATE_COOKIE_NAME)?.value;
  if (existing && (await verifyPreviewGateCookie(existing, password))) {
    return null;
  }

  if (isPasswordFormPost(request)) {
    try {
      const formData = await request.formData();
      const submitted = formData.get('password');
      if (typeof submitted === 'string' && timingSafeEqual(submitted, password)) {
        const redirect = NextResponse.redirect(request.url, 303);
        redirect.cookies.set(
          PREVIEW_GATE_COOKIE_NAME,
          await signPreviewGateCookie(password),
          getPreviewGateCookieOptions(request.nextUrl.protocol === 'https:'),
        );
        return redirect;
      }
    } catch {
      return passwordPageResponse(true);
    }
    return passwordPageResponse(true);
  }

  return passwordPageResponse(false);
}
