import { useEffect, useState } from "react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

type Card = { id: string; name: string; description: string | null; image_url: string | null; rarity: string };
type UserCard = { id: string; card_id: string; is_displayed: boolean; card: Card };

const RARITY_COLORS: Record<string, string> = {
  common: "from-slate-400 to-slate-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-amber-400 to-orange-600",
  mythic: "from-pink-500 via-fuchsia-500 to-cyan-500",
};

const CollectibleCards = () => {
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [myCards, setMyCards] = useState<UserCard[]>([]);
  const [all, setAll] = useState<Card[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [uid]);

  const load = async () => {
    if (!uid) return;
    const [m, a] = await Promise.all([
      supabase.from("user_collectible_cards").select("id, card_id, is_displayed, card:collectible_cards(*)").eq("user_id", uid),
      supabase.from("collectible_cards").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    ]);
    setMyCards((m.data ?? []) as any);
    setAll((a.data ?? []) as Card[]);
  };

  const toggleDisplay = async (uc: UserCard) => {
    await supabase.from("user_collectible_cards").update({ is_displayed: !uc.is_displayed }).eq("id", uc.id);
    toast.success(uc.is_displayed ? "Ocultada" : "Exhibida");
    load();
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title="Cartas coleccionables" leftAction={<BackButton />} />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setTab("mine")} className={`flex-1 py-2 rounded-xl text-sm ${tab==="mine"?"bg-primary text-primary-foreground":"bg-muted"}`}>Mi colección ({myCards.length})</button>
          <button onClick={() => setTab("all")} className={`flex-1 py-2 rounded-xl text-sm ${tab==="all"?"bg-primary text-primary-foreground":"bg-muted"}`}>Catálogo</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(tab === "mine" ? myCards.map(u => u.card) : all).filter(Boolean).map((c, i) => {
            const uc = myCards.find(u => u.card_id === c.id);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                onClick={() => uc && toggleDisplay(uc)}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br ${RARITY_COLORS[c.rarity]} p-[2px] cursor-pointer`}>
                <div className="w-full h-full rounded-2xl bg-card p-3 flex flex-col">
                  {c.image_url ? (
                    <img src={c.image_url} className="w-full flex-1 rounded-xl object-cover" />
                  ) : (
                    <div className="w-full flex-1 rounded-xl bg-muted flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <h4 className="text-sm font-semibold mt-2 truncate">{c.name}</h4>
                  <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                    <Star className="w-3 h-3" />{c.rarity}
                  </div>
                </div>
                {uc?.is_displayed && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">En perfil</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {tab === "all" && (
          <p className="text-xs text-muted-foreground text-center pt-3">Las cartas se obtienen desbloqueando logros o mediante eventos.</p>
        )}
      </div>
    </div>
  );
};
export default CollectibleCards;