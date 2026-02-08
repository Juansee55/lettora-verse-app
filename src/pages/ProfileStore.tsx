import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Coins, Crown, Sparkles, ShoppingBag,
  Check, Star, Gem, Flame, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserCoins } from "@/hooks/useUserCoins";
import { toast } from "sonner";
import BottomNav from "@/components/navigation/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  item_type: string;
  rarity: string;
  price: number;
  image_url: string;
  css_value: string | null;
}

interface OwnedItem {
  item_id: string;
  is_equipped: boolean;
}

const rarityConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  common: { icon: Star, color: "text-slate-400", bg: "bg-slate-500/10", label: "Común" },
  rare: { icon: Gem, color: "text-blue-400", bg: "bg-blue-500/10", label: "Raro" },
  epic: { icon: Flame, color: "text-purple-400", bg: "bg-purple-500/10", label: "Épico" },
  legendary: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", label: "Legendario" },
};

const ProfileStorePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { balance, totalEarned, purchaseItem, equipItem, unequipItem, refetch } = useUserCoins();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"frames" | "backgrounds">("frames");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<StoreItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: storeItems }, { data: owned }] = await Promise.all([
      supabase.from("profile_items").select("*").order("price", { ascending: true }),
      supabase.from("user_items").select("item_id, is_equipped"),
    ]);
    if (storeItems) setItems(storeItems as StoreItem[]);
    if (owned) setOwnedItems(owned);
    setLoading(false);
  };

  const handlePurchase = async (item: StoreItem) => {
    if (balance < item.price) {
      toast.error(t("notEnoughCoins"));
      return;
    }
    setPurchasing(item.id);
    const success = await purchaseItem(item.id);
    if (success) {
      toast.success(`¡${item.name} adquirido!`);
      await fetchData();
    } else {
      toast.error("Error al comprar");
    }
    setPurchasing(null);
  };

  const handleEquip = async (item: StoreItem) => {
    const owned = ownedItems.find(o => o.item_id === item.id);
    if (!owned) return;
    if (owned.is_equipped) {
      await unequipItem(item.id);
    } else {
      await equipItem(item.id, item.item_type);
    }
    await fetchData();
    toast.success(owned.is_equipped ? "Desequipado" : `${item.name} equipado`);
  };

  const isOwned = (itemId: string) => ownedItems.some(o => o.item_id === itemId);
  const isEquipped = (itemId: string) => ownedItems.some(o => o.item_id === itemId && o.is_equipped);

  const filteredItems = items.filter(i => i.item_type === (activeTab === "frames" ? "frame" : "background"));

  const renderItemCard = (item: StoreItem, index: number) => {
    const rarity = rarityConfig[item.rarity] || rarityConfig.common;
    const RarityIcon = rarity.icon;
    const owned = isOwned(item.id);
    const equipped = isEquipped(item.id);

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card rounded-2xl border border-border/50 overflow-hidden"
      >
        {/* Preview */}
        <div
          className={`h-32 flex items-center justify-center relative ${item.css_value || "bg-muted"}`}
          onClick={() => setShowPreview(item)}
        >
          {item.item_type === "frame" ? (
            <div className={`w-20 h-20 rounded-2xl ${item.css_value} flex items-center justify-center bg-muted`}>
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/80 text-2xl font-display font-bold drop-shadow-lg">
                {item.name.split(" ")[0]}
              </span>
            </div>
          )}
          {equipped && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <RarityIcon className={`w-3.5 h-3.5 ${rarity.color}`} />
            <span className={`text-[11px] font-medium ${rarity.color}`}>{rarity.label}</span>
          </div>
          <h3 className="font-medium text-[14px] mb-0.5">{item.name}</h3>
          <p className="text-[12px] text-muted-foreground mb-3 line-clamp-1">{item.description}</p>

          {owned ? (
            <Button
              variant={equipped ? "outline" : "default"}
              size="sm"
              className="w-full rounded-xl h-9 text-[13px]"
              onClick={() => handleEquip(item)}
            >
              {equipped ? "Desequipar" : "Equipar"}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full rounded-xl h-9 text-[13px]"
              onClick={() => handlePurchase(item)}
              disabled={purchasing === item.id || balance < item.price}
            >
              {purchasing === item.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5 mr-1" />
                  {item.price}
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-semibold text-[17px]">{t("profileStore")}</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-[14px] font-bold text-amber-500">{balance}</span>
          </div>
        </div>
      </div>

      {/* Coin Banner */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 rounded-2xl p-4 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-lg">{balance} {t("coins")}</p>
              <p className="text-[13px] text-muted-foreground">
                {t("totalEarned")}: {totalEarned} • {t("earnByEngaging")}
              </p>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-[12px] text-muted-foreground">
            <span>❤️ Like = 1</span>
            <span>💬 {t("comment")} = 2</span>
            <span>🔁 Repost = 1</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex gap-2">
          {[
            { key: "frames" as const, icon: Crown, label: t("frames") },
            { key: "backgrounds" as const, icon: Sparkles, label: t("backgrounds") },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t("noItemsAvailable")}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item, i) => renderItemCard(item, i))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setShowPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-3xl p-6 max-w-sm w-full"
            >
              <div className={`h-48 rounded-2xl mb-4 flex items-center justify-center ${showPreview.css_value || "bg-muted"}`}>
                {showPreview.item_type === "frame" ? (
                  <div className={`w-28 h-28 rounded-2xl ${showPreview.css_value} flex items-center justify-center bg-muted`}>
                    <Sparkles className="w-12 h-12 text-muted-foreground" />
                  </div>
                ) : (
                  <span className="text-white/80 text-3xl font-display font-bold drop-shadow-lg">
                    {showPreview.name}
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-xl mb-1">{showPreview.name}</h2>
              <p className="text-muted-foreground text-[15px] mb-4">{showPreview.description}</p>
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const r = rarityConfig[showPreview.rarity] || rarityConfig.common;
                  const Icon = r.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium ${r.bg} ${r.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {r.label}
                    </span>
                  );
                })()}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium bg-amber-500/10 text-amber-500">
                  <Coins className="w-3.5 h-3.5" /> {showPreview.price}
                </span>
              </div>
              <Button className="w-full rounded-xl" onClick={() => setShowPreview(null)}>
                {t("close")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default ProfileStorePage;
