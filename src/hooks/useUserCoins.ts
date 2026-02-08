import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserCoins = () => {
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchCoins = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data } = await supabase
      .from("user_coins")
      .select("balance, total_earned")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setBalance(data.balance);
      setTotalEarned(data.total_earned);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  const purchaseItem = async (itemId: string): Promise<boolean> => {
    if (!userId) return false;
    const { data, error } = await supabase.rpc("purchase_item", {
      p_user_id: userId,
      p_item_id: itemId,
    });
    if (error || !data) return false;
    await fetchCoins();
    return true;
  };

  const equipItem = async (itemId: string, itemType: string) => {
    if (!userId) return;
    // Unequip all items of the same type
    const { data: ownedItems } = await supabase
      .from("user_items")
      .select("id, item_id")
      .eq("user_id", userId)
      .eq("is_equipped", true);

    if (ownedItems) {
      for (const owned of ownedItems) {
        const { data: item } = await supabase
          .from("profile_items")
          .select("item_type")
          .eq("id", owned.item_id)
          .maybeSingle();
        if (item?.item_type === itemType) {
          await supabase
            .from("user_items")
            .update({ is_equipped: false })
            .eq("id", owned.id);
        }
      }
    }

    // Equip new item
    await supabase
      .from("user_items")
      .update({ is_equipped: true })
      .eq("user_id", userId)
      .eq("item_id", itemId);
  };

  const unequipItem = async (itemId: string) => {
    if (!userId) return;
    await supabase
      .from("user_items")
      .update({ is_equipped: false })
      .eq("user_id", userId)
      .eq("item_id", itemId);
  };

  return { balance, totalEarned, loading, purchaseItem, equipItem, unequipItem, refetch: fetchCoins };
};
