import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Info, UserPlus, AlertTriangle, Clock, X, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  invite: UserPlus,
  warning: AlertTriangle,
  reminder: Clock,
};

const typeStyles: Record<string, { icon: string; accent: string; dot: string }> = {
  info: {
    icon: 'text-primary dark:text-white/90',
    accent: 'bg-primary/10 ring-1 ring-primary/20 dark:bg-white/10 dark:ring-white/10',
    dot: 'bg-primary',
  },
  invite: {
    icon: 'text-accent-foreground dark:text-white/90',
    accent: 'bg-accent/15 ring-1 ring-accent/30 dark:bg-white/10 dark:ring-white/10',
    dot: 'bg-accent',
  },
  warning: {
    icon: 'text-destructive dark:text-red-400',
    accent: 'bg-destructive/10 ring-1 ring-destructive/20 dark:bg-white/10 dark:ring-white/10',
    dot: 'bg-destructive',
  },
  reminder: {
    icon: 'text-muted-foreground dark:text-white/80',
    accent: 'bg-muted ring-1 ring-border dark:bg-white/10 dark:ring-white/10',
    dot: 'bg-muted-foreground dark:bg-white/70',
  },
};

// Global set to prevent duplicate toasts across multiple mounted Bell components
const recentToasts = new Set<string>();

export function NotificationBell({ 
  renderTrigger,
  onUnreadChange
}: { 
  renderTrigger?: (props: any) => React.ReactNode;
  onUnreadChange?: (count: number) => void;
}) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const isPt = lang === 'pt-BR';

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotifications(data as any);
    };

    fetchNotifications();

    const channelName = `notifications-realtime-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          fetchNotifications();
          if (payload.eventType === 'INSERT' && payload.new) {
            const notif = payload.new as any;
            if (notif.title && notif.id && !recentToasts.has(notif.id)) {
              recentToasts.add(notif.id);
              toast.info(notif.title, { 
                description: notif.message,
                id: notif.id // Prevents duplicate toasts if multiple bells are mounted
              });
              // Cleanup memory after 10s
              setTimeout(() => recentToasts.delete(notif.id), 10000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true } as any).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllNotifications = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const timeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: isPt ? ptBR : enUS,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          renderTrigger({})
        ) : (
          <button className="relative w-10 h-10 rounded-xl hover:bg-muted transition-all flex items-center justify-center text-muted-foreground hover:text-foreground group/bell">
            <Bell className="w-[18px] h-[18px] transition-transform group-hover/bell:scale-110" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-card animate-in zoom-in-50 duration-200 dark:bg-white dark:text-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="right"
        className="w-[380px] p-0 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
        sideOffset={12}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center dark:bg-white/10">
                <Bell className="w-4 h-4 text-primary dark:text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isPt ? 'Notificações' : 'Notifications'}
                </h3>
                {unreadCount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 dark:text-white/70">
                    {unreadCount} {isPt ? 'não lidas' : 'unread'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 dark:text-white dark:hover:bg-white/10"
                  title={isPt ? 'Marcar todas como lidas' : 'Mark all as read'}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isPt ? 'Ler todas' : 'Read all'}</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors dark:text-white/70 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Unread indicator bar */}
          {unreadCount > 0 && (
            <div className="absolute bottom-0 left-5 right-5 h-[2px] rounded-full bg-primary/20 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min((unreadCount / Math.max(notifications.length, 1)) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto max-h-[60vh] minimal-scrollbar border-b border-border/40">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <BellOff className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-semibold text-foreground/60 mb-1 dark:text-white/70">
                {isPt ? 'Tudo em dia!' : 'All caught up!'}
              </p>
              <p className="text-xs text-muted-foreground/50 text-center max-w-[200px] dark:text-white/50">
                {isPt ? 'Nenhuma notificação no momento' : 'No notifications at the moment'}
              </p>
            </div>
          ) : (
            <div className="px-2 py-1">
              {notifications.map((notification, index) => {
                const Icon = typeIcons[notification.type] || Info;
                const style = typeStyles[notification.type] || typeStyles.info;

                return (
                  <div
                    key={notification.id}
                    className={`group relative flex gap-3 px-3 py-3.5 rounded-xl mx-0 mb-0.5 transition-all duration-150 cursor-pointer
                      ${!notification.read
                        ? 'bg-primary/[0.04] hover:bg-primary/[0.08]'
                        : 'hover:bg-muted/60'
                      }
                    `}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      if (notification.link) {
                        setOpen(false);
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    {/* Unread dot */}
                    {!notification.read && (
                      <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${style.dot} animate-in fade-in duration-300`} />
                    )}

                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.accent} transition-transform group-hover:scale-105`}>
                      <Icon className={`w-4 h-4 ${style.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug ${!notification.read ? 'font-semibold text-foreground dark:text-white' : 'text-foreground/75 font-medium dark:text-white/85'}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed dark:text-white/75">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-medium dark:text-white/45">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0 pt-0.5">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors dark:text-white/75 dark:hover:text-white dark:hover:bg-white/10"
                          title={isPt ? 'Marcar como lida' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors dark:text-white/75 dark:hover:text-red-400 dark:hover:bg-white/10"
                        title={isPt ? 'Excluir' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/50 px-4 py-3 flex justify-center">
            <button
              onClick={deleteAllNotifications}
              className="h-8 px-4 rounded-lg text-xs font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/8 transition-all flex items-center gap-1.5 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-white/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isPt ? 'Limpar todas' : 'Clear all'}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

