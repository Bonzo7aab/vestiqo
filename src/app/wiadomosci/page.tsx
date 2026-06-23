'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessagingSystem } from '../../components/MessagingSystem';
import { useUserProfile } from '../../contexts/AuthContext';
import { createClient } from '../../lib/supabase/client';
import { markMessagesAsRead } from '../../lib/database/messaging';
import { sendConversationMessageAction } from './actions';
import { shouldUseMockData } from '../../lib/config/data-source';
import { getConversations, getMessages } from '../../lib/data';
import { isDatabaseUuid } from '../../lib/validation/uuid';
import { Conversation, Message } from '../../types/messaging';
import { mockConversations } from '../../mocks';
import { toast } from 'sonner';
import type { PostgrestError } from '@supabase/supabase-js';

function resolveConversationList(fetchedConversations: Conversation[]): Conversation[] {
  if (fetchedConversations.length > 0) {
    return fetchedConversations;
  }
  return shouldUseMockData() ? mockConversations : [];
}

function logPostgrestError(context: string, err: unknown, extra?: Record<string, unknown>) {
  if (err && typeof err === 'object') {
    const e = err as PostgrestError;
    console.error(context, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      ...extra,
    });
  } else {
    console.error(context, err, extra);
  }
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingState label="Ładowanie wiadomości..." />}>
      <MessagesPageContent />
    </Suspense>
  );
}

