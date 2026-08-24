import { useEffect, useState, type FormEvent } from "react";
import { Check, ExternalLink, FileCheck2, Loader2, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type QueueStatus = "draft" | "approved" | "published" | "rejected";

type QueueBook = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  content: string | null;
  content_url: string | null;
  language: string;
  genre: string | null;
  source: string;
  external_id: string | null;
  source_url: string | null;
  license_note: string | null;
  rights_jurisdiction: string | null;
  rights_verified_at: string | null;
  content_format: string;
  scheduled_month: string;
  is_featured: boolean;
  status: QueueStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  published_book_id: string | null;
};

type Draft = Omit<QueueBook, "id" | "status" | "reviewed_at" | "published_book_id" | "review_notes">;

const emptyDraft: Draft = {
  title: "",
  author: "",
  description: "",
  cover_url: "",
  content: "",
  content_url: "",
  language: "es",
  genre: "Novela clásica",
  source: "gutenberg",
  external_id: "",
  source_url: "",
  license_note: "",
  rights_jurisdiction: "",
  rights_verified_at: "",
  content_format: "plain_text",
  scheduled_month: new Date().toISOString().slice(0, 7) + "-01",
  is_featured: false,
};

const statusLabel: Record<QueueStatus, string> = {
  draft: "Borrador",
  approved: "Aprobado",
  published: "Publicado",
  rejected: "Rechazado",
};

