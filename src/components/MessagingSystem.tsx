import {
  CheckCheck,
  Paperclip,
  Phone,
  Search,
  Send,
  X,
  MapPin,
  ExternalLink,
  ArrowLeft,
  Briefcase,
  MessagesSquare,
  RefreshCw,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useUserProfile } from '../contexts/AuthContext';
import { shouldUseMockData } from '../lib/config/data-source';
import { isDatabaseUuid } from '../lib/validation/uuid';
import { mockConversations, mockMessages } from '../mocks';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
} from '../types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getJobById, getTenderById } from '../lib/data';
import { useRouter } from 'next/navigation';
import { useIsMobile } from './ui/use-mobile';
import { cn } from './ui/utils';

function formatJobCompanyLabel(
  company: string | { name?: string } | null | undefined
): string {
  if (!company) return '';
  if (typeof company === 'string') return company;
  return company.name?.trim() || '';
}

function formatJobLocationLabel(
  location: string | { city?: string; sublocality_level_1?: string } | null | undefined
): string | undefined {
  if (!location) return undefined;
  if (typeof location === 'string') {
    const trimmed = location.trim();
    return trimmed || undefined;
  }
  const city = location.city?.trim();
  if (!city) return undefined;
  const district = location.sublocality_level_1?.trim();
  return district ? `${city}, ${district}` : city;
}

function getLatestMessageForConversation(
  conversation: Conversation,
  conversationMessages?: Message[],
): Message | undefined {
  if (conversationMessages?.length) {
    return conversationMessages[conversationMessages.length - 1];
  }
  return conversation.lastMessage;
}

function isOutgoingMessage(message: Message, currentUserId?: string): boolean {
  return Boolean(currentUserId && message.senderId === currentUserId);
}

function getDirectionLabel(outgoing: boolean): string {
  return outgoing ? 'Wysłano' : 'Odebrano';
}

/** Other person in the thread (not the signed-in user). */
function getConversationCounterparty(
  participants: ConversationParticipant[],
  currentUserId: string | undefined,
): ConversationParticipant | undefined {
  if (!participants.length) return undefined;

  if (currentUserId) {
    const self = participants.find((p) => p.id === currentUserId);
    if (self) {
      return participants.find((p) => p.id !== currentUserId);
    }
  }

  // fetchUserConversations stores [currentUser, otherParticipant]
  if (participants.length >= 2) {
    return participants[1];
  }

  return participants[0];
}

function getCounterpartyRoleLabel(userType: ConversationParticipant['userType']): string {
  return userType === 'manager' ? 'Zamawiający' : 'Wykonawca';
}

const NEAR_BOTTOM_THRESHOLD_PX = 96;

function formatMessagePreviewBody(message: Message): string {
  return (
    message.content.trim() ||
    (message.attachments?.length ? 'Przesłano plik' : '')
  );
}

function getLatestUnreadIncomingPreview(
  currentUserId: string | undefined,
  conversationMessages: Message[] | undefined,
  fallbackLastMessage: Message | undefined,
  hasUnread: boolean,
): string | null {
  if (!currentUserId || !hasUnread) return null;

  if (conversationMessages?.length) {
    for (let i = conversationMessages.length - 1; i >= 0; i -= 1) {
      const message = conversationMessages[i];
      if (message.senderId !== currentUserId && !message.read) {
        const body = formatMessagePreviewBody(message);
        if (body) return body;
      }
    }
  }

  if (
    fallbackLastMessage &&
    fallbackLastMessage.senderId !== currentUserId &&
    !fallbackLastMessage.read
  ) {
    const body = formatMessagePreviewBody(fallbackLastMessage);
    if (body) return body;
  }

  return null;
}

function UnreadPreviewLine({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'mt-2 line-clamp-2 text-xs leading-snug text-foreground sm:text-[13px]',
        className,
      )}
    >
      <span className="font-bold italic">Nie odebrano:</span>{' '}
      {body}
    </p>
  );
}

function getListPreviewParts(
  message: Message,
  currentUserId?: string,
): { label: string; body: string } | null {
  const body = formatMessagePreviewBody(message);
  if (!body) return null;
  const outgoing = isOutgoingMessage(message, currentUserId);
  return { label: getDirectionLabel(outgoing), body };
}

// Types now imported from centralized types folder

