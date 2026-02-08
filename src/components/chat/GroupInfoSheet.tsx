import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, Shield, ShieldOff, Crown, ShieldCheck, User, Info,
  Pin, Globe, Lock, Clock, MessageSquareOff, BellOff, Bell,
  UserMinus, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GroupInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
  onSettingsChanged?: () => void;
}

interface ParticipantInfo {
  user_id: string;
  role: string;
  muted_until: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface GroupSettings {
  name: string;
  description: string;
  is_public: boolean;
  slow_mode_seconds: number;
  admin_only_messages: boolean;
  pinned_message_id: string | null;
}

type MuteDuration = "1h" | "8h" | "24h" | "always" | "off";

const SLOW_MODE_OPTIONS = [
  { label: "Desactivado", value: 0 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
];

const GroupInfoSheet = ({ isOpen, onClose, conversationId, currentUserId, onSettingsChanged }: GroupInfoSheetProps) => {
  const [settings, setSettings] = useState<GroupSettings>({
    name: "", description: "", is_public: false,
    slow_mode_seconds: 0, admin_only_messages: false, pinned_message_id: null,
  });
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("member");
  const [editingInfo, setEditingInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"main" | "members" | "settings">("main");
  const [myMuteStatus, setMyMuteStatus] = useState<string | null>(null);
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGroupData();
      setActiveSection("main");
    }
  }, [isOpen]);

  const fetchGroupData = async () => {
    const { data: conv } = await supabase
      .from("conversations")
      .select("name, description, is_public, slow_mode_seconds, admin_only_messages, pinned_message_id")
      .eq("id", conversationId)
      .single();

    if (conv) {
      setSettings({
        name: conv.name || "",
        description: conv.description || "",
        is_public: conv.is_public ?? false,
        slow_mode_seconds: conv.slow_mode_seconds ?? 0,
        admin_only_messages: conv.admin_only_messages ?? false,
        pinned_message_id: conv.pinned_message_id,
      });
    }

    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("user_id, role, muted_until")
      .eq("conversation_id", conversationId);

    if (parts) {
      const myPart = parts.find(p => p.user_id === currentUserId);
      if (myPart) {
        setCurrentRole(myPart.role);
        setMyMuteStatus(myPart.muted_until);
      }

      const userIds = parts.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

      const enriched: ParticipantInfo[] = parts.map(p => {
        const profile = profiles?.find(pr => pr.id === p.user_id);
        return {
          ...p,
          display_name: profile?.display_name || null,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
        };
      });

      enriched.sort((a, b) => {
        const order = { owner: 0, admin: 1, member: 2 };
        return (order[a.role as keyof typeof order] ?? 2) - (order[b.role as keyof typeof order] ?? 2);
      });

      setParticipants(enriched);
    }
  };

  const saveGroupInfo = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("conversations")
      .update({ name: settings.name.trim(), description: settings.description.trim() })
      .eq("id", conversationId);

    if (error) toast.error("Error al guardar");
    else { toast.success("Grupo actualizado"); setEditingInfo(false); onSettingsChanged?.(); }
    setSaving(false);
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from("conversations")
      .update({ [key]: value })
      .eq("id", conversationId);

