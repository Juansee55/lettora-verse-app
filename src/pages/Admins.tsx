import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, BadgeCheck, Loader2, ArrowLeft, Crown, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

interface AdminUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  admin_title: string | null;
  role: string;
}

const AdminsPage = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role, admin_title")
      .in("role", ["admin", "moderator"]);

    if (!roles || roles.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified")
      .in("id", userIds);

    if (profiles) {
      const merged = profiles.map((p) => {
        const role = roles.find((r) => r.user_id === p.id);
        return {
          ...p,
          admin_title: role?.admin_title || null,
          role: role?.role || "admin",
          is_verified: p.is_verified ?? false,
        };
      });
      merged.sort((a, b) => (a.role === "admin" && b.role !== "admin" ? -1 : 1));
      setAdmins(merged);
    }
    setLoading(false);
  };

  const adminsList = admins.filter(a => a.role === "admin");
  const modsList = admins.filter(a => a.role === "moderator");

  const renderMember = (admin: AdminUser, index: number) => {
    const isAdmin = admin.role === "admin";

    return (
      <motion.div
        key={admin.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={() => navigate(`/user/${admin.id}`)}
        className="flex items-center gap-3.5 px-4 py-3 active:bg-muted/40 transition-colors cursor-pointer"
      >
        {/* Avatar with role ring */}
        <div className="relative flex-shrink-0">
          <div className={`w-[52px] h-[52px] rounded-full overflow-hidden ring-2 ${
            isAdmin ? "ring-amber-400/60" : "ring-slate-400/40"
          } bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-primary-foreground font-bold text-lg`}>
            {admin.avatar_url ? (
              <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              admin.display_name?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
            isAdmin ? "bg-amber-400" : "bg-slate-400"
          }`}>
            {isAdmin ? (
              <Crown className="w-2.5 h-2.5 text-white" />
            ) : (
              <Star className="w-2.5 h-2.5 text-white" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className={`font-semibold text-[16px] truncate ${
              isAdmin ? "admin-name-gold" : ""
            }`}>
              {admin.display_name || "Admin"}
            </h3>
            {admin.is_verified && (
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[13px] text-muted-foreground">@{admin.username || "user"}</span>
            {admin.admin_title && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[12px] text-muted-foreground font-medium">
                  {admin.admin_title}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Role pill */}
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          isAdmin
            ? "bg-amber-500/12 text-amber-500"
            : "bg-slate-500/12 text-slate-500"
        }`}>
          {isAdmin ? "Admin" : "Mod"}
        </span>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* iOS Header */}
      <div className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Equipo
          </h1>
          <div className="w-5" />
        </div>
      </div>

      {/* Hero Card */}
      <div className="px-4 pt-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500/10 via-primary/5 to-background rounded-2xl p-5 border border-border/40"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold">Equipo de Lettora</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {admins.length} miembro{admins.length !== 1 ? "s" : ""} del equipo
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No hay miembros del equipo</p>
        </div>
      ) : (
        <div className="mt-2">
          {/* Admins Section */}
          {adminsList.length > 0 && (
            <div>
              <div className="px-4 py-2">
                <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Administradores
                </p>
              </div>
              <div className="bg-card border-y border-border/30 divide-y divide-border/20">
                {adminsList.map((admin, i) => renderMember(admin, i))}
              </div>
            </div>
          )}

          {/* Moderators Section */}
          {modsList.length > 0 && (
            <div className="mt-6">
              <div className="px-4 py-2">
                <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Moderadores
                </p>
              </div>
              <div className="bg-card border-y border-border/30 divide-y divide-border/20">
                {modsList.map((mod, i) => renderMember(mod, i + adminsList.length))}
              </div>
            </div>
          )}
        </div>
      )}

      <IOSBottomNav />
    </div>
  );
};

export default AdminsPage;
