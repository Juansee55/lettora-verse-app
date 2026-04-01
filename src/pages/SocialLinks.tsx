import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, ExternalLink, Trash2, Loader2, X, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const platformIcons: Record<string, { svg: string; color: string }> = {
  tiktok: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.46a8.21 8.21 0 004.76 1.51V6.52a4.84 4.84 0 01-1-.17z"/></svg>`,
    color: "from-gray-900 to-gray-700"
  },
  instagram: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    color: "from-pink-500 to-orange-400"
  },
  facebook: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    color: "from-blue-600 to-blue-500"
  },
  discord: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
    color: "from-indigo-500 to-violet-500"
  },
  whatsapp: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    color: "from-green-500 to-emerald-400"
  },
  twitter: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    color: "from-gray-800 to-gray-600"
  },
  youtube: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    color: "from-red-600 to-red-500"
  },
  threads: {
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.723 2.04-1.128 3.457-1.206 1.065-.058 2.06.042 2.961.298.011-.634-.036-1.218-.141-1.743-.308-1.533-1.135-2.313-2.457-2.314-1.604.027-2.655.675-3.116 1.925l-1.92-.574c.668-1.813 2.21-2.89 4.217-3.01h.295c1.528 0 2.735.537 3.584 1.594.753.936 1.158 2.216 1.212 3.817.585.306 1.106.68 1.56 1.12 1.088 1.054 1.75 2.478 1.883 4.075.075.89-.006 2.029-.624 3.21-.79 1.507-2.226 2.697-4.265 3.536C16.23 23.454 14.39 23.98 12.186 24zm.193-8.65c-1.054.058-1.89.322-2.486.785-.533.412-.789.932-.762 1.543.037.797.512 1.39 1.41 1.76.597.245 1.275.347 1.994.305 1.165-.063 2.07-.484 2.685-1.25.495-.616.847-1.446 1.05-2.476-.756-.242-1.589-.368-2.49-.418a8.79 8.79 0 00-1.4-.003v-.246z"/></svg>`,
    color: "from-gray-800 to-gray-600"
  },
  other: {
    svg: "",
    color: "from-primary to-primary/80"
  },
};

const platformOptions = [
  "TikTok", "Instagram", "Facebook", "Discord",
  "WhatsApp", "Twitter/X", "YouTube", "Threads", "Otro",
];

const SocialLinksPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState("TikTok");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

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
      platform: newPlatform, url: newUrl.trim(), icon: platformKey, display_order: links.length, created_by: user.id,
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
            <span className="text-[17px]">{t("back")}</span>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Globe className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-[19px] font-bold">Lettora en redes</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Síguenos en nuestras redes sociales oficiales</p>
        </motion.div>

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
                <motion.div key={link.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl overflow-hidden">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3.5 p-4 active:bg-muted/60 transition-colors">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconData.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {iconData.svg ? (
                        <div dangerouslySetInnerHTML={{ __html: iconData.svg }} />
                      ) : (
                        <Globe className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-semibold">{link.platform}</p>
                      <p className="text-[13px] text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, "")}</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  </a>
                  {isAdmin && (
                    <div className="border-t border-border/50 px-4 py-2 flex justify-end">
                      <button onClick={() => handleDelete(link.id)} className="text-[13px] text-destructive font-medium flex items-center gap-1">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-3xl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-[17px] font-semibold">Añadir red social</h2>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="p-4 pb-8 space-y-4">
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Plataforma</label>
                  <div className="flex flex-wrap gap-2">
                    {platformOptions.map((p) => (
                      <button key={p} onClick={() => setNewPlatform(p)} className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${newPlatform === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-muted-foreground mb-2 block">URL</label>
                  <Input placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="rounded-xl" />
                </div>
                <Button onClick={handleAdd} disabled={saving || !newUrl.trim()} className="w-full rounded-xl h-11">
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
