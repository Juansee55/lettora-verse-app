import { useEffect, useMemo, useState } from "react";
import { FilePenLine, ImageOff, Loader2, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CONTENT_TYPES = [
  { table: "profiles", label: "Perfiles" },
  { table: "books", label: "Libros" },
  { table: "chapters", label: "Capítulos" },
  { table: "posts", label: "Publicaciones" },
  { table: "literary_posts", label: "Publicaciones literarias" },
  { table: "comments", label: "Comentarios" },
  { table: "microstories", label: "Microrrelatos" },
  { table: "author_blogs", label: "Blogs de autor" },
  { table: "webcomics", label: "Webcómics" },
  { table: "webcomic_episodes", label: "Episodios de webcómic" },
  { table: "free_books", label: "Libros gratuitos" },
  { table: "proposals", label: "Propuestas" },
] as const;

const IMMUTABLE_FIELDS = new Set(["id", "created_at", "updated_at"]);

type MediaObject = { id: string; bucket_id: string; name: string; created_at: string | null };

const recordTitle = (record: Record<string, unknown>) => {
  const candidates = [record.display_name, record.username, record.title, record.content, record.body, record.name];
  const found = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof found === "string" ? found.slice(0, 90) : `Registro ${String(record.id).slice(0, 8)}`;
};

const AdminContentManager = () => {
  const { toast } = useToast();
  const [table, setTable] = useState<(typeof CONTENT_TYPES)[number]["table"]>("profiles");
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<MediaObject[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const selectedLabel = useMemo(() => CONTENT_TYPES.find((item) => item.table === table)?.label || table, [table]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from(table as any).select("*").order("created_at", { ascending: false }).limit(50) as any);
    setRecords((data || []) as Record<string, unknown>[]);
    setLoading(false);
    if (error) toast({ title: "No se pudo cargar el contenido", description: error.message, variant: "destructive" });
  };

  useEffect(() => { void load(); }, [table]);

  const loadMedia = async () => {
    setMediaLoading(true);
    const { data, error } = await ((supabase.schema("storage") as any).from("objects").select("id, bucket_id, name, created_at").order("created_at", { ascending: false }).limit(50));
    setMedia((data || []) as MediaObject[]);
    setMediaLoading(false);
    if (error) toast({ title: "No se pudieron cargar los archivos", description: error.message, variant: "destructive" });
  };

  const removeMedia = async (item: MediaObject) => {
    if (!window.confirm(`¿Eliminar definitivamente el archivo “${item.name}” del bucket ${item.bucket_id}?`)) return;
    const { error } = await ((supabase.storage as any).from(item.bucket_id).remove([item.name]));
    if (error) { toast({ title: "No se pudo eliminar el archivo", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Archivo eliminado" });
    void loadMedia();
  };

  const openEditor = (record: Record<string, unknown>) => {
    const editable = Object.fromEntries(Object.entries(record).filter(([key]) => !IMMUTABLE_FIELDS.has(key)));
    setEditing(record);
    setDraft(JSON.stringify(editable, null, 2));
  };

  const save = async () => {
    if (!editing?.id) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(draft) as Record<string, unknown>;
    } catch {
      toast({ title: "JSON no válido", description: "Corrige la estructura antes de guardar.", variant: "destructive" });
      return;
    }
    for (const field of IMMUTABLE_FIELDS) delete payload[field];
    setSaving(true);
    const { error } = await (supabase.from(table as any).update(payload).eq("id", editing.id) as any);
    setSaving(false);
    if (error) { toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contenido actualizado" });
    setEditing(null);
    void load();
  };

  const remove = async (record: Record<string, unknown>) => {
    if (!record.id || !window.confirm(`¿Eliminar este registro de ${selectedLabel}? Esta acción no se puede deshacer.`)) return;
    const { error } = await (supabase.from(table as any).delete().eq("id", record.id) as any);
    if (error) { toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contenido eliminado" });
    void load();
  };

  return <div className="px-4 py-4 space-y-4">
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="flex gap-3"><FilePenLine className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /><div><h2 className="font-semibold">Edición de contenido</h2><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Permite corregir o retirar contenido y perfiles. Las modificaciones quedan limitadas a administradores y deben usarse con criterio de moderación.</p></div></div></section>
    <div className="flex gap-2"><select value={table} onChange={(event) => setTable(event.target.value as typeof table)} className="min-w-0 flex-1 rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm">{CONTENT_TYPES.map((item) => <option key={item.table} value={item.table}>{item.label}</option>)}</select><Button variant="outline" size="icon" className="rounded-xl" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="w-4 h-4" /></Button></div>
    {loading ? <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></div> : records.length === 0 ? <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">No hay registros recientes en {selectedLabel.toLowerCase()}.</div> : <div className="space-y-2">{records.map((record) => <article key={String(record.id)} className="rounded-2xl border border-border/45 bg-card p-3.5"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="font-medium text-sm break-words">{recordTitle(record)}</p><p className="mt-1 text-[11px] text-muted-foreground">ID: {String(record.id).slice(0, 13)}…</p></div><div className="flex gap-1 shrink-0"><Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => openEditor(record)} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-destructive border-destructive/30" onClick={() => void remove(record)} aria-label="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button></div></div></article>)}</div>}
    <section className="rounded-2xl border border-border/45 bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><ImageOff className="w-5 h-5 text-primary shrink-0 mt-0.5" /><div><h3 className="font-semibold text-sm">Archivos subidos</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Revisa los 50 archivos más recientes y elimina solo contenido que incumpla normas o que sea incorrecto.</p></div></div><Button size="sm" variant="outline" className="shrink-0" onClick={() => void loadMedia()}>{mediaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ver archivos"}</Button></div>{media.length > 0 && <div className="mt-4 max-h-64 overflow-y-auto space-y-2">{media.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-muted/50 p-2.5"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{item.name}</p><p className="text-[11px] text-muted-foreground">{item.bucket_id}{item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString()}` : ""}</p></div><Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => void removeMedia(item)} aria-label="Eliminar archivo"><Trash2 className="w-3.5 h-3.5" /></Button></div>)}</div>}</section>
    {editing && <div className="fixed inset-0 z-[110] flex items-end justify-center"><button className="absolute inset-0 bg-black/55" onClick={() => !saving && setEditing(null)} aria-label="Cerrar editor" /><section className="relative w-full max-w-2xl rounded-t-3xl border-t border-border/40 bg-background p-5 pb-8 max-h-[90vh] flex flex-col"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-primary">{selectedLabel}</p><h2 className="font-semibold">Editar registro</h2></div><Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-5 h-5" /></Button></div><p className="mt-2 text-xs text-muted-foreground">Edita solo los valores necesarios. Los identificadores y fechas de auditoría se protegen automáticamente.</p><textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 min-h-[320px] flex-1 rounded-xl border border-border/50 bg-muted/25 p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary/60 resize-none" spellCheck={false} /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button><Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Guardar cambios</>}</Button></div></section></div>}
  </div>;
};

export default AdminContentManager;
