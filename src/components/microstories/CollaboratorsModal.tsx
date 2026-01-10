import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Loader2, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Collaborator {
  id: string;
  user_id: string;
  accepted_at: string | null;
  user: Profile;
}

interface CollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  microstoryId: string;
  authorId: string;
}

const CollaboratorsModal = ({ isOpen, onClose, microstoryId, authorId }: CollaboratorsModalProps) => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkUser();
      fetchCollaborators();
    }
  }, [isOpen, microstoryId]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [search]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchCollaborators = async () => {
    setLoading(true);
    // Direct query with type assertion since table was just created
    const { data: collabData } = await supabase
      .from("microstory_collaborators" as any)
      .select(`
        id,
        user_id,
        accepted_at,
        user:profiles!user_id (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq("microstory_id", microstoryId) as any;
    
    setCollaborators(collabData || []);
    setLoading(false);
  };

  const searchUsers = async () => {
    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .neq("id", authorId)
      .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
      .limit(10);

    if (!error && data) {
      // Filter out already invited users
      const invitedIds = collaborators.map(c => c.user_id);
      setSearchResults(data.filter(u => !invitedIds.includes(u.id)));
    }
    setSearching(false);
  };

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    
    const { error } = await supabase
      .from("microstory_collaborators" as any)
      .insert({
        microstory_id: microstoryId,
        user_id: userId,
      } as any);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la invitación.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Invitación enviada!",
        description: "El usuario recibirá una notificación.",
      });
      fetchCollaborators();
      setSearch("");
      setSearchResults([]);
    }
    setInviting(null);
  };

  const handleRemove = async (collaboratorId: string) => {
    const { error } = await supabase
      .from("microstory_collaborators" as any)
      .delete()
      .eq("id", collaboratorId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el colaborador.",
        variant: "destructive",
      });
    } else {
      fetchCollaborators();
    }
  };

  const isAuthor = currentUserId === authorId;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="font-display font-semibold">Colaboradores</h2>
            <div className="w-10" />
          </div>

          {/* Search (only for author) */}
          {isAuthor && (
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios para invitar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-full bg-muted/50"
                />
              </div>

              {/* Search Results */}
              {searching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (user.display_name || user.username || "?")[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => handleInvite(user.id)}
                        disabled={inviting === user.id}
                      >
                        {inviting === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : search.length >= 2 ? (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  No se encontraron usuarios
                </p>
              ) : null}
            </div>
          )}

          {/* Current Collaborators */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {collaborators.length} colaborador{collaborators.length !== 1 ? "es" : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Sin colaboradores aún</p>
                {isAuthor && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Busca usuarios para invitar
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {collaborators.map((collab) => (
                  <motion.div
                    key={collab.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                      {collab.user.avatar_url ? (
                        <img src={collab.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (collab.user.display_name || collab.user.username || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {collab.user.display_name || collab.user.username}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">@{collab.user.username}</p>
                        {collab.accepted_at ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            Aceptado
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                    {isAuthor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(collab.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CollaboratorsModal;
