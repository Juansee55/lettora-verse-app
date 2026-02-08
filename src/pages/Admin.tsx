import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Users,
  BadgeCheck,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ModerationPanel from "@/components/reports/ModerationPanel";

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
  const [activeTab, setActiveTab] = useState<"users" | "moderation">("users");
  const [userFilter, setUserFilter] = useState<"all" | "pending" | "verified">("all");

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error || !data) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos de administrador.",
        variant: "destructive",
      });
      navigate("/home");
      return;
    }

    setIsAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_verified, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !currentStatus })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la verificación.",
        variant: "destructive",
      });
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: !currentStatus } : u
        )
      );
      toast({
        title: currentStatus ? "Verificación removida" : "Usuario verificado",
        description: currentStatus
          ? "El usuario ya no está verificado."
          : "El usuario ahora está verificado.",
      });
    }
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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* iOS Header */}
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
          <div className="w-16" />
        </div>

        {/* Main Tabs */}
        <div className="flex border-t border-border/50">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[14px] font-medium">Usuarios</span>
          </button>
          <button
            onClick={() => setActiveTab("moderation")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
              activeTab === "moderation"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-[14px] font-medium">Moderación</span>
          </button>
        </div>
      </div>

      {activeTab === "users" ? (
        <>
          {/* Search */}
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

          {/* Filter pills */}
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
                  userFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="px-4 pb-3 grid grid-cols-3 gap-2">
            <div className="ios-section p-3 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="font-bold text-lg">{users.length}</p>
              <p className="text-[11px] text-muted-foreground">Total</p>
            </div>
            <div className="ios-section p-3 text-center">
              <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className="font-bold text-lg">
                {users.filter((u) => u.is_verified).length}
              </p>
              <p className="text-[11px] text-muted-foreground">Verificados</p>
            </div>
            <div className="ios-section p-3 text-center">
              <XCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="font-bold text-lg">
                {users.filter((u) => !u.is_verified).length}
              </p>
              <p className="text-[11px] text-muted-foreground">Pendientes</p>
            </div>
          </div>

          {/* User list */}
          <div className="px-4 space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="ios-section p-8 text-center">
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
                  className="ios-section"
                >
                  <div className="ios-item">
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

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/user/${user.id}`)}
                    >
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-[15px] truncate">
                          {user.display_name || "Usuario"}
                        </h3>
                        {user.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[13px] text-muted-foreground truncate">
                        @{user.username || "user"}
                      </p>
                    </div>

                    <Button
                      variant={user.is_verified ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleVerification(user.id, user.is_verified)}
                      className="flex-shrink-0 rounded-full"
                    >
                      {user.is_verified ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Quitar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Verificar
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Moderation Tab */
        <div className="px-4 py-4">
          <ModerationPanel isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
};

export default AdminPage;