interface MessagingSystemProps {
  onClose?: () => void;
  initialConversationId?: string;
  initialRecipientId?: string;
  isFullPage?: boolean;
  initialConversations?: Conversation[];
  initialMessages?: { [conversationId: string]: Message[] };
  onConversationSelect?: (conversationId: string) => void;
  /** Refetch messages only (read receipts), without marking incoming as read */
  onRefreshMessages?: (conversationId: string) => void;
  /** Refresh conversation list and active thread */
  onRefresh?: () => void | Promise<void>;
  onConversationChange?: (conversationId: string | null) => void;
  onSendMessage?: (conversationId: string, content: string) => void;
}

export const MessagingSystem: React.FC<MessagingSystemProps> = ({
  onClose,
  initialConversationId,
  initialRecipientId: _initialRecipientId,
  isFullPage = false,
  initialConversations,
  initialMessages,
  onConversationSelect,
  onRefreshMessages,
  onRefresh,
  onConversationChange,
  onSendMessage,
}) => {
  const { user, session } = useUserProfile();
  const currentUserId = user?.id ?? session?.user?.id;
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>(
    initialConversations || mockConversations
  );
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>(
    initialMessages || mockMessages
  );
  const [showChatView, setShowChatView] = useState(false);
  const [isRefreshingList, setIsRefreshingList] = useState(false);

  // Sync with parent state when initialMessages changes
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (initialConversations) {
      setConversations(initialConversations);
    }
  }, [initialConversations]);

  // Deep-link / URL sync: open thread from ?conversation= without clearing a user click
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversation(initialConversationId);
      if (isMobile) {
        setShowChatView(true);
      }
    }
  }, [initialConversationId, isMobile]);

  // Poll read receipts so sender sees green checks when recipient reads
  useEffect(() => {
    if (!selectedConversation || !onRefreshMessages) return;
    if (!shouldUseMockData() && !isDatabaseUuid(selectedConversation)) return;

    const refresh = () => {
      void onRefreshMessages(selectedConversation);
    };

    refresh();
    const intervalId = window.setInterval(refresh, 4000);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [selectedConversation, onRefreshMessages]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping] = useState(false);
  const [jobData, setJobData] = useState<{ id: string; title: string; company: string; location?: string | { city?: string }; salary?: string } | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);

  // Sync pendingAttachments ref
  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach(att => {
        if (att.url.startsWith('blob:')) {
          URL.revokeObjectURL(att.url);
        }
      });
    };
  }, []);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const messagesMetaRef = useRef<{
    conversationId: string | null;
    lastMessageId: string | null;
    messageCount: number;
  }>({ conversationId: null, lastMessageId: null, messageCount: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingAttachmentsRef = useRef<MessageAttachment[]>([]);
  const router = useRouter();

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const updateStickToBottomFromScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
  }, []);

  const currentConversation = conversations.find(conv => conv.id === selectedConversation);
  const currentMessages = selectedConversation ? messages[selectedConversation] || [] : [];

  const lastOutgoingMessageId = useMemo(() => {
    if (!currentUserId) return null;
    for (let i = currentMessages.length - 1; i >= 0; i -= 1) {
      if (currentMessages[i].senderId === currentUserId) {
        return currentMessages[i].id;
      }
    }
    return null;
  }, [currentMessages, currentUserId]);

  // Scroll to bottom only when opening a thread, sending, or already at the bottom (not on poll/read updates)
  useEffect(() => {
    if (!selectedConversation) return;

    const conversationMessages = messages[selectedConversation] ?? [];
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const lastMessageId = lastMessage?.id ?? null;
    const messageCount = conversationMessages.length;

    const prev = messagesMetaRef.current;
    const conversationChanged = prev.conversationId !== selectedConversation;
    const hasNewTailMessage =
      Boolean(lastMessageId) &&
      lastMessageId !== prev.lastMessageId &&
      messageCount >= prev.messageCount;

    messagesMetaRef.current = {
      conversationId: selectedConversation,
      lastMessageId,
      messageCount,
    };

    if (conversationChanged) {
      stickToBottomRef.current = true;
      const frameId = requestAnimationFrame(() => {
        scrollMessagesToBottom('auto');
      });
      return () => cancelAnimationFrame(frameId);
    }

    if (!hasNewTailMessage) return;

    const isOwnMessage = Boolean(
      currentUserId && lastMessage?.senderId === currentUserId,
    );

    if (isOwnMessage || stickToBottomRef.current) {
      const frameId = requestAnimationFrame(() => {
        scrollMessagesToBottom(isOwnMessage ? 'auto' : 'smooth');
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [messages, selectedConversation, currentUserId, scrollMessagesToBottom]);

  // Fetch job details when conversation with jobId is selected
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!currentConversation?.jobId) {
        setJobData(null);
        return;
      }

      const jobId = currentConversation.jobId.trim();
      if (
        !shouldUseMockData() &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)
      ) {
        setJobData(null);
        return;
      }

      setIsLoadingJob(true);
      try {
        // Try to fetch as job first
        const { data: job, error: jobError } = await getJobById(jobId);
        if (job && !jobError) {
          setJobData({
            id: job.id,
            title: job.title || '',
            company: formatJobCompanyLabel(job.company),
            location: formatJobLocationLabel(job.location),
          });
          setIsLoadingJob(false);
          return;
        }

        // If not found as job, try as tender
        const { data: tender, error: tenderError } = await getTenderById(jobId);
        if (tender && !tenderError) {
          setJobData({
            id: tender.id,
            title: tender.title || '',
            company: formatJobCompanyLabel(tender.company),
            location: formatJobLocationLabel(tender.location),
          });
          setIsLoadingJob(false);
          return;
        }

        setJobData(null);
      } catch (error) {
        console.error('Error fetching job details:', error);
        setJobData(null);
      } finally {
        setIsLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [currentConversation?.jobId]);

  const handleSendMessage = () => {
    // Allow sending if there's text OR attachments
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !selectedConversation || !user) return;

    stickToBottomRef.current = true;

    const messageContent = newMessage.trim() || (pendingAttachments.length > 0 ? 'Przesłano plik' : '');

    // If we have a custom send handler (for database integration), use it
    if (onSendMessage) {
      // Call the handler - let the parent handle optimistic updates
      // Note: For now, we'll send text only. In a real implementation, you'd need to handle file uploads separately
      onSendMessage(selectedConversation, messageContent);
      setNewMessage('');
      setPendingAttachments([]);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Otherwise, use the original mock behavior
    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || '',
      senderName: user?.firstName || '',
      senderAvatar: user?.avatar || '',
      content: messageContent,
      timestamp: new Date(),
      read: false,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
      type: 'text'
    };

    setMessages(prev => ({
      ...prev,
      [selectedConversation]: [...(prev[selectedConversation] || []), message]
    }));

    // Update conversation last message
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation 
        ? { ...conv, lastMessage: message, updatedAt: new Date() }
        : conv
    ));

    setNewMessage('');
    setPendingAttachments([]);
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Wiadomość wysłana');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedConversation || !user) return;

    // Add files as pending attachments instead of sending immediately
    const newAttachments: MessageAttachment[] = Array.from(files).map((file, index) => ({
      id: `pending-att-${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'document',
      size: file.size
    }));

    setPendingAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => {
      const updated = prev.filter(att => att.id !== attachmentId);
      // Revoke object URL to free memory
      const removed = prev.find(att => att.id === attachmentId);
      if (removed && removed.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Dzisiaj';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    } else {
      return new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: 'short'
      }).format(date);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
    onConversationChange?.(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );

    // Clear pending attachments when switching conversations
    setPendingAttachments(prev => {
      prev.forEach(att => {
        if (att.url.startsWith('blob:')) {
          URL.revokeObjectURL(att.url);
        }
      });
      return [];
    });
    
    // On mobile, switch to chat view when conversation is selected
    if (isMobile) {
      setShowChatView(true);
    }
    
    // If we have a custom conversation select handler, call it
    if (onConversationSelect) {
      onConversationSelect(conversationId);
    }
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    onConversationChange?.(null);
    setShowChatView(false);
  };

  const handleRefreshList = async () => {
    if (!onRefresh || isRefreshingList) return;
    setIsRefreshingList(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshingList(false);
    }
  };

  const displayConversations = useMemo(() => {
    return conversations.map((conv) => {
      const loaded = messages[conv.id];
      if (!loaded?.length) return conv;

      const latest = loaded[loaded.length - 1];
      const convLast = conv.lastMessage;
      if (!convLast || latest.timestamp.getTime() >= convLast.timestamp.getTime()) {
        return {
          ...conv,
          lastMessage: latest,
          updatedAt: latest.timestamp,
        };
      }
      return conv;
    });
  }, [conversations, messages]);

  const filteredConversations = displayConversations.filter(conv =>
    conv.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || conv.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedConversations = useMemo(
    () =>
      [...filteredConversations].sort((a, b) => {
        const ta = (a.lastMessage?.timestamp ?? a.updatedAt).getTime();
        const tb = (b.lastMessage?.timestamp ?? b.updatedAt).getTime();
        return tb - ta;
      }),
    [filteredConversations],
  );

  const listTimeLabel = (conversation: Conversation) => {
    const ref = conversation.lastMessage?.timestamp ?? conversation.updatedAt;
    const today = new Date();
    if (ref.toDateString() === today.toDateString()) {
      return formatTime(ref);
    }
    return formatDate(ref);
  };

  const otherParticipant = currentConversation
    ? getConversationCounterparty(currentConversation.participants, currentUserId)
    : undefined;

  const containerClass = isFullPage 
    ? "h-full bg-background flex overflow-hidden"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50";
  
  const contentClass = isFullPage
    ? "bg-background w-full h-full flex overflow-hidden min-h-0"
    : "bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] overflow-hidden flex min-h-0";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Conversations sidebar */}
        <aside
          className={cn(
            'flex min-h-0 w-full shrink-0 flex-col border-r border-border/80 bg-muted/25 md:w-[min(100%,380px)] lg:w-[400px]',
            isMobile && showChatView && 'hidden',
          )}
        >
          {/* Sidebar header */}
          <div className="shrink-0 space-y-4 border-b border-border/60 bg-background/80 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Rozmowy
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {sortedConversations.length === 0
                    ? 'Brak aktywnych wątków'
                    : sortedConversations.length === 1
                      ? '1 aktywna rozmowa'
                      : `${sortedConversations.length} aktywnych rozmów`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {onRefresh && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleRefreshList()}
                        disabled={isRefreshingList}
                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                        aria-label="Odśwież rozmowy"
                      >
                        <RefreshCw
                          className={cn('h-4 w-4', isRefreshingList && 'animate-spin')}
                          aria-hidden
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Odśwież rozmowy</TooltipContent>
                  </Tooltip>
                )}
                {onClose && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Zamknij"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Szukaj po osobie, firmie lub zgłoszeniu…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-border/80 bg-background pl-9 pr-3 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2 sm:p-3">
              {sortedConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/50 px-4 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <MessagesSquare className="h-7 w-7 text-muted-foreground" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Brak rozmów</h3>
                  <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                    Gdy ktoś napisze lub odpowiesz na zgłoszenie, rozmowa pojawi się na tej liście.
                  </p>
                </div>
              ) : (
                sortedConversations.map((conversation) => {
                  const otherUser = getConversationCounterparty(
                    conversation.participants,
                    currentUserId,
                  );
                  const isSelected = selectedConversation === conversation.id;
                  const hasUnread = conversation.unreadCount > 0;
                  const roleLabel = otherUser
                    ? getCounterpartyRoleLabel(otherUser.userType)
                    : '';
                  const previewMessage = getLatestMessageForConversation(
                    conversation,
                    messages[conversation.id],
                  );
                  const previewParts = previewMessage
                    ? getListPreviewParts(previewMessage, currentUserId)
                    : null;
                  const unreadIncomingPreview = getLatestUnreadIncomingPreview(
                    currentUserId,
                    messages[conversation.id],
                    previewMessage,
                    hasUnread,
                  );

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleConversationClick(conversation.id)}
                      className={cn(
                        'relative w-full overflow-hidden rounded-xl border text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isSelected
                          ? 'border-primary/25 bg-background shadow-sm'
                          : hasUnread
                            ? 'border-transparent bg-primary/5 hover:bg-primary/10'
                            : 'border-transparent hover:border-border/60 hover:bg-muted/50',
                      )}
                    >
                      {isSelected ? (
                        <span
                          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary"
                          aria-hidden
                        />
                      ) : null}
                      <div className="flex gap-3 p-3 sm:p-3.5">
                        <div className="relative shrink-0">
                          <Avatar
                            className={cn(
                              'h-11 w-11 sm:h-12 sm:w-12',
                              isSelected ? 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background' : '',
                            )}
                          >
                            <AvatarImage src={otherUser?.avatar} alt="" />
                            <AvatarFallback className="text-xs font-medium sm:text-sm">
                              {(otherUser?.name ?? '?')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {otherUser?.isOnline && (
                            <span
                              className="absolute left-0 top-0 z-10 box-border h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm sm:h-3 sm:w-3"
                              title="Dostępny"
                            />
                          )}
                          {hasUnread && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'truncate text-sm font-semibold sm:text-[15px]',
                                  hasUnread && !isSelected ? 'text-foreground' : 'text-foreground/95',
                                )}
                              >
                                {otherUser?.name}
                              </p>
                              {otherUser?.company ? (
                                <p className="truncate text-xs text-muted-foreground sm:text-[13px]">
                                  {otherUser.company}
                                </p>
                              ) : null}
                            </div>
                            <time
                              className="shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground sm:text-xs"
                              dateTime={(conversation.lastMessage?.timestamp ?? conversation.updatedAt).toISOString()}
                            >
                              {listTimeLabel(conversation)}
                            </time>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {otherUser ? (
                              <span className="inline-flex items-center rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {roleLabel}
                              </span>
                            ) : null}
                            {conversation.jobTitle ? (
                              <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:text-[11px]">
                                <Briefcase className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                                <span className="truncate">{conversation.jobTitle}</span>
                              </span>
                            ) : null}
                          </div>

                          {hasUnread && unreadIncomingPreview ? (
                            <UnreadPreviewLine body={unreadIncomingPreview} />
                          ) : previewParts ? (
                            <p
                              className={cn(
                                'mt-2 line-clamp-2 text-xs leading-snug sm:text-[13px]',
                                'text-muted-foreground',
                              )}
                            >
                              <span className="font-medium text-muted-foreground/90">
                                {previewParts.label}
                                {': '}
                              </span>
                              <span>{previewParts.body}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat Area */}
        <div className={`flex-1 min-h-0 flex flex-col w-full ${
          isMobile && !showChatView ? 'hidden' : 'flex'
        }`}>
          {selectedConversation && currentConversation && otherParticipant ? (
            <>
              {/* Chat header — counterparty + linked listing */}
              <div className="shrink-0 border-b border-border/80 bg-background">
                <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
                  {isMobile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleBackToConversations}
                      className="-ml-1 h-9 w-9 shrink-0"
                      aria-label="Wróć do listy rozmów"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="relative min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 ring-2 ring-border/60 ring-offset-2 ring-offset-background">
                          <AvatarImage src={otherParticipant.avatar || ''} alt="" />
                          <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                            {otherParticipant.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {otherParticipant.isOnline && (
                          <span
                            className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500"
                            aria-hidden
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Rozmowa z
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">
                            {otherParticipant.name}
                          </h2>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px] font-medium uppercase tracking-wide sm:text-[11px]"
                          >
                            {getCounterpartyRoleLabel(otherParticipant.userType)}
                          </Badge>
                        </div>
                        {otherParticipant.company ? (
                          <p className="truncate text-sm text-muted-foreground">{otherParticipant.company}</p>
                        ) : null}
                      </div>

                      {otherParticipant.phone &&
                        !(currentConversation.jobId && String(currentConversation.jobId).trim()) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`tel:${otherParticipant.phone}`}
                                className="hidden shrink-0 items-center gap-1 rounded-md border border-border/80 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:inline-flex"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                Zadzwoń
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Zadzwoń: {otherParticipant.phone}</TooltipContent>
                          </Tooltip>
                        )}
                    </div>
                  </div>
                </div>

                {(currentConversation.jobTitle || currentConversation.jobId || isLoadingJob) && (
                  <div className="border-t border-border/60 bg-muted/25 px-4 py-3 sm:px-5">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Powiązane zgłoszenie
                    </p>
                    {isLoadingJob ? (
                      <div className="h-10 animate-pulse rounded-lg bg-muted" />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <p className="truncate font-medium text-foreground">
                            {jobData?.title || currentConversation.jobTitle || 'Zgłoszenie'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {(jobData?.company ||
                              (otherParticipant.userType === 'manager' && otherParticipant.company)) && (
                              <span className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="truncate">
                                  {jobData?.company ||
                                    (otherParticipant.userType === 'manager'
                                      ? otherParticipant.company
                                      : '')}
                                </span>
                              </span>
                            )}
                            {jobData?.location && (
                              <span className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="truncate">
                                  {typeof jobData.location === 'string'
                                    ? jobData.location
                                    : jobData.location.city || 'Nieznana lokalizacja'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        {currentConversation.jobId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full shrink-0 sm:w-auto"
                            onClick={() => router.push(`/konkurs/${currentConversation.jobId}`)}
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Zobacz zgłoszenie
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Messages */}
              <div className="flex-1 overflow-hidden min-h-0">
                <div
                  ref={messagesScrollRef}
                  onScroll={updateStickToBottomFromScroll}
                  className="h-full overflow-y-auto overscroll-y-contain p-2 sm:p-4 touch-pan-y"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="space-y-3 sm:space-y-4">
                  {currentMessages.map((message, index) => {
                    const isOwnMessage = Boolean(
                      currentUserId && message.senderId === currentUserId,
                    );
                    const isLastOutgoingMessage =
                      isOwnMessage && message.id === lastOutgoingMessageId;
                    const showWyslanoLabel =
                      isLastOutgoingMessage && !message.read;
                    const showDate = index === 0 || 
                      formatDate(message.timestamp) !== formatDate(currentMessages[index - 1].timestamp);

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="text-center my-3 sm:my-4">
                            <span className="text-[10px] sm:text-xs text-gray-500 bg-gray-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                        )}
                        
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] sm:max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`p-2 sm:p-3 rounded-lg ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-xs sm:text-sm break-words">{message.content}</p>
                              
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-1.5 sm:mt-2 space-y-1.5 sm:space-y-2">
                                  {message.attachments.map((attachment) => (
                                    <div
                                      key={attachment.id}
                                      className={`p-1.5 sm:p-2 rounded border ${
                                        isOwnMessage ? 'border-white/20 bg-white/10' : 'border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[10px] sm:text-xs font-medium truncate">{attachment.name}</p>
                                          <p className="text-[10px] sm:text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0">
                                          ⬇
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div
                              className={cn(
                                'mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs',
                                isOwnMessage ? 'justify-end' : 'justify-start',
                              )}
                            >
                              {isOwnMessage ? (
                                <>
                                  {showWyslanoLabel && (
                                    <>
                                      <span className="font-medium">Wysłano</span>
                                      <span aria-hidden>·</span>
                                    </>
                                  )}
                                  <span>{formatTime(message.timestamp)}</span>
                                  {isLastOutgoingMessage && (
                                    <CheckCheck
                                      className={cn(
                                        'h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3',
                                        message.read
                                          ? 'text-emerald-600'
                                          : 'text-muted-foreground/70',
                                      )}
                                      aria-label={
                                        message.read ? 'Przeczytano' : 'Dostarczone'
                                      }
                                    />
                                  )}
                                </>
                              ) : (
                                <span>{formatTime(message.timestamp)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-2 sm:p-4 border-t sticky bottom-0 bg-background z-10 touch-manipulation">
                {isTyping && (
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-2">
                    {otherParticipant.name} pisze...
                  </div>
                )}
                
                {/* Pending Attachments Preview */}
                {pendingAttachments.length > 0 && (
                  <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-md"
                      >
                        <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-[200px]">
                            {attachment.name}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePendingAttachment(attachment.id)}
                          className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-1.5 sm:gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 self-end"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Napisz wiadomość..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onClick={(e) => {
                        // Ensure textarea gets focus on mobile
                        e.stopPropagation();
                        e.currentTarget.focus();
                      }}
                      onTouchStart={(e) => {
                        // Explicitly focus on touch for mobile devices
                        e.stopPropagation();
                        const target = e.currentTarget;
                        setTimeout(() => {
                          target.focus();
                        }, 0);
                      }}
                      className="resize-none min-h-[40px] sm:min-h-[44px] max-h-[120px] text-sm sm:text-base touch-manipulation"
                      rows={1}
                      autoFocus={false}
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && pendingAttachments.length === 0}
                    className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-muted/15 px-6 py-12">
              <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-20 sm:w-20">
                  <MessagesSquare className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                  Twoje wiadomości
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Wybierz rozmowę z listy po lewej, aby zobaczyć historię i odpowiedzieć.
                  Powiadomienia o nowych wiadomościach otworzą od razu właściwy wątek.
                </p>
                {sortedConversations.length > 0 && isMobile && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Na telefonie wybierz wątek z listy, aby przejść do czatu.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingSystem;