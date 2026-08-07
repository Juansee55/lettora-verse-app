import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ScrollText, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IOSHeader } from "@/components/ios/IOSHeader";

interface LogRow {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  entity_type: string | null;
  details: any;
  created_at: string;
}

const PrivacyAuditPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = (roles || []).some((r: any) => r.role === "admin");
      setAllowed(admin);
      if (admin) {
        const { data } = await supabase
          .from("privacy_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        const list = (data || []) as LogRow[];
        setRows(list);
        const ids = Array.from(new Set(list.flatMap((r) => [r.admin_id, r.target_user_id].filter(Boolean) as string[])));
        if (ids.length) {
          const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p: any) => { map[p.id] = p.display_name || p.username || "Usuario"; });
          setNames(map);
        }
      }
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <IOSHeader title="Auditoría de privacidad" subtitle="Accesos administrativos a datos" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {!allowed ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Solo los administradores pueden ver esta sección.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Sin registros por ahora.</p>
          </div>
        ) : (
          rows.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-card rounded-2xl border border-border/50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-[14px]">{r.action}</p>
                <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {names[r.admin_id] || "Admin"}
                {r.target_user_id ? ` → ${names[r.target_user_id] || "Usuario"}` : ""}
                {r.entity_type ? ` · ${r.entity_type}` : ""}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default PrivacyAuditPage;
