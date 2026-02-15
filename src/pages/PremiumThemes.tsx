import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Check, Lock, Palette, Type, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePremium } from "@/hooks/usePremium";
import { useToast } from "@/hooks/use-toast";
import PremiumBadge from "@/components/premium/PremiumBadge";

interface ThemeOption {
  id: string;
  label: string;
  value: string;
  preview: string; // CSS class for preview
  category: "background" | "gradient" | "font";
}

const backgroundThemes: ThemeOption[] = [
  { id: "bg-midnight", label: "Medianoche", value: "premium-bg-midnight", preview: "bg-gradient-to-br from-slate-900 to-indigo-950", category: "background" },
  { id: "bg-aurora", label: "Aurora Boreal", value: "premium-bg-aurora", preview: "bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900", category: "background" },
  { id: "bg-sunset", label: "Atardecer", value: "premium-bg-sunset", preview: "bg-gradient-to-br from-orange-900 via-rose-900 to-purple-950", category: "background" },
  { id: "bg-ocean", label: "Océano", value: "premium-bg-ocean", preview: "bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-950", category: "background" },
  { id: "bg-forest", label: "Bosque", value: "premium-bg-forest", preview: "bg-gradient-to-br from-green-950 via-emerald-900 to-lime-950", category: "background" },
  { id: "bg-sakura", label: "Sakura", value: "premium-bg-sakura", preview: "bg-gradient-to-br from-pink-200 via-rose-100 to-fuchsia-200", category: "background" },
  { id: "bg-lavender", label: "Lavanda", value: "premium-bg-lavender", preview: "bg-gradient-to-br from-violet-200 via-purple-100 to-indigo-200", category: "background" },
  { id: "bg-golden", label: "Dorado", value: "premium-bg-golden", preview: "bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-200", category: "background" },
];

