import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Shield, Users, Trophy, Map, Plus, LogOut, Heart,
  ChevronRight, Camera, X, Crown, Clock, Target, Loader2,
  Trash2, Award, Gift, Check, XCircle, ShoppingBag, Backpack,
  ArrowUp, Crosshair, Zap, Bot, Castle, Timer, Edit, UserPlus,
  Star, UserCog,
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
  { id: "rewards", icon: Award, label: "Recompensa de Gang", color: "text-amber-500" },
  { id: "shop", icon: ShoppingBag, label: "Tienda de Armas", color: "text-emerald-500" },
  { id: "arsenal", icon: Backpack, label: "Arsenal / Loadout", color: "text-cyan-500" },
  { id: "bots", icon: Bot, label: "Bots", color: "text-indigo-500" },
  { id: "fort", icon: Castle, label: "Fort", color: "text-rose-500" },
  { id: "gangadmin", icon: Crown, label: "Admin Gangs", color: "text-orange-500", adminOnly: true },
] as const;

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-500",
  epic: "text-purple-500",
  legendary: "text-amber-500",
};
const RARITY_BG: Record<string, string> = {
  common: "bg-muted/50",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-amber-500/10",
};
const RARITY_LABELS: Record<string, string> = {
  common: "Común",
  rare: "Rara",
  epic: "Épica",
  legendary: "Legendaria",
};

