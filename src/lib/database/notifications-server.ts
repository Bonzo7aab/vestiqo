/**
 * Server-side notification creation with push notification support
 * This extends the existing notification system with push notifications
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClientOrNull } from '../supabase/admin';
import type { Database } from '../../types/database';
import {
  sendPushNotificationIfEnabled,
  type PushNotificationPayload
} from '../push-notifications/server';

type NotificationType = Database['public']['Tables']['notifications']['Row']['type'];

export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  sendPush?: boolean; // Default: true, set to false to skip push notification
  /** Authenticated admin session or service-role client. Prefer over elevated env when available. */
  supabase?: SupabaseClient<Database>;
}

/**
 * Create a notification and optionally send push notification
 * This is the main function to use when creating notifications in the app
 */
export async function createNotificationWithPush(
  options: CreateNotificationOptions
): Promise<{
  notificationId: string | null;
  pushSent: boolean;
  error?: Error;
}> {
  const supabase = options.supabase ?? createAdminClientOrNull();
  const sendPush = options.sendPush !== false; // Default to true

  if (!supabase) {
    const missingKeyError = new Error(
      'Cannot create notification: pass `supabase` from an authenticated admin action, or set SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY for server-side inserts.',
    );
    console.warn('createNotificationWithPush:', missingKeyError.message);
    return {
      notificationId: null,
      pushSent: false,
      error: missingKeyError,
    };
  }

  try {
    // Create notification in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notification, error: notificationError } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        data: (options.data || null) as Record<string, unknown> | null,
        action_url: options.actionUrl || null,
        priority: options.priority || 'normal',
        expires_at: options.expiresAt?.toISOString() || null
      } as { id?: string; [key: string]: unknown })
      .select('id')
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return {
        notificationId: null,
        pushSent: false,
        error: notificationError as Error
      };
    }

    const notificationId = ((notification as { id?: string } | null)?.id) || null;

    // Send push notification if enabled
    let pushSent = false;
    if (sendPush && notificationId) {
      try {
        const pushPayload: PushNotificationPayload = {
          title: options.title,
          body: options.message,
          icon: '/brand/vestiqo-mark.svg',
          badge: '/brand/vestiqo-mark.svg',
          tag: options.type,
          data: {
            notificationId,
            type: options.type,
            ...options.data
          },
          url: options.actionUrl || '/',
          requireInteraction: options.priority === 'high' || options.priority === 'urgent',
          timestamp: Date.now()
        };

        const pushResult = await sendPushNotificationIfEnabled(
          options.userId,
          options.type,
          pushPayload
        );

        pushSent = pushResult.sent;

        if (pushResult.error && pushResult.failedCount && pushResult.failedCount > 0) {
          console.warn('Some push notifications failed:', pushResult.error);
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        // Don't fail the whole operation if push fails
      }
    }

    return {
      notificationId,
      pushSent,
      error: undefined
    };
  } catch (error) {
    console.error('Error in createNotificationWithPush:', error);
    return {
      notificationId: null,
      pushSent: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Batch create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  options: Omit<CreateNotificationOptions, 'userId'>
): Promise<{
  created: number;
  pushSent: number;
  errors: Array<{ userId: string; error: Error }>;
}> {
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      return await createNotificationWithPush({
        ...options,
        userId
      });
    })
  );

  let created = 0;
  let pushSent = 0;
  const errors: Array<{ userId: string; error: Error }> = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const userId = userIds[i];

    if (result.status === 'fulfilled') {
      if (result.value.notificationId) {
        created++;
      }
      if (result.value.pushSent) {
        pushSent++;
      }
      if (result.value.error) {
        errors.push({ userId, error: result.value.error });
      }
    } else {
      errors.push({
        userId,
        error: result.reason instanceof Error ? result.reason : new Error('Unknown error')
      });
    }
  }

  return { created, pushSent, errors };
}



