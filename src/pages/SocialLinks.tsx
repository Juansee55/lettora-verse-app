import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, ExternalLink, Trash2, Loader2, X, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const platformIcons: Record<string, { emoji: string; color: string }> = {
  tiktok: { emoji: "🎵", color: "from-gray-900 to-gray-700" },
  instagram: { emoji: "📸", color: "from-pink-500 to-orange-400" },
  facebook: { emoji: "📘", color: "from-blue-600 to-blue-500" },
  discord: { emoji: "🎮", color: "from-indigo-500 to-violet-500" },
  whatsapp: { emoji: "💬", color: "from-green-500 to-emerald-400" },
  twitter: { emoji: "🐦", color: "from-sky-400 to-blue-500" },
  youtube: { emoji: "🎬", color: "from-red-600 to-red-500" },
  threads: { emoji: "🧵", color: "from-gray-800 to-gray-600" },
  other: { emoji: "🔗", color: "from-primary to-primary/80" },
};

const platformOptions = [
  "TikTok", "Instagram", "Facebook", "Discord",
  "WhatsApp", "Twitter/X", "YouTube", "Threads", "Otro",
];

const SocialLinksPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState("TikTok");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: roleData }, { data: linksData }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabase.from("social_links").select("*").eq("is_active", true).order("display_order"),
    ]);

    setIsAdmin(!!roleData);
    if (linksData) setLinks(linksData as SocialLink[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const platformKey = newPlatform.toLowerCase().replace("/x", "").replace("otro", "other");
    const { data, error } = await supabase.from("social_links").insert({
      platform: newPlatform,
      url: newUrl.trim(),
      icon: platformKey,
      display_order: links.length,
      created_by: user.id,
    } as any).select().single();

    if (!error && data) {
      setLinks(prev => [...prev, data as SocialLink]);
      setNewUrl("");
      setShowAddModal(false);
      toast({ title: "Red social añadida ✅" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("social_links").delete().eq("id", id);
    setLinks(prev => prev.filter(l => l.id !== id));
    toast({ title: "Eliminado" });
  };

  const getIcon = (icon: string) => platformIcons[icon] || platformIcons.other;

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
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">Atrás</span>
          </button>
          <h1 className="font-semibold text-[17px]">Redes Sociales</h1>
          {isAdmin ? (
            <button onClick={() => setShowAddModal(true)} className="text-primary active:opacity-60">
              <Plus className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>
      </header>

      <main className="px-4 pt-4 space-y-3">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Globe className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-[19px] font-bold">Lettora en redes</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Síguenos en nuestras redes sociales oficiales</p>
        </motion.div>

        {/* Links */}
        {links.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay redes sociales aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link, i) => {
              const iconData = getIcon(link.icon);
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl overflow-hidden"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3.5 p-4 active:bg-muted/60 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconData.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {iconData.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-semibold">{link.platform}</p>
                      <p className="text-[13px] text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, "")}</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  </a>
                  {isAdmin && (
                    <div className="border-t border-border/50 px-4 py-2 flex justify-end">
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="text-[13px] text-destructive font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-[17px] font-semibold">Añadir red social</h2>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 pb-8 space-y-4">
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Plataforma</label>
                  <div className="flex flex-wrap gap-2">
                    {platformOptions.map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewPlatform(p)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                          newPlatform === p
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">URL</label>
                  <Input
                    placeholder="https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={saving || !newUrl.trim()}
                  className="w-full rounded-xl h-11"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Añadir"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IOSBottomNav />
    </div>
  );
};

export default SocialLinksPage;
