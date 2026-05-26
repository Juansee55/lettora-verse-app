import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, 
  History, Info, Loader2, Copy, Check, Send, 
  ChevronRight, QrCode, Sparkles, Edit2, AlertTriangle,
  X, Search, User, FileText, Download, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

const LettoWalletPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showIntro, setShowIntro] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferStep, setTransferStep] = useState<"search" | "confirm" | "success">("search");
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // Alias edit state
  const [showEditAlias, setShowEditAlias] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [updatingAlias, setUpdatingAlias] = useState(false);

  // Receipt modal
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    initWallet();
  }, [navigate]);

  const initWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const hasSeenIntro = localStorage.getItem(`lettora_wallet_intro_${user.id}`);
    if (!hasSeenIntro) setShowIntro(true);

    let { data: walletData } = await supabase
      .from("wallets" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!walletData) {
      const cbu = "000" + Math.floor(Math.random() * 1000000000000000000).toString().padStart(19, "0");
      const alias = `${user.email?.split("@")[0] || "user"}.letto.wallet`;
      const { data: newWallet } = await supabase.from("wallets" as any).insert({ user_id: user.id, balance: 100, cbu_cvu: cbu, alias }).select().single();
      if (newWallet) walletData = newWallet;
    }

    setWallet(walletData);
    setNewAlias(walletData?.alias || "");

    if (walletData) {
      const { data: txs } = await supabase
        .from("wallet_transactions" as any)
        .select(`
          *,
          sender:sender_wallet_id(id, user_id, alias, profiles(username, display_name, avatar_url)),
          receiver:receiver_wallet_id(id, user_id, alias, profiles(username, display_name, avatar_url))
        `)
        .or(`sender_wallet_id.eq.${walletData.id},receiver_wallet_id.eq.${walletData.id}`)
        .order("created_at", { ascending: false });
      setTransactions(txs || []);
    }
    setLoading(false);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: "Copiado al portapapeles" });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSearchUser = async () => {
    if (!identifier) return;
    setSearching(true);
    const { data, error } = await supabase.rpc("find_wallet_by_identifier", { p_identifier: identifier });
    setSearching(false);
    
    if (data && data.length > 0) {
      const found = data[0];
      if (found.user_id === wallet.user_id) {
        toast({ title: "No puedes transferirte a ti mismo", variant: "destructive" });
        return;
      }
      setTargetUser(found);
      setTransferStep("confirm");
    } else {
      toast({ title: "Usuario no encontrado", description: "Verifica el Alias o CBU", variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!targetUser || !amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > wallet.balance) {
      toast({ title: "Saldo insuficiente", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("transfer_lettopays", {
        p_sender_id: wallet.user_id,
        p_receiver_id: targetUser.user_id,
        p_amount: parseFloat(amount),
        p_description: "Transferencia LettoWallet"
      });

      if (error) throw error;

      // Fetch the transaction for the receipt
      const { data: tx } = await supabase
        .from("wallet_transactions" as any)
        .select("*, sender:sender_wallet_id(alias), receiver:receiver_wallet_id(alias)")
        .eq("sender_wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setLastTransaction(tx);
      setTransferStep("success");
      initWallet(); // Refresh balance and history
    } catch (error: any) {
      toast({ title: "Error en la transferencia", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateAlias = async () => {
    if (!newAlias || newAlias === wallet.alias) return;
    setUpdatingAlias(true);
    const { error } = await supabase.from("wallets" as any).update({ alias: newAlias }).eq("id", wallet.id);
    setUpdatingAlias(false);

    if (error) {
      toast({ title: "Error al actualizar alias", description: "Es posible que ya esté en uso", variant: "destructive" });
    } else {
      setWallet({ ...wallet, alias: newAlias });
      setShowEditAlias(false);
      toast({ title: "Alias actualizado ✨" });
    }
  };

  const introSlides = [
    { title: "Bienvenido a LettoWallet", description: "Tu nueva billetera virtual dentro de Lettora Verse. Aquí podrás gestionar tus LettoPays de forma segura.", icon: <Wallet className="w-16 h-16 text-primary" />, color: "bg-primary" },
    { title: "LettoPays", description: "La moneda oficial de la app. Úsala para apoyar a tus autores favoritos, comprar items exclusivos o transferir a amigos.", icon: <Sparkles className="w-16 h-16 text-amber-500" />, color: "bg-amber-500" },
    { title: "Transferencias Instantáneas", description: "Envía y recibe LettoPays al instante usando tu Alias único o CBU. Sin comisiones, 100% funcional.", icon: <Send className="w-16 h-16 text-blue-500" />, color: "bg-blue-500" }
  ];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlide} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, y: -20 }} className="space-y-6">
              <div className={`w-32 h-32 rounded-3xl ${introSlides[currentSlide].color}/10 flex items-center justify-center mx-auto mb-8`}>{introSlides[currentSlide].icon}</div>
              <h2 className="text-3xl font-bold">{introSlides[currentSlide].title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{introSlides[currentSlide].description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="p-8 space-y-4">
          <div className="flex justify-center gap-2 mb-4">{introSlides.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"}`} />)}</div>
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold" 
            onClick={() => {
              if (currentSlide < introSlides.length - 1) {
                setCurrentSlide(s => s + 1);
              } else {
                if (wallet?.user_id) {
                  localStorage.setItem(`lettora_wallet_intro_${wallet.user_id}`, "true");
                }
                setShowIntro(false);
              }
            }}
          >
            {currentSlide === introSlides.length - 1 ? "Empezar" : "Siguiente"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-[17px] font-semibold">LettoWallet</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><Info className="w-5 h-5 text-muted-foreground" /></Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-violet-600 rounded-[32px] p-6 text-white shadow-xl shadow-primary/20">
          <div className="relative z-10">
            <p className="text-primary-foreground/80 text-[15px] font-medium mb-1">Saldo disponible</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold tracking-tight">{wallet?.balance?.toLocaleString()}</h2>
              <span className="text-xl font-medium opacity-90">LettoPays</span>
            </div>
            <div className="mt-8 flex gap-3">
              <Button onClick={() => setShowTransfer(true)} className="flex-1 bg-white/20 hover:bg-white/30 border-none h-12 rounded-2xl font-bold backdrop-blur-md"><ArrowUpRight className="w-5 h-5 mr-2" /> Enviar</Button>
              <Button className="flex-1 bg-white/20 hover:bg-white/30 border-none h-12 rounded-2xl font-bold backdrop-blur-md"><ArrowDownLeft className="w-5 h-5 mr-2" /> Recibir</Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        </motion.div>

        {/* Account Info */}
        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-2">Detalles de cuenta</h3>
          <div className="bg-card rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div><p className="text-[12px] text-muted-foreground">CBU / CVU</p><p className="text-[15px] font-mono font-medium">{wallet?.cbu_cvu}</p></div>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(wallet?.cbu_cvu, "cbu")}>{copied === "cbu" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[12px] text-muted-foreground">Alias único</p>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-medium">{wallet?.alias}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEditAlias(true)}><Edit2 className="w-3 h-3 text-primary" /></Button>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(wallet?.alias, "alias")}>{copied === "alias" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
            </div>
          </div>
        </section>

        {/* Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Actividad reciente</h3>
            <Button variant="ghost" className="text-primary text-[13px] h-auto p-0 font-semibold">Ver todo</Button>
          </div>
          <div className="space-y-2">
            {transactions.length > 0 ? transactions.map((tx) => (
              <div key={tx.id} onClick={() => setSelectedTx(tx)} className="bg-card p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${tx.sender_wallet_id === wallet.id ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                  {tx.sender_wallet_id === wallet.id ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[15px]">{tx.sender_wallet_id === wallet.id ? `A ${tx.receiver?.wallets?.profiles?.display_name || tx.receiver?.alias}` : `De ${tx.sender?.wallets?.profiles?.display_name || tx.sender?.alias}`}</p>
                  <p className="text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-[16px] ${tx.sender_wallet_id === wallet.id ? "text-foreground" : "text-green-500"}`}>{tx.sender_wallet_id === wallet.id ? "-" : "+"}{tx.amount}</p>
                  <p className="text-[11px] text-muted-foreground">LettoPays</p>
                </div>
              </div>
            )) : <div className="bg-card/50 border-2 border-dashed border-border rounded-3xl p-8 text-center space-y-2"><History className="w-10 h-10 text-muted-foreground/30 mx-auto" /><p className="text-muted-foreground font-medium">No hay movimientos aún</p></div>}
          </div>
        </section>
      </main>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold">Enviar LettoPays</h2>
                <Button variant="ghost" size="icon" onClick={() => (setShowTransfer(false), setTransferStep("search"), setIdentifier(""), setAmount(""), setTargetUser(null))}><X className="w-5 h-5" /></Button>
              </div>
              
              <div className="p-6">
                {transferStep === "search" && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input placeholder="Alias o CBU del destinatario" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="pl-12 h-14 rounded-2xl bg-muted/50 border-none text-lg" />
                      </div>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input type="number" placeholder="Cantidad a enviar" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-12 h-14 rounded-2xl bg-muted/50 border-none text-lg" />
                      </div>
                    </div>
                    <Button className="w-full h-14 rounded-2xl text-lg font-bold" disabled={!identifier || !amount || searching} onClick={handleSearchUser}>{searching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuar"}</Button>
                  </div>
                )}

                {transferStep === "confirm" && (
                  <div className="space-y-8 text-center">
                    <div className="space-y-4">
                      <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center overflow-hidden">
                        {targetUser.avatar_url ? <img src={targetUser.avatar_url} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-primary" />}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{targetUser.display_name}</h3>
                        <p className="text-muted-foreground">@{targetUser.username} • {targetUser.alias}</p>
                      </div>
                      <div className="bg-primary/5 py-4 rounded-2xl">
                        <p className="text-sm text-muted-foreground">Vas a enviar</p>
                        <p className="text-3xl font-bold text-primary">{amount} LettoPays</p>
                      </div>
                    </div>
                    
                    <div className="bg-amber-500/10 p-4 rounded-2xl flex gap-3 text-left border border-amber-500/20">
                      <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">Esta operación es irreversible. Solo el equipo de Staff puede intervenir en caso de error grave.</p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setTransferStep("search")}>Atrás</Button>
                      <Button className="flex-1 h-14 rounded-2xl font-bold bg-primary" disabled={processing} onClick={handleTransfer}>{processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Envío"}</Button>
                    </div>
                  </div>
                )}

                {transferStep === "success" && (
                  <div className="space-y-8 text-center py-4">
                    <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center text-white">
                      <Check className="w-10 h-10 stroke-[3px]" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">¡Envío Exitoso!</h3>
                      <p className="text-muted-foreground">Se han enviado {amount} LettoPays a {targetUser.display_name}</p>
                    </div>
                    <div className="space-y-3">
                      <Button className="w-full h-14 rounded-2xl font-bold bg-primary" onClick={() => (setShowTransfer(false), setTransferStep("search"), setIdentifier(""), setAmount(""))}>Listo</Button>
                      <Button variant="ghost" className="w-full h-12 rounded-2xl font-semibold text-primary flex items-center justify-center gap-2" onClick={() => setSelectedTx(lastTransaction)}>
                        <FileText className="w-5 h-5" /> Ver Comprobante
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Alias Modal */}
      <AnimatePresence>
        {showEditAlias && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-background w-full max-w-sm rounded-[32px] p-6 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Editar Alias</h3>
                <p className="text-sm text-muted-foreground">Elige un alias único para que otros te encuentren fácilmente.</p>
              </div>
              <Input value={newAlias} onChange={(e) => setNewAlias(e.target.value.toLowerCase().replace(/\s/g, ""))} className="h-12 rounded-xl bg-muted/50 border-none text-center font-medium" placeholder="nuevo.alias" />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setShowEditAlias(false)}>Cancelar</Button>
                <Button className="flex-1 h-12 rounded-xl font-bold" disabled={updatingAlias || !newAlias} onClick={handleUpdateAlias}>{updatingAlias ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white text-slate-900 w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl">
              <div className="bg-primary p-8 text-white text-center space-y-2 relative">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setSelectedTx(null)}><X className="w-5 h-5" /></Button>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                  <Wallet className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold opacity-80 uppercase tracking-widest">Comprobante Letto</h3>
                <p className="text-4xl font-black">{selectedTx.amount} LP</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm"><span className="text-slate-400 font-medium">Fecha</span><span className="font-bold">{new Date(selectedTx.created_at).toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400 font-medium">Tipo</span><span className="font-bold uppercase text-primary">{selectedTx.transaction_type}</span></div>
                  <div className="h-px bg-slate-100 w-full" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Origen</p>
                    <p className="font-bold text-slate-700">{selectedTx.sender?.wallets?.profiles?.display_name || "Sistema"}</p>
                    <p className="text-xs text-slate-400">{selectedTx.sender?.alias || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Destino</p>
                    <p className="font-bold text-slate-700">{selectedTx.receiver?.wallets?.profiles?.display_name || "Usuario"}</p>
                    <p className="text-xs text-slate-400">{selectedTx.receiver?.alias || "N/A"}</p>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-2">
                  <Button className="flex-1 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-12"><Download className="w-4 h-4 mr-2" /> Guardar</Button>
                  <Button variant="outline" className="flex-1 rounded-2xl border-slate-200 font-bold h-12 text-slate-600"><Share2 className="w-4 h-4 mr-2" /> Compartir</Button>
                </div>
              </div>
              <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {selectedTx.id.slice(0,18)}...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IOSBottomNav />
    </div>
  );
};

export default LettoWalletPage;
