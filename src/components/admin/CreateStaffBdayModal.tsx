import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Search, Cake, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateStaffBdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateStaffBdayModal = ({ isOpen, onClose, onCreated }: CreateStaffBdayModalProps) => {
  const [staffQuery, setStaffQuery] = useState("");
  const [staffUser, setStaffUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      supabase.from("profile_items").select("id, name, image_url, item_type").then(({ data }) => {
        setItems(data || []);
      });
    }
  }, [isOpen]);

  const searchStaff = async () => {
    if (!staffQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase.from("profiles")
      .select("id, display_name, username, avatar_url")
      .or(`username.ilike.%${staffQuery}%,display_name.ilike.%${staffQuery}%`)
      .limit(1).maybeSingle();
    setStaffUser(data);
    setSearching(false);
  };

  const handleCreate = async () => {
    if (!staffUser) { toast.error("Selecciona un usuario"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCreating(true);

    // Deactivate previous active bdays
    await (supabase.from("staff_birthdays" as any).update({ is_active: false } as any).eq("is_active", true) as any);

    await (supabase.from("staff_birthdays" as any).insert({
      staff_user_id: staffUser.id,
      gift_item_id: selectedItem,
      message: message.trim() || null,
      created_by: user.id,
      is_active: true,
    } as any) as any);

    toast.success("🎂 ¡Cumpleaños abierto!");
    setCreating(false);
    setStaffUser(null);
    setMessage("");
    setSelectedItem(null);
    onCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-[17px] font-semibold flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-400" />
              Abrir Staff Birthday
            </h2>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 pb-8 space-y-4">
            {/* Staff search */}
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                ¿Quién cumple años?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={staffQuery}
                  onChange={(e) => setStaffQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchStaff()}
                  placeholder="Buscar admin..."
                  className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button onClick={searchStaff} size="sm" className="rounded-xl h-10" disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {staffUser && (
                <div className="flex items-center gap-3 mt-2 p-3 bg-pink-500/5 rounded-xl border border-pink-500/20">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                    {staffUser.avatar_url ? (
                      <img src={staffUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (staffUser.display_name?.[0]?.toUpperCase() || "?")}
                  </div>
                  <div>
                    <p className="font-medium text-[14px]">{staffUser.display_name || "Usuario"}</p>
                    <p className="text-[12px] text-muted-foreground">@{staffUser.username || "user"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
                Mensaje de cumpleaños
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe un mensaje especial..."
                className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                rows={3}
              />
            </div>

            {/* Gift item */}
            <div>
              <label className="text-[13px] font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Gift className="w-4 h-4" /> Regalo para los usuarios
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                    className={`p-2 rounded-xl text-center transition-colors ${
                      selectedItem === item.id ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/40"
                    }`}
                  >
                    <span className="text-xl">{item.image_url}</span>
                    <p className="text-[10px] mt-0.5 truncate">{item.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleCreate} disabled={!staffUser || creating} className="w-full rounded-xl h-11">
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "🎂 Abrir cumpleaños"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateStaffBdayModal;
