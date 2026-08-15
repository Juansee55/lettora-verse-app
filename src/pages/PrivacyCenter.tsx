import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Eye, EyeOff, Search, AtSign, Tag, Mail, Cake, Radio,
  Loader2, FileText, Download, UserX, UserRound, MessageSquare, ScrollText, Users, CheckCheck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { IOSSettingItem, IOSSettingSection } from "@/components/ios/IOSSettingItem";

type Flags = {
  is_private: boolean;
  hide_email: boolean;
  hide_birth_date: boolean;
  hide_reading_activity: boolean;
  hide_online_status: boolean;
  searchable: boolean;
  allow_mentions: boolean;
  allow_tags: boolean;
  admin_hide_identity: boolean;
  dm_privacy: string;
  followers_visibility: string;
  show_typing_indicator: boolean;
  show_read_receipts: boolean;
};

const DM_LABELS: Record<string, string> = {
  everyone: "Todos",
  followers: "Solo seguidores",
  nobody: "Nadie",
};

const FOLLOWERS_LABELS: Record<string, string> = {
  all: "Todos",
  followers: "Solo seguidores",
  nobody: "Nadie",
};

const PrivacyCenterPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [flags, setFlags] = useState<Flags | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("is_private, hide_email, hide_birth_date, hide_reading_activity, hide_online_status, searchable, allow_mentions, allow_tags, admin_hide_identity, dm_privacy, followers_visibility, show_typing_indicator, show_read_receipts")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      setIsAdmin((roles || []).some((r: any) => r.role === "admin" || r.role === "moderator"));
      if (profile) setFlags(profile as unknown as Flags);
      setLoading(false);
    })();
  }, [navigate]);

  const update = async (key: keyof Flags, value: boolean | string) => {
    setFlags((prev) => (prev ? { ...prev, [key]: value } as Flags : prev));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ [key]: value } as any).eq("id", user.id);
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
  };

  const cycle = (key: "dm_privacy" | "followers_visibility", options: string[]) => {
    if (!flags) return;
    const idx = options.indexOf(flags[key]);
    update(key, options[(idx + 1) % options.length]);
  };

  const exportData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: profile }, { data: books }, { data: micros }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("books").select("*").eq("author_id", user.id),
      supabase.from("microstories").select("*").eq("author_id", user.id),
    ]);
    const payload = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email }, profile, books, microstories: micros };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lettora-mis-datos-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Datos exportados", description: "Se descargó tu copia en formato JSON." });
  };

  if (loading || !flags) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const toggle = (key: keyof Flags) => (
    <Switch
      checked={Boolean(flags[key])}
      onCheckedChange={(v) => update(key, v)}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <IOSHeader title="Privacidad" subtitle="Controla quién ve tus datos" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-6 py-4"
      >
        <IOSSettingSection title="Visibilidad del perfil" footer="Con el perfil privado solo tus seguidores aprobados verán tu contenido.">
          <IOSSettingItem icon={<Shield className="w-4 h-4" />} iconBg="bg-green-500" title="Perfil privado" subtitle="Solo seguidores ven tu contenido" showChevron={false} action={toggle("is_private")} />
          <IOSSettingItem icon={<Search className="w-4 h-4" />} iconBg="bg-blue-500" title="Aparecer en búsquedas" subtitle="Otros pueden encontrarte por nombre" showChevron={false} action={toggle("searchable")} />
          <IOSSettingItem icon={<Users className="w-4 h-4" />} iconBg="bg-indigo-500" title="Quién ve tus seguidores" value={FOLLOWERS_LABELS[flags.followers_visibility] || "Todos"} onClick={() => cycle("followers_visibility", ["all", "followers", "nobody"])} />
        </IOSSettingSection>

        <IOSSettingSection title="Datos personales">
          <IOSSettingItem icon={<Mail className="w-4 h-4" />} iconBg="bg-rose-500" title="Ocultar mi correo" subtitle="Nunca se muestra en tu perfil" showChevron={false} action={toggle("hide_email")} />
          <IOSSettingItem icon={<Cake className="w-4 h-4" />} iconBg="bg-pink-500" title="Ocultar fecha de nacimiento" showChevron={false} action={toggle("hide_birth_date")} />
          <IOSSettingItem icon={flags.hide_reading_activity ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} iconBg="bg-purple-500" title="Ocultar actividad de lectura" subtitle="Qué libros estás leyendo" showChevron={false} action={toggle("hide_reading_activity")} />
          <IOSSettingItem icon={<Radio className="w-4 h-4" />} iconBg="bg-teal-500" title="Ocultar estado en línea" showChevron={false} action={toggle("hide_online_status")} />
        </IOSSettingSection>

        <IOSSettingSection title="Interacciones" footer="Si desactivas las confirmaciones de lectura, tampoco podrás ver las de otras personas. Los indicadores solo funcionan cuando ambas personas los permiten.">
          <IOSSettingItem icon={<MessageSquare className="w-4 h-4" />} iconBg="bg-violet-500" title="Quién puede escribirte" value={DM_LABELS[flags.dm_privacy] || "Todos"} onClick={() => cycle("dm_privacy", ["everyone", "followers", "nobody"])} />
          <IOSSettingItem icon={<AtSign className="w-4 h-4" />} iconBg="bg-cyan-500" title="Permitir menciones" showChevron={false} action={toggle("allow_mentions")} />
          <IOSSettingItem icon={<Tag className="w-4 h-4" />} iconBg="bg-amber-500" title="Permitir etiquetas" showChevron={false} action={toggle("allow_tags")} />
          <IOSSettingItem
            icon={<UserRound className="w-4 h-4" />}
            iconBg="bg-violet-500"
            title="Mostrar cuando escribo"
            subtitle="Otros verán el indicador mientras redactas"
            showChevron={false}
            action={toggle("show_typing_indicator")}
          />
          <IOSSettingItem
            icon={<CheckCheck className="w-4 h-4" />}
            iconBg="bg-blue-500"
            title="Confirmaciones de lectura"
            subtitle="Permite mostrar cuándo has leído un mensaje"
            showChevron={false}
            action={toggle("show_read_receipts")}
          />
          <IOSSettingItem icon={<UserX className="w-4 h-4" />} iconBg="bg-orange-500" title="Usuarios bloqueados" onClick={() => navigate("/settings")} />
        </IOSSettingSection>

        {isAdmin && (
          <IOSSettingSection title="Privacidad del equipo" footer="Los accesos administrativos a datos de usuarios quedan registrados en el historial de auditoría.">
            <IOSSettingItem icon={<Shield className="w-4 h-4" />} iconBg="bg-emerald-600" title="Ocultar mi identidad como staff" subtitle="Oculta tu fecha de nacimiento y datos en el equipo" showChevron={false} action={toggle("admin_hide_identity")} />
            <IOSSettingItem icon={<ScrollText className="w-4 h-4" />} iconBg="bg-slate-600" title="Registro de auditoría" subtitle="Acciones de administradores sobre datos" onClick={() => navigate("/privacy-audit")} />
          </IOSSettingSection>
        )}

        <IOSSettingSection title="Tus datos">
          <IOSSettingItem icon={<Download className="w-4 h-4" />} iconBg="bg-blue-600" title="Descargar mis datos" subtitle="Copia en JSON de tu cuenta y contenido" onClick={exportData} />
          <IOSSettingItem icon={<FileText className="w-4 h-4" />} iconBg="bg-gray-500" title="Política de privacidad" onClick={() => navigate("/privacy-policy")} />
        </IOSSettingSection>
      </motion.div>
    </div>
  );
};

export default PrivacyCenterPage;
