import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { Conversation, Message } from '../../types/messaging';
import { isDatabaseUuid } from '../validation/uuid';

function logMessagingQueryError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  if (error && typeof error === 'object') {
    const e = error as PostgrestError;
    console.error(context, error, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      ...extra,
    });
    return;
  }
  console.error(context, error, extra);
}

// Helper types for tables not yet in Database type
interface ConversationRow {
  id: string;
  participant_1: string;
  participant_2: string;
  subject: string;
  job_id: string | null;
  contest_id: string | null;
  last_message_at: string;
  [key: string]: unknown;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachments: Record<string, unknown> | null;
  sender_profile?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
  };
  [key: string]: unknown;
}

interface UserCompanyRow {
  user_id: string;
  company_id: string;
  is_primary: boolean;
  [key: string]: unknown;
}

interface NotificationRow {
  id: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MessageReadStatusRow {
  message_id: string;
  user_id: string;
  read_at: string;
  [key: string]: unknown;
}

export interface QuoteRequestData {
  projectType: string;
  budgetRange: {
    min: number;
    max: number;
  };
  timeline: string;
  location: string;
  jobReference?: string | null;
}

export interface ConversationData {
  participant1: string;
  participant2: string;
  subject: string;
  jobId?: string | null;
  tenderId?: string | null;
}

export interface MessageData {
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'document' | 'system' | 'quote';
  attachments?: Array<Record<string, unknown>>;
  /** When true, caller handles recipient notification (e.g. custom copy or server push). */
  skipRecipientNotification?: boolean;
}

/**
 * Create a new conversation between two users
 */
export async function createConversation(
  supabase: SupabaseClient<Database>,
  data: ConversationData
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: conversation, error } = await (supabase as any)
      .from('conversations')
      .insert({
        participant_1: data.participant1,
        participant_2: data.participant2,
        subject: data.subject,
        job_id: data.jobId || null,
        contest_id: data.tenderId || null,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return { data: null, error };
    }

    return { data: (conversation as unknown as ConversationRow)?.id || null, error: null };
  } catch (err) {
    console.error('Error creating conversation:', err);
    return { data: null, error: err };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  supabase: SupabaseClient<Database>,
  data: MessageData
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversation, error: convFetchErr } = await (supabase as any)
      .from('conversations')
      .select('contest_id')
      .eq('id', data.conversationId)
      .maybeSingle();

    if (convFetchErr) {
      console.error('sendMessage: conversation lookup', convFetchErr);
    } else if (conversation?.contest_id) {
      const { isOrderMessagingBlocked } = await import('./order-mutations');
      const blocked = await isOrderMessagingBlocked(
        supabase,
        conversation.contest_id as string,
      );
      if (blocked) {
        return {
          data: null,
          error: new Error(
            'Wiadomości są zablokowane — zamówienie zostało przerwane lub anulowane.',
          ) as PostgrestError,
        };
      }
    }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: message, error } = await (supabase as any)
      .from('messages')
      .insert({
        conversation_id: data.conversationId,
        sender_id: data.senderId,
        content: data.content,
        message_type: data.messageType,
        attachments: data.attachments || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }

    const messageId = (message as unknown as MessageRow)?.id || null;

    // Update conversation's last_message_at
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.conversationId);

    if (messageId && !data.skipRecipientNotification) {
      await notifyConversationMessageRecipient(supabase, {
        conversationId: data.conversationId,
        senderId: data.senderId,
        messageId,
        content: data.content,
      });
    }

    return { data: messageId, error: null };
  } catch (err) {
    console.error('Error sending message:', err);
    return { data: null, error: err };
  }
}

interface MessageNotificationPayload {
  recipientId: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  actionUrl: string;
}

/**
 * Build in-app notification payload for a new conversation message.
 */
