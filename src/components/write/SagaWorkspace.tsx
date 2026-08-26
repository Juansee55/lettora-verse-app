import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Library, Loader2, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SagaVolume {
  id: string;
  title: string;
  cover_url: string | null;
  saga_order: number | null;
  status: string | null;
}

interface Props {
  sagaId: string | null;
  currentBookId?: string;
  onOpenVolume: (bookId: string) => void;
  onAddVolume: () => void;
}

const SagaWorkspace = ({ sagaId, currentBookId, onOpenVolume, onAddVolume }: Props) => {
  const { toast } = useToast();
  const [sagaTitle, setSagaTitle] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<SagaVolume[]>([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

  const loadSaga = useCallback(async () => {
    if (!sagaId) {
      setSagaTitle(null);
      setVolumes([]);
      return;
    }
    setLoading(true);
    const [{ data: saga }, { data: entries, error }] = await Promise.all([
      supabase.from("books").select("id, title").eq("id", sagaId).maybeSingle(),
      supabase.from("books").select("id, title, cover_url, saga_order, status").eq("parent_saga_id", sagaId).order("saga_order", { ascending: true }),
    ]);
    if (error) {
      toast({ title: "No se pudo cargar la saga", variant: "destructive" });
    }
    setSagaTitle(saga?.title ?? null);
    setVolumes((entries ?? []) as SagaVolume[]);
    setLoading(false);
  }, [sagaId, toast]);

  useEffect(() => { void loadSaga(); }, [loadSaga]);

  const moveVolume = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= volumes.length || reordering) return;
    const next = [...volumes];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setVolumes(next.map((volume, position) => ({ ...volume, saga_order: position + 1 })));
    setReordering(true);
    const updates = next.map((volume, position) =>
      supabase.from("books").update({ saga_order: position + 1 }).eq("id", volume.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      toast({ title: "No se pudo reordenar", description: "Se restauró el orden anterior.", variant: "destructive" });
      await loadSaga();
    }
    setReordering(false);
  };

  if (!sagaId) return null;

  return (
    <section className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Library className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">Continuidad de saga</p>
          <p className="text-[14px] font-semibold truncate">{sagaTitle || "Cargando saga…"}</p>
        </div>
        <button type="button" onClick={() => void loadSaga()} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground" aria-label="Actualizar saga" title="Actualizar">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {volumes.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-2">Todavía no hay volúmenes vinculados.</p>
      ) : (
        <div className="space-y-1.5">
          {volumes.map((volume, index) => (
            <div key={volume.id} className={`flex items-center gap-2 rounded-xl p-2 ${volume.id === currentBookId ? "bg-primary/10 ring-1 ring-primary/20" : "bg-background/60"}`}>
              <span className="w-6 h-6 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
              {volume.cover_url ? <img src={volume.cover_url} alt="" className="w-6 h-9 rounded object-cover flex-shrink-0" /> : <div className="w-6 h-9 rounded bg-muted flex items-center justify-center flex-shrink-0"><BookOpen className="w-3 h-3 text-muted-foreground" /></div>}
              <button type="button" onClick={() => onOpenVolume(volume.id)} className="flex-1 min-w-0 text-left">
                <span className="block text-[13px] font-medium truncate">{volume.title}</span>
                <span className="block text-[10px] text-muted-foreground capitalize">{volume.status === "completed" ? "Completado" : volume.status === "published" ? "En progreso" : "Borrador"}</span>
              </button>
              <div className="flex items-center gap-0.5">
                <button type="button" disabled={index === 0 || reordering} onClick={() => void moveVolume(index, -1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-25" aria-label="Subir volumen"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button type="button" disabled={index === volumes.length - 1 || reordering} onClick={() => void moveVolume(index, 1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-25" aria-label="Bajar volumen"><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onAddVolume} className="w-full mt-3 h-9 rounded-xl bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/15 active:scale-[0.98] transition-transform">
        <Plus className="w-3.5 h-3.5" /> Añadir volumen a la saga
      </button>
    </section>
  );
};

export default SagaWorkspace;
