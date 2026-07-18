import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, User, MapPin, Package, Sparkles, CalendarClock, BookOpen, Trash2 } from "lucide-react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Entry = { id: string; entry_type: string; name: string; description: string | null; image_url: string | null };
type Book = { id: string; title: string; cover_url: string | null };

const TYPE_ICONS: Record<string, any> = { character: User, place: MapPin, object: Package, concept: Sparkles, event: CalendarClock };
const TYPE_LABELS: Record<string, string> = { character: "Personaje", place: "Lugar", object: "Objeto", concept: "Concepto", event: "Evento" };

const UniverseDetail = () => {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [tab, setTab] = useState<"glossary" | "books">("glossary");
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ entry_type: "character", name: "", description: "" });

  const isOwner = uid === ownerId;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    loadAll();
  }, [id]);

  const loadAll = async () => {
    if (!id) return;
    const [u, e, b] = await Promise.all([
      supabase.from("universes").select("name, owner_id").eq("id", id).maybeSingle(),
      supabase.from("glossary_entries").select("id, entry_type, name, description, image_url").eq("universe_id", id).order("created_at"),
      supabase.from("universe_books").select("book:books(id, title, cover_url)").eq("universe_id", id),
    ]);
    if (u.data) { setName(u.data.name); setOwnerId(u.data.owner_id); }
    setEntries((e.data ?? []) as any);
    setBooks(((b.data ?? []) as any).map((r: any) => r.book).filter(Boolean));
  };

  const loadMyBooks = async () => {
    if (!uid) return;
    const { data } = await supabase.from("books").select("id, title, cover_url").eq("author_id", uid);
    setMyBooks((data ?? []) as any);
  };

  const addEntry = async () => {
    if (!newEntry.name.trim() || !id) return;
    const { error } = await supabase.from("glossary_entries").insert({ universe_id: id, ...newEntry });
    if (error) return toast.error(error.message);
    setNewEntry({ entry_type: "character", name: "", description: "" });
    setAdding(false);
    loadAll();
  };

  const removeEntry = async (eid: string) => {
    await supabase.from("glossary_entries").delete().eq("id", eid);
    loadAll();
  };

  const linkBook = async (bookId: string) => {
    if (!id) return;
    const { error } = await supabase.from("universe_books").insert({ universe_id: id, book_id: bookId });
    if (error) return toast.error(error.message);
    loadAll();
  };

  const unlinkBook = async (bookId: string) => {
    if (!id) return;
    await supabase.from("universe_books").delete().eq("universe_id", id).eq("book_id", bookId);
    loadAll();
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title={name || "Universo"} leftAction={<BackButton />} />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setTab("glossary")} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab==="glossary"?"bg-primary text-primary-foreground":"bg-muted"}`}>Glosario</button>
          <button onClick={() => { setTab("books"); loadMyBooks(); }} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab==="books"?"bg-primary text-primary-foreground":"bg-muted"}`}>Libros</button>
        </div>

        {tab === "glossary" && (
          <>
            {isOwner && (
              <button onClick={() => setAdding(v => !v)} className="w-full py-3 rounded-2xl border-2 border-dashed border-border/60 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Añadir entrada
              </button>
            )}
            {adding && (
              <div className="liquid-glass rounded-2xl p-4 space-y-2">
                <select value={newEntry.entry_type} onChange={e => setNewEntry(s => ({ ...s, entry_type: e.target.value }))} className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input value={newEntry.name} onChange={e => setNewEntry(s => ({ ...s, name: e.target.value }))} placeholder="Nombre" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
                <textarea value={newEntry.description} onChange={e => setNewEntry(s => ({ ...s, description: e.target.value }))} rows={3} placeholder="Descripción" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
                <button onClick={addEntry} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Guardar</button>
              </div>
            )}
            {entries.map(e => {
              const Icon = TYPE_ICONS[e.entry_type] ?? User;
              return (
                <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="liquid-glass rounded-2xl p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{TYPE_LABELS[e.entry_type]}</p>
                    <h4 className="font-semibold">{e.name}</h4>
                    {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                  </div>
                  {isOwner && <button onClick={() => removeEntry(e.id)} className="text-destructive/70 p-1"><Trash2 className="w-4 h-4" /></button>}
                </motion.div>
              );
            })}
          </>
        )}

        {tab === "books" && (
          <>
            {books.map(b => (
              <div key={b.id} className="liquid-glass rounded-2xl p-3 flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                  {b.cover_url ? <img src={b.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-muted-foreground" />}
                </div>
                <span className="flex-1 text-sm font-medium truncate">{b.title}</span>
                {isOwner && <button onClick={() => unlinkBook(b.id)} className="text-destructive/70 p-1"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
            {isOwner && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Añadir de mis libros</p>
                {myBooks.filter(mb => !books.some(b => b.id === mb.id)).map(b => (
                  <button key={b.id} onClick={() => linkBook(b.id)} className="w-full text-left liquid-glass rounded-xl p-3 flex items-center gap-3 mb-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="flex-1 text-sm truncate">{b.title}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default UniverseDetail;