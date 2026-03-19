import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Shield, Users, Trophy, Map, Plus, LogOut, Heart,
  ChevronRight, Camera, X, Crown, Clock, Target, Loader2,
  Trash2, Award, Gift, Check, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Gang {
  id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

interface Base {
  id: string;
  base_number: number;
  name: string;
  hp: number;
  max_hp: number;
  controlling_gang_id: string | null;
  controlled_since: string | null;
  defender_id: string | null;
  defender_hp: number;
  defender_max_hp: number;
  defender_respawn_at: string | null;
  gang?: Gang | null;
  defender_profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

interface LeaderboardEntry {
  gang_id: string;
  gang_name: string;
  gang_photo: string | null;
  total_hours: number;
}

const SECTION_ITEMS = [
  { id: "bases", icon: Target, label: "Bases", color: "text-red-500" },
  { id: "gangs", icon: Users, label: "Crear / Unirse", color: "text-blue-500" },
  { id: "mygangs", icon: Shield, label: "Mis Gangs", color: "text-green-500" },
  { id: "leaderboard", icon: Trophy, label: "Ranking", color: "text-yellow-500" },
  { id: "map", icon: Map, label: "Mapa", color: "text-purple-500" },
];

const GangWarsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [bases, setBases] = useState<Base[]>([]);
  const [allGangs, setAllGangs] = useState<Gang[]>([]);
  const [myGangs, setMyGangs] = useState<any[]>([]);
  const [myGangIds, setMyGangIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGang, setShowCreateGang] = useState(false);
  const [gangName, setGangName] = useState("");
  const [gangDesc, setGangDesc] = useState("");
  const [gangPhotoFile, setGangPhotoFile] = useState<File | null>(null);
  const [gangPhotoPreview, setGangPhotoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedBase, setSelectedBase] = useState<Base | null>(null);
  const [attackingGangId, setAttackingGangId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<"daily" | "weekly" | "total">("daily");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allies, setAllies] = useState<any[]>([]);
  const [showAllyPicker, setShowAllyPicker] = useState<string | null>(null);
  // Admin base creation
  const [showCreateBase, setShowCreateBase] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [creatingBase, setCreatingBase] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setUserId(user.id);

    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!roleData);

    const { data: basesData } = await supabase
      .from("territory_bases" as any)
      .select("*")
      .order("base_number");

    const { data: gangsData } = await supabase
      .from("gangs" as any)
      .select("*")
      .order("created_at", { ascending: false });

    const { data: memberships } = await supabase
      .from("gang_members" as any)
      .select("gang_id, is_leader")
      .eq("user_id", user.id);

    const memberGangIds = (memberships as any[] || []).map((m: any) => m.gang_id);
    setMyGangIds(memberGangIds);

    const { data: allMembers } = await supabase
      .from("gang_members" as any)
      .select("gang_id");

    const countMap: Record<string, number> = {};
    (allMembers as any[] || []).forEach((m: any) => {
      countMap[m.gang_id] = (countMap[m.gang_id] || 0) + 1;
    });

    const gangsWithCount = (gangsData as any[] || []).map((g: any) => ({
      ...g,
      member_count: countMap[g.id] || 0,
    }));

    setAllGangs(gangsWithCount);
    setMyGangs(gangsWithCount.filter((g: any) => memberGangIds.includes(g.id)));

    // Fetch defender profiles
    const defenderIds = (basesData as any[] || [])
      .map((b: any) => b.defender_id)
      .filter(Boolean);
    
    let defenderProfiles: Record<string, any> = {};
    if (defenderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", defenderIds);
      (profiles || []).forEach((p: any) => { defenderProfiles[p.id] = p; });
    }

    const basesWithGang = (basesData as any[] || []).map((b: any) => ({
      ...b,
      gang: b.controlling_gang_id
        ? gangsWithCount.find((g: any) => g.id === b.controlling_gang_id) || null
        : null,
      defender_profile: b.defender_id ? defenderProfiles[b.defender_id] || null : null,
    }));
    setBases(basesWithGang);

    const { data: alliesData } = await supabase
      .from("gang_allies" as any)
      .select("*");
    setAllies(alliesData as any[] || []);

    setLoading(false);
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadLeaderboard = useCallback(async () => {
    const { data: history } = await supabase
      .from("base_control_history" as any)
      .select("gang_id, started_at, ended_at");

    if (!history) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const gangHours: Record<string, number> = {};

    (history as any[]).forEach((h: any) => {
      const start = new Date(h.started_at);
      const end = h.ended_at ? new Date(h.ended_at) : now;

      let effectiveStart = start;
      if (leaderboardTab === "daily" && start < todayStart) effectiveStart = todayStart;
      if (leaderboardTab === "weekly" && start < weekStart) effectiveStart = weekStart;

      if (end > effectiveStart) {
        const hours = (end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
        gangHours[h.gang_id] = (gangHours[h.gang_id] || 0) + hours;
      }
    });

    const entries: LeaderboardEntry[] = Object.entries(gangHours)
      .map(([gangId, hours]) => {
        const gang = allGangs.find(g => g.id === gangId);
        return {
          gang_id: gangId,
          gang_name: gang?.name || "Desconocida",
          gang_photo: gang?.photo_url || null,
          total_hours: Math.round(hours * 100) / 100,
        };
      })
      .sort((a, b) => b.total_hours - a.total_hours);

    setLeaderboard(entries);
  }, [leaderboardTab, allGangs]);

  useEffect(() => {
    if (activeSection === "leaderboard" && allGangs.length > 0) loadLeaderboard();
  }, [activeSection, leaderboardTab, loadLeaderboard, allGangs]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setGangPhotoFile(file);
    setGangPhotoPreview(URL.createObjectURL(file));
  };

  const handleCreateGang = async () => {
    if (!gangName.trim() || !userId) return;
    setCreating(true);

    let photoUrl: string | null = null;
    if (gangPhotoFile) {
      const ext = gangPhotoFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("gang-photos")
        .upload(path, gangPhotoFile);
      if (uploadError) {
        toast({ title: "Error subiendo foto", description: uploadError.message, variant: "destructive" });
        setCreating(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("gang-photos").getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("gangs" as any)
      .insert({ name: gangName.trim(), description: gangDesc.trim() || null, photo_url: photoUrl, created_by: userId })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    await supabase.from("gang_members" as any).insert({ gang_id: (data as any).id, user_id: userId, is_leader: true });

    toast({ title: "¡Gang creada!", description: `${gangName} está lista` });
    setShowCreateGang(false);
    setGangName("");
    setGangDesc("");
    setGangPhotoFile(null);
    setGangPhotoPreview(null);
    setCreating(false);
    loadData();
  };

  const handleJoinGang = async (gangId: string) => {
    if (!userId) return;
    const gang = allGangs.find(g => g.id === gangId);
    if (gang && (gang.member_count || 0) >= 25) {
      toast({ title: "Gang llena", description: "Esta gang ya tiene 25 miembros", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("gang_members" as any).insert({ gang_id: gangId, user_id: userId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "¡Te uniste!" });
    loadData();
  };

  const handleLeaveGang = async (gangId: string) => {
    if (!userId) return;
    await supabase.from("gang_members" as any).delete().eq("gang_id", gangId).eq("user_id", userId);
    toast({ title: "Saliste de la gang" });
    loadData();
  };

  const handleAttack = async (baseId: string) => {
    if (!attackingGangId) {
      toast({ title: "Selecciona tu gang primero", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    const { data, error } = await supabase.rpc("attack_base", {
      p_base_id: baseId,
      p_attacker_gang_id: attackingGangId,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (!result.success) {
        toast({ title: "No se pudo atacar", description: result.message, variant: "destructive" });
      } else if (result.captured) {
        toast({ title: "🏴 ¡Base capturada!", description: "La base ahora es tuya" });
      } else if (result.defender_killed) {
        toast({ title: "💀 ¡Defensor eliminado!", description: `${result.defender_name} no puede volver por 4 segundos. ¡Ataca la base!` });
      } else if (result.hit_base) {
        toast({ title: "⚔️ ¡Golpe a la base!", description: `HP restante: ${result.new_hp}/5` });
      } else {
        toast({ title: "⚔️ ¡Golpe al defensor!", description: `${result.defender_name}: ${result.defender_hp}/5 HP` });
      }
    }
    setActionLoading(false);
    setSelectedBase(null);
    loadData();
  };

  const handleEnterBase = async (baseId: string) => {
    setActionLoading(true);
    const { data, error } = await supabase.rpc("enter_base", { p_base_id: baseId } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (!result.success) {
        toast({ title: "No puedes entrar", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "🛡️ ¡Defendiendo!", description: "Estás protegiendo esta base" });
      }
    }
    setActionLoading(false);
    setSelectedBase(null);
    loadData();
  };

  const handleLeaveBase = async (baseId: string) => {
    setActionLoading(true);
    const { data, error } = await supabase.rpc("leave_base", { p_base_id: baseId } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saliste de la base" });
    }
    setActionLoading(false);
    setSelectedBase(null);
    loadData();
  };

  const handleHeal = async (baseId: string) => {
    setActionLoading(true);
    const { data, error } = await supabase.rpc("heal_base", { p_base_id: baseId } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const result = data as any;
      if (!result.success) {
        toast({ title: "No se pudo curar", description: result.message, variant: "destructive" });
      } else {
        toast({ title: "💚 ¡Base curada!", description: `HP: ${result.new_hp}/${selectedBase?.max_hp || 5}` });
      }
    }
    setActionLoading(false);
    setSelectedBase(null);
    loadData();
  };

  const handleAddAlly = async (gangId: string, allyId: string) => {
    const currentAllies = allies.filter(a => a.gang_id === gangId);
    if (currentAllies.length >= 5) {
      toast({ title: "Máximo 5 aliados", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("gang_allies" as any).insert({ gang_id: gangId, allied_gang_id: allyId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Aliado añadido" }); setShowAllyPicker(null); loadData(); }
  };

  const handleCreateBase = async () => {
    if (!newBaseName.trim()) return;
    setCreatingBase(true);
    const nextNumber = bases.length > 0 ? Math.max(...bases.map(b => b.base_number)) + 1 : 1;
    const { error } = await supabase
      .from("territory_bases" as any)
      .insert({ name: newBaseName.trim(), base_number: nextNumber, hp: 5, max_hp: 5 });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Base creada", description: `Base #${nextNumber} añadida` });
      setNewBaseName("");
      setShowCreateBase(false);
      loadData();
    }
    setCreatingBase(false);
  };

  const handleDeleteBase = async (baseId: string) => {
    const { error } = await supabase.from("territory_bases" as any).delete().eq("id", baseId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Base eliminada" });
      loadData();
    }
  };

  const getControlHours = (since: string | null) => {
    if (!since) return "0h";
    const hours = (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  if (!attackingGangId && myGangIds.length > 0) {
    setAttackingGangId(myGangIds[0]);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── SECTION VIEWS ───
  if (activeSection) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <IOSHeader
          title={SECTION_ITEMS.find(s => s.id === activeSection)?.label || ""}
          subtitle="Gang Wars"
          onBack={() => setActiveSection(null)}
        />

        <div className="px-4 pt-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {activeSection === "bases" && renderBases()}
              {activeSection === "gangs" && renderGangs()}
              {activeSection === "mygangs" && renderMyGangs()}
              {activeSection === "leaderboard" && renderLeaderboard()}
              {activeSection === "map" && renderMap()}
            </motion.div>
          </AnimatePresence>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  // ─── MAIN MENU ───
  return (
    <div className="min-h-screen bg-background pb-24">
      <IOSHeader title="Gang Wars" subtitle="Control de Territorio" showBack />

      <div className="px-4 pt-6 space-y-6">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="liquid-glass-strong rounded-3xl p-5 text-center space-y-2"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 mx-auto flex items-center justify-center shadow-lg">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold font-['Playfair_Display']">Gang Wars</h2>
          <p className="text-sm text-muted-foreground">
            {bases.length} bases · {allGangs.length} gangs · {myGangs.length} tuyas
          </p>
        </motion.div>

        {/* Menu items */}
        <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
          {SECTION_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveSection(item.id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 active:bg-muted/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color} bg-muted/60`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="flex-1 text-left text-[15px] font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </motion.button>
            );
          })}
        </div>

        {/* Quick stats */}
        {myGangs.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Mis Gangs", value: myGangs.length, icon: Shield },
              { label: "Mis Bases", value: bases.filter(b => b.controlling_gang_id && myGangIds.includes(b.controlling_gang_id)).length, icon: Target },
              { label: "Aliados", value: allies.filter(a => myGangIds.includes(a.gang_id)).length, icon: Heart },
            ].map((stat) => (
              <div key={stat.label} className="liquid-glass rounded-2xl p-3 text-center space-y-1">
                <stat.icon className="w-4 h-4 text-primary mx-auto" />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── RENDER FUNCTIONS ───

  function renderBases() {
    return (
      <div className="space-y-4">
        {/* Admin: create base */}
        {isAdmin && (
          <Button
            onClick={() => setShowCreateBase(true)}
            variant="ios"
            size="ios-lg"
            className="w-full"
          >
            <Plus className="w-5 h-5 mr-2" /> Crear Base
          </Button>
        )}

        {/* Gang selector */}
        {myGangs.length > 1 && (
          <div className="liquid-glass rounded-2xl p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Atacar como:</p>
            <div className="flex gap-2 overflow-x-auto">
              {myGangs.map(g => (
                <button
                  key={g.id}
                  onClick={() => setAttackingGangId(g.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    attackingGangId === g.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "liquid-glass text-foreground"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {bases.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay bases creadas</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-1">Crea la primera base</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {bases.map((base) => {
              const isMyBase = base.controlling_gang_id ? myGangIds.includes(base.controlling_gang_id) : false;
              const hpPercent = (base.hp / base.max_hp) * 100;

              return (
                <motion.div
                  key={base.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedBase(base)}
                  className="liquid-glass rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                >
                  <div className={`h-14 flex items-center justify-center relative ${
                    isMyBase ? 'bg-green-500/20' : base.gang ? 'bg-red-500/10' : 'bg-muted/30'
                  }`}>
                    <span className="text-2xl font-bold text-foreground/70">#{base.base_number}</span>
                    {isMyBase && (
                      <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBase(base.id); }}
                        className="absolute top-2 left-2 w-5 h-5 bg-destructive/80 rounded-full flex items-center justify-center"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-semibold truncate">{base.name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className={hpPercent > 50 ? "text-green-500" : hpPercent > 20 ? "text-yellow-500" : "text-destructive"}>
                          {base.hp}/{base.max_hp} HP
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-destructive'
                          }`}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                    </div>
                    {/* Defender info */}
                    {base.defender_id && base.defender_profile && base.defender_hp > 0 && (
                      <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1">
                        <Avatar className="w-4 h-4">
                          {base.defender_profile.avatar_url && <AvatarImage src={base.defender_profile.avatar_url} />}
                          <AvatarFallback className="text-[7px] bg-primary/20">
                            {(base.defender_profile.display_name || base.defender_profile.username || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium text-primary truncate">
                          {base.defender_profile.display_name || base.defender_profile.username}
                        </span>
                        <span className="text-[9px] text-destructive ml-auto font-bold">{base.defender_hp}❤️</span>
                      </div>
                    )}
                    {base.defender_id && base.defender_hp <= 0 && (
                      <div className="text-[10px] text-destructive font-medium text-center">💀 Defensor eliminado</div>
                    )}
                    {base.gang ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-4 h-4">
                          {base.gang.photo_url && <AvatarImage src={base.gang.photo_url} />}
                          <AvatarFallback className="text-[8px] bg-muted">{base.gang.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground truncate">{base.gang.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Sin dueño</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderGangs() {
    return (
      <div className="space-y-4">
        <Button onClick={() => setShowCreateGang(true)} variant="ios" size="ios-lg" className="w-full">
          <Plus className="w-5 h-5 mr-2" /> Crear Gang
        </Button>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Gangs disponibles</h3>
          {allGangs.filter(g => !myGangIds.includes(g.id)).length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay gangs disponibles</p>
            </div>
          ) : (
            <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
              {allGangs.filter(g => !myGangIds.includes(g.id)).map(gang => (
                <div key={gang.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar className="w-11 h-11">
                    {gang.photo_url && <AvatarImage src={gang.photo_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {gang.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] truncate">{gang.name}</p>
                    <p className="text-xs text-muted-foreground">{gang.member_count}/25 miembros</p>
                  </div>
                  <Button
                    size="ios-sm"
                    variant="ios"
                    onClick={() => handleJoinGang(gang.id)}
                    disabled={(gang.member_count || 0) >= 25}
                  >
                    Unirse
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMyGangs() {
    if (myGangs.length === 0) {
      return (
        <div className="text-center py-16">
          <Shield className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No estás en ninguna gang</p>
          <p className="text-xs text-muted-foreground mt-1">Únete o crea una desde "Crear / Unirse"</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {myGangs.map(gang => {
          const gangAllies = allies.filter(a => a.gang_id === gang.id);
          const isCreator = gang.created_by === userId;

          return (
            <div key={gang.id} className="liquid-glass-strong rounded-2xl overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                  {gang.photo_url && <AvatarImage src={gang.photo_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {gang.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[17px] truncate">{gang.name}</p>
                    {isCreator && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{gang.member_count}/25 miembros</p>
                  {gang.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gang.description}</p>
                  )}
                </div>
              </div>

              {/* Allies */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Aliados ({gangAllies.length}/5)</span>
                  {isCreator && gangAllies.length < 5 && (
                    <button onClick={() => setShowAllyPicker(gang.id)} className="text-xs text-primary font-semibold">
                      + Añadir
                    </button>
                  )}
                </div>
                {gangAllies.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {gangAllies.map(ally => {
                      const allyGang = allGangs.find(g => g.id === ally.allied_gang_id);
                      return allyGang ? (
                        <span key={ally.id} className="px-2.5 py-1 bg-muted/60 rounded-full text-[11px] font-medium">{allyGang.name}</span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Sin aliados aún</p>
                )}
              </div>

              <div className="border-t border-border/50 p-3 flex justify-end">
                <Button size="ios-sm" variant="ios-destructive" onClick={() => handleLeaveGang(gang.id)}>
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Salir
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderLeaderboard() {
    return (
      <div className="space-y-4">
        <div className="liquid-glass rounded-2xl p-1 flex gap-1">
          {(["daily", "weekly", "total"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setLeaderboardTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                leaderboardTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "daily" ? "Diario" : tab === "weekly" ? "Semanal" : "Total"}
            </button>
          ))}
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin datos aún</p>
            <p className="text-xs text-muted-foreground mt-1">Controla bases para aparecer aquí</p>
          </div>
        ) : (
          <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
            {leaderboard.map((entry, i) => (
              <div key={entry.gang_id} className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-600" : i === 1 ? "bg-muted text-muted-foreground" : i === 2 ? "bg-orange-500/15 text-orange-600" : "bg-muted/50 text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <Avatar className="w-10 h-10">
                  {entry.gang_photo && <AvatarImage src={entry.gang_photo} />}
                  <AvatarFallback className="bg-muted">{entry.gang_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] truncate">{entry.gang_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[15px]">{entry.total_hours.toFixed(1)}h</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                    <Clock className="w-2.5 h-2.5" /> control
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderMap() {
    return (
      <div className="space-y-4">
        <div className="liquid-glass-strong rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" /> Mapa de Territorio
          </h3>

          {bases.length === 0 ? (
            <div className="text-center py-10">
              <Map className="w-12 h-12 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay bases aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {bases.map(base => {
                const isMyBase = base.controlling_gang_id ? myGangIds.includes(base.controlling_gang_id) : false;
                return (
                  <motion.div
                    key={base.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedBase(base)}
                    className={`liquid-glass rounded-xl p-3 text-center cursor-pointer transition-all ${
                      isMyBase
                        ? "ring-2 ring-green-500/50"
                        : base.gang
                        ? "ring-1 ring-red-500/30"
                        : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 bg-muted/60 flex items-center justify-center">
                      <span className="font-bold text-xs text-foreground/70">#{base.base_number}</span>
                    </div>
                    <p className="text-[11px] font-semibold truncate">{base.name}</p>
                    {base.gang ? (
                      <>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Avatar className="w-4 h-4">
                            {base.gang.photo_url && <AvatarImage src={base.gang.photo_url} />}
                            <AvatarFallback className="text-[7px]">{base.gang.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">{base.gang.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {getControlHours(base.controlled_since)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-green-500 font-medium mt-1">Libre</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDialogs() {
    return (
      <>
        {/* BASE ACTION DIALOG */}
        <Dialog open={!!selectedBase} onOpenChange={() => setSelectedBase(null)}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[340px] border-0">
            <DialogHeader>
              <DialogTitle className="text-center text-[17px]">{selectedBase?.name}</DialogTitle>
              <DialogDescription className="text-center text-[13px]">
                Base #{selectedBase?.base_number}
              </DialogDescription>
            </DialogHeader>
            {selectedBase && (() => {
              const isMyBase = myGangIds.includes(selectedBase.controlling_gang_id || "");
              const isDefender = selectedBase.defender_id === userId;
              const hasDefender = selectedBase.defender_id && selectedBase.defender_hp > 0;
              const defenderDead = selectedBase.defender_id && selectedBase.defender_hp <= 0;
              const respawnActive = selectedBase.defender_respawn_at && new Date(selectedBase.defender_respawn_at) > new Date();

              return (
                <div className="space-y-4">
                  {/* Base HP */}
                  <div className="text-center">
                    <span className={`text-2xl font-bold ${
                      (selectedBase.hp / selectedBase.max_hp) > 0.5 ? 'text-green-500' :
                      (selectedBase.hp / selectedBase.max_hp) > 0.2 ? 'text-yellow-500' : 'text-destructive'
                    }`}>
                      {selectedBase.hp}
                    </span>
                    <span className="text-muted-foreground text-sm">/{selectedBase.max_hp} HP</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (selectedBase.hp / selectedBase.max_hp) > 0.5 ? 'bg-green-500' :
                        (selectedBase.hp / selectedBase.max_hp) > 0.2 ? 'bg-yellow-500' : 'bg-destructive'
                      }`}
                      style={{ width: `${(selectedBase.hp / selectedBase.max_hp) * 100}%` }}
                    />
                  </div>

                  {/* Gang info */}
                  {selectedBase.gang && (
                    <div className="flex items-center gap-2 justify-center liquid-glass rounded-xl px-3 py-2">
                      <Avatar className="w-6 h-6">
                        {selectedBase.gang.photo_url && <AvatarImage src={selectedBase.gang.photo_url} />}
                        <AvatarFallback className="text-[9px]">{selectedBase.gang.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{selectedBase.gang.name}</span>
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {getControlHours(selectedBase.controlled_since)}
                      </span>
                    </div>
                  )}

                  {/* Defender info */}
                  {hasDefender && selectedBase.defender_profile && (
                    <div className="liquid-glass rounded-xl p-3 flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-2 ring-primary/30">
                        {selectedBase.defender_profile.avatar_url && <AvatarImage src={selectedBase.defender_profile.avatar_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {(selectedBase.defender_profile.display_name || selectedBase.defender_profile.username || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {selectedBase.defender_profile.display_name || selectedBase.defender_profile.username}
                        </p>
                        <p className="text-[11px] text-muted-foreground">🛡️ Defendiendo</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-destructive">{selectedBase.defender_hp}❤️</p>
                        <p className="text-[10px] text-muted-foreground">/{selectedBase.defender_max_hp}</p>
                      </div>
                    </div>
                  )}

                  {defenderDead && respawnActive && (
                    <div className="liquid-glass rounded-xl p-3 text-center">
                      <p className="text-sm font-medium text-destructive">💀 Defensor eliminado</p>
                      <p className="text-[11px] text-muted-foreground">No puede volver por 4 segundos</p>
                    </div>
                  )}

                  {!hasDefender && !defenderDead && selectedBase.controlling_gang_id && (
                    <div className="liquid-glass rounded-xl p-2 text-center">
                      <p className="text-[12px] text-muted-foreground">⚠️ Sin defensor</p>
                    </div>
                  )}

                  {/* Actions */}
                  {myGangIds.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {/* Attack button (enemy base) */}
                      {!isMyBase && selectedBase.controlling_gang_id && (
                        <Button
                          className="w-full"
                          variant="ios-destructive"
                          size="ios-md"
                          onClick={() => handleAttack(selectedBase.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4 mr-1.5" /> {hasDefender ? 'Atacar Defensor' : 'Atacar Base'}</>}
                        </Button>
                      )}
                      {/* Capture free base */}
                      {!selectedBase.controlling_gang_id && (
                        <Button
                          className="w-full"
                          variant="ios"
                          size="ios-md"
                          onClick={() => handleAttack(selectedBase.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Target className="w-4 h-4 mr-1.5" /> Capturar Base</>}
                        </Button>
                      )}
                      {/* Enter as defender (own base) */}
                      {isMyBase && !isDefender && (
                        <Button
                          className="w-full"
                          variant="ios"
                          size="ios-md"
                          onClick={() => handleEnterBase(selectedBase.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4 mr-1.5" /> Entrar a Defender</>}
                        </Button>
                      )}
                      {/* Leave base (I'm defending) */}
                      {isMyBase && isDefender && (
                        <Button
                          className="w-full"
                          variant="ios-secondary"
                          size="ios-md"
                          onClick={() => handleLeaveBase(selectedBase.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4 mr-1.5" /> Dejar de Defender</>}
                        </Button>
                      )}
                      {/* Heal own base */}
                      {isMyBase && selectedBase.hp < selectedBase.max_hp && (
                        <Button
                          className="w-full"
                          variant="ios"
                          size="ios-md"
                          onClick={() => handleHeal(selectedBase.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 mr-1.5" /> Curar Base</>}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="liquid-glass rounded-xl p-3 text-center">
                      <p className="text-sm text-muted-foreground">Únete a una gang para participar</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* CREATE GANG DIALOG */}
        <Dialog open={showCreateGang} onOpenChange={setShowCreateGang}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[340px] border-0">
            <DialogHeader>
              <DialogTitle className="text-[17px]">Crear Gang</DialogTitle>
              <DialogDescription className="text-[13px]">Recluta hasta 25 miembros</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nombre de la gang" value={gangName} onChange={e => setGangName(e.target.value)} maxLength={30} className="rounded-xl bg-muted/50 border-0 h-11" />
              <Textarea placeholder="Descripción (opcional)" value={gangDesc} onChange={e => setGangDesc(e.target.value)} maxLength={200} rows={3} className="rounded-xl bg-muted/50 border-0" />
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-2">Foto de la gang</label>
                <div className="flex items-center gap-3">
                  {gangPhotoPreview ? (
                    <div className="relative">
                      <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                        <AvatarImage src={gangPhotoPreview} />
                        <AvatarFallback>G</AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => { setGangPhotoFile(null); setGangPhotoPreview(null); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-2xl bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    </label>
                  )}
                  <p className="text-[12px] text-muted-foreground">JPG, PNG. Máx 5MB</p>
                </div>
              </div>
              <Button onClick={handleCreateGang} disabled={!gangName.trim() || creating} variant="ios" size="ios-lg" className="w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Gang"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CREATE BASE DIALOG (Admin) */}
        <Dialog open={showCreateBase} onOpenChange={setShowCreateBase}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[340px] border-0">
            <DialogHeader>
              <DialogTitle className="text-[17px]">Crear Base</DialogTitle>
              <DialogDescription className="text-[13px]">Será la base #{bases.length > 0 ? Math.max(...bases.map(b => b.base_number)) + 1 : 1}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre de la base"
                value={newBaseName}
                onChange={e => setNewBaseName(e.target.value)}
                maxLength={40}
                className="rounded-xl bg-muted/50 border-0 h-11"
              />
              <Button
                onClick={handleCreateBase}
                disabled={!newBaseName.trim() || creatingBase}
                variant="ios"
                size="ios-lg"
                className="w-full"
              >
                {creatingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Base"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ALLY PICKER DIALOG */}
        <Dialog open={!!showAllyPicker} onOpenChange={() => setShowAllyPicker(null)}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[340px] border-0">
            <DialogHeader>
              <DialogTitle className="text-[17px]">Añadir Aliado</DialogTitle>
              <DialogDescription className="text-[13px]">Selecciona una gang aliada</DialogDescription>
            </DialogHeader>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {allGangs
                .filter(g => g.id !== showAllyPicker && !allies.some(a => a.gang_id === showAllyPicker && a.allied_gang_id === g.id))
                .map(g => (
                  <button
                    key={g.id}
                    onClick={() => showAllyPicker && handleAddAlly(showAllyPicker, g.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-9 h-9">
                      {g.photo_url && <AvatarImage src={g.photo_url} />}
                      <AvatarFallback className="bg-muted">{g.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-[15px] font-medium">{g.name}</span>
                  </button>
                ))}
              {allGangs.filter(g => g.id !== showAllyPicker && !allies.some(a => a.gang_id === showAllyPicker && a.allied_gang_id === g.id)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No hay gangs disponibles</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
};

export default GangWarsPage;
