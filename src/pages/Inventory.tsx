import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Crown, Sparkles, Palette, Check, Loader2, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/navigation/BottomNav";

interface OwnedItemWithDetails {
  item_id: string;
  is_equipped: boolean;
  profile_items: {
    id: string;
    name: string;
    description: string | null;
    item_type: string;
    rarity: string;
    css_value: string | null;
    image_url: string;
  };
}

const rarityColors: Record<string, { text: string; bg: string; label: string }> = {
  common: { text: "text-slate-400", bg: "bg-slate-500/10", label: "Común" },
  rare: { text: "text-blue-400", bg: "bg-blue-500/10", label: "Raro" },
  epic: { text: "text-purple-400", bg: "bg-purple-500/10", label: "Épico" },
  legendary: { text: "text-amber-400", bg: "bg-amber-500/10", label: "Legendario" },
};

const InventoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<OwnedItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"frames" | "backgrounds" | "name_colors">("frames");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_items")
      .select("item_id, is_equipped, profile_items(id, name, description, item_type, rarity, css_value, image_url)")
      .order("purchased_at", { ascending: false });

    if (!error && data) {
      setItems(data as unknown as OwnedItemWithDetails[]);
    }
    setLoading(false);
  };

  const handleEquip = async (itemId: string, itemType: string) => {
    const item = items.find(i => i.item_id === itemId);
    if (!item) return;

    if (item.is_equipped) {
      // Unequip
      await supabase.from("user_items").update({ is_equipped: false }).eq("item_id", itemId);
      toast.success("Desequipado");
    } else {
      // Unequip others of same type, then equip this one
      const sameTypeIds = items
        .filter(i => i.profile_items.item_type === itemType && i.is_equipped)
        .map(i => i.item_id);

      if (sameTypeIds.length > 0) {
        await supabase.from("user_items").update({ is_equipped: false }).in("item_id", sameTypeIds);
      }
      await supabase.from("user_items").update({ is_equipped: true }).eq("item_id", itemId);
      toast.success(`${item.profile_items.name} equipado`);
    }
    await fetchInventory();
  };

  const tabTypeMap = { frames: "frame", backgrounds: "background", name_colors: "name_color" };
  const filtered = items.filter(i => i.profile_items.item_type === tabTypeMap[activeTab]);

  const isValentine = (cssValue: string | null) =>
    cssValue?.startsWith("valentine-");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-semibold text-[17px]">Mi Inventario</h1>
          <div className="w-5" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-2">
          {([
            { key: "frames" as const, icon: Crown, label: "Marcos" },
            { key: "backgrounds" as const, icon: Sparkles, label: "Fondos" },
            { key: "name_colors" as const, icon: Palette, label: "Colores" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                activeTab === tab.key
                  ? "valentine-gradient text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              {activeTab === "name_colors" ? (
                <Palette className="w-7 h-7 text-muted-foreground" />
              ) : activeTab === "frames" ? (
                <Crown className="w-7 h-7 text-muted-foreground" />
              ) : (
                <Sparkles className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-[17px] font-semibold mb-1">Sin items</h3>
            <p className="text-[14px] text-muted-foreground mb-4">
              Consigue items en la tienda o completando quests
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate("/store")}
            >
              Ir a la tienda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, index) => {
              const rarity = rarityColors[item.profile_items.rarity] || rarityColors.common;
              const valentine = isValentine(item.profile_items.css_value);

              return (
                <motion.div
                  key={item.item_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl border overflow-hidden ${
                    valentine
                      ? "border-rose-300/50 bg-gradient-to-b from-rose-50/50 to-card dark:from-rose-950/20 dark:to-card"
                      : "border-border/50 bg-card"
                  }`}
                >
                  {/* Preview */}
                  <div className="h-28 flex items-center justify-center relative bg-muted/30">
                    {item.profile_items.item_type === "frame" ? (
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Heart className="w-6 h-6 text-muted-foreground" />
                        </div>
                        {item.profile_items.css_value && (
                          <div className={`absolute -inset-1.5 rounded-full ${item.profile_items.css_value} pointer-events-none`} />
                        )}
                      </div>
                    ) : item.profile_items.item_type === "name_color" ? (
                      <span className={`text-lg font-bold ${item.profile_items.css_value}`}>
                        Tu nombre
                      </span>
                    ) : (
                      <div className={`absolute inset-0 ${item.profile_items.css_value || "bg-muted"}`} />
                    )}
                    {item.is_equipped && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    {valentine && (
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full valentine-gradient text-white">
                          💕 Exclusivo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[11px] font-medium ${rarity.text}`}>{rarity.label}</span>
                    </div>
                    <h3 className="font-medium text-[14px] mb-0.5">{item.profile_items.name}</h3>
                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-1">
                      {item.profile_items.description}
                    </p>
                    <Button
                      variant={item.is_equipped ? "outline" : "default"}
                      size="sm"
                      className={`w-full rounded-xl h-8 text-[12px] ${
                        !item.is_equipped && valentine ? "valentine-btn border-0" : ""
                      }`}
                      onClick={() => handleEquip(item.item_id, item.profile_items.item_type)}
                    >
                      {item.is_equipped ? "Desequipar" : "Equipar"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default InventoryPage;
