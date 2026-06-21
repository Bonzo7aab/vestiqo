/**
 * Database helpers for notification preferences and push subscriptions
 */

import { createClient } from '../supabase/client';
import type { Database } from '../../types/database';
import {
  DEFAULT_IN_APP_NOTIFICATION_PREFERENCES,
  mapInAppNotificationPreferences,
  type InAppNotificationPreferences,
} from '../notifications/opd41-preferences';

type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert'];
type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];
type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row'];
type PushSubscriptionInsert = Database['public']['Tables']['push_subscriptions']['Insert'];

export interface NotificationPreferencesData {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications?: boolean;
  newJobNotifications?: boolean;
  newTenderNotifications?: boolean;
  messageNotifications: boolean;
  statusUpdateNotifications?: boolean;
  reminderNotifications?: boolean;
  marketingNotifications: boolean;
  systemNotifications?: boolean;
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }

  return data;
}

/**
 * OPD-41: Save role-specific in-app notification toggles.
 */
export async function saveInAppNotificationPreferences(
  userId: string,
  preferences: InAppNotificationPreferences,
): Promise<NotificationPreferences> {
  const supabase = createClient();

  const dbPreferences: NotificationPreferencesUpdate = {
    manager_contest_question_notifications:
      preferences.managerContestQuestionNotifications,
    contractor_contest_offer_accepted_notifications:
      preferences.contractorContestOfferAcceptedNotifications,
    contractor_contest_offer_rejected_notifications:
      preferences.contractorContestOfferRejectedNotifications,
    contractor_contest_answer_notifications:
      preferences.contractorContestAnswerNotifications,
    updated_at: new Date().toISOString(),
  };

  const existing = await getNotificationPreferences(userId);

  if (existing) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(dbPreferences)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating in-app notification preferences:', error);
      throw error;
    }

    return data;
  }

  const insertData: NotificationPreferencesInsert = {
    user_id: userId,
    email_notifications: true,
    push_notifications: true,
    message_notifications: true,
    marketing_notifications: false,
    ...dbPreferences,
  };

  const { data, error } = await supabase
    .from('notification_preferences')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error inserting in-app notification preferences:', error);
    throw error;
  }

  return data;
}

export {
  DEFAULT_IN_APP_NOTIFICATION_PREFERENCES,
  mapInAppNotificationPreferences,
  type InAppNotificationPreferences,
};

/**
 * Save notification preferences for a user
 */
export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferencesData
): Promise<NotificationPreferences> {
  const supabase = createClient();

  // Map component preferences to database fields
  const dbPreferences: NotificationPreferencesUpdate = {
    email_notifications: preferences.emailNotifications,
    push_notifications: preferences.pushNotifications,
    sms_notifications: preferences.smsNotifications ?? false,
    new_job_notifications: preferences.newJobNotifications ?? true,
    new_contest_notifications: preferences.newTenderNotifications ?? true,
    message_notifications: preferences.messageNotifications,
    status_update_notifications: preferences.statusUpdateNotifications ?? true,
    reminder_notifications: preferences.reminderNotifications ?? true,
    marketing_notifications: preferences.marketingNotifications,
    system_notifications: preferences.systemNotifications ?? true,
    updated_at: new Date().toISOString()
  };

  // Check if preferences exist
  const existing = await getNotificationPreferences(userId);

  if (existing) {
    // Update existing preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(dbPreferences)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }

    return data;
  } else {
    // Insert new preferences
    const insertData: NotificationPreferencesInsert = {
      user_id: userId,
      ...dbPreferences
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting notification preferences:', error);
      throw error;
    }

    return data;
  }
}

/**
 * Convert database notification preferences to component format
 */
export function mapPreferencesToComponent(
  dbPreferences: NotificationPreferences | null
): {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  jobUpdates: boolean;
  messageNotifications: boolean;
} {
  if (!dbPreferences) {
    // Return defaults
    return {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      jobUpdates: true,
      messageNotifications: true
    };
  }

  return {
    emailNotifications: dbPreferences.email_notifications,
    pushNotifications: dbPreferences.push_notifications,
    marketingEmails: dbPreferences.marketing_notifications,
    jobUpdates: dbPreferences.new_job_notifications,
    messageNotifications: dbPreferences.message_notifications
  };
}

/**
 * Save push subscription to database
 */
export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }
): Promise<PushSubscription> {
  const supabase = createClient();

  const subscriptionData: PushSubscriptionInsert = {
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    user_agent: subscription.userAgent || null
  };

  // Use upsert to handle existing subscriptions
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id,endpoint'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving push subscription:', error);
    throw error;
  }

  return data;
}

/**
 * Delete push subscription from database
 */
export async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('Error deleting push subscription:', error);
    throw error;
  }
}

/**
 * Get all push subscriptions for a user
 */
export async function getPushSubscriptions(
  userId: string
): Promise<PushSubscription[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching push subscriptions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete all push subscriptions for a user
 */
export async function deleteAllPushSubscriptions(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting all push subscriptions:', error);
    throw error;
  }
}

/**
 * Notification database operations
 */
type Notification = Database['public']['Tables']['notifications']['Row'];

/**
 * Get all notifications for a user
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

