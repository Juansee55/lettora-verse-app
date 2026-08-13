import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BriefcaseBusiness, Users, ShieldCheck, CalendarClock, Send, X, CheckCircle2, UserRoundPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Vacancy = {
  id: string;
  title: string;
  team: string;
  description: string;
  requirements: string | null;
  openings: number;
  status: "open" | "closed" | "archived";
  closes_at: string | null;
};

type Application = { vacancy_id: string; status: "pending" | "approved" | "rejected" | "withdrawn" };

type StaffMember = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  title: string;
  team: string;
  assigned_at: string;
};

const RecruitmentPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingFor, setApplyingFor] = useState<Vacancy | null>(null);
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRecruitment = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const [vacanciesRes, staffRes, applicationsRes] = await Promise.all([
      (supabase.from("staff_vacancies" as any).select("id, title, team, description, requirements, openings, status, closes_at").eq("status", "open").or(`closes_at.is.null,closes_at.gt.${now}`).order("created_at", { ascending: false }) as any),
      supabase.rpc("get_public_staff" as any),
      user
        ? (supabase.from("staff_applications" as any).select("vacancy_id, status").eq("applicant_id", user.id) as any)
        : Promise.resolve({ data: [] }),
    ]);

    if (vacanciesRes.error) {
      toast({ title: "No se pudieron cargar las vacantes", description: vacanciesRes.error.message, variant: "destructive" });
    }
    setVacancies((vacanciesRes.data || []) as Vacancy[]);
    setStaff((staffRes.data || []) as StaffMember[]);
    setApplications((applicationsRes.data || []) as Application[]);
    setLoading(false);
  };

  useEffect(() => { void loadRecruitment(); }, []);

  const applicationByVacancy = useMemo(
    () => new Map(applications.map((application) => [application.vacancy_id, application.status])),
    [applications],
  );

  const submitApplication = async () => {
    if (!applyingFor) return;
    if (motivation.trim().length < 40) {
      toast({ title: "Cuéntanos un poco más", description: "La motivación debe tener al menos 40 caracteres.", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Inicia sesión para postularte", description: "Necesitas una cuenta de Lettora para enviar tu candidatura." });
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase.from("staff_applications" as any).insert({
      vacancy_id: applyingFor.id,
      applicant_id: user.id,
      motivation: motivation.trim(),
      relevant_experience: experience.trim() || null,
    }) as any);
    setSubmitting(false);

    if (error) {
      const alreadyApplied = error.code === "23505";
      toast({
        title: alreadyApplied ? "Ya enviaste una postulación" : "No se pudo enviar la postulación",
        description: alreadyApplied ? "Cada persona puede postularse una vez por vacante." : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Postulación enviada", description: "El equipo la revisará manualmente desde administración." });
    setApplications((current) => [...current, { vacancy_id: applyingFor.id, status: "pending" }]);
    setApplyingFor(null);
    setMotivation("");
    setExperience("");
  };

  const formatCloseDate = (date: string | null) => date
    ? `Cierra el ${new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date(date))}`
    : "Sin fecha de cierre";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="h-14 px-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1 text-primary" aria-label="Volver"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-display text-[17px] font-semibold">Únete al equipo</h1>
          <div className="w-7" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/10" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/15 flex items-center justify-center"><UserRoundPlus className="w-6 h-6 text-primary" /></div>
            <div>
              <h2 className="font-display text-xl font-bold">Haz crecer Lettora con nosotros</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Las candidaturas se revisan manualmente. Ser seleccionado para un equipo no concede automáticamente permisos de administrador.</p>
            </div>
          </div>
        </motion.section>

        <section>
          <div className="flex items-center gap-2 mb-3"><BriefcaseBusiness className="w-5 h-5 text-primary" /><h2 className="font-semibold text-lg">Vacantes disponibles</h2></div>
          {loading ? (
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">Cargando vacantes…</div>
          ) : vacancies.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center"><BriefcaseBusiness className="w-8 h-8 mx-auto mb-2 text-muted-foreground" /><p className="font-medium">No hay vacantes abiertas ahora mismo.</p><p className="mt-1 text-sm text-muted-foreground">Vuelve pronto para conocer nuevas oportunidades.</p></div>
          ) : (
            <div className="space-y-3">
              {vacancies.map((vacancy, index) => {
                const applicationStatus = applicationByVacancy.get(vacancy.id);
                return (
                  <motion.article key={vacancy.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="rounded-2xl border border-border/50 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{vacancy.team}</span><h3 className="mt-2 font-semibold text-[17px]">{vacancy.title}</h3></div>
                      <span className="shrink-0 text-xs text-muted-foreground">{vacancy.openings} plaza{vacancy.openings !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{vacancy.description}</p>
                    {vacancy.requirements && <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><strong className="text-foreground">Requisitos:</strong> {vacancy.requirements}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="w-3.5 h-3.5" /> {formatCloseDate(vacancy.closes_at)}</span>
                      {applicationStatus ? <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> {applicationStatus === "pending" ? "Postulación enviada" : applicationStatus === "approved" ? "Aceptada" : applicationStatus === "rejected" ? "Revisada" : "Retirada"}</span> : <Button size="sm" className="rounded-xl" onClick={() => setApplyingFor(vacancy)}><Send className="w-3.5 h-3.5 mr-1.5" /> Postularme</Button>}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>

        {staff.length > 0 && <section>
          <div className="flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-primary" /><h2 className="font-semibold text-lg">Equipos de Lettora</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{staff.map((member) => <div key={`${member.id}-${member.title}`} className="rounded-2xl border border-border/40 bg-card p-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center font-semibold text-primary">{member.avatar_url ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" /> : (member.display_name || "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="font-medium text-sm truncate">{member.display_name || member.username || "Miembro"}</p><p className="text-xs text-primary truncate">{member.title}</p><p className="text-[11px] text-muted-foreground truncate">{member.team}</p></div></div>)}</div>
        </section>}
      </main>

      <AnimatePresence>{applyingFor && <motion.div className="fixed inset-0 z-[100] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="absolute inset-0 bg-black/50" aria-label="Cerrar" onClick={() => !submitting && setApplyingFor(null)} /><motion.section initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="relative w-full max-w-xl rounded-t-3xl border-t border-border/40 bg-background p-5 pb-8 max-h-[88vh] overflow-y-auto"><div className="flex items-center justify-between gap-4"><div><p className="text-xs text-primary font-semibold">{applyingFor.team}</p><h2 className="text-lg font-bold">Postularme a {applyingFor.title}</h2></div><button onClick={() => setApplyingFor(null)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button></div><label className="block mt-5 text-sm font-medium">¿Por qué puedes aportar a este equipo?</label><textarea value={motivation} onChange={(event) => setMotivation(event.target.value)} maxLength={5000} rows={6} placeholder="Explica tu motivación, cómo tratarías a la comunidad y qué aportarías al cargo…" className="mt-2 w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm outline-none focus:border-primary/60 resize-none" /><p className="mt-1 text-right text-xs text-muted-foreground">{motivation.trim().length}/5000 · mínimo 40</p><label className="block mt-4 text-sm font-medium">Experiencia relevante <span className="font-normal text-muted-foreground">(opcional)</span></label><textarea value={experience} onChange={(event) => setExperience(event.target.value)} maxLength={4000} rows={3} placeholder="Moderación, lectura beta, gestión de comunidades, diseño…" className="mt-2 w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm outline-none focus:border-primary/60 resize-none" /><Button className="mt-5 w-full rounded-xl" disabled={submitting} onClick={submitApplication}>{submitting ? "Enviando…" : "Enviar postulación"}</Button></motion.section></motion.div>}</AnimatePresence>
      <IOSBottomNav />
    </div>
  );
};

export default RecruitmentPage;
