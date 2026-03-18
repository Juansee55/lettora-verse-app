import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Shield, Users, Trophy, Map, Plus, LogOut, Heart,
  ChevronRight, Camera, X, Crown, Clock, Target, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  gang?: Gang | null;
}

interface LeaderboardEntry {
  gang_id: string;
  gang_name: string;
  gang_photo: string | null;
  total_hours: number;
}

const BASE_COLORS = [
  "from-red-500 to-orange-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-purple-500 to-pink-500",
  "from-yellow-500 to-amber-500",
  "from-indigo-500 to-violet-500",
  "from-rose-500 to-red-500",
  "from-teal-500 to-green-500",
  "from-fuchsia-500 to-purple-500",
  "from-sky-500 to-blue-500",
  "from-lime-500 to-green-500",
  "from-orange-500 to-yellow-500",
];

const GangWarsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bases");
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

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setUserId(user.id);

    // Load bases with controlling gang info
    const { data: basesData } = await supabase
      .from("territory_bases" as any)
      .select("*")
      .order("base_number");

    // Load all gangs
    const { data: gangsData } = await supabase
      .from("gangs" as any)
      .select("*")
      .order("created_at", { ascending: false });

    // Load my memberships
    const { data: memberships } = await supabase
      .from("gang_members" as any)
      .select("gang_id, is_leader")
      .eq("user_id", user.id);

    const memberGangIds = (memberships as any[] || []).map((m: any) => m.gang_id);
    setMyGangIds(memberGangIds);

    // Load member counts
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

    // Map gang info to bases
    const basesWithGang = (basesData as any[] || []).map((b: any) => ({
      ...b,
      gang: b.controlling_gang_id
        ? gangsWithCount.find((g: any) => g.id === b.controlling_gang_id) || null
        : null,
    }));
    setBases(basesWithGang);

    // Load allies
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
    if (activeTab === "leaderboard" && allGangs.length > 0) loadLeaderboard();
  }, [activeTab, leaderboardTab, loadLeaderboard, allGangs]);

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

    // Upload photo if selected
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
    // Check member count
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
      } else {
        toast({ title: "⚔️ ¡Golpe!", description: `HP restante: ${result.new_hp}/50` });
      }
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
        toast({ title: "💚 ¡Base curada!", description: `HP: ${result.new_hp}/50` });
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

  const getControlHours = (since: string | null) => {
    if (!since) return "0h";
    const hours = (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Set default attacking gang
  if (!attackingGangId && myGangIds.length > 0) {
    setAttackingGangId(myGangIds[0]);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <IOSHeader title="Gang Wars" showBack />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-2 pt-2">
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
            <TabsTrigger value="bases" className="flex-1 text-xs rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Target className="w-3.5 h-3.5 mr-1" /> Bases
            </TabsTrigger>
            <TabsTrigger value="gangs" className="flex-1 text-xs rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users className="w-3.5 h-3.5 mr-1" /> Gangs
            </TabsTrigger>
            <TabsTrigger value="mygangs" className="flex-1 text-xs rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Shield className="w-3.5 h-3.5 mr-1" /> Mis Gangs
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 text-xs rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Trophy className="w-3.5 h-3.5 mr-1" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1 text-xs rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Map className="w-3.5 h-3.5 mr-1" /> Mapa
            </TabsTrigger>
          </TabsList>
        </div>

        {/* BASES TAB */}
        <TabsContent value="bases" className="px-4 mt-4 space-y-3">
          {myGangs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <span className="text-xs text-muted-foreground shrink-0 self-center">Atacar como:</span>
              {myGangs.map(g => (
                <button
                  key={g.id}
                  onClick={() => setAttackingGangId(g.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    attackingGangId === g.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {bases.map((base) => {
              const isMyBase = base.controlling_gang_id ? myGangIds.includes(base.controlling_gang_id) : false;
              const hpPercent = (base.hp / base.max_hp) * 100;

              return (
                <motion.div
                  key={base.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedBase(base)}
                  className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer"
                >
                  <div className={`h-16 bg-gradient-to-br ${BASE_COLORS[base.base_number - 1]} flex items-center justify-center relative`}>
                    <span className="text-white/90 font-bold text-lg">#{base.base_number}</span>
                    {isMyBase && (
                      <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-semibold truncate">{base.name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className={hpPercent > 50 ? "text-green-500" : hpPercent > 20 ? "text-yellow-500" : "text-red-500"}>
                          HP: {base.hp}/{base.max_hp}
                        </span>
                      </div>
                      <Progress value={hpPercent} className="h-1.5" />
                    </div>
                    {base.gang ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-4 h-4">
                          {base.gang.photo_url && <AvatarImage src={base.gang.photo_url} />}
                          <AvatarFallback className="text-[8px]">{base.gang.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground truncate">{base.gang.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Sin dueño</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* GANGS TAB - Create/Join */}
        <TabsContent value="gangs" className="px-4 mt-4 space-y-4">
          <Button onClick={() => setShowCreateGang(true)} variant="ios" size="ios-lg" className="w-full">
            <Plus className="w-5 h-5 mr-2" /> Crear Gang
          </Button>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Gangs disponibles</h3>
            {allGangs.filter(g => !myGangIds.includes(g.id)).map(gang => (
              <div key={gang.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <Avatar className="w-11 h-11">
                  {gang.photo_url && <AvatarImage src={gang.photo_url} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                    {gang.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{gang.name}</p>
                  <p className="text-xs text-muted-foreground">{gang.member_count}/25 miembros</p>
                </div>
                <Button
                  size="sm"
                  variant="ios"
                  onClick={() => handleJoinGang(gang.id)}
                  disabled={(gang.member_count || 0) >= 25}
                >
                  Unirse
                </Button>
              </div>
            ))}
            {allGangs.filter(g => !myGangIds.includes(g.id)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No hay gangs disponibles</p>
            )}
          </div>
        </TabsContent>

        {/* MY GANGS TAB */}
        <TabsContent value="mygangs" className="px-4 mt-4 space-y-3">
          {myGangs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No estás en ninguna gang</p>
            </div>
          ) : myGangs.map(gang => {
            const gangAllies = allies.filter(a => a.gang_id === gang.id);
            const isCreator = gang.created_by === userId;

            return (
              <div key={gang.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <Avatar className="w-14 h-14">
                    {gang.photo_url && <AvatarImage src={gang.photo_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-lg">
                      {gang.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{gang.name}</p>
                      {isCreator && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{gang.member_count}/25 miembros</p>
                    {gang.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gang.description}</p>
                    )}
                  </div>
                </div>

                {/* Allies */}
                <div className="px-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Aliados ({gangAllies.length}/5)</span>
                    {isCreator && gangAllies.length < 5 && (
                      <button onClick={() => setShowAllyPicker(gang.id)} className="text-xs text-primary font-medium">
                        + Añadir
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {gangAllies.map(ally => {
                      const allyGang = allGangs.find(g => g.id === ally.allied_gang_id);
                      return allyGang ? (
                        <span key={ally.id} className="px-2 py-1 bg-muted rounded-full text-[11px]">{allyGang.name}</span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="border-t border-border p-3 flex justify-end">
                  <Button size="sm" variant="ios-destructive" onClick={() => handleLeaveGang(gang.id)}>
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Salir
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="px-4 mt-4 space-y-4">
          <div className="flex gap-2">
            {(["daily", "weekly", "total"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLeaderboardTab(tab)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  leaderboardTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {tab === "daily" ? "Diario" : tab === "weekly" ? "Semanal" : "Total"}
              </button>
            ))}
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Sin datos aún</p>
            </div>
          ) : leaderboard.map((entry, i) => (
            <div key={entry.gang_id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                i === 0 ? "bg-yellow-500 text-white" : i === 1 ? "bg-gray-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <Avatar className="w-10 h-10">
                {entry.gang_photo && <AvatarImage src={entry.gang_photo} />}
                <AvatarFallback>{entry.gang_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{entry.gang_name}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{entry.total_hours.toFixed(1)}h</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> control
                </p>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* MAP TAB */}
        <TabsContent value="map" className="px-4 mt-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" /> Mapa de Territorio
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {bases.map(base => {
                const isMyBase = base.controlling_gang_id ? myGangIds.includes(base.controlling_gang_id) : false;
                return (
                  <div
                    key={base.id}
                    className={`rounded-xl p-3 text-center border-2 transition-colors ${
                      isMyBase
                        ? "border-green-500 bg-green-500/10"
                        : base.gang
                        ? "border-red-500/50 bg-red-500/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full mx-auto mb-2 bg-gradient-to-br ${BASE_COLORS[base.base_number - 1]} flex items-center justify-center`}>
                      <span className="text-white font-bold text-xs">#{base.base_number}</span>
                    </div>
                    <p className="text-[11px] font-semibold truncate">{base.name}</p>
                    {base.gang ? (
                      <>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Avatar className="w-4 h-4">
                            {base.gang.photo_url && <AvatarImage src={base.gang.photo_url} />}
                            <AvatarFallback className="text-[7px]">{base.gang.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{base.gang.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="w-2.5 h-2.5 inline" /> {getControlHours(base.controlled_since)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-1">Libre</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* BASE ACTION DIALOG */}
      <Dialog open={!!selectedBase} onOpenChange={() => setSelectedBase(null)}>
        <DialogContent className="rounded-2xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-center">{selectedBase?.name}</DialogTitle>
            <DialogDescription className="text-center">
              HP: {selectedBase?.hp}/{selectedBase?.max_hp}
            </DialogDescription>
          </DialogHeader>
          {selectedBase && (
            <div className="space-y-3">
              <Progress value={(selectedBase.hp / selectedBase.max_hp) * 100} className="h-3" />
              {selectedBase.gang && (
                <div className="flex items-center gap-2 justify-center">
                  <Avatar className="w-6 h-6">
                    {selectedBase.gang.photo_url && <AvatarImage src={selectedBase.gang.photo_url} />}
                    <AvatarFallback className="text-[9px]">{selectedBase.gang.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Controlada por <b>{selectedBase.gang.name}</b></span>
                </div>
              )}

              {myGangIds.length > 0 ? (
                <div className="flex gap-2">
                  {!myGangIds.includes(selectedBase.controlling_gang_id || "") && (
                    <Button
                      className="flex-1"
                      variant="ios-destructive"
                      onClick={() => handleAttack(selectedBase.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4 mr-1" /> Atacar (-1 HP)</>}
                    </Button>
                  )}
                  {myGangIds.includes(selectedBase.controlling_gang_id || "") && selectedBase.hp < selectedBase.max_hp && (
                    <Button
                      className="flex-1"
                      variant="ios"
                      onClick={() => handleHeal(selectedBase.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 mr-1" /> Curar (+1 HP)</>}
                    </Button>
                  )}
                  {myGangIds.includes(selectedBase.controlling_gang_id || "") && selectedBase.hp >= selectedBase.max_hp && (
                    <p className="text-sm text-green-500 text-center w-full">✅ Tu base está al máximo</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Únete a una gang para participar</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE GANG DIALOG */}
      <Dialog open={showCreateGang} onOpenChange={setShowCreateGang}>
        <DialogContent className="rounded-2xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Crear Gang</DialogTitle>
            <DialogDescription>Crea tu gang y recluta hasta 25 miembros</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre de la gang" value={gangName} onChange={e => setGangName(e.target.value)} maxLength={30} />
            <Textarea placeholder="Descripción (opcional)" value={gangDesc} onChange={e => setGangDesc(e.target.value)} maxLength={200} rows={3} />
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Foto de la gang</label>
              <div className="flex items-center gap-3">
                {gangPhotoPreview ? (
                  <div className="relative">
                    <Avatar className="w-16 h-16">
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
                  <label className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG. Máx 5MB</p>
              </div>
            </div>
            <Button onClick={handleCreateGang} disabled={!gangName.trim() || creating} variant="ios" className="w-full">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Gang"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ALLY PICKER DIALOG */}
      <Dialog open={!!showAllyPicker} onOpenChange={() => setShowAllyPicker(null)}>
        <DialogContent className="rounded-2xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Añadir Aliado</DialogTitle>
            <DialogDescription>Selecciona una gang aliada</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {allGangs
              .filter(g => g.id !== showAllyPicker && !allies.some(a => a.gang_id === showAllyPicker && a.allied_gang_id === g.id))
              .map(g => (
                <button
                  key={g.id}
                  onClick={() => showAllyPicker && handleAddAlly(showAllyPicker, g.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    {g.photo_url && <AvatarImage src={g.photo_url} />}
                    <AvatarFallback>{g.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{g.name}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GangWarsPage;
