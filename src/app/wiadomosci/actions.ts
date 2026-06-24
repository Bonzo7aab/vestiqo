'use server';

import {
  buildMessageNotificationPayload,
  sendMessage,
} from '../../lib/database/messaging';
import { createNotificationWithPush } from '../../lib/database/notifications-server';
import { instrumentServerAction } from '../../lib/sentry/instrument-server-action';
import { createClient } from '../../lib/supabase/server';

async function sendConversationMessageActionImpl(
  conversationId: string,
  content: string,
): Promise<{ messageId: string | null; error: string | null }> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { messageId: null, error: 'Wiadomość nie może być pusta' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { messageId: null, error: 'Brak autoryzacji' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversation, error: convError } = await (supabase as any)
    .from('conversations')
    .select('id, participant_1, participant_2')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return { messageId: null, error: 'Nie można znaleźć rozmowy' };
  }

  if (
    conversation.participant_1 !== user.id &&
    conversation.participant_2 !== user.id
  ) {
    return { messageId: null, error: 'Brak uprawnień do tej rozmowy' };
  }

  const sendResult = await sendMessage(supabase, {
    conversationId,
    senderId: user.id,
    content: trimmed,
    messageType: 'text',
    skipRecipientNotification: true,
  });

  if (sendResult.error || !sendResult.data) {
    return {
      messageId: null,
      error: sendResult.error?.message ?? 'Nie udało się wysłać wiadomości',
    };
  }

  // Service role ensures contractors and managers both receive in-app + push notifications.
  const payload = await buildMessageNotificationPayload(supabase, {
    conversationId,
    senderId: user.id,
    messageId: sendResult.data,
    content: trimmed,
  });

  if (payload) {
    const pushResult = await createNotificationWithPush({
      userId: payload.recipientId,
      type: 'new_message',
      title: payload.title,
      message: payload.message,
      data: payload.data,
      actionUrl: payload.actionUrl,
    });

    if (pushResult.error) {
      console.warn('sendConversationMessageAction: push/in-app notify failed', pushResult.error);
    }
  }

  return { messageId: sendResult.data, error: null };
}

export const sendConversationMessageAction = instrumentServerAction(
  'sendConversationMessageAction',
  sendConversationMessageActionImpl,
);
