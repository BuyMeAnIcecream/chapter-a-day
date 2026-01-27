import { forwardRef } from "react";
import { type Notification } from "../api";

type Props = {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
};

export const NotificationDropdown = forwardRef<HTMLDivElement, Props>(
  ({ notifications, loading, onMarkAsRead, onMarkAllAsRead }, ref) => {
    const formatTimeAgo = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    const truncateContent = (content: string, maxLength: number = 100) => {
      if (content.length <= maxLength) return content;
      return content.substring(0, maxLength) + "...";
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
      <div ref={ref} className="notification-dropdown">
        <div className="notification-dropdown-content">
          <div className="notification-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                className="text-button notification-mark-all"
                onClick={onMarkAllAsRead}
                type="button"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.slice(0, 20).map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? "notification-item-read" : "notification-item-unread"}`}
                  onClick={() => {
                    if (!notification.read) {
                      onMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="notification-item-content">
                    <div className="notification-item-header">
                      <strong>{notification.comment.user.username}</strong>
                      <span className="notification-item-time">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <div className="notification-item-text">
                      replied to your comment on{" "}
                      <strong>
                        {notification.comment.chapter.book} {notification.comment.chapter.chapterNumber}
                      </strong>
                    </div>
                    <div className="notification-item-preview">
                      "{truncateContent(notification.comment.content)}"
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
);

NotificationDropdown.displayName = "NotificationDropdown";
