import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  UserPlus,
  Trash2,
  Loader2,
  Check,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: string | null;
  accepted_at: string | null;
  invited_at: string | null;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface SearchResult {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const BookCollaboratorsModal = ({
  isOpen,
  onClose,
  bookId,
  bookTitle,
}: BookCollaboratorsModalProps) => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, bookId]);

  const fetchCollaborators = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("book_collaborators")
      .select(`
        id,
        user_id,
        role,
        accepted_at,
        invited_at
      `)
      .eq("book_id", bookId);

    if (error) {
      console.error("Error fetching collaborators:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for each collaborator
    if (data && data.length > 0) {
      const userIds = data.map((c) => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

      const collabsWithProfiles = data.map((collab) => ({
        ...collab,
        profile: profiles?.find((p) => p.id === collab.user_id) || null,
      }));

      setCollaborators(collabsWithProfiles);
    } else {
      setCollaborators([]);
    }

    setLoading(false);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .neq("id", user?.id || "")
      .limit(10);

    if (!error && data) {
      // Filter out existing collaborators
      const existingIds = collaborators.map((c) => c.user_id);
      setSearchResults(data.filter((u) => !existingIds.includes(u.id)));
    }

    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, collaborators]);

  const handleInvite = async (userId: string) => {
    if (collaborators.length >= 5) {
      toast({
        title: "Límite alcanzado",
        description: "Máximo 5 colaboradores por libro.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("book_collaborators").insert({
      book_id: bookId,
      user_id: userId,
      role: "editor",
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo invitar al colaborador.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invitación enviada",
        description: "El usuario ha sido invitado como colaborador.",
      });
      fetchCollaborators();
      setSearchQuery("");
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    const { error } = await supabase
      .from("book_collaborators")
      .delete()
      .eq("id", collaboratorId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar al colaborador.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Colaborador eliminado",
        description: "El usuario ya no es colaborador de este libro.",
      });
      fetchCollaborators();
    }
  };

  const handleAccept = async (collaboratorId: string) => {
    const { error } = await supabase
      .from("book_collaborators")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", collaboratorId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo aceptar la invitación.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invitación aceptada",
        description: "Ahora eres colaborador de este libro.",
      });
      fetchCollaborators();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Colaboradores
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {bookTitle}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios para invitar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="mt-3 space-y-2">
                {searching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron usuarios.
                  </p>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user.display_name?.[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.display_name || "Usuario"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.username || "user"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleInvite(user.id)}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Collaborators List */}
          <div className="p-4 overflow-y-auto max-h-64">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Colaboradores actuales
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  No hay colaboradores aún.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden">
                      {collab.profile?.avatar_url ? (
                        <img
                          src={collab.profile.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        collab.profile?.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {collab.profile?.display_name || "Usuario"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          @{collab.profile?.username || "user"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            collab.accepted_at
                              ? "bg-green-500/20 text-green-500"
                              : "bg-yellow-500/20 text-yellow-600"
                          }`}
                        >
                          {collab.accepted_at ? "Aceptado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                    {!collab.accepted_at ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAccept(collab.id)}
                        className="text-green-500"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(collab.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookCollaboratorsModal;