const statusClass: Record<QueueStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  published: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const FreeBooksAdminManager = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<QueueBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("free_book_ingestion_queue")
      .select("*")
      .order("scheduled_month", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);
    setRecords((data ?? []) as unknown as QueueBook[]);
    setLoading(false);
    if (error) toast({ title: "No se pudo cargar la cola mensual", description: error.message, variant: "destructive" });
  };

  useEffect(() => { void load(); }, []);

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addToQueue = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.author.trim() || !draft.source_url.trim() || !draft.license_note.trim() || !draft.rights_jurisdiction.trim() || !draft.rights_verified_at || (!draft.content.trim() && !draft.content_url.trim())) {
      toast({ title: "Faltan datos de revisión", description: "Completa título, autor, procedencia, licencia, jurisdicción, fecha y contenido legible.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...draft,
      title: draft.title.trim(),
      author: draft.author.trim(),
      description: draft.description.trim() || null,
      cover_url: draft.cover_url.trim() || null,
      content: draft.content.trim() || null,
      content_url: draft.content_url.trim() || null,
      genre: draft.genre.trim() || null,
      external_id: draft.external_id.trim() || null,
      source_url: draft.source_url.trim(),
      license_note: draft.license_note.trim(),
      rights_jurisdiction: draft.rights_jurisdiction.trim(),
      created_by: user?.id ?? null,
      status: "draft" as const,
    };
    const { error } = await supabase.from("free_book_ingestion_queue").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "No se pudo guardar la propuesta", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Libro añadido a revisión", description: "Todavía no será visible hasta que un administrador lo apruebe." });
    setDraft({ ...emptyDraft, scheduled_month: draft.scheduled_month });
    setShowForm(false);
    void load();
  };

  const changeStatus = async (record: QueueBook, status: QueueStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("free_book_ingestion_queue")
      .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(), review_notes: status === "rejected" ? "Rechazado desde el panel de administración." : record.review_notes })
      .eq("id", record.id);
    if (error) toast({ title: "No se pudo actualizar la revisión", description: error.message, variant: "destructive" });
    else { toast({ title: status === "approved" ? "Libro aprobado" : "Libro rechazado" }); void load(); }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex gap-3">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Cola mensual de biblioteca</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Añade solo obras con procedencia, licencia y jurisdicción revisadas. Los borradores no aparecen en la app; el primer día de cada mes se publican únicamente los títulos aprobados y programados.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="rounded-xl" onClick={() => setShowForm((value) => !value)}><Plus className="mr-1.5 h-4 w-4" /> Nuevo título</Button>
          <Button size="icon" variant="outline" className="rounded-xl" onClick={() => void load()} aria-label="Actualizar cola"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </section>

      {showForm && (
        <form onSubmit={(event) => void addToQueue(event)} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-primary">Nueva propuesta</p><h3 className="font-semibold">Preparar título mensual</h3></div><Button type="button" size="icon" variant="ghost" onClick={() => setShowForm(false)} aria-label="Cerrar"><X className="h-4 w-4" /></Button></div>
          <p className="text-xs text-muted-foreground">La URL de procedencia debe ser la ficha oficial del libro, no un archivo interno sin contexto.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="Título" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input required value={draft.author} onChange={(event) => updateDraft("author", event.target.value)} placeholder="Autor" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input value={draft.external_id} onChange={(event) => updateDraft("external_id", event.target.value)} placeholder="ID externo (ej. 320)" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input value={draft.genre} onChange={(event) => updateDraft("genre", event.target.value)} placeholder="Género" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input required type="month" value={draft.scheduled_month.slice(0, 7)} onChange={(event) => updateDraft("scheduled_month", `${event.target.value}-01`)} className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input required type="date" value={draft.rights_verified_at} onChange={(event) => updateDraft("rights_verified_at", event.target.value)} className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input required value={draft.source_url} onChange={(event) => updateDraft("source_url", event.target.value)} placeholder="URL de la ficha oficial" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm sm:col-span-2" />
            <input value={draft.content_url} onChange={(event) => updateDraft("content_url", event.target.value)} placeholder="URL de texto legible (o pega el texto abajo)" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm sm:col-span-2" />
            <input required value={draft.rights_jurisdiction} onChange={(event) => updateDraft("rights_jurisdiction", event.target.value)} placeholder="Jurisdicción revisada (ej. Estados Unidos)" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
            <input required value={draft.license_note} onChange={(event) => updateDraft("license_note", event.target.value)} placeholder="Nota de licencia / dominio público" className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
          </div>
          <textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Descripción editorial breve" className="min-h-20 w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
          <textarea value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} placeholder="Texto interno opcional; si no lo pegas, se usará la URL de texto legible" className="min-h-24 w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm" />
          <div className="flex items-center gap-2"><input type="checkbox" checked={draft.is_featured} onChange={(event) => updateDraft("is_featured", event.target.checked)} id="free-book-featured" /><label htmlFor="free-book-featured" className="text-sm">Destacar en la biblioteca</label></div>
          <Button type="submit" disabled={saving} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileCheck2 className="mr-1.5 h-4 w-4" /> Guardar para revisión</>}</Button>
        </form>
      )}

      {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></div> : records.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center"><ShieldAlert className="mx-auto mb-2 h-9 w-9 text-muted-foreground" /><p className="font-semibold">La cola está vacía</p><p className="mt-1 text-sm text-muted-foreground">Añade con anticipación los próximos títulos verificados.</p></div>
      ) : (
        <div className="space-y-3">{records.map((record) => (
          <article key={record.id} className="rounded-2xl border border-border/45 bg-card p-4">
            <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{record.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass[record.status]}`}>{statusLabel[record.status]}</span></div><p className="mt-1 text-sm text-muted-foreground">{record.author} · {record.source} · {record.scheduled_month.slice(0, 7)}</p><p className="mt-2 text-xs text-muted-foreground">Procedencia: {record.source_url ? <a href={record.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">abrir ficha <ExternalLink className="h-3 w-3" /></a> : "pendiente"}</p></div></div>
            {record.review_notes && <p className="mt-3 rounded-xl bg-destructive/5 p-3 text-xs text-destructive">{record.review_notes}</p>}
            {record.status === "draft" && <div className="mt-3 flex gap-2"><Button size="sm" className="rounded-xl" onClick={() => void changeStatus(record, "approved")}><Check className="mr-1.5 h-4 w-4" /> Aprobar</Button><Button size="sm" variant="outline" className="rounded-xl text-destructive" onClick={() => void changeStatus(record, "rejected")}><X className="mr-1.5 h-4 w-4" /> Rechazar</Button></div>}
          </article>
        ))}</div>
      )}
    </div>
  );
};

export default FreeBooksAdminManager;
