import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, MessageSquarePlus, CheckCircle2, Clock, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { useLanguage } from "@/contexts/LanguageContext";

interface Proposal {
  id: string;
  content: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const ProposalsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allProposals, setAllProposals] = useState<any[]>([]);
  const [tab, setTab] = useState<"mine" | "all">("mine");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!roleData);

    const { data } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setProposals(data.filter((p: any) => p.user_id === user.id));
      if (roleData) setAllProposals(data);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!content.trim() || content.trim().length < 10) {
      toast({ title: "Escribe al menos 10 caracteres", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("proposals").insert({
      user_id: user.id,
      content: content.trim(),
    } as any);

    if (!error) {
      toast({ title: "¡Propuesta enviada! ✨" });
      setContent("");
      fetchData();
    }
    setSending(false);
  };

  const handleUpdateStatus = async (id: string, status: string, response?: string) => {
    await supabase.from("proposals").update({ status, admin_response: response || null } as any).eq("id", id);
    fetchData();
    toast({ title: "Propuesta actualizada" });
  };

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-amber-500", label: "Pendiente" },
    reviewed: { icon: CheckCircle2, color: "text-blue-500", label: "Revisada" },
    implemented: { icon: Sparkles, color: "text-green-500", label: "Implementada" },
  };

  const displayList = isAdmin && tab === "all" ? allProposals : proposals;

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
          <h1 className="font-semibold text-[17px]">Propuestas</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageSquarePlus className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-[19px] font-bold">Envía tu propuesta</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Comparte ideas y sugerencias para mejorar Lettora</p>
        </motion.div>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe tu idea o sugerencia..."
            rows={4}
            maxLength={500}
            className="w-full bg-muted/50 rounded-xl p-3 text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[12px] text-muted-foreground">{content.length}/500</span>
            <button
              onClick={handleSend}
              disabled={sending || content.trim().length < 10}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[14px] font-semibold disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </button>
          </div>
        </motion.div>

        {/* Admin tabs */}
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setTab("mine")}
              className={`flex-1 py-2 rounded-xl text-[14px] font-medium transition-colors ${tab === "mine" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Mis propuestas
            </button>
            <button
              onClick={() => setTab("all")}
              className={`flex-1 py-2 rounded-xl text-[14px] font-medium transition-colors ${tab === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Todas ({allProposals.length})
            </button>
          </div>
        )}

        {/* List */}
        {displayList.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquarePlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay propuestas aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayList.map((p, i) => {
              const st = statusConfig[p.status] || statusConfig.pending;
              const Icon = st.icon;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${st.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] leading-relaxed">{p.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[12px] font-medium ${st.color}`}>{st.label}</span>
                        <span className="text-[12px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {p.admin_response && (
                        <div className="mt-2 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
                          <p className="text-[13px] text-primary font-medium">Respuesta del equipo:</p>
                          <p className="text-[13px] mt-0.5">{p.admin_response}</p>
                        </div>
                      )}
                      {isAdmin && tab === "all" && (
                        <div className="flex gap-2 mt-3">
                          {p.status !== "reviewed" && (
                            <button onClick={() => handleUpdateStatus(p.id, "reviewed")} className="text-[12px] px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg font-medium">
                              Marcar revisada
                            </button>
                          )}
                          {p.status !== "implemented" && (
                            <button onClick={() => handleUpdateStatus(p.id, "implemented")} className="text-[12px] px-3 py-1 bg-green-500/10 text-green-500 rounded-lg font-medium">
                              Implementada
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <IOSBottomNav />
    </div>
  );
};

export default ProposalsPage;
