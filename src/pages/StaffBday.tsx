import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Cake, Send, Loader2, Gift, X, Users, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNameColors } from "@/hooks/useNameColors";

interface StaffBday {
  id: string;
  staff_user_id: string;
  gift_item_id: string | null;
  message: string | null;
  is_active: boolean;
  created_at: string;
}

interface BdayMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const StaffBdayPage = () => {
  const navigate = useNavigate();
  const [bday, setBday] = useState<StaffBday | null>(null);
  const [staffProfile, setStaffProfile] = useState<Profile | null>(null);
  const [giftItem, setGiftItem] = useState<any>(null);
  const [messages, setMessages] = useState<BdayMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [rolesMap, setRolesMap] = useState<Record<string, { role: string; title: string | null }>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const senderIds = [...new Set(messages.map(m => m.user_id))];
  const nameColors = useNameColors(senderIds);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!bday) return;
    const channel = supabase
      .channel(`bday-msgs:${bday.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "staff_bday_messages",
        filter: `bday_id=eq.${bday.id}`,
      }, (payload) => {
        const msg = payload.new as BdayMessage;
        setMessages(prev => [...prev, msg]);
        // Fetch profile if not known
        if (!profilesMap[msg.user_id]) {
          supabase.from("profiles").select("id, display_name, username, avatar_url")
            .eq("id", msg.user_id).single().then(({ data }) => {
              if (data) setProfilesMap(prev => ({ ...prev, [data.id]: data }));
            });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bday]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);

    // Get active bday
    const { data: bdayData } = await supabase
      .from("staff_birthdays" as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any;

    if (!bdayData) { setLoading(false); return; }
    setBday(bdayData);

    // Fetch staff profile
    const { data: sp } = await supabase.from("profiles")
      .select("id, display_name, username, avatar_url")
      .eq("id", bdayData.staff_user_id).single();
    if (sp) setStaffProfile(sp);

    // Fetch gift item
    if (bdayData.gift_item_id) {
      const { data: item } = await supabase.from("profile_items")
        .select("id, name, image_url, item_type, css_value")
        .eq("id", bdayData.gift_item_id).single();
      if (item) setGiftItem(item);

      // Check if already claimed
      const { data: owned } = await supabase.from("user_items")
        .select("id").eq("user_id", user.id).eq("item_id", bdayData.gift_item_id).maybeSingle();
      setClaimed(!!owned);
    }

    // Fetch messages
    const { data: msgs } = await supabase
      .from("staff_bday_messages" as any)
      .select("*")
      .eq("bday_id", bdayData.id)
      .order("created_at", { ascending: true }) as any;

    if (msgs) {
      setMessages(msgs);
      const userIds = [...new Set(msgs.map((m: any) => m.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", userIds as string[]);
        const map: Record<string, Profile> = {};
        profiles?.forEach(p => { map[p.id] = p; });
        setProfilesMap(map);

        const { data: roles } = await supabase.from("user_roles")
          .select("user_id, role, admin_title")
          .in("user_id", userIds as string[])
          .in("role", ["admin", "moderator"]);
        const rMap: Record<string, { role: string; title: string | null }> = {};
        roles?.forEach((r: any) => { rMap[r.user_id] = { role: r.role, title: r.admin_title }; });
        setRolesMap(rMap);
      }
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !bday || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    await (supabase.from("staff_bday_messages" as any).insert({
      bday_id: bday.id, user_id: currentUserId, content,
    } as any) as any);

    setSending(false);
  };

  const handleClaimGift = async () => {
    if (!giftItem || !currentUserId || claimed) return;
    const { error } = await supabase.from("user_items").insert({
      user_id: currentUserId, item_id: giftItem.id,
    });
    if (error) {
      if (error.code === "23505") toast.error("Ya tienes este regalo");
      else toast.error("Error al reclamar");
    } else {
      setClaimed(true);
      toast.success("🎁 ¡Regalo reclamado!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bday) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="ios-header">
          <div className="flex items-center justify-between px-4 h-11">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[17px]">Atrás</span>
            </button>
            <h1 className="font-semibold text-[17px]">Staff Bday</h1>
            <div className="w-16" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-8 pt-32">
          <Cake className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold mb-2">No hay cumpleaños activo</h2>
          <p className="text-muted-foreground text-center text-[15px]">
            Vuelve cuando un administrador abra una celebración.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="ios-header">
        <div className="flex items-center gap-2 px-4 h-11">
          <button onClick={() => navigate(-1)} className="text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="font-semibold text-[17px] flex items-center justify-center gap-2">
              <Cake className="w-4 h-4 text-pink-400" />
              🎂 Cumpleaños
            </h1>
          </div>
          <div className="w-5" />
        </div>
      </div>

      {/* Birthday hero */}
      <div className="px-4 py-4 bg-gradient-to-b from-pink-500/10 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-white overflow-hidden shadow-lg">
            {staffProfile?.avatar_url ? (
              <img src={staffProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : "🎂"}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">
              ¡Feliz cumpleaños{staffProfile?.display_name ? `, ${staffProfile.display_name}` : ""}! 🎉
            </h2>
            {bday.message && (
              <p className="text-[14px] text-muted-foreground mt-0.5">{bday.message}</p>
            )}
          </div>
        </div>

        {/* Gift section */}
        {giftItem && (
          <div className="mt-4 p-3 bg-card rounded-2xl border border-border/50 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">
              {giftItem.image_url || "🎁"}
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-muted-foreground">Regalo para todos</p>
              <p className="font-semibold text-[15px]">{giftItem.name}</p>
            </div>
            <Button
              size="sm"
              onClick={handleClaimGift}
              disabled={claimed}
              className="rounded-full"
            >
              {claimed ? "Reclamado ✓" : "Reclamar"}
            </Button>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Cake className="w-12 h-12 text-pink-300/50 mb-3" />
            <p className="text-muted-foreground text-[15px]">¡Envía un mensaje de felicitación!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const profile = profilesMap[msg.user_id];
              const role = rolesMap[msg.user_id];
              const isAdmin = role?.role === "admin";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (profile?.display_name?.[0]?.toUpperCase() || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[13px] font-semibold ${
                        isAdmin ? "text-amber-500" : nameColors[msg.user_id] || ""
                      }`}>
                        {profile?.display_name || profile?.username || "Usuario"}
                      </span>
                      {role && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          isAdmin ? "bg-amber-500/20 text-amber-500" : "bg-slate-400/20 text-slate-400"
                        }`}>
                          {role.role}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[14px] leading-snug mt-0.5">{msg.content}</p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 bg-background/80 backdrop-blur-2xl px-3 py-2 pb-safe">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Felicita al cumpleañero... 🎂"
            className="flex-1 bg-muted/40 rounded-full px-4 py-2.5 text-[15px] placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Send className="w-4 h-4 text-primary-foreground" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffBdayPage;
