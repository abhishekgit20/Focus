import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

// A notification's session route depends on which side of the booking the
// current user is on — same session, different page (and the client's own
// "waiting for accept" state only exists on the Consultation page).
function sessionRouteFor(role: string | undefined, sessionId: string): string {
  return role === "professional" ? `/professional-chat/${sessionId}` : `/consultation/${sessionId}`;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60_000,
  });

  const { data, refetch } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: getNotifications,
  });

  const notifications = data?.notifications || [];
  const unreadCount = countData?.count || 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) refetch(); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full relative"
          data-testid="button-notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={async () => {
                await markAllNotificationsRead();
                invalidate();
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No new notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto -mx-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  if (!n.read) {
                    await markNotificationRead(n.id);
                    invalidate();
                  }
                  if (n.relatedSessionId) {
                    setOpen(false);
                    setLocation(sessionRouteFor(user?.role, n.relatedSessionId));
                  }
                }}
                className={`w-full text-left px-2 py-2.5 rounded-lg transition-colors ${n.read ? "hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10"}`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
