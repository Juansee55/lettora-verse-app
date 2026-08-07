import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, BadgeCheck, Loader2, ArrowLeft, Crown, Star, Pencil, CalendarDays, Cake, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { useNameColors } from "@/hooks/useNameColors";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  admin_title: string | null;
  admin_bio: string | null;
  role_since: string | null;
  is_active: boolean;
  left_at: string | null;
  birth_date: string | null;
  role: string;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;

const fmtDay = (d?: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : null;

const AdminsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const nameColors = useNameColors(admins.map((a) => a.id));

  useEffect(() => {
    fetchAdmins();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setCanEdit(Boolean(data));
    })();
  }, []);

  const fetchAdmins = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role, admin_title, admin_bio, role_since, is_active, left_at, birth_date")
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
      const merged: AdminUser[] = profiles.map((p) => {
        const role: any = roles.find((r) => r.user_id === p.id);
        const hidden = Boolean((p as any).admin_hide_identity);
        return {
          ...p,
          admin_title: role?.admin_title || null,
          admin_bio: role?.admin_bio || null,
          role_since: role?.role_since || null,
          is_active: role?.is_active ?? true,
          left_at: role?.left_at || null,
          birth_date: hidden ? null : role?.birth_date || null,
          role: role?.role || "admin",
          is_verified: p.is_verified ?? false,
        };
      });
      merged.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.role === "admin" && b.role !== "admin" ? -1 : 1;
      });
      setAdmins(merged);
    }
    setLoading(false);
  };

  const saveMember = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_roles")
      .update({
        admin_title: editing.admin_title,
        admin_bio: editing.admin_bio,
        role_since: editing.role_since || null,
        is_active: editing.is_active,
        left_at: editing.is_active ? null : editing.left_at || null,
        birth_date: editing.birth_date || null,
      } as any)
      .eq("user_id", editing.id)
      .eq("role", editing.role as any);

    setSaving(false);
    if (error) {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Perfil actualizado ✨" });
    setEditing(null);
    fetchAdmins();
  };

  const adminsList = admins.filter((a) => a.role === "admin");
  const modsList = admins.filter((a) => a.role === "moderator");

  const renderMember = (admin: AdminUser, index: number) => {
    const isAdmin = admin.role === "admin";
    const hasCustomColor = nameColors[admin.id];

    return (
      <motion.div
        key={admin.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`p-4 active:bg-muted/40 transition-colors ${admin.is_active ? "" : "opacity-70"}`}
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(`/user/${admin.id}`)}
            className="relative flex-shrink-0"
          >
            <div
              className={`w-14 h-14 rounded-full overflow-hidden ring-[2.5px] ${
                isAdmin ? "ring-amber-400" : "ring-slate-400/60"
              } bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-primary-foreground font-bold text-lg`}
            >
              {admin.avatar_url ? (
                <img src={admin.avatar_url} alt={admin.display_name || "Miembro del equipo"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{admin.display_name?.[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background ${
                isAdmin ? "bg-amber-400" : "bg-slate-400"
              }`}
            >
              {isAdmin ? <Crown className="w-3 h-3 text-white" /> : <Star className="w-3 h-3 text-white" />}
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`font-bold text-[16px] truncate ${
                  hasCustomColor ? hasCustomColor : isAdmin ? "admin-name-gold" : ""
                }`}
              >
                {admin.display_name || "Admin"}
              </h3>
              {admin.is_verified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">@{admin.username || "user"}</p>

            {admin.admin_title && (
              <p className={`text-[12px] font-medium mt-0.5 ${isAdmin ? "text-amber-500" : "text-slate-400"}`}>
                {admin.admin_title}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                isAdmin ? "bg-amber-500/15 text-amber-500" : "bg-slate-500/15 text-slate-400"
              }`}
            >
              {isAdmin ? "Admin" : "Mod"}
            </span>
            {canEdit && (
              <button
                onClick={() => setEditing(admin)}
                className="text-primary/80 active:opacity-60 p-1"
                aria-label="Editar miembro"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {admin.admin_bio && (
          <p className="text-[13px] text-foreground/80 leading-relaxed mt-3">{admin.admin_bio}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              admin.is_active ? "bg-emerald-500/12 text-emerald-500" : "bg-rose-500/12 text-rose-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
            {admin.is_active ? "Activo" : `Baja${admin.left_at ? ` · ${fmtDate(admin.left_at)}` : ""}`}
          </span>
          {admin.role_since && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              <CalendarDays className="w-3 h-3" />
              En el cargo desde {fmtDate(admin.role_since)}
            </span>
          )}
          {admin.birth_date && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              <Cake className="w-3 h-3" />
              {fmtDay(admin.birth_date)}
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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
              <h2 className="text-[18px] font-bold">Conoce al equipo</h2>
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

      {/* iOS 26 edit sheet */}
      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative w-full max-w-md liquid-glass rounded-t-3xl border-t border-border/40 p-5 pb-8 max-h-[88vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-bold">Editar miembro</h3>
                <button onClick={() => setEditing(null)} className="p-1 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Cargo</label>
                  <input
                    value={editing.admin_title || ""}
                    onChange={(e) => setEditing({ ...editing, admin_title: e.target.value })}
                    placeholder="Ej. Fundador · Community Manager"
                    className="mt-1.5 w-full bg-card rounded-xl px-3.5 py-3 text-[15px] border border-border/40 outline-none focus:border-primary/60"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Descripción</label>
                  <textarea
                    value={editing.admin_bio || ""}
                    onChange={(e) => setEditing({ ...editing, admin_bio: e.target.value })}
                    rows={4}
                    maxLength={400}
                    placeholder="Cuenta quién es y qué hace en Lettora"
                    className="mt-1.5 w-full bg-card rounded-xl px-3.5 py-3 text-[15px] border border-border/40 outline-none focus:border-primary/60 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">En el cargo desde</label>
                    <input
                      type="date"
                      value={editing.role_since || ""}
                      onChange={(e) => setEditing({ ...editing, role_since: e.target.value })}
                      className="mt-1.5 w-full bg-card rounded-xl px-3 py-3 text-[14px] border border-border/40 outline-none focus:border-primary/60"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Nacimiento</label>
                    <input
                      type="date"
                      value={editing.birth_date || ""}
                      onChange={(e) => setEditing({ ...editing, birth_date: e.target.value })}
                      className="mt-1.5 w-full bg-card rounded-xl px-3 py-3 text-[14px] border border-border/40 outline-none focus:border-primary/60"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-card rounded-xl px-3.5 py-3 border border-border/40">
                  <div>
                    <p className="text-[15px] font-medium">Sigue activo</p>
                    <p className="text-[12px] text-muted-foreground">Desactívalo si se dio de baja</p>
                  </div>
                  <button
                    onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                    className={`w-[51px] h-[31px] rounded-full transition-colors relative ${
                      editing.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`}
                    aria-label="Alternar actividad"
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow ${
                        editing.is_active ? "right-[2px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                </div>

                {!editing.is_active && (
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Fecha de baja</label>
                    <input
                      type="date"
                      value={editing.left_at || ""}
                      onChange={(e) => setEditing({ ...editing, left_at: e.target.value })}
                      className="mt-1.5 w-full bg-card rounded-xl px-3 py-3 text-[14px] border border-border/40 outline-none focus:border-primary/60"
                    />
                  </div>
                )}

                <button
                  onClick={saveMember}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-[16px] active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IOSBottomNav />
    </div>
  );
};

export default AdminsPage;
