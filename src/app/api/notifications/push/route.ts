import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { sendPushNotificationToUser, initializeVAPID, type PushNotificationPayload } from '../../../../lib/push-notifications/server';
import { createClient } from '../../../../lib/supabase/server';
import { sanitizeRedirectPath } from '../../../../lib/auth/redirectPath';
import webpush from 'web-push';

/**
 * API route for sending push notifications
 * This is primarily for testing purposes
 * 
 * POST /api/notifications/push
 * Body: {
 *   userId: string,
 *   title: string,
 *   body: string,
 *   icon?: string,
 *   url?: string,
 *   data?: Record<string, any>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authz = await authorizePlatformAdmin();
    if (authz) {
      return authz;
    }

    // Initialize VAPID keys
    try {
      initializeVAPID();
    } catch {
      return NextResponse.json(
        { error: 'Push notifications are not configured.' },
        { status: 500 }
      );
    }

    const requestBody = (await request.json()) as Record<string, unknown>;
    const userId = typeof requestBody.userId === 'string' ? requestBody.userId.trim() : '';
    const title = typeof requestBody.title === 'string' ? requestBody.title.trim() : '';
    const message = typeof requestBody.body === 'string' ? requestBody.body.trim() : '';
    const icon = typeof requestBody.icon === 'string' ? requestBody.icon.trim() : '';
    const redirectUrl = sanitizeRedirectPath(
      typeof requestBody.url === 'string' ? requestBody.url : null,
      '/'
    );
    const data =
      requestBody.data && typeof requestBody.data === 'object' && !Array.isArray(requestBody.data)
        ? (requestBody.data as Record<string, unknown>)
        : {};

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }
    if (title.length > 120 || message.length > 2000) {
      return NextResponse.json(
        { error: 'Notification title or body is too long.' },
        { status: 400 }
      );
    }

    // Verify user exists
    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send push notification
    const payload: PushNotificationPayload = {
      title,
      body: message,
      icon: icon.startsWith('/') ? icon : '/brand/vestiqo-mark.svg',
      badge: '/brand/vestiqo-mark.svg',
      url: redirectUrl,
      data,
      timestamp: Date.now()
    };

    const result = await sendPushNotificationToUser(userId, payload);

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.map(e => ({
        subscriptionId: e.subscriptionId,
        error: e.error.message
      }))
    });
  } catch (error) {
    console.error('Error in push notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/push
 * Test endpoint to check if push notifications are configured
 */
export async function GET() {
  try {
    const authz = await authorizePlatformAdmin();
    if (authz) {
      return authz;
    }

    initializeVAPID();
    
    return NextResponse.json({
      configured: !!webpush.getVapidDetails().publicKey,
    });
  } catch (error) {
    console.error('Error in push notification config API:', error);
    return NextResponse.json(
      {
        configured: false,
        error: 'Push notifications are not configured.'
      },
      { status: 500 }
    );
  }
}

async function authorizePlatformAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('platform_role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.platform_role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

