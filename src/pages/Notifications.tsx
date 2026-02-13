import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Heart, MessageCircle, UserPlus, BookOpen,
  Sparkles, Eye, Megaphone, Loader2, Check, Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case "like":
    case "chapter_like":
      return <Heart className="w-5 h-5 text-destructive" />;
    case "comment":
      return <MessageCircle className="w-5 h-5 text-primary" />;
    case "follow":
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case "new_chapter":
      return <BookOpen className="w-5 h-5 text-amber-500" />;
    case "new_reader":
      return <Eye className="w-5 h-5 text-blue-500" />;
    case "message":
      return <MessageCircle className="w-5 h-5 text-emerald-500" />;
    case "promotion":
      return <Sparkles className="w-5 h-5 text-violet-500" />;
    case "mention":
      return <Megaphone className="w-5 h-5 text-orange-500" />;
    case "report_resolved":
      return <Megaphone className="w-5 h-5 text-primary" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)}d`;
  return new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <IOSHeader title="Notificaciones" large />

      {/* Filters & actions */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f === "all" ? "Todas" : `Sin leer (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary text-[13px]">
            <Check className="w-4 h-4 mr-1" /> Leer todo
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">
              {filter === "unread" ? "Todo leído" : "Sin notificaciones"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filter === "unread" ? "No tienes notificaciones pendientes" : "Aquí aparecerán tus notificaciones"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`bg-card rounded-2xl overflow-hidden transition-colors relative group ${
                  !notification.read_at ? "border-l-4 border-l-primary" : "border border-border/50"
                }`}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.link) { navigate(notification.link); }
                }}
              >
                <div className="flex gap-3 p-4 cursor-pointer">
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-[15px] ${!notification.read_at ? "font-semibold" : "font-medium"}`}>
                        {notification.title}
                      </h4>
                      <span className="text-[12px] text-muted-foreground flex-shrink-0 mt-0.5">
                        {timeAgo(notification.created_at)}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="text-[14px] text-muted-foreground mt-0.5 line-clamp-3">
                        {notification.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delete button on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <IOSBottomNav />
    </div>
  );
};

export default NotificationsPage;
