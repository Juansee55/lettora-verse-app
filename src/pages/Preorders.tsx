import { useEffect, useState } from "react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, BookOpen, X } from "lucide-react";

type Book = { id: string; title: string; cover_url: string | null; release_date: string | null; preorder_price_cents: number | null };
type PO = { id: string; book_id: string; status: string; book?: Book };

const Preorders = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [available, setAvailable] = useState<Book[]>([]);
  const [mine, setMine] = useState<PO[]>([]);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  useEffect(() => { load(); }, [uid]);

  const load = async () => {
    const { data: books } = await supabase.from("books").select("id, title, cover_url, release_date, preorder_price_cents").eq("is_preorder", true).order("release_date");
    setAvailable((books ?? []) as Book[]);
    if (uid) {
      const { data } = await supabase.from("book_preorders").select("*, book:books(id, title, cover_url, release_date, preorder_price_cents)").eq("user_id", uid);
      setMine((data ?? []) as any);
    }
  };

  const reserve = async (b: Book) => {
    if (!uid) return;
    const { error } = await supabase.from("book_preorders").insert({ book_id: b.id, user_id: uid, release_date: b.release_date, amount_cents: b.preorder_price_cents });
    if (error) return toast.error(error.message);
    toast.success("Reservado"); load();
  };
  const cancel = async (id: string) => { await supabase.from("book_preorders").delete().eq("id", id); load(); };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title="Preventa" leftAction={<BackButton />} />
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {mine.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Mis reservas</h3>
            {mine.map(po => (
              <div key={po.id} className="liquid-glass rounded-2xl p-3 flex items-center gap-3 mb-2">
                <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden">{po.book?.cover_url && <img src={po.book.cover_url} className="w-full h-full object-cover" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{po.book?.title}</p>
                  <p className="text-xs text-muted-foreground">{po.book?.release_date ? new Date(po.book.release_date).toLocaleDateString() : "Sin fecha"}</p>
                </div>
                <button onClick={() => cancel(po.id)} className="p-2 text-destructive/70"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <h3 className="text-sm font-semibold">Disponibles en preventa</h3>
        {available.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nada en preventa aún.</p>}
        {available.map(b => {
          const reserved = mine.some(m => m.book_id === b.id);
          return (
            <div key={b.id} className="liquid-glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-14 h-20 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{b.title}</p>
                {b.release_date && <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3" />{new Date(b.release_date).toLocaleDateString()}</p>}
                {b.preorder_price_cents ? <p className="text-xs">${(b.preorder_price_cents / 100).toFixed(2)}</p> : null}
              </div>
              <button disabled={reserved} onClick={() => reserve(b)} className={`px-3 py-2 rounded-xl text-xs font-medium ${reserved?"bg-muted text-muted-foreground":"bg-primary text-primary-foreground"}`}>{reserved ? "Reservado" : "Reservar"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Preorders;