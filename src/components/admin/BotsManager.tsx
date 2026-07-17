import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Shield, Sparkles, Loader2, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BotRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bot_type: string | null;
  created_at: string | null;
}

const BotsManager = () => {
  const { toast } = useToast();
  const [bots, setBots] = useState<BotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const fetchBots = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bot_type, created_at")
      .eq("is_bot", true)
      .order("created_at", { ascending: false });
    setBots((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchBots(); }, []);

  const create = async (botType: "admin" | "user") => {
    setCreating(botType);
    try {
      const { data, error } = await supabase.functions.invoke("create-bot", {
        body: { botType, count: 1 },
      });
      if (error) throw error;
      toast({ title: `✅ Bot ${botType} creado`, description: (data as any)?.created?.[0]?.display_name });
      fetchBots();
    } catch (e: any) {
      toast({ title: "Error creando bot", description: e.message, variant: "destructive" });
    } finally { setCreating(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este bot?")) return;
    // Delete profile (cascades via auth user? Use admin RPC) — soft: mark banned & delete profile row.
    await supabase.from("profiles").delete().eq("id", id);
    fetchBots();
  };

  const runAction = async (fn: "moderate-content" | "bot-user-actions", label: string) => {
    setRunning(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { action: "cycle" } });
      if (error) throw error;
      toast({ title: `${label} ejecutado`, description: JSON.stringify((data as any)?.stats ?? data) });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setRunning(null); }
  };

  const admins = bots.filter(b => b.bot_type === "admin");
  const users = bots.filter(b => b.bot_type === "user");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => create("admin")}
          disabled={creating !== null}
          className="rounded-2xl h-14 flex-col gap-0.5"
        >
          {creating === "admin" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          <span className="text-[13px]">Crear bot admin</span>
        </Button>
        <Button
          onClick={() => create("user")}
          variant="secondary"
          disabled={creating !== null}
          className="rounded-2xl h-14 flex-col gap-0.5"
        >
          {creating === "user" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          <span className="text-[13px]">Crear bot usuario</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => runAction("moderate-content", "Moderación")}
          variant="outline"
          disabled={running !== null}
          className="rounded-2xl h-12"
        >
          {running === "moderate-content" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
          <span className="text-[13px]">Moderar ahora</span>
        </Button>
        <Button
          onClick={() => runAction("bot-user-actions", "Bots usuarios")}
          variant="outline"
          disabled={running !== null}
          className="rounded-2xl h-12"
        >
          {running === "bot-user-actions" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
          <span className="text-[13px]">Ciclo de bots</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : bots.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border/50">
          <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No hay bots. Crea el primero arriba.</p>
        </div>
      ) : (
        <>
          {admins.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                🛡️ Bots administradores ({admins.length})
              </h3>
              <div className="space-y-2">
                {admins.map((b, i) => <BotItem key={b.id} bot={b} index={i} onDelete={remove} />)}
              </div>
            </div>
          )}
          {users.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1 mt-4">
                🤖 Bots usuarios ({users.length})
              </h3>
              <div className="space-y-2">
                {users.map((b, i) => <BotItem key={b.id} bot={b} index={i} onDelete={remove} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const BotItem = ({ bot, index, onDelete }: { bot: BotRow; index: number; onDelete: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
    className="bg-card rounded-2xl border border-border/50 flex items-center gap-3 px-4 py-3"
  >
    <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
      {bot.bot_type === "admin" ? <Shield className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-medium text-[14px] truncate">{bot.display_name}</h4>
      <p className="text-[12px] text-muted-foreground truncate">@{bot.username}</p>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onDelete(bot.id)}
      className="rounded-full text-destructive border-destructive/30 h-8 px-2"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  </motion.div>
);

export default BotsManager;