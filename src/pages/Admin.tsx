import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, Users, BadgeCheck, Search,
  Loader2, CheckCircle, XCircle, UserPlus, Tag, Save,
  Trash2, ShieldPlus, ShieldMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ModerationPanel from "@/components/reports/ModerationPanel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserWithVerification {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string | null;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithVerification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "moderation" | "roles">("users");
  const [userFilter, setUserFilter] = useState<"all" | "pending" | "verified">("all");
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithVerification | null>(null);
  const [verifyUsername, setVerifyUsername] = useState("");
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<UserWithVerification | null>(null);
  const [adminRoles, setAdminRoles] = useState<any[]>([]);
  const [editingTitles, setEditingTitles] = useState<Record<string, string>>({});
  
  // New states for role management and account deletion
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleUsername, setRoleUsername] = useState("");
  const [roleFoundUser, setRoleFoundUser] = useState<UserWithVerification | null>(null);
  const [searchingRoleUser, setSearchingRoleUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "moderator">("moderator");
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithVerification | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (error || !data) {
      toast({ title: "Acceso denegado", description: "No tienes permisos de administrador.", variant: "destructive" });
      navigate("/home");
      return;
    }
    setIsAdmin(true);
    fetchUsers();
    fetchAdminRoles();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified, created_at")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const fetchAdminRoles = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("id, user_id, role, admin_title")
      .in("role", ["admin", "moderator"]);
    if (!roles) return;
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", userIds);
    const merged = roles.map((r) => ({
      ...r,
      profile: profiles?.find((p) => p.id === r.user_id),
    }));
    setAdminRoles(merged);
    const titles: Record<string, string> = {};
    roles.forEach((r) => { titles[r.id] = r.admin_title || ""; });
    setEditingTitles(titles);
  };

  const saveAdminTitle = async (roleId: string) => {
    const title = editingTitles[roleId]?.trim() || null;
    await supabase.from("user_roles").update({ admin_title: title }).eq("id", roleId);
    setAdminRoles((prev) => prev.map((r: any) => r.id === roleId ? { ...r, admin_title: title } : r));
    toast({ title: "✅ Cargo actualizado" });
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !currentStatus }).eq("id", userId);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
      toast({ title: currentStatus ? "Verificación removida" : "✅ Usuario verificado" });
    }
  };

  const searchUserToVerify = async () => {
    if (!verifyUsername.trim()) return;
    setSearchingUser(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified, created_at")
      .or(`username.ilike.%${verifyUsername}%,display_name.ilike.%${verifyUsername}%`)
      .limit(1)
      .maybeSingle();
    setFoundUser(data as UserWithVerification | null);
    setSearchingUser(false);
  };

  const searchUserForRole = async () => {
    if (!roleUsername.trim()) return;
    setSearchingRoleUser(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified, created_at")
      .or(`username.ilike.%${roleUsername}%,display_name.ilike.%${roleUsername}%`)
      .limit(1)
      .maybeSingle();
    setRoleFoundUser(data as UserWithVerification | null);
    setSearchingRoleUser(false);
  };

  const assignRole = async () => {
    if (!roleFoundUser) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: roleFoundUser.id,
      role: selectedRole,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Ya tiene este rol", variant: "destructive" });
      } else {
        toast({ title: "Error al asignar rol", variant: "destructive" });
      }
    } else {
      toast({ title: `✅ Rol ${selectedRole} asignado` });
      fetchAdminRoles();
      setRoleFoundUser(null);
      setRoleUsername("");
      setShowRoleDialog(false);
    }
  };

  const removeRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Error al eliminar rol", variant: "destructive" });
    } else {
      toast({ title: "Rol eliminado" });
      fetchAdminRoles();
    }
  };

  const deleteUserAccount = async () => {
    if (!userToDelete) return;
    // Delete profile (cascades or RLS handles related data)
    const { error } = await supabase.from("profiles").delete().eq("id", userToDelete.id);
    if (error) {
      toast({ title: "Error al eliminar cuenta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cuenta eliminada" });
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    }
    setShowDeleteAccountDialog(false);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    if (userFilter === "verified") return matchesSearch && user.is_verified;
    if (userFilter === "pending") return matchesSearch && !user.is_verified;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-display font-semibold text-[17px]">Admin</h1>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowRoleDialog(true)}>
              <ShieldPlus className="w-5 h-5 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowVerifyDialog(true)}>
              <UserPlus className="w-5 h-5 text-primary" />
            </Button>
          </div>
        </div>

        <div className="flex border-t border-border/50">
          {[
            { key: "users" as const, icon: Users, label: "Usuarios" },
            { key: "moderation" as const, icon: Shield, label: "Moderación" },
            { key: "roles" as const, icon: Tag, label: "Cargos" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[14px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "users" ? (
        <>
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar usuarios"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[36px] pl-9 pr-4 rounded-xl bg-muted/60 text-[17px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          <div className="px-4 pb-3 flex gap-2">
            {[
              { key: "all" as const, label: "Todos" },
              { key: "pending" as const, label: "Sin verificar" },
              { key: "verified" as const, label: "Verificados" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setUserFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  userFilter === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-3 grid grid-cols-3 gap-2">
            <div className="bg-card rounded-2xl p-3 text-center border border-border/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="font-bold text-lg">{users.length}</p>
              <p className="text-[11px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-card rounded-2xl p-3 text-center border border-border/50">
              <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="font-bold text-lg">{users.filter(u => u.is_verified).length}</p>
              <p className="text-[11px] text-muted-foreground">Verificados</p>
            </div>
            <div className="bg-card rounded-2xl p-3 text-center border border-border/50">
              <XCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="font-bold text-lg">{users.filter(u => !u.is_verified).length}</p>
              <p className="text-[11px] text-muted-foreground">Pendientes</p>
            </div>
          </div>

          <div className="px-4 space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center border border-border/50">
                <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No se encontraron usuarios.</p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card rounded-2xl border border-border/50"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className="w-11 h-11 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/user/${user.id}`)}
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${user.id}`)}>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-[15px] truncate">{user.display_name || "Usuario"}</h3>
                        {user.is_verified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                      <p className="text-[13px] text-muted-foreground truncate">@{user.username || "user"}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant={user.is_verified ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleVerification(user.id, user.is_verified)}
                        className="rounded-full text-[11px] h-8 px-2"
                      >
                        {user.is_verified ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setUserToDelete(user); setShowDeleteAccountDialog(true); }}
                        className="rounded-full text-destructive border-destructive/30 h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : activeTab === "moderation" ? (
        <div className="px-4 py-4">
          <ModerationPanel isAdmin={isAdmin} />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] text-muted-foreground">
              Gestiona roles y cargos del equipo.
            </p>
            <Button size="sm" className="rounded-xl" onClick={() => setShowRoleDialog(true)}>
              <ShieldPlus className="w-4 h-4 mr-1" /> Asignar rol
            </Button>
          </div>
          {adminRoles.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center border border-border/50">
              <Tag className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No hay administradores registrados.</p>
            </div>
          ) : (
            adminRoles.map((role: any) => (
              <div key={role.id} className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                    {role.profile?.avatar_url ? (
                      <img src={role.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      role.profile?.display_name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[15px]" style={{ color: "hsl(45, 90%, 50%)" }}>
                      {role.profile?.display_name || "Admin"}
                    </h3>
                    <p className="text-[12px] text-muted-foreground">
                      @{role.profile?.username || "user"} · {role.role}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRole(role.id)}
                    className="rounded-full text-destructive border-destructive/30 h-8 px-2"
                  >
                    <ShieldMinus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Developer, Community Manager..."
                    value={editingTitles[role.id] || ""}
                    onChange={(e) => setEditingTitles((prev) => ({ ...prev, [role.id]: e.target.value }))}
                    className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button size="sm" onClick={() => saveAdminTitle(role.id)} className="rounded-xl h-10">
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Verify Dialog */}
      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-primary" />
              Verificar usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              Busca un usuario por nombre o username para verificarlo rápidamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Username o nombre..."
                value={verifyUsername}
                onChange={(e) => setVerifyUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUserToVerify()}
                className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button onClick={searchUserToVerify} disabled={searchingUser} className="rounded-xl">
                {searchingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {foundUser && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                  {foundUser.avatar_url ? (
                    <img src={foundUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    foundUser.display_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-[15px] truncate">{foundUser.display_name || "Usuario"}</p>
                    {foundUser.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-[13px] text-muted-foreground">@{foundUser.username || "user"}</p>
                </div>
                <Button
                  size="sm"
                  variant={foundUser.is_verified ? "outline" : "default"}
                  className="rounded-full"
                  onClick={() => {
                    toggleVerification(foundUser.id, foundUser.is_verified);
                    setFoundUser({ ...foundUser, is_verified: !foundUser.is_verified });
                  }}
                >
                  {foundUser.is_verified ? "Quitar" : "Verificar"}
                </Button>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setVerifyUsername(""); setFoundUser(null); }}>
              Cerrar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Role Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldPlus className="w-5 h-5 text-primary" />
              Asignar rol
            </AlertDialogTitle>
            <AlertDialogDescription>
              Busca un usuario y asígnale un rol de administrador o moderador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Username o nombre..."
                value={roleUsername}
                onChange={(e) => setRoleUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUserForRole()}
                className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button onClick={searchUserForRole} disabled={searchingRoleUser} className="rounded-xl">
                {searchingRoleUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {roleFoundUser && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                    {roleFoundUser.avatar_url ? (
                      <img src={roleFoundUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      roleFoundUser.display_name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] truncate">{roleFoundUser.display_name || "Usuario"}</p>
                    <p className="text-[13px] text-muted-foreground">@{roleFoundUser.username || "user"}</p>
                  </div>
                </div>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "moderator")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={assignRole} className="w-full rounded-xl">
                  Asignar {selectedRole}
                </Button>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setRoleUsername(""); setRoleFoundUser(null); }}>
              Cerrar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Eliminar cuenta
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar la cuenta de <strong>{userToDelete?.display_name || userToDelete?.username}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUserAccount} className="bg-destructive hover:bg-destructive/90 rounded-xl">
              Eliminar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPage;
