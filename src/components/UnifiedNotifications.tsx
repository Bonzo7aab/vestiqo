import { Bell, Bookmark, Calendar, Check, CheckCircle, Clock, Eye, Gavel, HelpCircle, MessagesSquare, Search, ShieldCheck, ShieldX, Star, Trophy, UserCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { useUserProfile } from '../contexts/AuthContext';
import { deleteNotification, getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../lib/database/notifications';
import { createClient } from '../lib/supabase/client';
import { KONTO_DOKUMENTY_PATH } from '../lib/konto-tabs';
import type { Database } from '../types/database';
import type {
  ApplicationNotification,
  ContestNotification,
  JobNotification,
  MessageNotification,
  SystemNotification,
  UnifiedNotification,
  UnifiedNotificationsProps,
} from '../types/notification';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

/**
 * Map database notification type to component notification category and type
 */
function getNotificationCategoryAndType(
  dbType: NotificationRow['type'],
  data: Record<string, unknown> | null
): { category: 'job' | 'application' | 'contest' | 'message' | 'system'; type: string } | null {
  switch (dbType) {
    // Job notifications
    case 'new_job':
      return { category: 'job', type: 'new_job' };
    case 'deadline_reminder':
      // Check if it's job-related or contest-related based on data
      if (data?.jobId) {
        return { category: 'job', type: 'deadline_reminder' };
      } else if (data?.tenderId) {
        return { category: 'contest', type: 'deadline_reminder' };
      }
      return { category: 'job', type: 'deadline_reminder' }; // Default to job

    // Application notifications (for managers)
    case 'application_received':
      return { category: 'application', type: 'new_application' };
    case 'application_status_update':
      return { category: 'application', type: 'application_update' };
    case 'job_assigned':
      return { category: 'application', type: 'contract_signed' };

    // Contest notifications (for contractors)
    case 'new_contest':
      return { category: 'contest', type: 'new_contest' };
    case 'bid_status_update':
      return { category: 'contest', type: 'evaluation_started' };
    case 'contest_awarded':
      return { category: 'contest', type: 'contest_awarded' };

    // System (admin) notifications surfaced to the user
    case 'verification_approved':
      return { category: 'system', type: 'verification_approved' };
    case 'verification_rejected':
      return { category: 'system', type: 'verification_rejected' };

    case 'new_message':
      return { category: 'message', type: 'new_message' };

    case 'contest_question':
      return { category: 'contest', type: 'contest_question' };

    default:
      // For other types, try to infer from data
      if (data?.conversationId || data?.conversation_id) {
        return { category: 'message', type: 'new_message' };
      }
      if (data?.jobId && !data?.tenderId) {
        return { category: 'job', type: 'new_job' };
      } else if (data?.tenderId) {
        return { category: 'contest', type: 'new_contest' };
      } else if (data?.applicationId) {
        return { category: 'application', type: 'new_application' };
      }
      return null;
  }
}

/**
 * Transform database notification to component notification format
 */
function transformNotification(dbNotification: NotificationRow): UnifiedNotification | null {
  const data = dbNotification.data as Record<string, unknown> | null;
  const categoryAndType = getNotificationCategoryAndType(dbNotification.type, data);
  
  if (!categoryAndType) {
    return null;
  }

  const baseNotification = {
    id: dbNotification.id,
    timestamp: new Date(dbNotification.created_at),
    read: dbNotification.is_read,
    urgent: dbNotification.priority === 'urgent'
  };

  switch (categoryAndType.category) {
    case 'job': {
      const jobNotif: JobNotification = {
        ...baseNotification,
        category: 'job',
        type: categoryAndType.type as JobNotification['type'],
        title: dbNotification.title,
        description: dbNotification.message,
        jobId: (data?.jobId || data?.job_id) as string | undefined,
        searchQuery: (data?.searchQuery || data?.search_query) as string | undefined
      };
      return jobNotif;
    }
    
    case 'application': {
      const appNotif: ApplicationNotification = {
        ...baseNotification,
        category: 'application',
        type: categoryAndType.type as ApplicationNotification['type'],
        title: dbNotification.title,
        message: dbNotification.message,
        contractorName: (data?.contractorName || data?.contractor_name || 'Nieznany wykonawca') as string,
        contractorAvatar: (data?.contractorAvatar || data?.contractor_avatar) as string | undefined,
        contractorRating: (data?.contractorRating || data?.contractor_rating || 0) as number,
        jobTitle: (data?.jobTitle || data?.job_title || dbNotification.title) as string,
        applicationId: (data?.applicationId || data?.application_id || dbNotification.id) as string,
        jobId: (data?.jobId || data?.job_id || '') as string
      };
      return appNotif;
    }
    
    case 'contest': {
      const contestNotif: ContestNotification = {
        ...baseNotification,
        category: 'contest',
        type: categoryAndType.type as ContestNotification['type'],
        title: dbNotification.title,
        message: dbNotification.message,
        contestTitle: (data?.tenderTitle || data?.tender_title || dbNotification.title) as string,
        organizerName: (data?.organizerName || data?.organizer_name || 'Nieznany organizator') as string,
        estimatedValue: (data?.estimatedValue || data?.estimated_value) as string | undefined,
        deadline: data?.deadline ? new Date(data.deadline as string | number) : dbNotification.expires_at ? new Date(dbNotification.expires_at) : undefined,
        contestId: (data?.contestId || data?.contest_id || data?.tenderId || data?.contest_id || dbNotification.id) as string,
        actionUrl: dbNotification.action_url ?? undefined,
      };
      return contestNotif;
    }

    case 'system': {
      const systemNotif: SystemNotification = {
        ...baseNotification,
        category: 'system',
        type: categoryAndType.type as SystemNotification['type'],
        title: dbNotification.title,
        message: dbNotification.message,
        actionUrl: dbNotification.action_url ?? undefined,
      };
      return systemNotif;
    }

    case 'message': {
      const messageNotif: MessageNotification = {
        ...baseNotification,
        category: 'message',
        type: 'new_message',
        title: dbNotification.title,
        message: dbNotification.message,
        conversationId: (data?.conversationId || data?.conversation_id) as string | undefined,
        actionUrl: dbNotification.action_url ?? undefined,
      };
      return messageNotif;
    }

    default:
      return null;
  }
}

export const UnifiedNotifications: React.FC<UnifiedNotificationsProps> = ({
  onJobSelect,
  onSearchSelect,
  onApplicationSelect,
  onTenderSelect
}) => {
  const { user } = useUserProfile();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure consistent hydration by only rendering user-dependent content after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const dbNotifications = await getNotifications(user.id);
      const transformed = dbNotifications
        .map(transformNotification)
        .filter((n): n is UnifiedNotification => n !== null);
      
      setNotifications(transformed);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Nie udało się załadować powiadomień');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!isMounted || !user?.id) {
      return;
    }

    fetchNotifications();

    // Set up real-time subscription
    const supabase = createClient();
    const channelName = `notifications-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          console.log('Notification change:', payload.eventType);
          // Refetch notifications on any change
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [isMounted, user?.id, fetchNotifications]);

  // Filter notifications based on user type
  const getAllNotifications = (): UnifiedNotification[] => {
    if (!isMounted) {
      return [];
    }

    const filtered = [...notifications];

    // Filter by user type - managers see applications, contractors see tenders
    // But all users see job notifications
    // The filtering is already done at the database level based on notification type
    // We just need to ensure we're showing the right categories
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const allNotifications = getAllNotifications();
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistically update UI
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      await markNotificationAsRead(notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      await markAllNotificationsAsRead(user.id);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Optimistically remove from UI
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      await deleteNotification(notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification: UnifiedNotification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Try to use action_url from database first (would need to fetch original notification)
    // For now, use the extracted IDs from transformed notification
    
    switch (notification.category) {
      case 'job': {
        const jobNotif = notification as JobNotification;
        if (jobNotif.jobId && onJobSelect) {
          onJobSelect(jobNotif.jobId);
        } else if (jobNotif.searchQuery && onSearchSelect) {
          onSearchSelect(jobNotif.searchQuery);
        }
        break;
      }
      case 'application': {
        const appNotif = notification as ApplicationNotification;
        if (onApplicationSelect && appNotif.applicationId) {
          onApplicationSelect(appNotif.applicationId);
        } else if (appNotif.jobId && onJobSelect) {
          // Fallback to job if application ID not available
          onJobSelect(appNotif.jobId);
        }
        break;
      }
      case 'contest': {
        const contestNotif = notification as ContestNotification;
        if (contestNotif.actionUrl) {
          router.push(contestNotif.actionUrl);
        } else if (onTenderSelect && contestNotif.contestId) {
          onTenderSelect(contestNotif.contestId);
        } else if (contestNotif.contestId) {
          router.push(`/konkurs/${contestNotif.contestId}`);
        }
        break;
      }
      case 'system': {
        const systemNotif = notification as SystemNotification;
        const verificationPath =
          user?.userType === 'manager' ? '/konto' : KONTO_DOKUMENTY_PATH;
        const target =
          systemNotif.actionUrl ||
          (systemNotif.type === 'verification_rejected' ? verificationPath : '/konto');
        router.push(target);
        break;
      }
      case 'message': {
        const messageNotif = notification as MessageNotification;
        const target =
          messageNotif.actionUrl ||
          (messageNotif.conversationId
            ? `/wiadomosci?conversation=${messageNotif.conversationId}`
            : '/wiadomosci');
        router.push(target);
        break;
      }
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (notification: UnifiedNotification) => {
    const urgent = 'urgent' in notification ? notification.urgent : false;
    const iconClass = urgent ? 'text-destructive' : 'text-primary';
    
    switch (notification.category) {
      case 'job': {
        const jobNotif = notification as JobNotification;
        switch (jobNotif.type) {
          case 'new_job':
            return <Search className={`h-4 w-4 ${iconClass}`} />;
          case 'saved_search':
            return <Bookmark className={`h-4 w-4 ${iconClass}`} />;
          case 'price_alert':
            return <Bell className={`h-4 w-4 ${iconClass}`} />;
          case 'deadline_reminder':
            return <Clock className={`h-4 w-4 ${iconClass}`} />;
        }
        break;
      }
      case 'application': {
        const appNotif = notification as ApplicationNotification;
        switch (appNotif.type) {
          case 'new_application':
            return <UserCheck className="h-4 w-4 text-blue-600" />;
          case 'application_update':
            return <Clock className="h-4 w-4 text-orange-600" />;
          case 'interview_request':
            return <Calendar className="h-4 w-4 text-purple-600" />;
          case 'contract_signed':
            return <CheckCircle className="h-4 w-4 text-green-600" />;
        }
        break;
      }
      case 'contest': {
        const contestNotif = notification as ContestNotification;
        switch (contestNotif.type) {
          case 'new_contest':
            return <Gavel className="h-4 w-4 text-blue-600" />;
          case 'deadline_reminder':
            return <Clock className="h-4 w-4 text-orange-600" />;
          case 'evaluation_started':
            return <Eye className="h-4 w-4 text-purple-600" />;
          case 'contest_awarded':
            return <Trophy className="h-4 w-4 text-green-600" />;
          case 'contest_cancelled':
            return <X className="h-4 w-4 text-red-600" />;
          case 'contest_question':
            return <HelpCircle className="h-4 w-4 text-blue-600" />;
        }
        break;
      }
      case 'system': {
        const systemNotif = notification as SystemNotification;
        switch (systemNotif.type) {
          case 'verification_approved':
            return <ShieldCheck className="h-4 w-4 text-green-600" />;
          case 'verification_rejected':
            return <ShieldX className="h-4 w-4 text-red-600" />;
        }
        break;
      }
      case 'message':
        return <MessagesSquare className={`h-4 w-4 ${iconClass}`} />;
    }

    return <Bell className={`h-4 w-4 ${iconClass}`} />;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Teraz';
    if (minutes < 60) return `${minutes}m temu`;
    if (hours < 24) return `${hours}h temu`;
    return `${days}d temu`;
  };

  const renderNotification = (notification: UnifiedNotification) => {
    return (
      <div
        key={notification.id}
        className={`p-4 border-b cursor-pointer transition-colors group ${
          !notification.read 
            ? 'bg-primary/5 hover:bg-primary/10' 
            : 'hover:bg-muted/50'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start justify-between space-x-3">
          <div className="flex items-start space-x-3 flex-1">
            {getNotificationIcon(notification)}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                !notification.read ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {'description' in notification ? notification.description : notification.message}
              </p>
              
              {/* Additional info based on notification type */}
              {notification.category === 'application' && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs">
                      {(notification as ApplicationNotification).contractorName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{(notification as ApplicationNotification).contractorName}</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{(notification as ApplicationNotification).contractorRating}</span>
                  </div>
                </div>
              )}
              
              {notification.category === 'contest' && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    📋 {(notification as ContestNotification).contestTitle}
                  </p>
                  <p className="text-xs text-gray-500">
                    Organizator: {(notification as ContestNotification).organizerName}
                  </p>
                  {notification.estimatedValue && (
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-medium">💰</span>
                      <span className="text-green-600 font-medium">
                        {notification.estimatedValue}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {formatTimestamp(notification.timestamp)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {!notification.read && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNotification(notification.id);
              }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Always show the bell icon button
  const bellButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsOpen(!isOpen)}
      className={`relative ${isOpen ? 'bg-primary/10' : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );

  if (!isOpen) {
    return bellButton;
  }

  return (
    <>
      {/* Bell Button - Always visible */}
      {bellButton}
      
      <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/30"
          onClick={() => setIsOpen(false)}
        />

        {/* Notification Panel */}
        <Card className="relative w-96 max-h-[80vh] shadow-xl border-2 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Powiadomienia</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} nowe
                </Badge>
              )}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Quick Actions */}
          {unreadCount > 0 && (
            <div className="px-6 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                Oznacz wszystkie jako przeczytane
              </Button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Ładowanie powiadomień...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Brak powiadomień</p>
              </div>
            ) : (
              <div className="space-y-1">
                {allNotifications.map(renderNotification)}
              </div>
            )}
          </div>

        </CardContent>
        </Card>
      </div>
    </>
  );
};