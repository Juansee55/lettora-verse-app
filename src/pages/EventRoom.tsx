import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Send, Loader2, Trophy, Users, Pause, Play,
  Square, UserMinus, UserPlus, HelpCircle, Crown, Shield, X,
  Star, Minus, Plus, Zap, SkipForward,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNameColors } from "@/hooks/useNameColors";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  status: string;
  created_by: string;
}

interface Message {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  points: number;
  status: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Round {
  id: string;
  event_id: string;
  round_number: number;
  title: string;
  status: string;
  created_at: string;
}

interface RoundParticipant {
  id: string;
  round_id: string;
  user_id: string;
  status: string;
  eliminated_at: string | null;
}

const EventRoomPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [roles, setRoles] = useState<Record<string, { role: string; admin_title: string | null }>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [pointsEdit, setPointsEdit] = useState<Record<string, number>>({});
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundParticipants, setRoundParticipants] = useState<RoundParticipant[]>([]);
  const [showRoundsPanel, setShowRoundsPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userIds = Object.keys(profiles);
  const nameColors = useNameColors(userIds);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!eventId) return;
    initEvent();
  }, [eventId]);

  const initEvent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);

    const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!adminCheck);

    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!ev) { navigate("/home"); return; }
    setEvent(ev as any);

    await fetchParticipants();

    // Check if user is participant
    const { data: part } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsParticipant(!!part);

    if (part) {
      await fetchMessages();
    }

    setLoading(false);

    // Realtime messages
    const channel = supabase
      .channel(`event-${eventId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "event_messages",
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        // Fetch profile if needed
        if (!profiles[msg.user_id]) {
          supabase.from("profiles").select("id, display_name, username, avatar_url")
            .eq("id", msg.user_id).single().then(({ data }) => {
              if (data) setProfiles(prev => ({ ...prev, [data.id]: data }));
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("event_messages")
      .select("*")
      .eq("event_id", eventId!)
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) {
      setMessages(data as any[]);
      const ids = [...new Set(data.map((m: any) => m.user_id))];
      await fetchProfilesAndRoles(ids);
    }
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from("event_participants")
      .select("*")
      .eq("event_id", eventId!)
      .order("points", { ascending: false });

    if (data) {
      const ids = data.map((p: any) => p.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", ids);

      const mapped = (data as any[]).map(p => ({
        ...p,
        profile: profs?.find(pr => pr.id === p.user_id),
      }));
      setParticipants(mapped);

      const pts: Record<string, number> = {};
      mapped.forEach(p => { pts[p.user_id] = p.points; });
      setPointsEdit(pts);
    }
  };

  const fetchProfilesAndRoles = async (ids: string[]) => {
    if (ids.length === 0) return;
    const [{ data: profs }, { data: roleData }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids),
      supabase.from("user_roles").select("user_id, role, admin_title").in("user_id", ids),
    ]);

    if (profs) {
      const map: Record<string, any> = { ...profiles };
      profs.forEach(p => { map[p.id] = p; });
      setProfiles(map);
    }
    if (roleData) {
      const map: Record<string, any> = { ...roles };
      (roleData as any[]).forEach(r => { map[r.user_id] = r; });
      setRoles(map);
    }
  };

  const joinEvent = async () => {
    if (!currentUserId || !eventId) return;
    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId,
      user_id: currentUserId,
    });
    if (error) {
      toast({ title: "Error al unirte", variant: "destructive" });
    } else {
      setIsParticipant(true);
      toast({ title: "🎉 Te has unido al evento" });
      await fetchMessages();
      await fetchParticipants();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !eventId || !currentUserId || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("event_messages").insert({
      event_id: eventId,
      user_id: currentUserId,
      content,
    });
    setSending(false);
  };

  const updateEventStatus = async (status: string) => {
    if (!eventId) return;
    await supabase.from("events").update({ status }).eq("id", eventId);
    setEvent(prev => prev ? { ...prev, status } : prev);
    toast({ title: status === "paused" ? "⏸ Evento pausado" : status === "ended" ? "🏁 Evento terminado" : "▶️ Evento reanudado" });
  };

  const removeParticipant = async (userId: string) => {
    await supabase.from("event_participants").delete().eq("event_id", eventId!).eq("user_id", userId);
    setParticipants(prev => prev.filter(p => p.user_id !== userId));
    toast({ title: "Participante eliminado" });
  };

  const updatePoints = async (userId: string, points: number) => {
    await supabase.from("event_participants")
      .update({ points })
      .eq("event_id", eventId!)
      .eq("user_id", userId);
    setParticipants(prev => prev.map(p => p.user_id === userId ? { ...p, points } : p));
    toast({ title: `Puntos actualizados: ${points}` });
  };

  const addUserToEvent = async () => {
    if (!addUsername.trim()) return;
    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.ilike.%${addUsername}%,display_name.ilike.%${addUsername}%`)
      .limit(1)
      .maybeSingle();

    if (!user) { toast({ title: "Usuario no encontrado", variant: "destructive" }); return; }

    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId!,
      user_id: user.id,
    });

    if (error) {
      toast({ title: "Ya está en el evento", variant: "destructive" });
    } else {
      toast({ title: "Usuario añadido" });
      setAddUsername("");
      setShowAddUser(false);
      await fetchParticipants();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  const statusColor = event.status === "active" ? "text-green-500" : event.status === "paused" ? "text-amber-500" : "text-muted-foreground";
  const statusLabel = event.status === "active" ? "En vivo" : event.status === "paused" ? "Pausado" : "Finalizado";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Trophy className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold truncate">{event.title}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[12px] font-medium ${statusColor}`}>● {statusLabel}</span>
              <span className="text-[12px] text-muted-foreground">· {participants.length} participantes</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowHelp(true)} className="p-2 rounded-full active:bg-muted/60">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </button>
            {isAdmin && (
              <button onClick={() => setShowAdminPanel(true)} className="p-2 rounded-full active:bg-muted/60">
                <Shield className="w-5 h-5 text-primary" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Not joined yet */}
      {!isParticipant && event.status !== "ended" ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-xs">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-[20px] font-bold mb-2">{event.title}</h2>
            {event.description && <p className="text-[14px] text-muted-foreground mb-4">{event.description}</p>}
            <Button onClick={joinEvent} className="rounded-full px-8" size="lg">
              Unirme al evento
            </Button>
          </div>
        </div>
      ) : !isParticipant && event.status === "ended" ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground">Este evento ha finalizado.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Leaderboard mini */}
          {participants.filter(p => p.points > 0).length > 0 && (
            <div className="px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-[13px] font-semibold">Tabla de puntos</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {participants.filter(p => p.points > 0).sort((a, b) => b.points - a.points).slice(0, 5).map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 rounded-full shrink-0">
                    <span className="text-[12px] font-bold text-amber-500">#{i + 1}</span>
                    <span className="text-[12px] font-medium truncate max-w-[80px]">
                      {p.profile?.display_name || p.profile?.username || "?"}
                    </span>
                    <span className="text-[12px] font-bold text-primary">{p.points}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {event.status === "paused" && (
              <div className="text-center py-4">
                <span className="px-4 py-2 bg-amber-500/10 text-amber-500 rounded-full text-[13px] font-medium">
                  ⏸ Evento pausado por un administrador
                </span>
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[13px] text-muted-foreground">Envía el primer mensaje 🎉</p>
              </div>
            )}

            {messages.map((msg) => {
              const isOwn = msg.user_id === currentUserId;
              const sender = profiles[msg.user_id];
              const userRole = roles[msg.user_id];
              const isAdminUser = userRole?.role === "admin" || userRole?.role === "moderator";
              const nameColor = nameColors[msg.user_id];

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isOwn && (
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/user/${msg.user_id}`)}
                    >
                      {sender?.avatar_url ? (
                        <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        sender?.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 mb-0.5 px-1">
                        <p
                          className={`text-[11px] font-semibold ${nameColor || (isAdminUser ? "" : "text-foreground/70")}`}
                          style={isAdminUser && !nameColor ? { color: "hsl(45, 90%, 50%)" } : undefined}
                        >
                          {sender?.display_name || sender?.username || "Usuario"}
                        </p>
                        {isAdminUser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold">
                            {userRole.role === "admin" ? "Admin" : "Mod"}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[15px] leading-snug ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border/50 rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? "text-right" : ""}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {event.status !== "ended" && (
            <div className="sticky bottom-0 bg-background/80 backdrop-blur-2xl border-t border-border/30 px-4 py-3 pb-safe">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={event.status === "paused" ? "Evento pausado..." : "Escribe un mensaje..."}
                  disabled={event.status === "paused" && !isAdmin}
                  className="flex-1 h-10 px-4 rounded-full bg-muted/60 text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending || (event.status === "paused" && !isAdmin)}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Help Sheet */}
      <Sheet open={showHelp} onOpenChange={setShowHelp}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Reglas del evento
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {event.rules ? (
              <p className="text-[14px] text-foreground whitespace-pre-wrap">{event.rules}</p>
            ) : (
              <div className="space-y-3 text-[14px] text-muted-foreground">
                <p>📝 <strong>1.</strong> Los admins crean eventos de microrrelatos con un tema.</p>
                <p>🏆 <strong>2.</strong> Los participantes escriben sus mejores microrrelatos.</p>
                <p>⚔️ <strong>3.</strong> Las mejores historias pasan a eliminatorias.</p>
                <p>🎖 <strong>4.</strong> Los ganadores reciben puntos que se acumulan.</p>
                <p>🛒 <strong>5.</strong> Los puntos se podrán canjear en la futura tienda.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Admin Panel Sheet */}
      <Sheet open={showAdminPanel} onOpenChange={setShowAdminPanel}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Panel de administrador
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* Event controls */}
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-muted-foreground uppercase">Control del evento</p>
              <div className="grid grid-cols-3 gap-2">
                {event.status !== "active" && event.status !== "ended" && (
                  <Button variant="outline" className="rounded-xl flex-col h-16 gap-1" onClick={() => updateEventStatus("active")}>
                    <Play className="w-5 h-5 text-green-500" />
                    <span className="text-[11px]">Reanudar</span>
                  </Button>
                )}
                {event.status === "active" && (
                  <Button variant="outline" className="rounded-xl flex-col h-16 gap-1" onClick={() => updateEventStatus("paused")}>
                    <Pause className="w-5 h-5 text-amber-500" />
                    <span className="text-[11px]">Pausar</span>
                  </Button>
                )}
                {event.status !== "ended" && (
                  <Button variant="outline" className="rounded-xl flex-col h-16 gap-1" onClick={() => updateEventStatus("ended")}>
                    <Square className="w-5 h-5 text-destructive" />
                    <span className="text-[11px]">Terminar</span>
                  </Button>
                )}
                <Button variant="outline" className="rounded-xl flex-col h-16 gap-1" onClick={() => setShowAddUser(true)}>
                  <UserPlus className="w-5 h-5 text-primary" />
                  <span className="text-[11px]">Añadir</span>
                </Button>
              </div>
            </div>

            {/* Participants with points */}
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-muted-foreground uppercase">
                Participantes ({participants.length})
              </p>
              {participants.map(p => (
                <div key={p.user_id} className="bg-muted/30 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                      {p.profile?.avatar_url ? (
                        <img src={p.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.profile?.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{p.profile?.display_name || p.profile?.username || "?"}</p>
                      <p className="text-[12px] text-muted-foreground">{p.points} puntos</p>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      className="rounded-full text-destructive border-destructive/30 h-8 px-2"
                      onClick={() => removeParticipant(p.user_id)}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const curr = pointsEdit[p.user_id] || 0;
                        setPointsEdit(prev => ({ ...prev, [p.user_id]: Math.max(0, curr - 1) }));
                      }}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <input
                      type="number"
                      value={pointsEdit[p.user_id] ?? p.points}
                      onChange={(e) => setPointsEdit(prev => ({ ...prev, [p.user_id]: parseInt(e.target.value) || 0 }))}
                      className="w-16 h-8 text-center rounded-xl bg-muted/60 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      variant="outline" size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const curr = pointsEdit[p.user_id] || 0;
                        setPointsEdit(prev => ({ ...prev, [p.user_id]: curr + 1 }));
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm" className="rounded-xl h-8 ml-auto"
                      onClick={() => updatePoints(p.user_id, pointsEdit[p.user_id] ?? p.points)}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add user dialog */}
      <AlertDialog open={showAddUser} onOpenChange={setShowAddUser}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Añadir participante</AlertDialogTitle>
            <AlertDialogDescription>Busca por username o nombre.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Username..."
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUserToEvent()}
              className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button onClick={addUserToEvent} className="rounded-xl">Añadir</Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventRoomPage;
