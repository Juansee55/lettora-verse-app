import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, 
  History, Info, Loader2, Copy, Check, Send, 
  ChevronRight, QrCode, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import OnboardingSlide from "@/components/onboarding/OnboardingSlide";

const LettoWalletPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showIntro, setShowIntro] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const initWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Check if user has seen wallet intro
      const hasSeenIntro = localStorage.getItem(`lettora_wallet_intro_${user.id}`);
      if (!hasSeenIntro) setShowIntro(true);

      // Load or create wallet
      let { data: walletData } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!walletData) {
        // Generate unique CBU and Alias
        const cbu = "000" + Math.floor(Math.random() * 1000000000000000000).toString().padStart(19, "0");
        const alias = `${user.email?.split("@")[0] || "user"}.letto.wallet`;
        
        const { data: newWallet, error } = await supabase
          .from("wallets" as any)
          .insert({
            user_id: user.id,
            balance: 100, // Initial bonus
            cbu_cvu: cbu,
            alias: alias
          })
          .select()
          .single();
        
        if (newWallet) walletData = newWallet;
      }

      setWallet(walletData);

      // Load transactions
      if (walletData) {
        const { data: txs } = await supabase
          .from("wallet_transactions" as any)
          .select("*, sender:sender_wallet_id(wallets(profiles(username))), receiver:receiver_wallet_id(wallets(profiles(username)))")
          .or(`sender_wallet_id.eq.${walletData.id},receiver_wallet_id.eq.${walletData.id}`)
          .order("created_at", { ascending: false });
        setTransactions(txs || []);
      }

      setLoading(false);
    };

    initWallet();
  }, [navigate]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: "Copiado al portapapeles" });
    setTimeout(() => setCopied(null), 2000);
  };

  const finishIntro = () => {
    if (wallet?.user_id) {
      localStorage.setItem(`lettora_wallet_intro_${wallet.user_id}`, "true");
    }
    setShowIntro(false);
  };

  const introSlides = [
    {
      title: "Bienvenido a LettoWallet",
      description: "Tu nueva billetera virtual dentro de Lettora Verse. Aquí podrás gestionar tus LettoPays de forma segura.",
      icon: <Wallet className="w-16 h-16 text-primary" />,
      color: "bg-primary"
    },
    {
      title: "LettoPays",
      description: "La moneda oficial de la app. Úsala para apoyar a tus autores favoritos, comprar items exclusivos o transferir a amigos.",
      icon: <Sparkles className="w-16 h-16 text-amber-500" />,
      color: "bg-amber-500"
    },
    {
      title: "Transferencias Instantáneas",
      description: "Envía y recibe LettoPays al instante usando tu Alias único o CBU. Sin comisiones, 100% funcional.",
      icon: <Send className="w-16 h-16 text-blue-500" />,
      color: "bg-blue-500"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              className="space-y-6"
            >
              <div className={`w-32 h-32 rounded-3xl ${introSlides[currentSlide].color}/10 flex items-center justify-center mx-auto mb-8`}>
                {introSlides[currentSlide].icon}
              </div>
              <h2 className="text-3xl font-bold">{introSlides[currentSlide].title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {introSlides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="p-8 space-y-4">
          <div className="flex justify-center gap-2 mb-4">
            {introSlides.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"}`} 
              />
            ))}
          </div>
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold" 
            onClick={() => {
              if (currentSlide < introSlides.length - 1) {
                setCurrentSlide(s => s + 1);
              } else {
                finishIntro();
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
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-[17px] font-semibold">LettoWallet</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <Info className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Balance Card - iOS 26 Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-violet-600 rounded-[32px] p-6 text-white shadow-xl shadow-primary/20"
        >
          <div className="relative z-10">
            <p className="text-primary-foreground/80 text-[15px] font-medium mb-1">Saldo disponible</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold tracking-tight">{wallet?.balance?.toLocaleString()}</h2>
              <span className="text-xl font-medium opacity-90">LettoPays</span>
            </div>
            
            <div className="mt-8 flex gap-3">
              <Button className="flex-1 bg-white/20 hover:bg-white/30 border-none h-12 rounded-2xl font-bold backdrop-blur-md">
                <ArrowUpRight className="w-5 h-5 mr-2" /> Enviar
              </Button>
              <Button className="flex-1 bg-white/20 hover:bg-white/30 border-none h-12 rounded-2xl font-bold backdrop-blur-md">
                <ArrowDownLeft className="w-5 h-5 mr-2" /> Recibir
              </Button>
            </div>
          </div>
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-400/20 rounded-full -ml-12 -mb-12 blur-2xl" />
        </motion.div>

        {/* Account Info Section */}
        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-2">Detalles de cuenta</h3>
          <div className="bg-card rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-muted-foreground">CBU / CVU</p>
                <p className="text-[15px] font-mono font-medium">{wallet?.cbu_cvu}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(wallet?.cbu_cvu, "cbu")}>
                {copied === "cbu" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-muted-foreground">Alias único</p>
                <p className="text-[15px] font-medium">{wallet?.alias}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(wallet?.alias, "alias")}>
                {copied === "alias" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Actividad reciente</h3>
            <Button variant="ghost" className="text-primary text-[13px] h-auto p-0 font-semibold">Ver todo</Button>
          </div>
          
          <div className="space-y-2">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-card p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    tx.sender_wallet_id === wallet.id ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                  }`}>
                    {tx.sender_wallet_id === wallet.id ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[15px]">
                      {tx.sender_wallet_id === wallet.id ? "Transferencia enviada" : "Transferencia recibida"}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-[16px] ${
                      tx.sender_wallet_id === wallet.id ? "text-foreground" : "text-green-500"
                    }`}>
                      {tx.sender_wallet_id === wallet.id ? "-" : "+"}{tx.amount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">LettoPays</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card/50 border-2 border-dashed border-border rounded-3xl p-8 text-center space-y-2">
                <History className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground font-medium">No hay movimientos aún</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <IOSBottomNav />
    </div>
  );
};

export default LettoWalletPage;
