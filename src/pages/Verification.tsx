import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Star, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import verifiedIcon from "@/assets/verified-icon.png";

interface Plan {
  type: "premium" | "creator";
  name: string;
  price: string;
  priceNote: string;
  icon: any;
  color: string;
  gradient: string;
  glow: string;
  features: string[];
}

const plans: Plan[] = [
  {
    type: "premium",
    name: "Premium",
    price: "$3",
    priceNote: "USD / mes",
    icon: Crown,
    color: "text-amber-500",
    gradient: "from-amber-400 to-yellow-500",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    features: [
      "Insignia dorada de verificado",
      "Prioridad en búsquedas",
      "Nombre destacado en chats",
      "Soporte prioritario",
    ],
  },
  {
    type: "creator",
    name: "Creador",
    price: "$5",
    priceNote: "USD / mes",
    icon: Sparkles,
    color: "text-violet-500",
    gradient: "from-violet-500 to-purple-400",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.3)]",
    features: [
      "Insignia violeta de creador",
      "Estadísticas avanzadas de libros",
      "Badge exclusivo en perfil",
      "Acceso anticipado a funciones",
      "Soporte VIP",
    ],
  },
];

const VerificationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentVerification, setCurrentVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadVerification();
  }, []);

  const loadVerification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data } = await (supabase
      .from("user_verifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle() as any);

    setCurrentVerification(data);
    setLoading(false);
  };

  const handlePurchase = async (type: "premium" | "creator") => {
    setPurchasing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    if (currentVerification) {
      await (supabase
        .from("user_verifications" as any)
        .update({
          verification_type: type,
          status: "active",
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user.id) as any);
    } else {
      await (supabase
        .from("user_verifications" as any)
        .insert({
          user_id: user.id,
          verification_type: type,
          status: "active",
          expires_at: expiresAt.toISOString(),
        } as any) as any);
    }

    toast({ title: "¡Verificación activada! ✨", description: `Tu insignia de ${type} está activa.` });
    setPurchasing(false);
    loadVerification();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <IOSHeader title="Verificación" showBack />

      {/* Hero */}
      <div className="px-6 py-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)]"
        >
          <img src={verifiedIcon} alt="Verified" className="w-12 h-12" />
        </motion.div>
        <h2 className="text-[22px] font-bold">Hazte verificar</h2>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-[280px] mx-auto">
          Obtén tu insignia y destaca en la comunidad de Lettora
        </p>
      </div>

      {/* Official note */}
      <div className="mx-4 mb-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-blue-500">Verificación Oficial</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              La insignia azul oficial es otorgada únicamente por administradores a figuras notables y cuentas oficiales.
            </p>
          </div>
        </div>
      </div>

      {/* Current status */}
      {currentVerification?.status === "active" && (
        <div className="mx-4 mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-[13px] font-semibold text-emerald-600">Estás verificado</p>
              <p className="text-[12px] text-muted-foreground">
                Tipo: {currentVerification.verification_type} · Expira: {new Date(currentVerification.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="px-4 space-y-4">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          const isActive = currentVerification?.status === "active" && currentVerification?.verification_type === plan.type;
          return (
            <motion.div
              key={plan.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-card rounded-2xl border border-border/50 overflow-hidden ${plan.glow}`}
            >
              <div className={`h-1 bg-gradient-to-r ${plan.gradient}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold">{plan.name}</h3>
                      <p className="text-[12px] text-muted-foreground">{plan.priceNote}</p>
                    </div>
                  </div>
                  <span className={`text-[28px] font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                    {plan.price}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center`}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-[13px] text-foreground/80">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePurchase(plan.type)}
                  disabled={purchasing || isActive}
                  className={`w-full py-3 rounded-xl font-semibold text-[15px] transition-all ${
                    isActive
                      ? "bg-muted text-muted-foreground"
                      : `bg-gradient-to-r ${plan.gradient} text-white active:scale-[0.98]`
                  } disabled:opacity-60`}
                >
                  {purchasing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : isActive ? (
                    "Plan actual"
                  ) : (
                    "Obtener verificación"
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="px-4 mt-8 mb-4">
        <h3 className="text-[15px] font-semibold mb-3">Preguntas frecuentes</h3>
        <div className="space-y-3">
          {[
            { q: "¿Puedo cancelar?", a: "Sí, en cualquier momento. Tu insignia seguirá activa hasta la fecha de expiración." },
            { q: "¿Se renueva automáticamente?", a: "No, debes renovar manualmente cada mes." },
            { q: "¿Cómo obtengo la insignia oficial?", a: "La verificación oficial (azul) es otorgada por el equipo de Lettora a cuentas notables." },
          ].map((faq, i) => (
            <div key={i} className="bg-card rounded-xl p-3 border border-border/50">
              <p className="text-[13px] font-semibold">{faq.q}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <IOSBottomNav />
    </div>
  );
};

export default VerificationPage;
