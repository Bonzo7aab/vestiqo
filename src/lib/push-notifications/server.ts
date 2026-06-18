/**
 * Server-side Push Notification Utilities
 * Handles sending push notifications using web-push library
 */

import webpush from 'web-push';
import { createAdminClientOrNull } from '../supabase/admin';
import type { Database } from '../../types/database';

type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row'];

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  timestamp?: number;
}

/**
 * Initialize VAPID keys for web-push
 * Call this once when the server starts (e.g., in a Next.js API route or server action)
 */
export function initializeVAPID() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_SUPABASE_URL || 'mailto:admin@domio.pl';

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error(
      'VAPID keys are not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.'
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Initialize VAPID if not already done
    if (!webpush.getVapidDetails().publicKey) {
      initializeVAPID();
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/brand/vestiqo-mark.svg',
      badge: payload.badge || '/brand/vestiqo-mark.svg',
      tag: payload.tag || 'default',
      data: {
        ...payload.data,
        url: payload.url
      },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      timestamp: payload.timestamp || Date.now()
    });

    await webpush.sendNotification(pushSubscription, notificationPayload);

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Subscription expired or invalid
      if (error.message.includes('410') || error.message.includes('Gone')) {
        return {
          success: false,
          error: new Error('Subscription expired')
        };
      }
      // Unauthorized (invalid VAPID keys)
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: new Error('Invalid VAPID keys')
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Send push notifications to all subscriptions for a user
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{
  sent: number;
  failed: number;
  errors: Array<{ subscriptionId: string; error: Error }>;
}> {
  const supabase = createAdminClientOrNull();
  if (!supabase) {
    return { sent: 0, failed: 0, errors: [] };
  }

  // Get all push subscriptions for the user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching push subscriptions:', error);
    throw error;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  let sent = 0;
  let failed = 0;
  const errors: Array<{ subscriptionId: string; error: Error }> = [];

  // Send notification to all subscriptions (user might have multiple devices/browsers)
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const result = await sendPushNotification(subscription, payload);
      return { subscription, result };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { subscription, result: sendResult } = result.value;
      
      if (sendResult.success) {
        sent++;
      } else {
        failed++;
        
        // If subscription expired, delete it from database
        if (sendResult.error?.message === 'Subscription expired') {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
        
        errors.push({
          subscriptionId: subscription.id,
          error: sendResult.error || new Error('Unknown error')
        });
      }
    } else {
      failed++;
      errors.push({
        subscriptionId: 'unknown',
        error: result.reason instanceof Error ? result.reason : new Error('Unknown error')
      });
    }
  }

  return { sent, failed, errors };
}

/**
 * Check if user has push notifications enabled and should receive this notification type
 */
export async function shouldSendPushNotification(
  userId: string,
  notificationType: string
): Promise<boolean> {
  const supabase = createAdminClientOrNull();
  if (!supabase) {
    return false;
  }

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('push_notifications, new_job_notifications, new_contest_notifications, message_notifications, status_update_notifications, reminder_notifications, marketing_notifications, system_notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    // Default to true if there's an error
    return true;
  }

  if (!preferences) {
    // Default to true if preferences don't exist
    return true;
  }

  // Check if push notifications are enabled
  if (!preferences.push_notifications) {
    return false;
  }

  // Check type-specific preferences
  switch (notificationType) {
    case 'new_job':
      return preferences.new_job_notifications ?? true;
    case 'new_contest':
      return preferences.new_contest_notifications ?? true;
    case 'new_message':
    case 'contest_question':
      return preferences.message_notifications ?? true;
    case 'application_status_update':
    case 'bid_status_update':
      return preferences.status_update_notifications ?? true;
    case 'deadline_reminder':
    case 'certificate_expiring':
      return preferences.reminder_notifications ?? true;
    case 'system_announcement':
      return preferences.system_notifications ?? true;
    case 'subscription_expiring':
    case 'payment_failed':
      // Marketing/system notifications
      return preferences.marketing_notifications ?? false;
    default:
      return true;
  }
}

/**
 * Send push notification to user if they have it enabled
 * This is the main function to use when creating notifications
 */
export async function sendPushNotificationIfEnabled(
  userId: string,
  notificationType: string,
  payload: PushNotificationPayload
): Promise<{
  sent: boolean;
  sentCount?: number;
  failedCount?: number;
  error?: Error;
}> {
  try {
    // Check if user wants to receive this type of push notification
    const shouldSend = await shouldSendPushNotification(userId, notificationType);
    
    if (!shouldSend) {
      return { sent: false };
    }

    // Send the notification
    const result = await sendPushNotificationToUser(userId, payload);
    
    return {
      sent: result.sent > 0,
      sentCount: result.sent,
      failedCount: result.failed,
      error: result.errors.length > 0 ? result.errors[0].error : undefined
    };
  } catch (error) {
    console.error('Error in sendPushNotificationIfEnabled:', error);
    return {
      sent: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}


