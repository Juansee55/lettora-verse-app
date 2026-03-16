import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  isOwnProfile: boolean;
  followersVisibility: string;
  isFollower: boolean;
}

interface UserItem {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const FollowersListModal = ({
  isOpen, onClose, userId, type, isOwnProfile, followersVisibility, isFollower,
}: FollowersListModalProps) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = isOwnProfile ||
    followersVisibility === "all" ||
    (followersVisibility === "followers" && isFollower);

  useEffect(() => {
    if (isOpen && canView) fetchUsers();
  }, [isOpen, type, userId]);

  const fetchUsers = async () => {
    setLoading(true);
    const column = type === "followers" ? "following_id" : "follower_id";
    const targetColumn = type === "followers" ? "follower_id" : "following_id";

    const { data: follows } = await supabase
      .from("followers")
      .select(targetColumn)
      .eq(column, userId);

    if (follows && follows.length > 0) {
      const ids = follows.map((f: any) => f[targetColumn]);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      setUsers(profiles || []);
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[70vh]"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-[17px] font-semibold">
              {type === "followers" ? "Seguidores" : "Siguiendo"}
            </h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-2 pb-8 overflow-y-auto max-h-[55vh]">
            {!canView ? (
              <div className="text-center py-12">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-[15px] font-medium">Lista privada</p>
                <p className="text-muted-foreground/60 text-[13px] mt-1">
                  {followersVisibility === "nobody"
                    ? "Este usuario ha ocultado su lista"
                    : "Solo sus seguidores pueden verla"}
                </p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-[15px]">
                  {type === "followers" ? "Sin seguidores aún" : "No sigue a nadie aún"}
                </p>
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => { onClose(); navigate(`/user/${user.id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.display_name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-[15px] truncate">{user.display_name || "Usuario"}</p>
                    <p className="text-[13px] text-muted-foreground">@{user.username || "user"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FollowersListModal;
