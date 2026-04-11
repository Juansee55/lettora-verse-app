import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Coins, Loader2, Sparkles, Check, X, AlertTriangle,
  Crown, Palette, Zap, Award, Type,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  emoji: string | null;
  is_active: boolean;
}

const categoryIcons: Record<string, any> = {
  avatar_frame: Crown,
  badge: Award,
  theme: Palette,
  effect: Zap,
  title: Type,
};

const categoryLabels: Record<string, string> = {
  avatar_frame: "Marcos",
  badge: "Insignias",
  theme: "Temas",
  effect: "Efectos",
  title: "Títulos",
};

const ShopPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const [itemsRes, purchasesRes, coinsRes] = await Promise.all([
      supabase.from("shop_items").select("*").eq("is_active", true).order("price"),
      supabase.from("shop_purchases").select("item_id").eq("user_id", user.id),
      supabase.from("user_coins").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);

    setItems((itemsRes.data as any[]) || []);
    setPurchases((purchasesRes.data as any[])?.map(p => p.item_id) || []);
    setBalance(coinsRes.data?.balance || 0);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedItem) return;
    setBuying(true);

    const { data, error } = await supabase.rpc("purchase_shop_item", { p_item_id: selectedItem.id });

    if (error || !(data as any)?.success) {
      toast({
        title: "Error",
        description: (data as any)?.message || error?.message || "No se pudo completar la compra",
        variant: "destructive",
      });
    } else {
      toast({ title: "¡Compra exitosa! 🎉", description: (data as any)?.message });
      setPurchases(prev => [...prev, selectedItem.id]);
      setBalance(prev => prev - selectedItem.price);
    }

    setBuying(false);
    setSelectedItem(null);
  };

  const filteredItems = activeCategory === "all" ? items : items.filter(i => i.category === activeCategory);
  const categories = ["all", ...new Set(items.map(i => i.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <IOSHeader title="Tienda" showBack />

      {/* Balance */}
      <div className="mx-4 mt-2 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">Tu saldo</p>
              <p className="text-[24px] font-bold text-amber-500">{balance}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-amber-500/10 rounded-full">
            <span className="text-[11px] font-semibold text-amber-600">BETA</span>
          </div>
        </motion.div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
              activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            Todos
          </button>
          {categories.filter(c => c !== "all").map(cat => {
            const Icon = categoryIcons[cat] || ShoppingBag;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {categoryLabels[cat] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {filteredItems.map((item, i) => {
          const owned = purchases.includes(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => !owned && setSelectedItem(item)}
              className={`bg-card rounded-2xl p-4 cursor-pointer active:scale-[0.97] transition-transform ${
                owned ? "opacity-60" : ""
              }`}
            >
              <div className="text-3xl mb-2">{item.emoji || "🎁"}</div>
              <h3 className="text-[14px] font-semibold leading-tight">{item.name}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
              <div className="mt-3 flex items-center justify-between">
                {owned ? (
                  <span className="flex items-center gap-1 text-[12px] text-emerald-500 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Comprado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[13px] font-bold text-amber-500">
                    <Coins className="w-3.5 h-3.5" /> {item.price}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                  {categoryLabels[item.category] || item.category}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay items en esta categoría</p>
        </div>
      )}

      {/* Purchase Dialog */}
      <AlertDialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <AlertDialogContent className="rounded-2xl max-w-[320px]">
          <AlertDialogHeader className="items-center text-center">
            <div className="text-4xl mb-2">{selectedItem?.emoji || "🎁"}</div>
            <AlertDialogTitle className="text-[17px]">{selectedItem?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px]">
              {selectedItem?.description}
              <br />
              <span className="flex items-center justify-center gap-1 mt-2 text-amber-500 font-bold">
                <Coins className="w-4 h-4" /> {selectedItem?.price} monedas
              </span>
              {selectedItem && selectedItem.price > balance && (
                <span className="flex items-center justify-center gap-1 mt-1 text-destructive text-[12px]">
                  <AlertTriangle className="w-3 h-3" /> Saldo insuficiente
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handlePurchase}
              disabled={buying || (selectedItem ? selectedItem.price > balance : false)}
              className="bg-primary hover:bg-primary/90 rounded-xl w-full h-11 text-[15px] font-semibold disabled:opacity-50"
            >
              {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Comprar"}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl w-full h-11 text-[15px] mt-0">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IOSBottomNav />
    </div>
  );
};

export default ShopPage;
