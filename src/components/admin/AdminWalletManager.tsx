import { useState } from "react";
import { Search, Loader2, DollarSign, Send, User, AlertTriangle, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminWalletManager = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSearch = async () => {
    if (!username.trim()) return;
    setSearching(true);
    setUser(null);
    setWallet(null);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${username}%,display_name.ilike.%${username}%`)
      .limit(1)
      .maybeSingle();

    if (profile) {
      setUser(profile);
      const { data: walletData } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();
      setWallet(walletData);
    } else {
      toast({ title: "Usuario no encontrado", variant: "destructive" });
    }
    setSearching(false);
  };

  const handleAdjust = async (isDeposit: boolean) => {
    if (!user || !amount) return;
    const finalAmount = isDeposit ? parseFloat(amount) : -parseFloat(amount);
    
    setProcessing(true);
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    
    const { error } = await (supabase.rpc as any)("admin_adjust_balance", {
      p_target_user_id: user.id,
      p_amount: finalAmount,
      p_description: description || (isDeposit ? "Depósito administrativo" : "Ajuste administrativo"),
      p_admin_user_id: adminUser?.id
    });

    setProcessing(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isDeposit ? "Depósito realizado" : "Descuento realizado" });
      setAmount("");
      setDescription("");
      handleSearch(); // Refresh wallet info
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="bg-card rounded-3xl p-6 space-y-4 shadow-sm border">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" /> Gestión de LettoPays
        </h3>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar usuario por nombre o @username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 h-11 rounded-xl bg-muted/50 border-none"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching} className="h-11 rounded-xl px-6">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>

        {user && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-bold text-lg">{user.display_name}</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <p className="text-xs font-mono mt-1 text-primary">Saldo: {wallet?.balance || 0} LettoPays</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Cantidad</label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Motivo / Descripción</label>
                <Input 
                  placeholder="Ej: Recompensa evento" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="default" 
                className="flex-1 h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700"
                onClick={() => handleAdjust(true)}
                disabled={processing || !amount}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Añadir</div>}
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => handleAdjust(false)}
                disabled={processing || !amount}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="flex items-center"><Minus className="w-4 h-4 mr-2" /> Descontar</div>}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminWalletManager;