export async function buildMessageNotificationPayload(
  supabase: SupabaseClient<Database>,
  params: {
    conversationId: string;
    senderId: string;
    messageId: string;
    content: string;
  },
): Promise<MessageNotificationPayload | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv, error: convError } = await (supabase as any)
      .from('conversations')
      .select(`
        id,
        participant_1,
        participant_2,
        job_id,
        contest_id,
        job:jobs(title),
        tender:contests(title)
      `)
      .eq('id', params.conversationId)
      .single();

    if (convError || !conv) {
      console.warn('buildMessageNotificationPayload: conversation not found', convError);
      return null;
    }

    const participant1 = String(conv.participant_1);
    const participant2 = String(conv.participant_2);
    const recipientId =
      participant1 === params.senderId ? participant2 : participant1;

    if (!recipientId || recipientId === params.senderId) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: senderProfile } = await (supabase as any)
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', params.senderId)
      .maybeSingle();

    const senderName =
      `${String(senderProfile?.first_name ?? '')} ${String(senderProfile?.last_name ?? '')}`.trim() ||
      'Użytkownik';

    const jobTitle =
      String((conv.job as { title?: string } | null)?.title ?? '') ||
      String((conv.tender as { title?: string } | null)?.title ?? '');
    const preview = params.content.trim().slice(0, 160) || 'Nowa wiadomość';

    const title = jobTitle
      ? `Nowa wiadomość: ${jobTitle}`
      : `Nowa wiadomość od ${senderName}`;
    const message = jobTitle ? `${senderName}: ${preview}` : `${senderName}: ${preview}`;

    return {
      recipientId,
      title,
      message,
      data: {
        conversationId: params.conversationId,
        messageId: params.messageId,
        senderId: params.senderId,
        jobId: conv.job_id ?? null,
        tenderId: conv.contest_id ?? null,
      },
      actionUrl: `/wiadomosci?conversation=${params.conversationId}`,
    };
  } catch (err) {
    console.warn('buildMessageNotificationPayload failed:', err);
    return null;
  }
}

/**
 * Notify the other participant about a new message (in-app notification).
 */
export async function notifyConversationMessageRecipient(
  supabase: SupabaseClient<Database>,
  params: {
    conversationId: string;
    senderId: string;
    messageId: string;
    content: string;
  },
): Promise<void> {
  const payload = await buildMessageNotificationPayload(supabase, params);
  if (!payload) return;

  const notificationResult = await createNotification(
    supabase,
    payload.recipientId,
    'new_message',
    payload.title,
    payload.message,
    payload.data,
    payload.actionUrl,
  );

  if (notificationResult.error) {
    console.warn('Failed to create message notification:', notificationResult.error);
  }
}

/**
 * Send a quote request message with structured data
 */
export async function sendQuoteRequestMessage(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  senderId: string,
  message: string,
  quoteData: QuoteRequestData
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    const attachments = {
      projectType: quoteData.projectType,
      budgetRange: quoteData.budgetRange,
      timeline: quoteData.timeline,
      location: quoteData.location,
      jobReference: quoteData.jobReference || null,
    };

    return await sendMessage(supabase, {
      conversationId,
      senderId,
      content: message,
      messageType: 'quote',
      attachments: (attachments ? [attachments] : null) as Array<Record<string, unknown>> | null,
      skipRecipientNotification: true,
    });
  } catch (err) {
    console.error('Error sending quote request message:', err);
    return { data: null, error: err };
  }
}

/**
 * Create a notification for a user
 * Note: This function does NOT send push notifications. 
 * Use createNotificationWithPush from notifications-server.ts if you need push notifications.
 */
export async function createNotification(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: 'new_job' | 'new_contest' | 'application_received' | 'bid_received' | 'application_status_update' | 'bid_status_update' | 'job_assigned' | 'contest_awarded' | 'new_message' | 'review_received' | 'certificate_expiring' | 'deadline_reminder' | 'system_announcement' | 'subscription_expiring' | 'payment_failed' | 'verification_approved' | 'verification_rejected' | 'profile_completion_reminder' | 'offer_admin_moderation' | 'listing_admin_paused' | 'contest_question',
  title: string,
  message: string,
  data?: Record<string, unknown>,
  actionUrl?: string
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    // Insert notification without select first (RLS might block select for other users)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: (data || null) as Record<string, unknown> | null,
        action_url: actionUrl || null,
        priority: 'normal',
      } as unknown as NotificationRow);

    if (insertError) {
      console.error('Error creating notification (insert):', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return { data: null, error: insertError };
    }

    // Try to get the ID, but if it fails due to RLS, that's okay - the insert succeeded
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: notification, error: selectError } = await (supabase as any)
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('title', title)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectError) {
        console.warn('Could not retrieve notification ID (RLS may block select):', selectError);
        // Insert succeeded, so return success even if we can't get the ID
        return { data: null, error: null };
      }

      return { data: (notification as unknown as NotificationRow)?.id || null, error: null };
    } catch (selectErr) {
      console.warn('Error selecting notification ID:', selectErr);
      // Insert succeeded, so return success
      return { data: null, error: null };
    }
  } catch (err) {
    console.error('Error creating notification:', err);
    return { data: null, error: err };
  }
}

