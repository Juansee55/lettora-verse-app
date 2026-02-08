import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  MessageCircle,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserResult {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const NewConversationModal = ({ isOpen, onClose }: NewConversationModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [following, setFollowing] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFollowing();
    }
  }, [isOpen]);

  const fetchFollowing = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get users the current user is following
    const { data: followingData } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followingData && followingData.length > 0) {
      const ids = followingData.map((f) => f.following_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", ids);

      if (profiles) {
        setFollowing(profiles);
      }
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
      setSearchResults(data);
    }

    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const startConversation = async (targetUserId: string) => {
    setStartingChat(targetUserId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión.",
        variant: "destructive",
      });
      setStartingChat(null);
      return;
    }

    // Check if conversation already exists
    const { data: myConversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConversations) {
      for (const conv of myConversations) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.conversation_id)
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (otherParticipant) {
          onClose();
          navigate(`/chat/${conv.conversation_id}`);
          setStartingChat(null);
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ is_group: false })
      .select()
      .single();

    if (convError || !newConv) {
      toast({
        title: "Error",
        description: "No se pudo crear la conversación.",
        variant: "destructive",
      });
      setStartingChat(null);
      return;
    }

    // Add current user first (satisfies RLS: user_id = auth.uid())
    const { error: selfError } = await supabase.from("conversation_participants").insert({
      conversation_id: newConv.id,
      user_id: user.id,
    });

    if (selfError) {
      toast({
        title: "Error",
        description: "No se pudo unir a la conversación.",
        variant: "destructive",
      });
      setStartingChat(null);
      return;
    }

    // Now add the other user (RLS passes because current user is already a participant)
    await supabase.from("conversation_participants").insert({
      conversation_id: newConv.id,
      user_id: targetUserId,
    });

    onClose();
    navigate(`/chat/${newConv.id}`);
    setStartingChat(null);
  };

  const renderUserItem = (user: UserResult) => (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => startConversation(user.id)}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-lg font-bold text-primary-foreground overflow-hidden">
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
        <p className="text-sm text-muted-foreground truncate">
          @{user.username || "user"}
        </p>
      </div>
      {startingChat === user.id ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : (
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
      )}
    </motion.div>
  );

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
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Nuevo mensaje
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-96">
            {searchQuery ? (
              <div className="p-2">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">
                      No se encontraron usuarios.
                    </p>
                  </div>
                ) : (
                  searchResults.map(renderUserItem)
                )}
              </div>
            ) : (
              <div className="p-2">
                <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">
                  Personas que sigues
                </h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : following.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">
                      Aún no sigues a nadie.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Busca usuarios arriba para iniciar una conversación.
                    </p>
                  </div>
                ) : (
                  following.map(renderUserItem)
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NewConversationModal;
