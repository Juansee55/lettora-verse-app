import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Check, ChevronDown, ClipboardCheck, Loader2, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const POSITION_OPTIONS = [
  { title: "Head Moderator", team: "Moderación" },
  { title: "Moderator", team: "Moderación" },
  { title: "Content Manager", team: "Contenido" },
  { title: "Community Ambassador", team: "Comunidad" },
  { title: "Support Manager", team: "Soporte" },
  { title: "Events Manager", team: "Eventos" },
  { title: "Design Manager", team: "Diseño" },
  { title: "Trust & Safety Coordinator", team: "Trust & Safety" },
  { title: "Beta Reader Coordinator", team: "Lectura beta" },
] as const;

type Vacancy = { id: string; title: string; team: string; description: string; requirements: string | null; openings: number; status: string; closes_at: string | null };
type Application = { id: string; vacancy_id: string; applicant_id: string; motivation: string; relevant_experience: string | null; status: string; reviewer_note: string | null; created_at: string };
type ProfileLite = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

const StaffRecruitmentManager = () => {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ position: "Moderator", description: "", requirements: "", openings: "1", closes_at: "" });

  const vacancyById = useMemo(() => new Map(vacancies.map((vacancy) => [vacancy.id, vacancy])), [vacancies]);

  const load = async () => {
    setLoading(true);
    const [vacanciesRes, applicationsRes] = await Promise.all([
      (supabase.from("staff_vacancies" as any).select("*").order("created_at", { ascending: false }) as any),
      (supabase.from("staff_applications" as any).select("*").order("created_at", { ascending: false }) as any),
    ]);
    const nextVacancies = (vacanciesRes.data || []) as Vacancy[];
    const nextApplications = (applicationsRes.data || []) as Application[];
    setVacancies(nextVacancies);
    setApplications(nextApplications);
    const ids = [...new Set(nextApplications.map((application) => application.applicant_id))];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids);
      setProfiles(Object.fromEntries(((data || []) as ProfileLite[]).map((profile) => [profile.id, profile])));
    } else {
      setProfiles({});
    }
    if (vacanciesRes.error || applicationsRes.error) toast({ title: "No se pudo cargar el reclutamiento", description: vacanciesRes.error?.message || applicationsRes.error?.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const createVacancy = async () => {
    const option = POSITION_OPTIONS.find((item) => item.title === form.position);
    if (!option || form.description.trim().length < 30) {
      toast({ title: "Completa la vacante", description: "La descripción debe tener al menos 30 caracteres.", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const closesAt = form.closes_at ? new Date(`${form.closes_at}T23:59:59.999`).toISOString() : null;
    const { error } = await (supabase.from("staff_vacancies" as any).insert({
      title: option.title, team: option.team, description: form.description.trim(), requirements: form.requirements.trim() || null,
      openings: Math.max(1, Math.min(25, Number(form.openings) || 1)), closes_at: closesAt, created_by: user.id,
    }) as any);
    if (error) { toast({ title: "No se pudo publicar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vacante publicada", description: "Ya está disponible para que los usuarios se postulen." });
    setForm({ position: "Moderator", description: "", requirements: "", openings: "1", closes_at: "" });
    setCreating(false);
    void load();
  };

  const setVacancyStatus = async (vacancy: Vacancy, status: "open" | "closed" | "archived") => {
    const { error } = await (supabase.from("staff_vacancies" as any).update({ status }).eq("id", vacancy.id) as any);
    if (error) { toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "open" ? "Vacante reabierta" : status === "closed" ? "Vacante cerrada" : "Vacante archivada" });
    void load();
  };

  const review = async (application: Application, decision: "approved" | "rejected") => {
    setReviewing(application.id);
    const { error } = await supabase.rpc("review_staff_application" as any, {
      p_application_id: application.id, p_decision: decision, p_reviewer_note: notes[application.id] || null,
    } as any);
    setReviewing(null);
    if (error) { toast({ title: "No se pudo revisar", description: error.message, variant: "destructive" }); return; }
    toast({ title: decision === "approved" ? "Postulación aprobada" : "Postulación rechazada", description: decision === "approved" ? "Se creó la asignación de staff; no se otorgaron privilegios de administrador." : undefined });
    void load();
  };

  const pendingApplications = applications.filter((application) => application.status === "pending");

  return <div className="px-4 py-4 space-y-5">
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><BriefcaseBusiness className="w-5 h-5 text-primary" /><h2 className="font-semibold">Reclutamiento de staff</h2></div><p className="mt-1 text-[13px] text-muted-foreground">Las vacantes excluyen cargos de dirección. Las aprobaciones crean una asignación de equipo, no un rol de administrador.</p></div><Button size="sm" className="shrink-0 rounded-xl" onClick={() => setCreating(!creating)}><Plus className="w-4 h-4 mr-1" /> Vacante</Button></div>
      {creating && <div className="mt-4 space-y-3 border-t border-primary/15 pt-4"><select value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm">{POSITION_OPTIONS.map((option) => <option key={option.title} value={option.title}>{option.title} · {option.team}</option>)}</select><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder="Qué hará la persona y cómo contribuirá al equipo…" className="w-full resize-none rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" /><textarea value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} rows={2} placeholder="Requisitos o conocimientos deseados (opcional)" className="w-full resize-none rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" /><div className="grid grid-cols-2 gap-3"><input type="number" min="1" max="25" value={form.openings} onChange={(event) => setForm({ ...form, openings: event.target.value })} placeholder="Plazas" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" /><input type="date" value={form.closes_at} onChange={(event) => setForm({ ...form, closes_at: event.target.value })} className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" /></div><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setCreating(false)}>Cancelar</Button><Button size="sm" onClick={createVacancy}>Publicar vacante</Button></div></div>}
    </section>

    <section><div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-primary" /> Postulaciones pendientes</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{pendingApplications.length}</span></div>{loading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></div> : pendingApplications.length === 0 ? <div className="rounded-2xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">No hay postulaciones pendientes.</div> : <div className="space-y-3">{pendingApplications.map((application) => { const profile = profiles[application.applicant_id]; const vacancy = vacancyById.get(application.vacancy_id); return <article key={application.id} className="rounded-2xl border border-border/50 bg-card p-4"><div className="flex gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-semibold text-primary shrink-0">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile?.display_name || "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="font-medium text-sm">{profile?.display_name || "Usuario"}</p><p className="text-xs text-muted-foreground">@{profile?.username || "sin-usuario"} · {vacancy?.title || "Vacante cerrada"}</p></div></div><p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{application.motivation}</p>{application.relevant_experience && <p className="mt-2 rounded-xl bg-muted/60 p-2.5 text-xs text-muted-foreground"><strong className="text-foreground">Experiencia:</strong> {application.relevant_experience}</p>}<textarea value={notes[application.id] || ""} onChange={(event) => setNotes({ ...notes, [application.id]: event.target.value })} rows={2} maxLength={2000} placeholder="Nota privada para la revisión (opcional)" className="mt-3 w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2 text-xs" /><div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="outline" disabled={reviewing === application.id} onClick={() => review(application, "rejected")} className="text-destructive border-destructive/30"><X className="w-4 h-4 mr-1" /> Rechazar</Button><Button size="sm" disabled={reviewing === application.id} onClick={() => review(application, "approved")}>{reviewing === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Aprobar</>}</Button></div></article>; })}</div>}</section>

    <section><div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Vacantes</h3><span className="text-xs text-muted-foreground">{vacancies.length}</span></div><div className="space-y-2">{vacancies.map((vacancy) => <article key={vacancy.id} className="rounded-2xl border border-border/45 bg-card p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-sm">{vacancy.title}</p><p className="text-xs text-muted-foreground">{vacancy.team} · {vacancy.openings} plaza{vacancy.openings !== 1 ? "s" : ""}</p></div><div className="flex items-center gap-1"><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${vacancy.status === "open" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{vacancy.status === "open" ? "Abierta" : vacancy.status === "closed" ? "Cerrada" : "Archivada"}</span><div className="relative"><select aria-label="Cambiar estado" value={vacancy.status} onChange={(event) => setVacancyStatus(vacancy, event.target.value as "open" | "closed" | "archived")} className="absolute inset-0 opacity-0 cursor-pointer"><option value="open">Abierta</option><option value="closed">Cerrada</option><option value="archived">Archivada</option></select><ChevronDown className="w-4 h-4 text-muted-foreground" /></div></div></div></article>)}</div></section>
  </div>;
};

export default StaffRecruitmentManager;
