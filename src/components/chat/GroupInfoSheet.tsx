import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Shield, ShieldOff, Crown, ShieldCheck, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GroupInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
}

interface ParticipantInfo {
  user_id: string;
  role: string;
  muted_until: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const GroupInfoSheet = ({ isOpen, onClose, conversationId, currentUserId }: GroupInfoSheetProps) => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("member");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) fetchGroupData();
  }, [isOpen]);

  const fetchGroupData = async () => {
    const { data: conv } = await supabase
      .from("conversations")
      .select("name, description")
      .eq("id", conversationId)
      .single();

    if (conv) {
      setGroupName(conv.name || "");
      setDescription(conv.description || "");
    }

    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("user_id, role, muted_until")
      .eq("conversation_id", conversationId);

    if (parts) {
      const myPart = parts.find(p => p.user_id === currentUserId);
      if (myPart) setCurrentRole(myPart.role);

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

      // Sort: owner first, then admin, then members
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
      .update({ name: groupName.trim(), description: description.trim() })
      .eq("id", conversationId);

    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Grupo actualizado");
      setEditing(false);
    }
    setSaving(false);
  };

  const toggleMute = async (userId: string, isMuted: boolean) => {
    const muted_until = isMuted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("conversation_participants")
      .update({ muted_until })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) {
      toast.error("Error al cambiar silencio");
    } else {
      toast.success(isMuted ? "Usuario desilenciado" : "Usuario silenciado");
      fetchGroupData();
    }
  };

  const isAdmin = currentRole === "owner" || currentRole === "admin";

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

  const isMuted = (p: ParticipantInfo) => {
    return p.muted_until && new Date(p.muted_until) > new Date();
  };

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
          className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Info del grupo
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
            {/* Group Info Section */}
            <div className="p-4 space-y-3 border-b border-border">
              {editing && isAdmin ? (
                <>
                  <div>
                    <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Nombre</label>
                    <Input
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      className="h-11 rounded-xl bg-muted/50"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Descripción</label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Añade una descripción del grupo..."
                      className="rounded-xl bg-muted/50 resize-none min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1 rounded-xl" onClick={saveGroupInfo} disabled={saving}>
                      Guardar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{groupName || "Grupo"}</h3>
                      {description ? (
                        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Sin descripción</p>
                      )}
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="rounded-xl text-primary" onClick={() => setEditing(true)}>
                        Editar
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Members Section */}
            <div className="p-4">
              <h3 className="text-[13px] font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Miembros ({participants.length})
              </h3>
              <div className="space-y-1">
                {participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
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
                        </span>
                        {getRoleIcon(p.role)}
                        {isMuted(p) && <ShieldOff className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getRoleLabel(p.role)}
                        {isMuted(p) && " · Silenciado"}
                      </span>
                    </div>
                    {isAdmin && p.user_id !== currentUserId && p.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl h-8 px-2"
                        onClick={() => toggleMute(p.user_id, !!isMuted(p))}
                      >
                        {isMuted(p) ? (
                          <Shield className="w-4 h-4 text-primary" />
                        ) : (
                          <ShieldOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GroupInfoSheet;