const AdminClaimRow = ({ claim, gangName, badges, selectedBadge, onSelectBadge, onApprove, onReject, loading }: {
  claim: any; gangName: string; badges: any[]; selectedBadge: string | null;
  onSelectBadge: (id: string) => void; onApprove: () => void; onReject: () => void; loading: boolean;
}) => {
  const [claimProfile, setClaimProfile] = useState<any>(null);
  useEffect(() => {
    supabase.from("profiles").select("display_name, username, avatar_url").eq("id", claim.user_id).single()
      .then(({ data }) => setClaimProfile(data));
  }, [claim.user_id]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9">
          {claimProfile?.avatar_url && <AvatarImage src={claimProfile.avatar_url} />}
          <AvatarFallback className="bg-muted text-xs">{(claimProfile?.display_name || "U")[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{claimProfile?.display_name || claimProfile?.username || "Usuario"}</p>
          <p className="text-[11px] text-muted-foreground">Gang: {gangName}</p>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {badges.map((b: any) => (
          <button
            key={b.id}
            onClick={() => onSelectBadge(b.id)}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedBadge === b.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
            }`}
          >
            {b.emoji} {b.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="ios-sm" variant="ios" onClick={onApprove} disabled={loading} className="flex-1">
          <Check className="w-3.5 h-3.5 mr-1" /> Aprobar
        </Button>
        <Button size="ios-sm" variant="ios-destructive" onClick={onReject} disabled={loading} className="flex-1">
          <XCircle className="w-3.5 h-3.5 mr-1" /> Rechazar
        </Button>
      </div>
    </div>
  );
};

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
  // Rewards
  const [gangRewardClaims, setGangRewardClaims] = useState<any[]>([]);
  const [gangTotalHours, setGangTotalHours] = useState<Record<string, number>>({});
  const [rewardBadges, setRewardBadges] = useState<any[]>([]);
  const [selectedRewardBadge, setSelectedRewardBadge] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  // Weapons
  const [allWeapons, setAllWeapons] = useState<any[]>([]);
  const [myWeapons, setMyWeapons] = useState<any[]>([]);
  const [myLoadout, setMyLoadout] = useState<any[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  // Admin weapon creation
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [weaponName, setWeaponName] = useState("");
  const [weaponDesc, setWeaponDesc] = useState("");
  const [weaponDamage, setWeaponDamage] = useState("1");
  const [weaponPrice, setWeaponPrice] = useState("50");
  const [weaponRarity, setWeaponRarity] = useState("common");
  const [weaponPhotoFile, setWeaponPhotoFile] = useState<File | null>(null);
  const [weaponPhotoPreview, setWeaponPhotoPreview] = useState<string | null>(null);
  const [creatingWeapon, setCreatingWeapon] = useState(false);
  // Bots
  const [myBots, setMyBots] = useState<any[]>([]);
  const [botLoading, setBotLoading] = useState(false);
  const [botName, setBotName] = useState("Bot");
  const [selectedBotGang, setSelectedBotGang] = useState<string | null>(null);
  // Fort
  const [fortEvents, setFortEvents] = useState<any[]>([]);
  const [activeFort, setActiveFort] = useState<any>(null);

  const [weaponActionLoading, setWeaponActionLoading] = useState(false);

  // Gang editing & member management
  const [editingGang, setEditingGang] = useState<any>(null);
  const [editGangName, setEditGangName] = useState("");
  const [editGangDesc, setEditGangDesc] = useState("");
  const [editGangPhotoFile, setEditGangPhotoFile] = useState<File | null>(null);
  const [editGangPhotoPreview, setEditGangPhotoPreview] = useState<string | null>(null);
  const [editGangLoading, setEditGangLoading] = useState(false);
  const [managingGang, setManagingGang] = useState<any>(null);
  const [gangMembers, setGangMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newMemberRank, setNewMemberRank] = useState<Record<string, string>>({});

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

    // Load reward claims
    const { data: claimsData } = await supabase
      .from("gang_reward_claims" as any)
      .select("*");
    setGangRewardClaims(claimsData as any[] || []);

    // Load badges for reward selection
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("*")
      .eq("is_active", true);
    setRewardBadges(badgesData || []);

    // Calculate total hours per gang
    const { data: historyAll } = await supabase
      .from("base_control_history" as any)
      .select("gang_id, started_at, ended_at");
    const now = new Date();
    const hoursMap: Record<string, number> = {};
    (historyAll as any[] || []).forEach((h: any) => {
      const start = new Date(h.started_at);
      const end = h.ended_at ? new Date(h.ended_at) : now;
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      hoursMap[h.gang_id] = (hoursMap[h.gang_id] || 0) + hours;
    });
    setGangTotalHours(hoursMap);

    // Load weapons
    const { data: weaponsData } = await supabase.from("weapons" as any).select("*").order("created_at", { ascending: false });
    setAllWeapons(weaponsData as any[] || []);

    const { data: myWeaponsData } = await supabase.from("user_weapons" as any).select("*").eq("user_id", user.id);
    setMyWeapons(myWeaponsData as any[] || []);

    const { data: loadoutData } = await supabase.from("weapon_loadout" as any).select("*").eq("user_id", user.id);
    setMyLoadout(loadoutData as any[] || []);

    const { data: coinsData } = await supabase.from("user_coins").select("balance").eq("user_id", user.id).single();
    setUserCoins(coinsData?.balance || 0);

    // Load bots
    const { data: botsData } = await supabase.from("user_bots" as any).select("*").eq("user_id", user.id);
    setMyBots(botsData as any[] || []);

    // Load fort events (last 10)
    const { data: fortData } = await supabase.from("fort_events" as any).select("*").order("created_at", { ascending: false }).limit(10);
    setFortEvents(fortData as any[] || []);
    const active = (fortData as any[] || []).find((f: any) => f.status === "active");
    setActiveFort(active || null);

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
        toast({ title: "🏴 ¡Base capturada!", description: `Daño: ${result.damage || 1}` });
      } else if (result.defender_killed) {
        toast({ title: "💀 ¡Defensor eliminado!", description: `${result.defender_name} fuera 4s. Daño: ${result.damage || 1}` });
      } else if (result.hit_base) {
        toast({ title: "⚔️ ¡Golpe a la base!", description: `HP: ${result.new_hp}/5 · Daño: ${result.damage || 1}` });
      } else {
        toast({ title: "⚔️ ¡Golpe al defensor!", description: `${result.defender_name}: ${result.defender_hp}/5 HP · Daño: ${result.damage || 1}` });
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
              {activeSection === "rewards" && renderRewards()}
              {activeSection === "shop" && renderShop()}
              {activeSection === "arsenal" && renderArsenal()}
              {activeSection === "bots" && renderBots()}
              {activeSection === "fort" && renderFort()}
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
          {/* NPC Gangs */}
          {allGangs.filter(g => (g as any).is_npc).length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">🤖 Gangs NPC (IA)</h3>
              <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
                {allGangs.filter(g => (g as any).is_npc).map(gang => (
                  <div key={gang.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar className="w-11 h-11">
                      {gang.photo_url && <AvatarImage src={gang.photo_url} />}
                      <AvatarFallback className="bg-indigo-500/10 text-indigo-500 font-bold">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-[15px] truncate">{gang.name}</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/15 text-indigo-500 rounded-full font-bold">NPC</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{gang.member_count}/25 · Controlada por IA</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Gangs disponibles</h3>
          {allGangs.filter(g => !myGangIds.includes(g.id) && !(g as any).is_npc).length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay gangs disponibles</p>
            </div>
          ) : (
            <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
              {allGangs.filter(g => !myGangIds.includes(g.id) && !(g as any).is_npc).map(gang => (
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
                {isCreator && (
                  <Button size="ios-sm" variant="ios-ghost" onClick={() => openEditGang(gang)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Manage members button */}
              <div className="px-4 pb-2">
                <Button
                  size="ios-sm"
                  variant="ios-secondary"
                  className="w-full text-xs"
                  onClick={() => openManageMembers(gang)}
                >
                  <UserCog className="w-3.5 h-3.5 mr-1" /> Gestionar Miembros
                </Button>
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

  // ─── GANG EDIT HANDLERS ───
  function openEditGang(gang: any) {
    setEditingGang(gang);
    setEditGangName(gang.name);
    setEditGangDesc(gang.description || "");
    setEditGangPhotoPreview(gang.photo_url || null);
    setEditGangPhotoFile(null);
  }

  function handleEditPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setEditGangPhotoFile(file);
    setEditGangPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSaveGangEdit() {
    if (!editingGang || !userId) return;
    setEditGangLoading(true);

    let photoUrl = editingGang.photo_url;
    if (editGangPhotoFile) {
      const ext = editGangPhotoFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("gang-photos").upload(path, editGangPhotoFile);
      if (uploadError) {
        toast({ title: "Error subiendo foto", description: uploadError.message, variant: "destructive" });
        setEditGangLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("gang-photos").getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("gangs" as any)
      .update({
        name: editGangName.trim(),
        description: editGangDesc.trim() || null,
        photo_url: photoUrl,
      })
      .eq("id", editingGang.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Gang actualizada" });
      setEditingGang(null);
      loadData();
    }
    setEditGangLoading(false);
  }

  async function openManageMembers(gang: any) {
    setManagingGang(gang);
    setMembersLoading(true);
    const { data: members } = await supabase
      .from("gang_members" as any)
      .select("*")
      .eq("gang_id", gang.id);

    const memberList = members as any[] || [];
    // Fetch profiles for non-bot members
    const userIds = memberList.filter(m => !m.is_bot).map(m => m.user_id);
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);
      (profilesData || []).forEach((p: any) => { profiles[p.id] = p; });
    }

    const enriched = memberList.map(m => ({
      ...m,
      profile: m.is_bot ? null : profiles[m.user_id] || null,
    }));
    setGangMembers(enriched);

    // Initialize rank map
    const rankMap: Record<string, string> = {};
    enriched.forEach(m => { rankMap[m.id] = m.rank || "member"; });
    setNewMemberRank(rankMap);

    setMembersLoading(false);
  }

  async function handleTransferLeader(memberId: string, newLeaderUserId: string) {
    if (!managingGang || !userId) return;
    setMembersLoading(true);

    // Remove current leader
    await supabase
      .from("gang_members" as any)
      .update({ is_leader: false })
      .eq("gang_id", managingGang.id)
      .eq("user_id", userId);

    // Set new leader
    await supabase
      .from("gang_members" as any)
      .update({ is_leader: true })
      .eq("id", memberId);

    // Transfer gang ownership
    await supabase
      .from("gangs" as any)
      .update({ created_by: newLeaderUserId })
      .eq("id", managingGang.id);

    toast({ title: "👑 Líder transferido" });
    setManagingGang(null);
    loadData();
  }

  async function handleUpdateMemberRank(memberId: string, rank: string) {
    const { error } = await supabase
      .from("gang_members" as any)
      .update({ rank })
      .eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rango actualizado" });
      setNewMemberRank(prev => ({ ...prev, [memberId]: rank }));
    }
  }

  async function handleKickMember(memberId: string) {
    const { error } = await supabase.from("gang_members" as any).delete().eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Miembro expulsado" });
      setGangMembers(prev => prev.filter(m => m.id !== memberId));
    }
  }

  async function handleCreateBotMember(gangId: string) {
    if (!userId) return;
    setMembersLoading(true);
    const memberCount = gangMembers.length;
    if (memberCount >= 25) {
      toast({ title: "Gang llena", description: "Máximo 25 miembros", variant: "destructive" });
      setMembersLoading(false);
      return;
    }

    const botNumber = gangMembers.filter(m => m.is_bot).length + 1;
    const { error } = await supabase
      .from("gang_members" as any)
      .insert({ gang_id: gangId, user_id: userId, is_bot: true, is_leader: false, rank: "bot" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `🤖 Bot #${botNumber} creado` });
      if (managingGang) openManageMembers(managingGang);
      loadData();
    }
    setMembersLoading(false);
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

  const handleClaimReward = async (gangId: string, milestoneHours: number = 2000) => {
    if (!userId) return;
    setClaimLoading(true);
    const { error } = await supabase
      .from("gang_reward_claims" as any)
      .insert({ gang_id: gangId, user_id: userId, status: "pending", milestone_hours: milestoneHours });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🎖️ ¡Solicitud enviada!", description: "Un administrador revisará tu solicitud" });
      loadData();
    }
    setClaimLoading(false);
  };

  const handleApproveClaim = async (claimId: string, badgeId: string | null) => {
    if (!badgeId) {
      toast({ title: "Selecciona una medalla", variant: "destructive" });
      return;
    }
    setClaimLoading(true);
    const { error } = await supabase
      .from("gang_reward_claims" as any)
      .update({ status: "approved", badge_id: badgeId, granted_by: userId })
      .eq("id", claimId);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Also equip the badge to the user
      const claim = gangRewardClaims.find((c: any) => c.id === claimId);
      if (claim) {
        await supabase.from("user_equipped_badges").insert({ 
          user_id: claim.user_id, 
          badge_id: badgeId 
        });
      }
      toast({ title: "✅ Recompensa aprobada" });
      loadData();
    }
    setClaimLoading(false);
  };

  const handleRejectClaim = async (claimId: string) => {
    setClaimLoading(true);
    const { error } = await supabase
      .from("gang_reward_claims" as any)
      .update({ status: "rejected" })
      .eq("id", claimId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitud rechazada" });
      loadData();
    }
    setClaimLoading(false);
  };

  function renderRewards() {
    const MILESTONES = [
      { hours: 2000, maxClaims: 13, emoji: "🏆", label: "Medalla Especial", desc: "13 miembros conseguirán una medalla especial.", color: "from-amber-500 to-yellow-500", type: "badge" },
      { hours: 4000, maxClaims: 0, emoji: "🏠", label: "Página de Gang (1 Habitación)", desc: "Desbloquea una página especial con la temática de tu gang.", color: "from-blue-500 to-cyan-500", type: "room" },
      { hours: 6000, maxClaims: 0, emoji: "🎖️", label: "Insignia de Habitación", desc: "Una insignia agarrable en la habitación, solo para miembros con el tag.", color: "from-purple-500 to-pink-500", type: "room_badge" },
      { hours: 10000, maxClaims: 0, emoji: "🏰", label: "Habitación Especial (2 Habitaciones)", desc: "Desbloquea una habitación adicional especial para tu gang.", color: "from-emerald-500 to-green-500", type: "room" },
      { hours: 15000, maxClaims: 23, emoji: "⭐", label: "Nueva Insignia Exclusiva", desc: "23 miembros recibirán una nueva insignia exclusiva.", color: "from-rose-500 to-red-500", type: "badge" },
      { hours: 22500, maxClaims: 0, emoji: "👑", label: "2 Habitaciones + Color Animado", desc: "2 habitaciones adicionales y un color de nombre personalizado animado para todos los miembros.", color: "from-yellow-500 to-orange-500", type: "ultimate" },
    ];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="liquid-glass-strong rounded-2xl p-5 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 mx-auto flex items-center justify-center shadow-lg">
            <Award className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold">Recompensas de Gang</h3>
          <p className="text-sm text-muted-foreground">
            Acumula horas de control territorial para desbloquear recompensas épicas para tu gang.
          </p>
        </div>

        {/* Milestone roadmap */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Hitos de Recompensas</h4>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border/50" />
            
            <div className="space-y-3">
              {MILESTONES.map((ms, i) => {
                // Check if any of user's gangs reached this milestone
                const bestGang = myGangs.reduce<{ gang: typeof myGangs[0] | null; hours: number }>((best, g) => {
                  const h = gangTotalHours[g.id] || 0;
                  return h > best.hours ? { gang: g, hours: h } : best;
                }, { gang: null, hours: 0 });
                
                const reached = bestGang.hours >= ms.hours;
                const progressPercent = Math.min(100, (bestGang.hours / ms.hours) * 100);
                
                return (
                  <div key={ms.hours} className={`relative pl-14 ${!reached ? "opacity-60" : ""}`}>
                    {/* Circle on timeline */}
                    <div className={`absolute left-3.5 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                      reached 
                        ? `bg-gradient-to-br ${ms.color} border-transparent text-white shadow-md` 
                        : "bg-background border-border"
                    }`}>
                      {reached ? "✓" : i + 1}
                    </div>

                    <div className={`liquid-glass rounded-2xl overflow-hidden ${reached ? "ring-1 ring-primary/20" : ""}`}>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{ms.emoji}</span>
                              <h5 className="font-bold text-[14px]">{ms.label}</h5>
                            </div>
                            <p className="text-[12px] text-muted-foreground mt-0.5">{ms.desc}</p>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                            reached ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
                          }`}>
                            {ms.hours.toLocaleString()}h
                          </div>
                        </div>

                        {/* Progress bar for best gang */}
                        {bestGang.gang && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground truncate">{bestGang.gang.name}</span>
                              <span className="text-muted-foreground">{bestGang.hours.toFixed(1)}h / {ms.hours.toLocaleString()}h</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${ms.color} transition-all`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {reached && <div className="text-[11px] font-semibold text-green-600">✅ ¡Desbloqueado!</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Per-gang detailed progress with claims */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Progreso por Gang</h4>
          
          {myGangs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">Únete a una gang primero</p>
            </div>
          ) : (
            myGangs.map(gang => {
              const totalHours = Math.round((gangTotalHours[gang.id] || 0) * 100) / 100;
              const gangClaims = gangRewardClaims.filter((c: any) => c.gang_id === gang.id);

              // Find all claimable milestones for this gang
              const claimableMilestones = MILESTONES.filter(ms => ms.maxClaims > 0 && totalHours >= ms.hours);
              const nextMilestone = MILESTONES.find(ms => totalHours < ms.hours) || MILESTONES[MILESTONES.length - 1];
              const overallProgress = Math.min(100, (totalHours / nextMilestone.hours) * 100);

              return (
                <div key={gang.id} className="liquid-glass rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-2 ring-amber-500/20">
                      {gang.photo_url && <AvatarImage src={gang.photo_url} />}
                      <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-lg">
                        {gang.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] truncate">{gang.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalHours.toFixed(1)}h — Siguiente: {nextMilestone.hours.toLocaleString()}h
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg">{nextMilestone.emoji}</span>
                    </div>
                  </div>

                  {/* Overall progress */}
                  <div className="px-4 pb-2">
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Claimable milestones */}
                  {claimableMilestones.length > 0 && (
                    <div className="border-t border-border/50 p-4 space-y-3">
                      {claimableMilestones.map(ms => {
                        const msClaims = gangClaims.filter((c: any) => (c.milestone_hours || 2000) === ms.hours);
                        const myClaim = msClaims.find((c: any) => c.user_id === userId);
                        const approvedClaims = msClaims.filter((c: any) => c.status === "approved").length;
                        const canClaim = !myClaim && approvedClaims < ms.maxClaims;

                        return (
                          <div key={ms.hours} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium flex items-center gap-1.5">
                                <span>{ms.emoji}</span> {ms.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                <Gift className="w-3 h-3 inline mr-0.5" />
                                {approvedClaims}/{ms.maxClaims}
                              </span>
                            </div>

                            {myClaim ? (
                              <div className={`rounded-xl px-3 py-2 text-center text-[12px] font-medium ${
                                myClaim.status === "approved" 
                                  ? "bg-green-500/10 text-green-600" 
                                  : myClaim.status === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}>
                                {myClaim.status === "approved" && "✅ Recompensa recibida"}
                                {myClaim.status === "pending" && "⏳ Solicitud pendiente"}
                                {myClaim.status === "rejected" && "❌ Solicitud rechazada"}
                              </div>
                            ) : canClaim ? (
                              <Button
                                onClick={() => handleClaimReward(gang.id, ms.hours)}
                                disabled={claimLoading}
                                variant="ios"
                                size="ios-sm"
                                className={`w-full bg-gradient-to-r ${ms.color} text-white hover:opacity-90`}
                              >
                                {claimLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Award className="w-3.5 h-3.5 mr-1" /> Reclamar</>}
                              </Button>
                            ) : approvedClaims >= ms.maxClaims ? (
                              <div className="rounded-xl px-3 py-1.5 text-center text-[11px] font-medium bg-muted text-muted-foreground">
                                Ya se reclamaron las {ms.maxClaims} recompensas
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Non-claimable unlocked milestones (rooms, etc.) */}
                  {MILESTONES.filter(ms => ms.maxClaims === 0 && totalHours >= ms.hours).length > 0 && (
                    <div className="border-t border-border/50 p-4">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-2">Desbloqueados</p>
                      <div className="flex flex-wrap gap-2">
                        {MILESTONES.filter(ms => ms.maxClaims === 0 && totalHours >= ms.hours).map(ms => (
                          <div key={ms.hours} className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${ms.color} text-white text-[11px] font-bold flex items-center gap-1`}>
                            <span>{ms.emoji}</span> {ms.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Admin panel: pending claims */}
        {isAdmin && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Panel Admin — Solicitudes
            </h4>
            
            {gangRewardClaims.filter((c: any) => c.status === "pending").length === 0 ? (
              <div className="liquid-glass rounded-2xl p-6 text-center">
                <Check className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
                {gangRewardClaims
                  .filter((c: any) => c.status === "pending")
                  .map((claim: any) => {
                    const gang = allGangs.find(g => g.id === claim.gang_id);
                    const milestone = MILESTONES.find(ms => ms.hours === (claim.milestone_hours || 2000));
                    return (
                      <AdminClaimRow
                        key={claim.id}
                        claim={claim}
                        gangName={`${gang?.name || "Desconocida"} — ${milestone?.emoji || "🏆"} ${(claim.milestone_hours || 2000).toLocaleString()}h`}
                        badges={rewardBadges}
                        selectedBadge={selectedRewardBadge}
                        onSelectBadge={setSelectedRewardBadge}
                        onApprove={() => handleApproveClaim(claim.id, selectedRewardBadge)}
                        onReject={() => handleRejectClaim(claim.id)}
                        loading={claimLoading}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── WEAPON HANDLERS (hoisted) ───
  function handleWeaponPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setWeaponPhotoFile(file);
    setWeaponPhotoPreview(URL.createObjectURL(file));
  }

  async function handleCreateWeapon() {
    if (!weaponName.trim() || !userId) return;
    setCreatingWeapon(true);
    let imageUrl: string | null = null;
    if (weaponPhotoFile) {
      const ext = weaponPhotoFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("weapon-images").upload(path, weaponPhotoFile);
      if (upErr) { toast({ title: "Error subiendo imagen", variant: "destructive" }); setCreatingWeapon(false); return; }
      const { data: urlData } = supabase.storage.from("weapon-images").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }
    const { error } = await supabase.from("weapons" as any).insert({
      name: weaponName.trim(), description: weaponDesc.trim() || null,
      image_url: imageUrl, base_damage: parseInt(weaponDamage) || 1,
      price: parseInt(weaponPrice) || 50, rarity: weaponRarity, created_by: userId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "⚔️ Arma creada" });
      setShowCreateWeapon(false);
      setWeaponName(""); setWeaponDesc(""); setWeaponDamage("1"); setWeaponPrice("50");
      setWeaponRarity("common"); setWeaponPhotoFile(null); setWeaponPhotoPreview(null);
      loadData();
    }
    setCreatingWeapon(false);
  }

  async function handleBuyWeapon(weaponId: string) {
    setWeaponActionLoading(true);
    const { data, error } = await supabase.rpc("buy_weapon", { p_weapon_id: weaponId } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      const r = data as any;
      if (!r.success) toast({ title: "No se pudo comprar", description: r.message, variant: "destructive" });
      else { toast({ title: "🎉 ¡Arma comprada!" }); loadData(); }
    }
    setWeaponActionLoading(false);
  }

  async function handleUpgradeWeapon(userWeaponId: string) {
    setWeaponActionLoading(true);
    const { data, error } = await supabase.rpc("upgrade_weapon", { p_user_weapon_id: userWeaponId } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      const r = data as any;
      if (!r.success) toast({ title: "No se pudo mejorar", description: r.message, variant: "destructive" });
      else { toast({ title: `⬆️ ¡Nivel ${r.new_level}!`, description: `Costó ${r.cost} monedas` }); loadData(); }
    }
    setWeaponActionLoading(false);
  }

  async function handleEquipWeapon(userWeaponId: string) {
    const usedSlots = myLoadout.map((l: any) => l.slot_number);
    const freeSlot = [1, 2, 3, 4].find(s => !usedSlots.includes(s));
    if (!freeSlot) { toast({ title: "Loadout lleno", description: "Máximo 4 armas. Desequipa una primero.", variant: "destructive" }); return; }
    setWeaponActionLoading(true);
    const { error } = await supabase.from("weapon_loadout" as any).insert({ user_id: userId, user_weapon_id: userWeaponId, slot_number: freeSlot });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Arma equipada en slot " + freeSlot }); loadData(); }
    setWeaponActionLoading(false);
  }

  async function handleUnequipWeapon(loadoutId: string) {
    setWeaponActionLoading(true);
    const { error } = await supabase.from("weapon_loadout" as any).delete().eq("id", loadoutId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Arma desequipada" }); loadData(); }
    setWeaponActionLoading(false);
  }

  async function handleDeleteWeapon(weaponId: string) {
    const { error } = await supabase.from("weapons" as any).delete().eq("id", weaponId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Arma eliminada" }); loadData(); }
  }

  // ─── RENDER SHOP ───
  function renderShop() {
    return (
      <div className="space-y-4">
        {/* Admin: create weapon */}
        {isAdmin && (
          <Button onClick={() => setShowCreateWeapon(true)} variant="ios" size="ios-lg" className="w-full">
            <Plus className="w-5 h-5 mr-2" /> Crear Arma
          </Button>
        )}

        {/* Coins display */}
        <div className="liquid-glass rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Tus monedas</span>
          <span className="text-lg font-bold">🪙 {userCoins}</span>
        </div>

        {allWeapons.length === 0 ? (
          <div className="text-center py-16">
            <Swords className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay armas en la tienda</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-1">Crea la primera arma</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {allWeapons.map((weapon: any) => {
              const owned = myWeapons.some((w: any) => w.weapon_id === weapon.id);
              const canAfford = userCoins >= weapon.price;
              return (
                <div key={weapon.id} className={`liquid-glass rounded-2xl overflow-hidden ${RARITY_BG[weapon.rarity] || ""}`}>
                  {weapon.image_url ? (
                    <div className="h-28 bg-muted/30 flex items-center justify-center overflow-hidden relative">
                      <img src={weapon.image_url} alt={weapon.name} className="w-full h-full object-cover" />
                      {isAdmin && (
                        <button onClick={() => handleDeleteWeapon(weapon.id)} className="absolute top-2 left-2 w-5 h-5 bg-destructive/80 rounded-full flex items-center justify-center">
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-28 bg-muted/30 flex items-center justify-center relative">
                      <Swords className="w-10 h-10 text-muted-foreground/30" />
                      {isAdmin && (
                        <button onClick={() => handleDeleteWeapon(weapon.id)} className="absolute top-2 left-2 w-5 h-5 bg-destructive/80 rounded-full flex items-center justify-center">
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="p-3 space-y-1.5">
                    <p className="text-sm font-bold truncate">{weapon.name}</p>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`font-semibold ${RARITY_COLORS[weapon.rarity]}`}>{RARITY_LABELS[weapon.rarity]}</span>
                      <span className="text-destructive font-bold flex items-center gap-0.5"><Zap className="w-3 h-3" />{weapon.base_damage}</span>
                    </div>
                    {weapon.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{weapon.description}</p>}
                    {owned ? (
                      <div className="text-[11px] font-semibold text-green-600 text-center bg-green-500/10 rounded-lg py-1.5">✅ En tu arsenal</div>
                    ) : (
                      <Button
                        size="ios-sm"
                        variant="ios"
                        className="w-full text-xs"
                        disabled={!canAfford || weaponActionLoading}
                        onClick={() => handleBuyWeapon(weapon.id)}
                      >
                        {weaponActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>🪙 {weapon.price}</>}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER ARSENAL / LOADOUT ───
  function renderArsenal() {
    const loadoutWeaponIds = myLoadout.map((l: any) => l.user_weapon_id);

    // Calculate total loadout damage
    const totalDamage = myLoadout.reduce((sum: number, l: any) => {
      const uw = myWeapons.find((w: any) => w.id === l.user_weapon_id);
      if (!uw) return sum;
      const weapon = allWeapons.find((w: any) => w.id === uw.weapon_id);
      if (!weapon) return sum;
      return sum + weapon.base_damage + (uw.upgrade_level - 1);
    }, 0);

    return (
      <div className="space-y-4">
        {/* Loadout */}
        <div className="liquid-glass-strong rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2"><Crosshair className="w-4 h-4 text-primary" /> Loadout Activo</h3>
            <span className="text-xs font-bold text-destructive"><Zap className="w-3 h-3 inline" /> Daño total: {totalDamage || 1}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(slot => {
              const loadoutItem = myLoadout.find((l: any) => l.slot_number === slot);
              const uw = loadoutItem ? myWeapons.find((w: any) => w.id === loadoutItem.user_weapon_id) : null;
              const weapon = uw ? allWeapons.find((w: any) => w.id === uw.weapon_id) : null;
              return (
                <div key={slot} className="liquid-glass rounded-xl aspect-square flex flex-col items-center justify-center p-1 relative">
                  {weapon ? (
                    <>
                      {weapon.image_url ? (
                        <img src={weapon.image_url} alt={weapon.name} className="w-full h-full object-cover rounded-lg absolute inset-0" />
                      ) : (
                        <Swords className="w-6 h-6 text-muted-foreground/50" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-1 py-0.5 rounded-b-xl">
                        <p className="text-[9px] font-bold truncate text-center">{weapon.name}</p>
                        <p className="text-[8px] text-destructive text-center font-bold">Nv{uw.upgrade_level} · {weapon.base_damage + (uw.upgrade_level - 1)}dmg</p>
                      </div>
                      <button
                        onClick={() => handleUnequipWeapon(loadoutItem.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-muted-foreground/30 text-lg font-bold">{slot}</div>
                      <p className="text-[8px] text-muted-foreground">Vacío</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coins */}
        <div className="liquid-glass rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Tus monedas</span>
          <span className="text-lg font-bold">🪙 {userCoins}</span>
        </div>

        {/* Inventory */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Tu Arsenal ({myWeapons.length} armas)</h4>
          {myWeapons.length === 0 ? (
            <div className="text-center py-12">
              <Backpack className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No tienes armas</p>
              <p className="text-xs text-muted-foreground mt-1">Compra en la tienda</p>
            </div>
          ) : (
            <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
              {myWeapons.map((uw: any) => {
                const weapon = allWeapons.find((w: any) => w.id === uw.weapon_id);
                if (!weapon) return null;
                const isEquipped = loadoutWeaponIds.includes(uw.id);
                const currentDamage = weapon.base_damage + (uw.upgrade_level - 1);
                const upgradeCost = uw.upgrade_level * 30;
                const canUpgrade = uw.upgrade_level < 10 && userCoins >= upgradeCost;

                return (
                  <div key={uw.id} className="flex items-center gap-3 p-3">
                    <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${RARITY_BG[weapon.rarity]}`}>
                      {weapon.image_url ? (
                        <img src={weapon.image_url} alt={weapon.name} className="w-full h-full object-cover" />
                      ) : (
                        <Swords className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{weapon.name}</p>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className={`font-medium ${RARITY_COLORS[weapon.rarity]}`}>{RARITY_LABELS[weapon.rarity]}</span>
                        <span className="text-destructive font-bold"><Zap className="w-3 h-3 inline" />{currentDamage}</span>
                        <span className="text-muted-foreground">Nv.{uw.upgrade_level}/10</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!isEquipped ? (
                        <Button size="ios-sm" variant="ios" className="text-[10px] h-7 px-2" onClick={() => handleEquipWeapon(uw.id)} disabled={weaponActionLoading}>
                          <Crosshair className="w-3 h-3 mr-0.5" /> Equipar
                        </Button>
                      ) : (
                        <span className="text-[10px] font-semibold text-green-600 text-center">Equipada</span>
                      )}
                      {uw.upgrade_level < 10 && (
                        <Button size="ios-sm" variant="ios-secondary" className="text-[10px] h-7 px-2" onClick={() => handleUpgradeWeapon(uw.id)} disabled={!canUpgrade || weaponActionLoading}>
                          <ArrowUp className="w-3 h-3 mr-0.5" /> 🪙{upgradeCost}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── BOT HANDLERS (hoisted) ───
  async function handleBuyBot() {
    const gangId = selectedBotGang || (myGangIds.length > 0 ? myGangIds[0] : null);
    if (!gangId) { toast({ title: "Selecciona una gang", variant: "destructive" }); return; }
    setBotLoading(true);
    const { data, error } = await supabase.rpc("buy_bot", { p_gang_id: gangId, p_bot_name: botName.trim() || "Bot" } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      const r = data as any;
      if (!r.success) toast({ title: "No se pudo comprar", description: r.message, variant: "destructive" });
      else { toast({ title: "🤖 ¡Bot comprado!" }); setBotName("Bot"); loadData(); }
    }
    setBotLoading(false);
  }

  async function handleAddHelperBot() {
    const gangId = selectedBotGang || (myGangIds.length > 0 ? myGangIds[0] : null);
    if (!gangId) { toast({ title: "Selecciona una gang", variant: "destructive" }); return; }
    setBotLoading(true);
    const { data, error } = await supabase.rpc("add_helper_bot", { p_gang_id: gangId, p_bot_name: botName.trim() || "Bot Helper" } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      const r = data as any;
      if (!r.success) toast({ title: "No se pudo añadir", description: r.message, variant: "destructive" });
      else { toast({ title: "🤖 ¡Bot añadido a tu gang!" }); setBotName("Bot"); loadData(); }
    }
    setBotLoading(false);
  }

  async function handleDeleteBot(botId: string) {
    const { error } = await supabase.from("user_bots" as any).delete().eq("id", botId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Bot eliminado" }); loadData(); }
  }

  async function handleToggleBot(botId: string, isActive: boolean) {
    const { error } = await supabase.from("user_bots" as any).update({ is_active: !isActive }).eq("id", botId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: isActive ? "Bot desactivado" : "Bot activado" }); loadData(); }
  }

  async function handleTriggerBotAttacks() {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bot-actions", {
        body: { action: "bot_attacks" },
      });
      if (error) throw error;
      toast({ title: "⚔️ Bots atacaron", description: `${data?.attacks || 0} ataques realizados` });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBotLoading(false);
  }

  async function handleCreateNpcGangs() {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bot-actions", {
        body: { action: "create_npc_gangs" },
      });
      if (error) throw error;
      toast({ title: "🤖 Gangs NPC", description: data?.message || "Procesado" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBotLoading(false);
  }

  async function handleNpcAttacks() {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bot-actions", {
        body: { action: "npc_attacks" },
      });
      if (error) throw error;
      toast({ title: "🤖 NPCs atacaron", description: `${data?.attacks || 0} ataques` });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBotLoading(false);
  }

  async function handleFullCycle() {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bot-actions", {
        body: { action: "full_cycle" },
      });
      if (error) throw error;
      toast({ title: "⚡ Ciclo completo", description: "Gangs NPC + ataques + Fort procesados" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBotLoading(false);
  }

  async function handleCheckFort() {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bot-actions", {
        body: { action: "check_fort" },
      });
      if (error) throw error;
      toast({ title: "🏰 Fort", description: data?.message || "Procesado" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBotLoading(false);
  }

  // ─── RENDER BOTS ───
  function renderBots() {
    const activeBots = myBots.filter((b: any) => b.is_active);
    const npcGangs = allGangs.filter((g: any) => (g as any).is_npc);
    return (
      <div className="space-y-4">
        {/* Buy bot section */}
        <div className="liquid-glass-strong rounded-2xl p-5 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mx-auto flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold">Bots de Combate</h3>
          <p className="text-sm text-muted-foreground">
            Compra bots por <span className="font-bold text-foreground">🪙 50</span> cada uno.
            Atacan bases enemigas y ayudan en tu gang. Máximo 10 bots + 5 helpers por gang.
          </p>
        </div>

        {/* Coins */}
        <div className="liquid-glass rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Tus monedas</span>
          <span className="text-lg font-bold">🪙 {userCoins}</span>
        </div>

        {/* Buy forms */}
        {myGangIds.length > 0 && (
          <div className="liquid-glass rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-bold">Comprar Bot</h4>
            <Input
              placeholder="Nombre del bot"
              value={botName}
              onChange={e => setBotName(e.target.value)}
              maxLength={20}
              className="rounded-xl bg-muted/50 border-0 h-11"
            />
            {myGangs.length > 1 && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Gang del bot</label>
                <div className="flex gap-1.5 overflow-x-auto">
                  {myGangs.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedBotGang(g.id)}
                      className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        (selectedBotGang || myGangIds[0]) === g.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {myBots.length < 10 && (
                <Button onClick={handleBuyBot} disabled={botLoading || userCoins < 50} variant="ios" size="ios-md" className="w-full">
                  {botLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🤖 Bot Ataque · 🪙50</>}
                </Button>
              )}
              <Button onClick={handleAddHelperBot} disabled={botLoading || userCoins < 50} variant="ios-secondary" size="ios-md" className="w-full">
                {botLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🛡️ Bot Helper · 🪙50</>}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Bot Ataque: ataca bases enemigas · Bot Helper: se une a tu gang como miembro
            </p>
          </div>
        )}

        {myBots.length >= 10 && (
          <div className="liquid-glass rounded-2xl p-3 text-center text-sm text-muted-foreground">
            Máximo de 10 bots de ataque alcanzado
          </div>
        )}

        {/* NPC Gangs Info */}
        {npcGangs.length > 0 && (
          <div className="liquid-glass rounded-2xl p-4 space-y-2">
            <h4 className="text-sm font-bold flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-500" /> Gangs NPC Activas</h4>
            <div className="space-y-1.5">
              {npcGangs.map((g: any) => (
                <div key={g.id} className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-xl">
                  <Bot className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-medium truncate">{g.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{g.member_count} miembros</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Las gangs NPC atacan bases automáticamente
            </p>
          </div>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div className="liquid-glass rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Panel Admin</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleCreateNpcGangs} disabled={botLoading} variant="ios" size="ios-sm" className="text-xs">
                {botLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>🤖 Crear Gangs NPC</>}
              </Button>
              <Button onClick={handleNpcAttacks} disabled={botLoading} variant="ios" size="ios-sm" className="text-xs">
                {botLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>⚔️ NPC Atacar</>}
              </Button>
              <Button onClick={handleTriggerBotAttacks} disabled={botLoading} variant="ios" size="ios-sm" className="text-xs">
                {botLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>🤖 Bots Atacar</>}
              </Button>
              <Button onClick={handleFullCycle} disabled={botLoading} variant="ios-secondary" size="ios-sm" className="text-xs">
                {botLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <>⚡ Ciclo Completo</>}
              </Button>
            </div>
          </div>
        )}

        {/* My bots */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Tus Bots ({myBots.length}/10) · {activeBots.length} activos
          </h4>
          {myBots.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No tienes bots</p>
            </div>
          ) : (
            <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-border/50">
              {myBots.map((bot: any) => {
                const gang = allGangs.find(g => g.id === bot.gang_id);
                return (
                  <div key={bot.id} className="flex items-center gap-3 p-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bot.is_active ? "bg-indigo-500/20" : "bg-muted/50"}`}>
                      <Bot className={`w-5 h-5 ${bot.is_active ? "text-indigo-500" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{bot.bot_name}</p>
                      <p className="text-[11px] text-muted-foreground">{gang?.name || "Sin gang"} · {bot.is_active ? "🟢 Activo" : "🔴 Inactivo"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="ios-sm" variant="ios-secondary" className="text-[10px] h-7 px-2" onClick={() => handleToggleBot(bot.id, bot.is_active)}>
                        {bot.is_active ? "Pausar" : "Activar"}
                      </Button>
                      <button onClick={() => handleDeleteBot(bot.id)} className="w-7 h-7 bg-destructive/10 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER FORT ───
  function renderFort() {
    const recentForts = fortEvents.filter((f: any) => f.status === "ended").slice(0, 5);

    return (
      <div className="space-y-4">
        {/* Fort info */}
        <div className="liquid-glass-strong rounded-2xl p-5 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 mx-auto flex items-center justify-center shadow-lg">
            <Castle className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold">Fort</h3>
          <p className="text-sm text-muted-foreground">
            Cada <span className="font-bold text-foreground">2 horas</span> se activa un evento de 30 minutos. 
            Las 3 gangs con más tiempo de control durante el Fort ganan reconocimiento.
          </p>
        </div>

        {/* Active Fort */}
        {activeFort ? (
          <div className="liquid-glass-strong rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/30 flex items-center justify-center animate-pulse">
                <Castle className="w-5 h-5 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[15px]">🏰 Fort Activo</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  Iniciado: {new Date(activeFort.started_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-rose-500">
                  {Math.max(0, 30 - Math.round((Date.now() - new Date(activeFort.started_at).getTime()) / (1000 * 60)))}
                </p>
                <p className="text-[10px] text-muted-foreground">min restantes</p>
              </div>
            </div>
            <div className="p-4 text-center text-sm text-muted-foreground">
              ¡Controla bases para ganar! Las 3 mejores gangs serán premiadas.
            </div>
          </div>
        ) : (
          <div className="liquid-glass rounded-2xl p-4 text-center space-y-2">
            <Castle className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">No hay Fort activo</p>
            <p className="text-[11px] text-muted-foreground">Se activa automáticamente cada 2 horas</p>
          </div>
        )}

        {/* Admin trigger */}
        {isAdmin && (
          <Button onClick={handleCheckFort} disabled={botLoading} variant="ios" size="ios-lg" className="w-full">
            {botLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🏰 Verificar / Crear Fort (Admin)</>}
          </Button>
        )}

        {/* Recent Fort results */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Resultados Recientes</h4>
          {recentForts.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">Sin resultados aún</p>
            </div>
          ) : (
            recentForts.map((fort: any) => {
              const topGangs = fort.top_gangs || [];
              return (
                <div key={fort.id} className="liquid-glass rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {new Date(fort.started_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · {new Date(fort.started_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">Finalizado</span>
                  </div>
                  {topGangs.length > 0 ? (
                    <div className="divide-y divide-border/50">
                      {topGangs.map((tg: any) => (
                        <div key={tg.gang_id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            tg.rank === 1 ? "bg-yellow-500/20 text-yellow-600" : tg.rank === 2 ? "bg-muted text-muted-foreground" : "bg-orange-500/15 text-orange-600"
                          }`}>
                            {tg.rank === 1 ? "🥇" : tg.rank === 2 ? "🥈" : "🥉"}
                          </div>
                          <Avatar className="w-9 h-9">
                            {tg.gang_photo && <AvatarImage src={tg.gang_photo} />}
                            <AvatarFallback className="bg-muted text-xs">{(tg.gang_name || "?")[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{tg.gang_name}</p>
                          </div>
                          <span className="text-xs font-bold text-rose-500">{tg.control_minutes}min</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Sin datos</div>
                  )}
                </div>
              );
            })
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

        {/* CREATE WEAPON DIALOG (Admin) */}
        <Dialog open={showCreateWeapon} onOpenChange={setShowCreateWeapon}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[340px] border-0">
            <DialogHeader>
              <DialogTitle className="text-[17px]">Crear Arma</DialogTitle>
              <DialogDescription className="text-[13px]">Añadir al catálogo de la tienda</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre del arma" value={weaponName} onChange={e => setWeaponName(e.target.value)} maxLength={40} className="rounded-xl bg-muted/50 border-0 h-11" />
              <Textarea placeholder="Descripción (opcional)" value={weaponDesc} onChange={e => setWeaponDesc(e.target.value)} maxLength={200} rows={2} className="rounded-xl bg-muted/50 border-0" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Daño base</label>
                  <Input type="number" value={weaponDamage} onChange={e => setWeaponDamage(e.target.value)} min={1} max={10} className="rounded-xl bg-muted/50 border-0 h-10" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Precio (monedas)</label>
                  <Input type="number" value={weaponPrice} onChange={e => setWeaponPrice(e.target.value)} min={1} className="rounded-xl bg-muted/50 border-0 h-10" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Rareza</label>
                <div className="flex gap-1.5">
                  {(["common", "rare", "epic", "legendary"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setWeaponRarity(r)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                        weaponRarity === r ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {RARITY_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-2 block">Imagen del arma</label>
                <div className="flex items-center gap-3">
                  {weaponPhotoPreview ? (
                    <div className="relative">
                      <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-primary/20">
                        <img src={weaponPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => { setWeaponPhotoFile(null); setWeaponPhotoPreview(null); }} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-2xl bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleWeaponPhotoSelect} />
                    </label>
                  )}
                  <p className="text-[12px] text-muted-foreground">JPG, PNG. Máx 5MB</p>
                </div>
              </div>
              <Button onClick={handleCreateWeapon} disabled={!weaponName.trim() || creatingWeapon} variant="ios" size="ios-lg" className="w-full">
                {creatingWeapon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Arma"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* EDIT GANG DIALOG */}
        <Dialog open={!!editingGang} onOpenChange={() => setEditingGang(null)}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[340px] border-0">
            <DialogHeader>
              <DialogTitle className="text-[17px]">Editar Gang</DialogTitle>
              <DialogDescription className="text-[13px]">Cambia nombre, descripción o foto</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nombre de la gang"
                value={editGangName}
                onChange={e => setEditGangName(e.target.value)}
                maxLength={30}
                className="rounded-xl bg-muted/50 border-0 h-11"
              />
              <Textarea
                placeholder="Descripción (opcional)"
                value={editGangDesc}
                onChange={e => setEditGangDesc(e.target.value)}
                maxLength={200}
                rows={3}
                className="rounded-xl bg-muted/50 border-0"
              />
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-2">Foto de la gang</label>
                <div className="flex items-center gap-3">
                  {editGangPhotoPreview ? (
                    <div className="relative">
                      <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                        <AvatarImage src={editGangPhotoPreview} />
                        <AvatarFallback>G</AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => { setEditGangPhotoFile(null); setEditGangPhotoPreview(editingGang?.photo_url || null); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-2xl bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleEditPhotoSelect} />
                    </label>
                  )}
                  <p className="text-[12px] text-muted-foreground">JPG, PNG. Máx 5MB</p>
                </div>
              </div>
              <Button
                onClick={handleSaveGangEdit}
                disabled={!editGangName.trim() || editGangLoading}
                variant="ios"
                size="ios-lg"
                className="w-full"
              >
                {editGangLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MANAGE MEMBERS DIALOG */}
        <Dialog open={!!managingGang} onOpenChange={() => setManagingGang(null)}>
          <DialogContent className="liquid-glass-strong rounded-3xl max-w-[380px] border-0 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[17px]">Gestionar Miembros</DialogTitle>
              <DialogDescription className="text-[13px]">
                {managingGang?.name} · {gangMembers.length}/25 miembros
              </DialogDescription>
            </DialogHeader>

            {membersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Add bot member */}
                {managingGang && managingGang.created_by === userId && gangMembers.length < 25 && (
                  <Button
                    size="ios-sm"
                    variant="ios-secondary"
                    className="w-full text-xs"
                    onClick={() => handleCreateBotMember(managingGang.id)}
                    disabled={membersLoading}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Crear Usuario Bot
                  </Button>
                )}

                {/* Members list */}
                <div className="space-y-2">
                  {gangMembers.map((member: any) => {
                    const isLeader = member.is_leader;
                    const isBot = member.is_bot;
                    const profile = member.profile;
                    const isGangCreator = managingGang?.created_by === userId;
                    const currentRank = newMemberRank[member.id] || member.rank || "member";

                    return (
                      <div key={member.id} className="liquid-glass rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            {!isBot && profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                            <AvatarFallback className={`font-bold text-xs ${isBot ? "bg-indigo-500/10 text-indigo-500" : "bg-primary/10 text-primary"}`}>
                              {isBot ? <Bot className="w-4 h-4" /> : (profile?.display_name || profile?.username || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">
                                {isBot ? `🤖 Bot #${gangMembers.filter(m => m.is_bot).indexOf(member) + 1}` : (profile?.display_name || profile?.username || "Usuario")}
                              </p>
                              {isLeader && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground capitalize">
                              {isLeader ? "👑 Líder" : currentRank === "bot" ? "🤖 Bot" : `⭐ ${currentRank}`}
                            </p>
                          </div>
                        </div>

                        {/* Rank & actions for non-leaders (only gang creator can manage) */}
                        {isGangCreator && !isLeader && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Rank selector */}
                            {!isBot && (
                              <>
                                {["member", "officer", "captain", "co-leader"].map(rank => (
                                  <button
                                    key={rank}
                                    onClick={() => handleUpdateMemberRank(member.id, rank)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                                      currentRank === rank
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/50 text-muted-foreground"
                                    }`}
                                  >
                                    {rank === "member" ? "Miembro" : rank === "officer" ? "Oficial" : rank === "captain" ? "Capitán" : "Co-Líder"}
                                  </button>
                                ))}
                              </>
                            )}

                            <div className="flex gap-1 ml-auto">
                              {/* Transfer leader (only for non-bot members) */}
                              {!isBot && (
                                <Button
                                  size="ios-sm"
                                  variant="ios-ghost"
                                  className="text-[10px] h-6 px-2"
                                  onClick={() => {
                                    if (window.confirm("¿Transferir liderazgo a este miembro? Perderás el control de la gang.")) {
                                      handleTransferLeader(member.id, member.user_id);
                                    }
                                  }}
                                >
                                  <Crown className="w-3 h-3 mr-0.5" /> Líder
                                </Button>
                              )}
                              {/* Kick */}
                              <button
                                onClick={() => handleKickMember(member.id)}
                                className="w-6 h-6 bg-destructive/10 rounded-lg flex items-center justify-center"
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {gangMembers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin miembros</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
};

export default GangWarsPage;