const gradientThemes: ThemeOption[] = [
  { id: "gr-neon", label: "Neón", value: "premium-gr-neon", preview: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500", category: "gradient" },
  { id: "gr-fire", label: "Fuego", value: "premium-gr-fire", preview: "bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500", category: "gradient" },
  { id: "gr-ice", label: "Hielo", value: "premium-gr-ice", preview: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600", category: "gradient" },
  { id: "gr-nature", label: "Naturaleza", value: "premium-gr-nature", preview: "bg-gradient-to-r from-emerald-500 via-green-400 to-lime-500", category: "gradient" },
  { id: "gr-cosmic", label: "Cósmico", value: "premium-gr-cosmic", preview: "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700", category: "gradient" },
  { id: "gr-rose-gold", label: "Oro Rosa", value: "premium-gr-rose-gold", preview: "bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300", category: "gradient" },
];

const fontThemes: ThemeOption[] = [
  { id: "font-elegant", label: "Elegante", value: "premium-font-elegant", preview: "font-serif", category: "font" },
  { id: "font-modern", label: "Moderna", value: "premium-font-modern", preview: "font-sans tracking-wide", category: "font" },
  { id: "font-creative", label: "Creativa", value: "premium-font-creative", preview: "font-mono", category: "font" },
];

type TabKey = "backgrounds" | "gradients" | "fonts";

const tabs: { key: TabKey; label: string; icon: typeof Palette }[] = [
  { key: "backgrounds", label: "Fondos", icon: Palette },
  { key: "gradients", label: "Gradientes", icon: Sparkles },
  { key: "fonts", label: "Fuentes", icon: Type },
];

const PremiumThemesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { premiumData, loading: premiumLoading } = usePremium(currentUserId);
  const [activeTab, setActiveTab] = useState<TabKey>("backgrounds");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("premium_theme")
        .eq("id", user.id)
        .single();

      if (profile?.premium_theme) {
        setSelectedTheme(profile.premium_theme);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSelectTheme = async (theme: ThemeOption) => {
    if (!premiumData.isPremium) {
      toast({ title: "Solo Premium", description: "Necesitas una suscripción Premium para usar temas exclusivos.", variant: "destructive" });
      return;
    }
    if (!currentUserId) return;

    setSaving(true);
    const newValue = selectedTheme === theme.value ? null : theme.value;

    const { error } = await supabase
      .from("profiles")
      .update({ premium_theme: newValue })
      .eq("id", currentUserId);

    if (error) {
      toast({ title: "Error", description: "No se pudo guardar el tema.", variant: "destructive" });
    } else {
      setSelectedTheme(newValue);
      toast({ title: newValue ? "Tema aplicado" : "Tema eliminado", description: newValue ? `"${theme.label}" es tu nuevo tema.` : "Tu perfil volvió al tema predeterminado." });
    }
    setSaving(false);
  };

  const getCurrentThemes = (): ThemeOption[] => {
    switch (activeTab) {
      case "backgrounds": return backgroundThemes;
      case "gradients": return gradientThemes;
      case "fonts": return fontThemes;
    }
  };

  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="ios-header">
        <div className="flex items-center gap-3 px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-semibold flex-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Temas de Perfil
          </h1>
          <PremiumBadge compact />
        </div>
      </header>

      {/* Premium Gate */}
      {!premiumData.isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">Contenido exclusivo</p>
              <p className="text-[12px] text-muted-foreground">Suscríbete a Premium para personalizar tu perfil</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview Card */}
      <div className="mx-4 mt-4">
        <div className={`rounded-2xl overflow-hidden h-32 relative ${
          selectedTheme 
            ? [...backgroundThemes, ...gradientThemes].find(t => t.value === selectedTheme)?.preview || "bg-gradient-hero"
            : "bg-gradient-hero"
        }`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-background/30 backdrop-blur-sm mx-auto mb-2 flex items-center justify-center">
                <span className={`text-lg font-bold text-white ${
                  fontThemes.find(f => f.value === selectedTheme)?.preview || ""
                }`}>
                  Aa
                </span>
              </div>
              <p className="text-white/90 text-[13px] font-medium">Vista previa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Grid */}
      <div className="px-4 mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "fonts" ? (
              <div className="space-y-2">
                {getCurrentThemes().map((theme, i) => {
                  const isSelected = selectedTheme === theme.value;
                  return (
                    <motion.button
                      key={theme.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelectTheme(theme)}
                      disabled={saving || !premiumData.isPremium}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/50 bg-card hover:bg-muted/50"
                      } ${!premiumData.isPremium ? "opacity-50" : ""}`}
                    >
                      <span className={`text-[18px] ${theme.preview}`}>{theme.label}</span>
                      <span className="flex-1 text-left text-[13px] text-muted-foreground">
                        Ejemplo de texto con esta fuente
                      </span>
                      {!premiumData.isPremium ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {getCurrentThemes().map((theme, i) => {
                  const isSelected = selectedTheme === theme.value;
                  return (
                    <motion.button
                      key={theme.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelectTheme(theme)}
                      disabled={saving || !premiumData.isPremium}
                      className={`relative rounded-xl overflow-hidden aspect-[4/3] transition-all ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      } ${!premiumData.isPremium ? "opacity-50" : "active:scale-95"}`}
                    >
                      <div className={`absolute inset-0 ${theme.preview}`} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {!premiumData.isPremium ? (
                          <Lock className="w-5 h-5 text-white/70 mb-1" />
                        ) : isSelected ? (
                          <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center mb-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : null}
                        <span className="text-white text-[13px] font-semibold drop-shadow-md">{theme.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Reset button */}
      {selectedTheme && premiumData.isPremium && (
        <div className="px-4 mt-6">
          <Button
            variant="outline"
            className="w-full rounded-xl h-11"
            onClick={() => handleSelectTheme({ id: "", label: "Predeterminado", value: selectedTheme, preview: "", category: "background" })}
            disabled={saving}
          >
            Restablecer tema predeterminado
          </Button>
        </div>
      )}
    </div>
  );
};

export default PremiumThemesPage;
