import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, BadgeCheck, Loader2, ArrowLeft, Crown, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { useNameColors } from "@/hooks/useNameColors";

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

  const nameColors = useNameColors(admins.map(a => a.id));

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
    const hasCustomColor = nameColors[admin.id];

    return (
      <motion.div
        key={admin.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={() => navigate(`/user/${admin.id}`)}
        className="flex items-center gap-4 p-4 active:bg-muted/40 transition-colors cursor-pointer"
      >
        {/* Avatar with role ring */}
        <div className="relative flex-shrink-0">
          <div className={`w-14 h-14 rounded-full overflow-hidden ring-[2.5px] ${
            isAdmin ? "ring-amber-400" : "ring-slate-400/60"
          } bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-primary-foreground font-bold text-lg`}>
            {admin.avatar_url ? (
              <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{admin.display_name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-background ${
            isAdmin ? "bg-amber-400" : "bg-slate-400"
          }`}>
            {isAdmin ? (
              <Crown className="w-3 h-3 text-white" />
            ) : (
              <Star className="w-3 h-3 text-white" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-[16px] truncate ${
              hasCustomColor ? hasCustomColor : isAdmin ? "admin-name-gold" : ""
            }`}>
              {admin.display_name || "Admin"}
            </h3>
            {admin.is_verified && (
              <BadgeCheck className="w-4.5 h-4.5 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            @{admin.username || "user"}
          </p>
          {admin.admin_title && (
            <p className={`text-[12px] font-medium mt-0.5 ${
              isAdmin ? "text-amber-500" : "text-slate-400"
            }`}>
              {admin.admin_title}
            </p>
          )}
        </div>

        {/* Role pill */}
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${
          isAdmin
            ? "bg-amber-500/15 text-amber-500"
            : "bg-slate-500/15 text-slate-400"
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
      <div className="px-4 pt-5 pb-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/40"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent" />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
              <Shield className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold">Equipo de Lettora</h2>
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
        <div className="mt-1">
          {/* Admins Section */}
          {adminsList.length > 0 && (
            <div>
              <div className="px-4 py-2.5">
                <p className="text-[12px] font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  Administradores
                </p>
              </div>
              <div className="mx-4 bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/20">
                {adminsList.map((admin, i) => renderMember(admin, i))}
              </div>
            </div>
          )}

          {/* Moderators Section */}
          {modsList.length > 0 && (
            <div className="mt-6">
              <div className="px-4 py-2.5">
                <p className="text-[12px] font-bold text-slate-400/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" />
                  Moderadores
                </p>
              </div>
              <div className="mx-4 bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/20">
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
