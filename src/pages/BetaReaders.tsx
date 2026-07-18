import { useEffect, useState } from "react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Check, X, MessageSquare } from "lucide-react";

type Inv = { id: string; book_id: string; author_id: string; reader_id: string; status: string; message: string | null; book?: { title: string }; author?: { username: string; display_name: string } };

const BetaReaders = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [received, setReceived] = useState<Inv[]>([]);
  const [sent, setSent] = useState<Inv[]>([]);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [myBooks, setMyBooks] = useState<{ id: string; title: string }[]>([]);
  const [bookId, setBookId] = useState("");
  const [readerHandle, setReaderHandle] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  useEffect(() => { if (uid) { load(); loadMyBooks(); } }, [uid]);

  const load = async () => {
    if (!uid) return;
    const [r, s] = await Promise.all([
      supabase.from("beta_invitations").select("*, book:books(title), author:profiles!beta_invitations_author_id_fkey(username, display_name)").eq("reader_id", uid).order("created_at", { ascending: false }),
      supabase.from("beta_invitations").select("*, book:books(title)").eq("author_id", uid).order("created_at", { ascending: false }),
    ]);
    setReceived((r.data ?? []) as any);
    setSent((s.data ?? []) as any);
  };

  const loadMyBooks = async () => {
    const { data } = await supabase.from("books").select("id, title").eq("author_id", uid!);
    setMyBooks((data ?? []) as any);
  };

  const respond = async (id: string, status: "accepted" | "declined") => {
    await supabase.from("beta_invitations").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const invite = async () => {
    if (!bookId || !readerHandle.trim() || !uid) return;
    const { data: p } = await supabase.from("profiles").select("id").eq("username", readerHandle.replace("@", "").trim()).maybeSingle();
    if (!p) return toast.error("Usuario no encontrado");
    const { error } = await supabase.from("beta_invitations").insert({ book_id: bookId, author_id: uid, reader_id: p.id, message: msg || null });
    if (error) return toast.error(error.message);
    toast.success("Invitación enviada");
    setReaderHandle(""); setMsg("");
    load();
  };

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title="Lectores BETA" leftAction={<BackButton />} />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setTab("received")} className={`flex-1 py-2 rounded-xl text-sm ${tab==="received"?"bg-primary text-primary-foreground":"bg-muted"}`}>Recibidas ({received.length})</button>
          <button onClick={() => setTab("sent")} className={`flex-1 py-2 rounded-xl text-sm ${tab==="sent"?"bg-primary text-primary-foreground":"bg-muted"}`}>Enviadas</button>
        </div>

        {tab === "sent" && myBooks.length > 0 && (
          <div className="liquid-glass rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invitar lector BETA</p>
            <select value={bookId} onChange={e => setBookId(e.target.value)} className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm">
              <option value="">Selecciona un libro</option>
              {myBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <input value={readerHandle} onChange={e => setReaderHandle(e.target.value)} placeholder="@usuario" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="Mensaje (opcional)" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <button onClick={invite} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm">Enviar</button>
          </div>
        )}

        {(tab === "received" ? received : sent).map(i => (
          <div key={i.id} className="liquid-glass rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{i.book?.title ?? "Libro"}</p>
                {tab === "received" && <p className="text-xs text-muted-foreground">de @{i.author?.username}</p>}
                {i.message && <p className="text-xs mt-1 italic text-muted-foreground">"{i.message}"</p>}
                <p className="text-[10px] uppercase mt-1 text-muted-foreground">{i.status}</p>
              </div>
              {tab === "received" && i.status === "pending" && (
                <div className="flex gap-1">
                  <button onClick={() => respond(i.id, "accepted")} className="p-2 rounded-full bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></button>
                  <button onClick={() => respond(i.id, "declined")} className="p-2 rounded-full bg-destructive/15 text-destructive"><X className="w-4 h-4" /></button>
                </div>
              )}
              {i.status === "accepted" && (
                <MessageSquare className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default BetaReaders;