function MessagesPageContent() {
  const { user, isLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const conversationId = searchParams.get('conversation');

  const handleConversationChange = useCallback(
    (id: string | null) => {
      const path = id
        ? `/wiadomosci?conversation=${encodeURIComponent(id)}`
        : '/wiadomosci';
      router.replace(path, { scroll: false });
    },
    [router],
  );

  const markConversationOpened = useCallback(
    async (selectedConversationId: string) => {
      if (!user) return;
      if (!shouldUseMockData() && !isDatabaseUuid(selectedConversationId)) {
        return;
      }

      const supabase = createClient();

      const messagesResult = await getMessages(selectedConversationId, user.id);
      if (messagesResult.error) {
        logPostgrestError('Failed to load messages:', messagesResult.error, {
          conversationId: selectedConversationId,
        });
        toast.error('Nie udało się załadować wiadomości');
        return;
      }

      await markMessagesAsRead(supabase, selectedConversationId, user.id);

      const refreshed = await getMessages(selectedConversationId, user.id);
      const finalMessages =
        refreshed.data ??
        (messagesResult.data || []).map((msg) =>
          msg.senderId !== user.id ? { ...msg, read: true } : msg,
        );

      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: finalMessages,
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    },
    [user],
  );

  const refreshConversationMessages = useCallback(
    async (selectedConversationId: string) => {
      if (!user) return;
      if (!shouldUseMockData() && !isDatabaseUuid(selectedConversationId)) {
        return;
      }

      const refreshed = await getMessages(selectedConversationId, user.id);
      if (refreshed.error) {
        logPostgrestError('Failed to refresh messages:', refreshed.error, {
          conversationId: selectedConversationId,
        });
        return;
      }

      if (refreshed.data) {
        setMessages((prev) => ({
          ...prev,
          [selectedConversationId]: refreshed.data!,
        }));
      }
    },
    [user],
  );

  const handleRefreshPanel = useCallback(async () => {
    if (!user) return;

    try {
      const conversationsResult = await getConversations(user.id);
      if (conversationsResult.error) {
        throw new Error('Nie udało się odświeżyć rozmów');
      }

      const fetchedConversations = conversationsResult.data || [];
      const conversationList = resolveConversationList(fetchedConversations);
      setConversations(conversationList);

      const activeId = conversationId ?? null;
      if (activeId && conversationList.some((c) => c.id === activeId)) {
        await refreshConversationMessages(activeId);
      }
    } catch (err) {
      console.error('Error refreshing messages panel:', err);
      toast.error('Nie udało się odświeżyć rozmów');
    }
  }, [user, conversationId, refreshConversationMessages]);

  const openedFromUrlRef = useRef<string | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = typeof window !== 'undefined' 
        ? `${window.location.pathname}${window.location.search}` 
        : '/wiadomosci';
      router.push(`/logowanie?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isLoading, router]);

  // Load conversation list once (avoid full-page spinner when picking a thread)
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        setIsLoadingData(true);
        setError(null);

        const conversationsResult = await getConversations(user.id);

        if (conversationsResult.error) {
          throw new Error('Nie udało się załadować rozmów');
        }

        const fetchedConversations = conversationsResult.data || [];
        const conversationList = resolveConversationList(fetchedConversations);

        if (fetchedConversations.length === 0 && shouldUseMockData()) {
          console.log('No conversations found in database, using mock data for testing');
        }

        setConversations(conversationList);
        setConversationsLoaded(true);
      } catch (err) {
        console.error('Error loading messages data:', err);
        setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas ładowania danych');
        toast.error('Nie udało się załadować wiadomości');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadConversations();
  }, [user]);

  // Reset URL-open guard when query param changes
  useEffect(() => {
    openedFromUrlRef.current = null;
  }, [conversationId]);

  // Open thread from URL (notifications, shared links).
  // conversations are read via ref so the dependency array length stays fixed.
  useEffect(() => {
    if (!user?.id || !conversationsLoaded || !conversationId) return;
    if (!conversationsRef.current.some((c) => c.id === conversationId)) return;
    if (openedFromUrlRef.current === conversationId) return;

    openedFromUrlRef.current = conversationId;
    void markConversationOpened(conversationId);
  }, [
    user?.id,
    conversationsLoaded,
    conversationId,
    conversations.length,
    markConversationOpened,
  ]);

  const handleConversationSelect = useCallback(
    async (selectedConversationId: string) => {
      try {
        await markConversationOpened(selectedConversationId);
      } catch (err) {
        console.error('Error loading conversation messages:', err);
        toast.error('Nie udało się załadować wiadomości');
      }
    },
    [markConversationOpened],
  );

  // Handle sending a new message
  const handleSendMessage = async (conversationId: string, content: string) => {
    if (!user) return;

    const tempId = `temp-${Date.now()}`;

    // Create optimistic message for immediate UI update
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      senderAvatar: user.avatar || '',
      content,
      timestamp: new Date(),
      read: false,
      type: 'text'
    };

    // Add optimistic message immediately
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: optimisticMessage,
              updatedAt: optimisticMessage.timestamp,
            }
          : c,
      ),
    );

    try {
      const { messageId, error } = await sendConversationMessageAction(
        conversationId,
        content,
      );

      if (error || !messageId) {
        throw new Error(error ?? 'Nie udało się wysłać wiadomości');
      }

      setMessages((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId].map((msg) =>
          msg.id === tempId ? { ...msg, id: messageId } : msg,
        ),
      }));

      toast.success('Wiadomość wysłana');

    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Nie udało się wysłać wiadomości');
      
      // Remove optimistic update on error
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId].filter(msg => msg.id !== tempId)
      }));
    }
  };

  // Prevent hydration mismatch - wait for client-side mount
  if (!mounted) {
    return <LoadingState label="Ładowanie..." />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingState label="Sprawdzanie..." />;
  }

  // Don't render if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold mb-2">Błąd ładowania</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (isLoadingData) {
    return <LoadingState label="Ładowanie wiadomości..." />;
  }

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-10rem)] bg-background">
      <MessagingSystem
        isFullPage={true}
        initialConversationId={conversationId || undefined}
        initialConversations={conversations}
        initialMessages={messages}
        onConversationSelect={handleConversationSelect}
        onRefreshMessages={refreshConversationMessages}
        onRefresh={handleRefreshPanel}
        onConversationChange={handleConversationChange}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
