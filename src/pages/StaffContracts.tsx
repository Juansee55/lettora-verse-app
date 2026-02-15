import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, ExternalLink, Calendar, User, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface StaffContract {
  id: string;
  title: string;
  description: string | null;
  form_link: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  ends_at: string | null;
  is_active: boolean;
  admin_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const StaffContractsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [contracts, setContracts] = useState<StaffContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      const { data } = await supabase
        .from("staff_contracts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map(c => c.created_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", adminIds);

        const enriched = data.map(c => ({
          ...c,
          admin_profile: profiles?.find(p => p.id === c.created_by) || null,
        }));
        setContracts(enriched);
      }
      setLoading(false);
    };
    fetchContracts();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (endsAt: string | null) => {
    if (!endsAt) return false;
    return new Date(endsAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[17px]">{t("back")}</span>
          </button>
          <h1 className="font-display font-semibold text-[17px]">{t("staffContract")}</h1>
          <div className="w-16" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : contracts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center px-8 pt-32"
        >
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-bold mb-2">{t("noContracts")}</h2>
          <p className="text-muted-foreground text-center text-[15px]">
            {t("noContractsDesc")}
          </p>
        </motion.div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {contracts.map((contract, index) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-card rounded-2xl overflow-hidden border border-border/50"
            >
              {/* Cover image */}
              {contract.cover_url && (
                <div className="w-full h-40 overflow-hidden">
                  <img
                    src={contract.cover_url}
                    alt={contract.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                {/* Title & Status */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[17px] font-bold leading-tight flex-1">{contract.title}</h3>
                  {contract.ends_at && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ml-2 ${
                      isExpired(contract.ends_at) ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    }`}>
                      {isExpired(contract.ends_at) ? t("expired") : t("active")}
                    </span>
                  )}
                </div>

                {/* Description */}
                {contract.description && (
                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-3">
                    {contract.description}
                  </p>
                )}

                {/* Admin info */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden">
                    {contract.admin_profile?.avatar_url ? (
                      <img src={contract.admin_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[13px] text-muted-foreground">
                    {contract.admin_profile?.display_name || contract.admin_profile?.username || "Admin"}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">·</span>
                  <div className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                    <Calendar className="w-3 h-3" />
                    {formatDate(contract.created_at)}
                  </div>
                </div>

                {/* End date */}
                {contract.ends_at && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    {t("endsAt")}: {formatDate(contract.ends_at)}
                  </div>
                )}

                {/* Form link CTA */}
                {contract.form_link && (
                  <a
                    href={contract.form_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-[15px] active:scale-[0.98] transition-transform"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("openForm")}
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffContractsPage;