    if (error) { toast.error("Error al actualizar"); return; }
    setSettings(prev => ({ ...prev, [key]: value }));
    onSettingsChanged?.();
    toast.success("Configuración actualizada");
  };

  const muteGroupForMe = async (duration: MuteDuration) => {
    let muted_until: string | null = null;
    if (duration === "1h") muted_until = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
    else if (duration === "8h") muted_until = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    else if (duration === "24h") muted_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    else if (duration === "always") muted_until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("conversation_participants")
      .update({ muted_until })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    if (error) toast.error("Error");
    else {
      setMyMuteStatus(muted_until);
      setShowMuteOptions(false);
      toast.success(duration === "off" ? "Notificaciones activadas" : "Grupo silenciado");
    }
  };

  const toggleUserMute = async (userId: string, isMuted: boolean) => {
    const muted_until = isMuted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("conversation_participants")
      .update({ muted_until })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) toast.error("Error");
    else { toast.success(isMuted ? "Desilenciado" : "Silenciado"); fetchGroupData(); }
  };

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("conversation_participants")
      .update({ role: newRole })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) toast.error("Error al cambiar rol");
    else { toast.success(`Rol cambiado a ${getRoleLabel(newRole)}`); fetchGroupData(); }
  };

  const kickUser = async (userId: string) => {
    const { error } = await supabase
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) toast.error("Error al expulsar");
    else { toast.success("Usuario expulsado"); fetchGroupData(); }
  };

  const isAdmin = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";
  const isGroupMuted = myMuteStatus && new Date(myMuteStatus) > new Date();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case "admin": return <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />;
      default: return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner": return "Propietario";
      case "admin": return "Admin";
      default: return "Miembro";
    }
  };

  const isMuted = (p: ParticipantInfo) => p.muted_until && new Date(p.muted_until) > new Date();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          onClick={e => e.stopPropagation()}
          className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            {activeSection !== "main" ? (
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => setActiveSection("main")}>
                ← Volver
              </Button>
            ) : (
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Info del grupo
              </h2>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1">
            {activeSection === "main" && (
              <>
                {/* Group Info */}
                <div className="p-4 space-y-3 border-b border-border">
                  {editingInfo && isAdmin ? (
                    <>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Nombre</label>
                        <Input
                          value={settings.name}
                          onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                          className="h-11 rounded-xl bg-muted/50"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Descripción</label>
                        <Textarea
                          value={settings.description}
                          onChange={e => setSettings(s => ({ ...s, description: e.target.value }))}
                          placeholder="Añade una descripción..."
                          className="rounded-xl bg-muted/50 resize-none min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => setEditingInfo(false)}>Cancelar</Button>
                        <Button size="sm" className="flex-1 rounded-xl" onClick={saveGroupInfo} disabled={saving}>Guardar</Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">{settings.name || "Grupo"}</h3>
                          {settings.is_public ? (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Público</span>
                          ) : (
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">Privado</span>
                          )}
                        </div>
                        {settings.description ? (
                          <p className="text-sm text-muted-foreground mt-0.5">{settings.description}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Sin descripción</p>
                        )}
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="rounded-xl text-primary" onClick={() => setEditingInfo(true)}>
                          Editar
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="p-4 space-y-1 border-b border-border">
                  {/* Mute group */}
                  <button
                    onClick={() => setShowMuteOptions(!showMuteOptions)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    {isGroupMuted ? <BellOff className="w-5 h-5 text-destructive" /> : <Bell className="w-5 h-5 text-muted-foreground" />}
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium">{isGroupMuted ? "Grupo silenciado" : "Silenciar grupo"}</span>
                      {isGroupMuted && <p className="text-[11px] text-muted-foreground">Toca para cambiar</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <AnimatePresence>
                    {showMuteOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-11 pr-3 pb-2 flex flex-wrap gap-1.5">
                          {[
                            { label: "1 hora", value: "1h" as MuteDuration },
                            { label: "8 horas", value: "8h" as MuteDuration },
                            { label: "24 horas", value: "24h" as MuteDuration },
                            { label: "Siempre", value: "always" as MuteDuration },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => muteGroupForMe(opt.value)}
                              className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted hover:bg-muted/80 transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                          {isGroupMuted && (
                            <button
                              onClick={() => muteGroupForMe("off")}
                              className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Members */}
                  <button
                    onClick={() => setActiveSection("members")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1 text-left">Miembros ({participants.length})</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {/* Settings (admin only) */}
                  {isAdmin && (
                    <button
                      onClick={() => setActiveSection("settings")}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1 text-left">Configuración del grupo</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Members Section */}
            {activeSection === "members" && (
              <div className="p-4">
                <h3 className="text-[13px] font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Miembros ({participants.length})
                </h3>
                <div className="space-y-1">
                  {participants.map(p => (
                    <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (p.display_name || "?")[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">
                            {p.display_name || p.username || "Usuario"}
                            {p.user_id === currentUserId && <span className="text-muted-foreground"> (tú)</span>}
                          </span>
                          {getRoleIcon(p.role)}
                          {isMuted(p) && <ShieldOff className="w-3 h-3 text-destructive" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{getRoleLabel(p.role)}</span>
                      </div>

                      {/* Admin actions for other users */}
                      {isAdmin && p.user_id !== currentUserId && p.role !== "owner" && (
                        <div className="flex items-center gap-1">
                          {/* Toggle role */}
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl h-8 px-2 text-xs"
                              onClick={() => changeRole(p.user_id, p.role === "admin" ? "member" : "admin")}
                              title={p.role === "admin" ? "Quitar admin" : "Hacer admin"}
                            >
                              {p.role === "admin" ? (
                                <User className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </Button>
                          )}
                          {/* Mute/unmute */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 px-2"
                            onClick={() => toggleUserMute(p.user_id, !!isMuted(p))}
                            title={isMuted(p) ? "Desilenciar" : "Silenciar"}
                          >
                            {isMuted(p) ? (
                              <Shield className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ShieldOff className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </Button>
                          {/* Kick */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 px-2 text-destructive hover:text-destructive"
                            onClick={() => kickUser(p.user_id)}
                            title="Expulsar"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Section (admin only) */}
            {activeSection === "settings" && isAdmin && (
              <div className="p-4 space-y-4">
                <h3 className="text-[13px] font-medium text-muted-foreground mb-1">Configuración</h3>

                {/* Public/Private */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {settings.is_public ? <Globe className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <span className="text-sm font-medium">Grupo público</span>
                      <p className="text-[11px] text-muted-foreground">Cualquiera puede encontrar y unirse</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.is_public}
                    onCheckedChange={v => updateSetting("is_public", v)}
                  />
                </div>

                {/* Admin only messages */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <MessageSquareOff className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">Solo admins escriben</span>
                      <p className="text-[11px] text-muted-foreground">Solo admins pueden enviar mensajes</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.admin_only_messages}
                    onCheckedChange={v => updateSetting("admin_only_messages", v)}
                  />
                </div>

                {/* Slow mode */}
                <div className="p-3 rounded-xl bg-muted/30 space-y-2">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">Modo lento</span>
                      <p className="text-[11px] text-muted-foreground">Intervalo mínimo entre mensajes</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-8">
                    {SLOW_MODE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting("slow_mode_seconds", opt.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          settings.slow_mode_seconds === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pinned message info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Pin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">Mensaje fijado</span>
                    <p className="text-[11px] text-muted-foreground">
                      {settings.pinned_message_id ? "Hay un mensaje fijado" : "Mantén presionado un mensaje para fijarlo"}
                    </p>
                  </div>
                  {settings.pinned_message_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-destructive text-xs rounded-xl"
                      onClick={() => updateSetting("pinned_message_id", null)}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GroupInfoSheet;