/**
 * Get the user profile ID that represents a contractor company
 */
export async function getContractorUserId(
  supabase: SupabaseClient<Database>,
  contractorCompanyId: string
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    console.log('Looking for contractor user for company ID:', contractorCompanyId);
    
    // First, try to find any active user for this company
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userCompanies, error } = await (supabase as any)
      .from('user_companies')
      .select('user_id')
      .eq('company_id', contractorCompanyId)
      .eq('is_active', true);

    console.log('Query result:', { userCompanies, error });

    if (error) {
      console.error('Error querying user_companies table:', error);
      return { data: null, error };
    }

    if (!userCompanies || userCompanies.length === 0) {
      console.warn('No active users found for contractor company:', contractorCompanyId);
      
      // Try to find the contractor company details for debugging
        const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, type, email, phone')
        .eq('id', contractorCompanyId)
        .single();
      
      console.log('Contractor company info:', { company, companyError });
      
      // For now, we'll still allow the quote request to proceed
      // but notify the user that the contractor may not be notified via the system
      return { 
        data: null, 
        error: null // Don't fail, but the calling function will need to handle this
      };
    }

    // Find primary user or use the first one
    const primaryUser = ((userCompanies as UserCompanyRow[]) || []).find((uc: UserCompanyRow) => uc.is_primary);
    const userId = primaryUser?.user_id || (userCompanies as UserCompanyRow[])?.[0]?.user_id;
    
    console.log('Found contractor user:', userId);
    return { data: userId || null, error: null };
  } catch (err) {
    console.error('Error finding contractor user:', err);
    return { data: null, error: err };
  }
}

/**
 * Get the user profile ID that represents a manager company
 */
export async function getManagerUserId(
  supabase: SupabaseClient<Database>,
  managerCompanyId: string
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    console.log('Looking for manager user for company ID:', managerCompanyId);
    
    // First, try to find any active user for this company
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userCompanies, error } = await (supabase as any)
      .from('user_companies')
      .select('user_id')
      .eq('company_id', managerCompanyId)
      .eq('is_active', true);

    console.log('Query result:', { userCompanies, error });

    if (error) {
      console.error('Error querying user_companies table:', error);
      return { data: null, error };
    }

    if (!userCompanies || userCompanies.length === 0) {
      console.warn('No active users found for manager company:', managerCompanyId);
      
      // Try to find the manager company details for debugging
        const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, type, email, phone')
        .eq('id', managerCompanyId)
        .single();
      
      console.log('Manager company info:', { company, companyError });
      
      // Return null data but no error - calling function will handle this
      return { 
        data: null, 
        error: null
      };
    }

    // Find primary user or use the first one
    const primaryUser = ((userCompanies as UserCompanyRow[]) || []).find((uc: UserCompanyRow) => uc.is_primary);
    const userId = primaryUser?.user_id || (userCompanies as UserCompanyRow[])?.[0]?.user_id;
    
    console.log('Found manager user:', userId);
    return { data: userId || null, error: null };
  } catch (err) {
    console.error('Error finding manager user:', err);
    return { data: null, error: err };
  }
}

/**
 * Complete workflow: Create conversation, send quote request, and notify contractor
 */
