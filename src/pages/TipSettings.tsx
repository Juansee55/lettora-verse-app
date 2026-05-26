import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Save, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { IOSSettingItem, IOSSettingSection } from "@/components/ios/IOSSettingItem";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";

const TipSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const [paypalUrl, setPaypalUrl] = useState("");
  const [stripeUrl, setStripeUrl] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tips_enabled, tip_paypal_url, tip_stripe_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setTipsEnabled(profile.tips_enabled || false);
        setPaypalUrl(profile.tip_paypal_url || "");
        setStripeUrl(profile.tip_stripe_url || "");
      }
      setLoading(false);
    };
    loadSettings();
  }, [navigate]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        tips_enabled: tipsEnabled,
        tip_paypal_url: paypalUrl,
        tip_stripe_url: stripeUrl,
      } as any)
      .eq("id", userId);

    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } else {
      toast({ title: "Configuración guardada ✨" });
    }
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
      <header className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-[17px] font-semibold">Propinas</h1>
          </div>
          <Button 
            variant="ghost" 
            className="text-primary font-semibold" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </header>

      <main className="space-y-6 pt-4">
        <div className="px-4 text-muted-foreground text-[14px]">
          Activa las propinas para que tus lectores puedan apoyarte directamente. Lettora no retiene ninguna comisión.
        </div>

        <IOSSettingSection>
          <IOSSettingItem
            icon={<DollarSign className="w-4 h-4" />}
            iconBg="bg-green-500"
            title="Activar Propinas"
            action={
              <Switch
                checked={tipsEnabled}
                onCheckedChange={setTipsEnabled}
              />
            }
            showChevron={false}
          />
        </IOSSettingSection>

        {tipsEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <IOSSettingSection title="Enlaces de Pago">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium px-1">PayPal.me URL</label>
                  <Input 
                    placeholder="https://paypal.me/tuusuario" 
                    value={paypalUrl}
                    onChange={(e) => setPaypalUrl(e.target.value)}
                    className="bg-muted/50 border-none rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium px-1">Stripe Payment Link</label>
                  <Input 
                    placeholder="https://buy.stripe.com/..." 
                    value={stripeUrl}
                    onChange={(e) => setStripeUrl(e.target.value)}
                    className="bg-muted/50 border-none rounded-xl h-11"
                  />
                </div>
              </div>
            </IOSSettingSection>
            
            <div className="px-6 text-[12px] text-muted-foreground">
              Asegúrate de que los enlaces sean correctos. Los usuarios verán un botón en tu perfil que los redirigirá a estas plataformas.
            </div>
          </motion.div>
        )}
      </main>

      <IOSBottomNav />
    </div>
  );
};

export default TipSettingsPage;
