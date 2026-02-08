import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Users, Loader2, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserResult {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "members">("info");
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq("id", user?.id || "")
        .limit(10);
      if (data) setSearchResults(data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleMember = (user: UserResult) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      toast({ title: "Nombre requerido", variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    // Create conversation
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ is_group: true, name: groupName.trim() })
      .select()
      .single();

    if (error || !conv) {
      toast({ title: "Error al crear grupo", variant: "destructive" });
      setCreating(false);
      return;
    }

    // Add self as owner
    await supabase.from("conversation_participants").insert({
      conversation_id: conv.id,
      user_id: user.id,
      role: "owner",
    });

    // Add selected members
    for (const member of selectedMembers) {
      await supabase.from("conversation_participants").insert({
        conversation_id: conv.id,
        user_id: member.id,
        role: "member",
      });
    }

    toast({ title: "¡Grupo creado!" });
    onClose();
    navigate(`/chat/${conv.id}`);
    setCreating(false);
  };

  const reset = () => {
    setStep("info");
    setGroupName("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMembers([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
        onClick={() => { reset(); onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={e => e.stopPropagation()}
          className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {step === "info" ? "Nuevo grupo" : "Añadir miembros"}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => { reset(); onClose(); }}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {step === "info" ? (
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Nombre del grupo</label>
                <Input
                  placeholder="Ej: Club de lectura..."
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50"
                  autoFocus
                />
              </div>
              <Button
                variant="ios"
                size="ios-lg"
                className="w-full"
                onClick={() => setStep("members")}
                disabled={!groupName.trim()}
              >
                Siguiente
              </Button>
            </div>
          ) : (
            <>
              {/* Selected members */}
              {selectedMembers.length > 0 && (
                <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
                  {selectedMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleMember(m)}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <div className="relative w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (m.display_name || "?")[0]
                        )}
                        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <span className="text-[10px] truncate max-w-[48px]">{m.display_name?.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl bg-muted/50"
                    autoFocus
                  />
                </div>
              </div>

              {/* Results */}
              <div className="overflow-y-auto max-h-64 p-2">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => {
                    const isSelected = selectedMembers.some(m => m.id === user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 w-full transition-colors"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (user.display_name || "?")[0]
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium truncate">{user.display_name || "Usuario"}</p>
                          <p className="text-sm text-muted-foreground truncate">@{user.username || "user"}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })
                ) : searchQuery ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No se encontraron usuarios.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">Busca usuarios para añadir al grupo</p>
                  </div>
                )}
              </div>

              {/* Create button */}
              <div className="p-4 border-t border-border">
                <Button
                  variant="ios"
                  size="ios-lg"
                  className="w-full"
                  onClick={createGroup}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-5 h-5 mr-2" />
                  )}
                  Crear grupo {selectedMembers.length > 0 ? `(${selectedMembers.length} miembros)` : ""}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateGroupModal;
