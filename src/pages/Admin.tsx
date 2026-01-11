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
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "verified">("all");

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user has admin role using the security definer function
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

    if (activeTab === "verified") return matchesSearch && user.is_verified;
    if (activeTab === "pending") return matchesSearch && !user.is_verified;
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-display font-bold text-lg">Panel de Admin</h1>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { key: "all", label: "Todos", icon: Users },
            { key: "pending", label: "Sin verificar", icon: XCircle },
            { key: "verified", label: "Verificados", icon: BadgeCheck },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="font-bold text-2xl">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total usuarios</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center">
          <BadgeCheck className="w-6 h-6 mx-auto mb-2 text-green-500" />
          <p className="font-bold text-2xl">
            {users.filter((u) => u.is_verified).length}
          </p>
          <p className="text-xs text-muted-foreground">Verificados</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center">
          <XCircle className="w-6 h-6 mx-auto mb-2 text-orange-500" />
          <p className="font-bold text-2xl">
            {users.filter((u) => !u.is_verified).length}
          </p>
          <p className="text-xs text-muted-foreground">Sin verificar</p>
        </div>
      </div>

      {/* User list */}
      <div className="p-4 space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontraron usuarios.</p>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl p-4 flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-lg font-bold text-primary-foreground overflow-hidden cursor-pointer"
                onClick={() => navigate(`/user/${user.id}`)}
              >
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

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/user/${user.id}`)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">
                    {user.display_name || "Usuario"}
                  </h3>
                  {user.is_verified && (
                    <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  @{user.username || "user"}
                </p>
              </div>

              <Button
                variant={user.is_verified ? "outline" : "default"}
                size="sm"
                onClick={() => toggleVerification(user.id, user.is_verified)}
                className="flex-shrink-0"
              >
                {user.is_verified ? (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    Quitar
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Verificar
                  </>
                )}
              </Button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPage;
