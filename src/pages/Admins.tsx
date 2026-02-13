import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, BadgeCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { IOSHeader } from "@/components/ios/IOSHeader";
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
    // Get all admin/moderator roles
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
      // Sort admins first, then mods
      merged.sort((a, b) => (a.role === "admin" && b.role !== "admin" ? -1 : 1));
      setAdmins(merged);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <IOSHeader title="Equipo" large />

      <div className="px-4 pt-2">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 mb-4 border border-border/50 text-center"
        >
          <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-[17px] font-semibold mb-1">Administradores</h2>
          <p className="text-[14px] text-muted-foreground">
            El equipo que mantiene la comunidad segura y funcionando.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay administradores registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/user/${admin.id}`)}
                className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4 cursor-pointer active:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden flex-shrink-0 ring-2 ring-amber-400/50">
                  {admin.avatar_url ? (
                    <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    admin.display_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3
                      className="font-semibold text-[16px] truncate"
                      style={{ color: "hsl(45, 90%, 50%)" }}
                    >
                      {admin.display_name || "Admin"}
                    </h3>
                    {admin.is_verified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] text-muted-foreground">@{admin.username || "user"}</span>
                    {admin.admin_title && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span
                          className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: "hsl(45, 90%, 50%, 0.12)",
                            color: "hsl(45, 90%, 45%)",
                          }}
                        >
                          {admin.admin_title}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div
                  className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex-shrink-0"
                  style={{
                    background: admin.role === "admin"
                      ? "hsl(45, 90%, 50%, 0.15)"
                      : "hsl(270, 75%, 55%, 0.15)",
                    color: admin.role === "admin"
                      ? "hsl(45, 90%, 45%)"
                      : "hsl(270, 75%, 55%)",
                  }}
                >
                  {admin.role === "admin" ? "Admin" : "Mod"}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <IOSBottomNav />
    </div>
  );
};

export default AdminsPage;
