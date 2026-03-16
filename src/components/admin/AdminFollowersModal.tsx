import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminFollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminFollowersModal = ({ isOpen, onClose }: AdminFollowersModalProps) => {
  const [followerQuery, setFollowerQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const [followerUser, setFollowerUser] = useState<any>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const searchUser = async (query: string, setter: (u: any) => void) => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(1)
      .maybeSingle();
    setter(data);
    setSearching(false);
  };

  const checkFollowStatus = async () => {
    if (!followerUser || !targetUser) return;
    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", followerUser.id)
      .eq("following_id", targetUser.id)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const handleAddFollow = async () => {
    if (!followerUser || !targetUser) return;
    const { error } = await supabase.from("followers").insert({
      follower_id: followerUser.id,
      following_id: targetUser.id,
    });
    if (error) {
      if (error.code === "23505") toast.error("Ya lo sigue");
      else toast.error("Error al añadir seguidor");
    } else {
      toast.success("Seguidor añadido");
      setIsFollowing(true);
    }
  };

  const handleRemoveFollow = async () => {
    if (!followerUser || !targetUser) return;
    await supabase.from("followers")
      .delete()
      .eq("follower_id", followerUser.id)
      .eq("following_id", targetUser.id);
    toast.success("Seguidor eliminado");
    setIsFollowing(false);
  };

  const UserCard = ({ user, label }: { user: any; label: string }) => (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (user.display_name?.[0]?.toUpperCase() || "?")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="font-medium text-[14px] truncate">{user.display_name || "Usuario"}</p>
        <p className="text-[12px] text-muted-foreground">@{user.username || "user"}</p>
      </div>
    </div>
  );

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
          className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-[17px] font-semibold">Gestionar seguidores</h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 pb-8 space-y-4">
            {/* Follower search */}
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Seguidor (quien sigue)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={followerQuery}
                  onChange={(e) => setFollowerQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUser(followerQuery, setFollowerUser)}
                  placeholder="Buscar usuario..."
                  className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button onClick={() => searchUser(followerQuery, setFollowerUser)} size="sm" className="rounded-xl h-10">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {followerUser && <div className="mt-2"><UserCard user={followerUser} label="Seguidor" /></div>}
            </div>

            {/* Target search */}
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">Seguido (a quien sigue)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetQuery}
                  onChange={(e) => setTargetQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      searchUser(targetQuery, (u) => {
                        setTargetUser(u);
                        setTimeout(checkFollowStatus, 500);
                      });
                    }
                  }}
                  placeholder="Buscar usuario..."
                  className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button onClick={() => {
                  searchUser(targetQuery, (u) => {
                    setTargetUser(u);
                    setTimeout(checkFollowStatus, 500);
                  });
                }} size="sm" className="rounded-xl h-10">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {targetUser && <div className="mt-2"><UserCard user={targetUser} label="Seguido" /></div>}
            </div>

            {/* Actions */}
            {followerUser && targetUser && (
              <div className="flex gap-2">
                <Button onClick={handleAddFollow} className="flex-1 rounded-xl" disabled={isFollowing}>
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Añadir seguidor
                </Button>
                <Button onClick={handleRemoveFollow} variant="destructive" className="flex-1 rounded-xl" disabled={!isFollowing}>
                  <UserMinus className="w-4 h-4 mr-1.5" />
                  Quitar seguidor
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminFollowersModal;