export async function submitQuoteRequest(
  supabase: SupabaseClient<Database>,
  requesterId: string,
  contractorCompanyId: string,
  contractorName: string,
  message: string,
  quoteData: QuoteRequestData
): Promise<{ success: boolean; error: PostgrestError | null; note?: string }> {
  try {
    // 1. Find the user profile ID that represents the contractor company
    const contractorUserResult = await getContractorUserId(supabase, contractorCompanyId);
    
    // Handle case where contractor has no user account
    if (contractorUserResult.error) {
      return { 
        success: false, 
        error: new Error('Nie można znaleźć profilu użytkownika wykonawcy') as PostgrestError 
      };
    }

    if (!contractorUserResult.data) {
      // Contractor doesn't have a user account, but we can still save the request
      console.warn('Contractor has no user account, saving quote request without conversation');
      
      // TODO: Store quote requests in a separate table for contractors without user accounts
      // For now, we'll just inform the user
      return { 
        success: true, 
        error: null,
        note: 'Ten wykonawca nie ma aktywnego konta w systemie. Skontaktuj się z nim bezpośrednio.'
      };
    }

    const contractorUserId = contractorUserResult.data;

    // 2. Create conversation
    const conversationResult = await createConversation(supabase, {
      participant1: requesterId,
      participant2: contractorUserId,
      subject: `Zapytanie o wycenę - ${quoteData.projectType}`,
      jobId: quoteData.jobReference || null,
    });

    if (conversationResult.error || !conversationResult.data) {
      return { success: false, error: conversationResult.error };
    }

    // 3. Send quote request message
    const messageResult = await sendQuoteRequestMessage(
      supabase,
      conversationResult.data,
      requesterId,
      message,
      quoteData
    );

    if (messageResult.error || !messageResult.data) {
      return { success: false, error: messageResult.error };
    }

    // 4. Create notification for contractor
    const notificationResult = await createNotification(
      supabase,
      contractorUserId,
      'new_message',
      'Nowe zapytanie o wycenę',
      `Otrzymałeś nowe zapytanie o wycenę od użytkownika dotyczące: ${quoteData.projectType}`,
      {
        conversationId: conversationResult.data,
        messageId: messageResult.data,
        projectType: quoteData.projectType,
        budgetRange: quoteData.budgetRange,
        timeline: quoteData.timeline,
        location: quoteData.location,
      },
      `/wiadomosci?conversation=${conversationResult.data}`
    );

    if (notificationResult.error) {
      console.warn('Failed to create notification:', notificationResult.error);
      // Don't fail the whole operation if notification fails
    }

    return { success: true, error: null, note: undefined };
  } catch (err) {
    console.error('Error submitting quote request:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if a conversation already exists between two users
 */
export async function findExistingConversation(
  supabase: SupabaseClient<Database>,
  participant1: string,
  participant2: string
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: conversation, error } = await (supabase as any)
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${participant1},participant_2.eq.${participant2}),and(participant_1.eq.${participant2},participant_2.eq.${participant1})`)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing on 0 rows

    // Handle "not found" error (PGRST116) as a normal case, not an error
    if (error) {
      // Check for PGRST116 in multiple ways since error structure can vary
      const errorCode = error.code || error?.code;
      if (errorCode === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('single JSON object')) {
        // Conversation not found - this is expected, not an error
        return { data: null, error: null };
      }
      console.error('Error finding conversation:', error);
      return { data: null, error };
    }

    // If no data, conversation doesn't exist
    return { data: (conversation as unknown as ConversationRow)?.id || null, error: null };
  } catch (err) {
    const error = err as unknown as { code?: string; error?: { code?: string }; message?: string };
    // Handle "not found" error (PGRST116) as a normal case
    const errorCode = error?.code || error?.error?.code;
    if (errorCode === 'PGRST116' || error?.message?.includes('0 rows') || error?.message?.includes('single JSON object')) {
      return { data: null, error: null };
    }
    console.error('Error finding conversation:', err);
    return { data: null, error: err };
  }
}

/**
 * Find a conversation by job_id and participants
 */
export async function findConversationByJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  participant1: string,
  participant2: string,
  isTender: boolean = false
): Promise<{ data: string | null; error: PostgrestError | null }> {
  try {
    const jobField = isTender ? 'contest_id' : 'job_id';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: conversation, error } = await (supabase as any)
      .from('conversations')
      .select('id')
      .eq(jobField, jobId)
      .or(`and(participant_1.eq.${participant1},participant_2.eq.${participant2}),and(participant_1.eq.${participant2},participant_2.eq.${participant1})`)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing on 0 rows

    // Handle "not found" error (PGRST116) as a normal case, not an error
    if (error) {
      // Check for PGRST116 in multiple ways since error structure can vary
      const errorCode = error.code || error?.code;
      if (errorCode === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('single JSON object')) {
        // Conversation not found - this is expected, not an error
        return { data: null, error: null };
      }
      console.error('Error finding conversation by job:', error);
      return { data: null, error };
    }

    // If no data, conversation doesn't exist
    return { data: (conversation as unknown as ConversationRow)?.id || null, error: null };
  } catch (err) {
    const error = err as unknown as { code?: string; error?: { code?: string }; message?: string };
    // Handle "not found" error (PGRST116) as a normal case
    const errorCode = error?.code || error?.error?.code;
    if (errorCode === 'PGRST116' || error?.message?.includes('0 rows') || error?.message?.includes('single JSON object')) {
      return { data: null, error: null };
    }
    console.error('Error finding conversation by job:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch all conversations for a user with participant details
 */
export async function fetchUserConversations(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ data: Conversation[] | null; error: PostgrestError | null }> {
  try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: conversations, error } = await (supabase as any)
      .from('conversations')
      .select(`
        id,
        subject,
        last_message_at,
        created_at,
        updated_at,
        job_id,
        contest_id,
        participant_1_profile:user_profiles!conversations_participant_1_fkey(
          id,
          first_name,
          last_name,
          avatar_url,
          user_type,
          phone
        ),
        participant_2_profile:user_profiles!conversations_participant_2_fkey(
          id,
          first_name,
          last_name,
          avatar_url,
          user_type,
          phone
        ),
        job:jobs(
          id,
          title
        ),
        tender:contests(
          id,
          title
        )
      `)
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return { data: null, error };
    }

    // Transform to Conversation format
    const transformedConversations: Conversation[] = ((conversations as ConversationRow[]) || []).map((conv: ConversationRow) => {
      const otherParticipant = (conv.participant_1_profile as Record<string, unknown>)?.id === userId 
        ? conv.participant_2_profile 
        : conv.participant_1_profile;
      
      const currentUser = (conv.participant_1_profile as Record<string, unknown>)?.id === userId 
        ? conv.participant_1_profile 
        : conv.participant_2_profile;

      return {
        id: String(conv.id ?? ''),
        participants: [
          {
            id: String((currentUser as Record<string, unknown>)?.id ?? ''),
            name: `${String((currentUser as Record<string, unknown>)?.first_name ?? '')} ${String((currentUser as Record<string, unknown>)?.last_name ?? '')}`.trim(),
            avatar: String((currentUser as Record<string, unknown>)?.avatar_url ?? ''),
            userType: (currentUser as Record<string, unknown>)?.user_type === 'manager' ? 'manager' : 'contractor',
            phone: (currentUser as Record<string, unknown>)?.phone as string | undefined,
            isOnline: false // TODO: Implement online status
          },
          {
            id: String((otherParticipant as Record<string, unknown>)?.id ?? ''),
            name: `${String((otherParticipant as Record<string, unknown>)?.first_name ?? '')} ${String((otherParticipant as Record<string, unknown>)?.last_name ?? '')}`.trim(),
            avatar: String((otherParticipant as Record<string, unknown>)?.avatar_url ?? ''),
            userType: (otherParticipant as Record<string, unknown>)?.user_type === 'manager' ? 'manager' : 'contractor',
            phone: (otherParticipant as Record<string, unknown>)?.phone as string | undefined,
            isOnline: false // TODO: Implement online status
          }
        ],
        lastMessage: undefined, // Will be populated separately
        unreadCount: 0, // Will be calculated separately
        jobId: String(conv.job_id ?? conv.contest_id ?? ''),
        jobTitle: String((conv.job as Record<string, unknown>)?.title ?? (conv.tender as Record<string, unknown>)?.title ?? ''),
        subject: conv.subject ? String(conv.subject) : undefined,
        createdAt: new Date(String(conv.created_at ?? '')),
        updatedAt: new Date(String(conv.updated_at ?? ''))
      };
    });

    const enriched = await enrichConversationsWithMessageMeta(
      supabase,
      transformedConversations,
      userId,
    );

    return { data: enriched, error: null };
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return { data: null, error: err };
  }
}

interface SenderProfileRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

function mapAttachments(raw: MessageRow['attachments']): Message['attachments'] {
  if (raw == null) return undefined;
  const list = Array.isArray(raw) ? raw : Object.values(raw as Record<string, unknown>);
  if (list.length === 0) return undefined;
  return list.map((att: Record<string, unknown>) => ({
    id: (att.id as string) || '',
    name: (att.name as string) || '',
    url: (att.url as string) || '',
    type: ((att.type as string) || 'other') as 'image' | 'document' | 'other',
    size: (att.size as number) || 0,
  }));
}

function formatMessagePreviewContent(
  content: string,
  attachments: MessageRow['attachments'],
): string {
  const trimmed = content.trim();
  if (trimmed) return trimmed;
  if (mapAttachments(attachments)?.length) return 'Przesłano plik';
  return '';
}

async function enrichConversationsWithMessageMeta(
  supabase: SupabaseClient<Database>,
  conversations: Conversation[],
  userId: string,
): Promise<Conversation[]> {
  const conversationIds = conversations.map((c) => c.id).filter(Boolean);
  if (conversationIds.length === 0) return conversations;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messageRows, error: messagesError } = await (supabase as any)
    .from('messages')
    .select('id, conversation_id, sender_id, content, message_type, attachments, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  if (messagesError) {
    console.error('Error fetching conversation message previews:', messagesError);
    return conversations;
  }

  const rows = (messageRows as MessageRow[]) || [];
  const lastByConversation = new Map<string, MessageRow>();
  const incomingIdsByConversation = new Map<string, string[]>();

  for (const row of rows) {
    const convId = String(row.conversation_id);
    if (!lastByConversation.has(convId)) {
      lastByConversation.set(convId, row);
    }
    if (String(row.sender_id) !== userId) {
      const existing = incomingIdsByConversation.get(convId) ?? [];
      existing.push(String(row.id));
      incomingIdsByConversation.set(convId, existing);
    }
  }

  const allIncomingIds = [...incomingIdsByConversation.values()].flat();
  const readMessageIds = new Set<string>();

  if (allIncomingIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: readRows, error: readError } = await (supabase as any)
      .from('message_read_status')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', allIncomingIds);

    if (readError) {
      console.error('Error fetching message read status:', readError);
    } else {
      for (const row of (readRows as { message_id: string }[]) || []) {
        readMessageIds.add(String(row.message_id));
      }
    }
  }

  const participantNameById = new Map<string, string>();
  for (const conv of conversations) {
    for (const participant of conv.participants) {
      participantNameById.set(participant.id, participant.name);
    }
  }

  return conversations.map((conv) => {
    const lastRow = lastByConversation.get(conv.id);
    const incomingIds = incomingIdsByConversation.get(conv.id) ?? [];
    const unreadCount = incomingIds.filter((id) => !readMessageIds.has(id)).length;

    let lastMessage: Message | undefined;
    if (lastRow) {
      const senderId = String(lastRow.sender_id);
      const previewContent = formatMessagePreviewContent(
        String(lastRow.content ?? ''),
        lastRow.attachments,
      );
      lastMessage = {
        id: String(lastRow.id),
        senderId,
        senderName: participantNameById.get(senderId) ?? '',
        content: previewContent,
        timestamp: new Date(String(lastRow.created_at)),
        read: senderId === userId || readMessageIds.has(String(lastRow.id)),
        type: 'text',
        attachments: mapAttachments(lastRow.attachments),
      };
    }

    return {
      ...conv,
      lastMessage,
      unreadCount,
      updatedAt: lastMessage?.timestamp ?? conv.updatedAt,
    };
  });
}

/**
 * Fetch all messages for a conversation.
 * Loads messages and sender profiles in two steps so we do not depend on
 * PostgREST embed FK names (which differ across deployments).
 */
export async function fetchConversationMessages(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  currentUserId: string,
): Promise<{ data: Message[] | null; error: PostgrestError | null }> {
  if (!isDatabaseUuid(conversationId)) {
    return { data: [], error: null };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase as any)
      .from('messages')
      .select('id, sender_id, content, message_type, attachments, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      logMessagingQueryError('Error fetching messages:', error, { conversationId });
      return { data: null, error };
    }

    const messageRows = (rows as MessageRow[]) || [];
    const senderIds = [...new Set(messageRows.map((m) => String(m.sender_id || '')).filter(Boolean))];

    let profileById: Record<string, SenderProfileRow> = {};
    if (senderIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles, error: profileError } = await (supabase as any)
        .from('user_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', senderIds);

      if (profileError) {
        console.error('Error fetching sender profiles for messages:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
          conversationId,
          senderIds,
        });
      } else {
        profileById = Object.fromEntries(
          ((profiles as SenderProfileRow[]) || []).map((p) => [p.id, p]),
        );
      }
    }

    const messageIds = messageRows.map((m) => String(m.id)).filter(Boolean);
    const readByUserId = new Map<string, Set<string>>();

    if (messageIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: readRows, error: readError } = await (supabase as any)
        .from('message_read_status')
        .select('message_id, user_id')
        .in('message_id', messageIds);

      if (readError) {
        console.error('Error fetching message read status:', {
          message: readError.message,
          code: readError.code,
          conversationId,
        });
      } else {
        for (const row of (readRows as { message_id: string; user_id: string }[]) || []) {
          const msgId = String(row.message_id);
          const uid = String(row.user_id);
          if (!readByUserId.has(msgId)) {
            readByUserId.set(msgId, new Set());
          }
          readByUserId.get(msgId)!.add(uid);
        }
      }
    }

    const transformedMessages: Message[] = messageRows.map((msg) => {
      const prof = profileById[String(msg.sender_id)];
      const senderName = prof
        ? `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim()
        : '';
      const senderId = String(msg.sender_id);
      const msgId = String(msg.id);
      const readers = readByUserId.get(msgId) ?? new Set<string>();
      const isOutgoing = senderId === currentUserId;
      const read = isOutgoing
        ? [...readers].some((uid) => uid !== currentUserId)
        : readers.has(currentUserId);

      return {
        id: msgId,
        senderId,
        senderName,
        senderAvatar: prof?.avatar_url ?? '',
        content: msg.content as string,
        timestamp: new Date(msg.created_at as string),
        read,
        type: msg.message_type === 'quote' ? 'text' : 'text',
        attachments: mapAttachments(msg.attachments),
      };
    });

    return { data: transformedMessages, error: null };
  } catch (err) {
    logMessagingQueryError('Error fetching messages:', err, { conversationId });
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Mark messages as read for a user in a conversation
 */
export async function markMessagesAsRead(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  userId: string
): Promise<{ data: boolean; error: PostgrestError | null }> {
  if (!isDatabaseUuid(conversationId)) {
    return { data: true, error: null };
  }

  try {
    // First, get all unread messages in this conversation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: messages, error: messagesError } = await (supabase as any)
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId); // Don't mark own messages as read

    if (messagesError) {
      console.error('Error fetching messages for read status:', messagesError);
      return { data: false, error: messagesError };
    }

    if (!messages || messages.length === 0) {
      return { data: true, error: null };
    }

    // Insert read status for each message
    const readStatusInserts = ((messages as MessageRow[]) || []).map((msg: MessageRow) => ({
      message_id: msg.id as string,
      user_id: userId,
      read_at: new Date().toISOString()
    }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
      .from('message_read_status')
      .upsert(readStatusInserts, {
        onConflict: 'message_id,user_id',
      });

    if (insertError) {
      console.error('Error marking messages as read:', insertError);
      return { data: false, error: insertError };
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('Error marking messages as read:', err);
    return { data: false, error: err };
  }
}
