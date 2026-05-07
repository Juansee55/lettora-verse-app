import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, StickyNote, Highlighter, Volume2, Pause, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chapterId: string;
  chapterContent: string;
  scrollPosition: number;
}

const ReaderToolsSheet = ({ open, onOpenChange, chapterId, chapterContent, scrollPosition }: Props) => {
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (open) loadAll();
    return () => { window.speechSynthesis?.cancel(); setSpeaking(false); };
  }, [open, chapterId]);

  const loadAll = async () => {
    const [b, n, h] = await Promise.all([
      supabase.from("chapter_bookmarks").select("*").eq("chapter_id", chapterId).order("created_at", { ascending: false }),
      supabase.from("reader_notes").select("*").eq("chapter_id", chapterId).order("created_at", { ascending: false }),
      supabase.from("reader_highlights").select("*").eq("chapter_id", chapterId).order("created_at", { ascending: false }),
    ]);
    setBookmarks(b.data || []);
    setNotes(n.data || []);
    setHighlights(h.data || []);
  };

  const addBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("chapter_bookmarks").insert({
      user_id: user.id, chapter_id: chapterId, position: Math.round(scrollPosition), label: bookmarkLabel || null,
    });
    if (!error) { setBookmarkLabel(""); toast({ title: "Marcador guardado" }); loadAll(); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("reader_notes").insert({
      user_id: user.id, chapter_id: chapterId, paragraph_index: 0, note: newNote.trim(),
    });
    if (!error) { setNewNote(""); toast({ title: "Nota guardada" }); loadAll(); }
  };

  const remove = async (table: "chapter_bookmarks" | "reader_notes" | "reader_highlights", id: string) => {
    await supabase.from(table).delete().eq("id", id);
    loadAll();
  };

  const toggleSpeak = () => {
    if (!("speechSynthesis" in window)) {
      toast({ title: "TTS no disponible en este navegador", variant: "destructive" });
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = chapterContent.replace(/<[^>]+>/g, " ").slice(0, 32000);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const goToBookmark = (pos: number) => {
    window.scrollTo({ top: pos, behavior: "smooth" });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Herramientas de lectura</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="bookmarks" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full rounded-2xl">
            <TabsTrigger value="bookmarks" className="rounded-xl"><Bookmark className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="notes" className="rounded-xl"><StickyNote className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="highlights" className="rounded-xl"><Highlighter className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="tts" className="rounded-xl"><Volume2 className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="bookmarks" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input value={bookmarkLabel} onChange={(e) => setBookmarkLabel(e.target.value)} placeholder="Etiqueta (opcional)" className="rounded-xl" />
              <Button onClick={addBookmark} variant="ios" size="ios-md"><Plus className="w-4 h-4" /></Button>
            </div>
            {bookmarks.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin marcadores</p>}
            {bookmarks.map((b) => (
              <div key={b.id} className="flex items-center gap-2 p-3 rounded-2xl bg-muted/40">
                <button className="flex-1 text-left" onClick={() => goToBookmark(b.position)}>
                  <p className="text-sm font-medium">{b.label || `Posición ${b.position}px`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => remove("chapter_bookmarks", b.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Escribe una nota privada..." className="rounded-2xl" rows={3} />
            <Button onClick={addNote} variant="ios" className="w-full">Añadir nota</Button>
            {notes.map((n) => (
              <div key={n.id} className="flex items-start gap-2 p-3 rounded-2xl bg-muted/40">
                <p className="flex-1 text-sm whitespace-pre-wrap">{n.note}</p>
                <Button variant="ghost" size="icon" onClick={() => remove("reader_notes", n.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="highlights" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Selecciona texto en el capítulo y mantén pulsado para resaltarlo (próximamente).</p>
            {highlights.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin resaltados</p>}
            {highlights.map((h) => (
              <div key={h.id} className="flex items-start gap-2 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
                <p className="flex-1 text-sm">{h.snippet}</p>
                <Button variant="ghost" size="icon" onClick={() => remove("reader_highlights", h.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tts" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Escucha el capítulo con voz sintetizada del dispositivo.</p>
            <Button onClick={toggleSpeak} variant={speaking ? "ios-destructive" : "ios"} className="w-full">
              {speaking ? <><Pause className="w-4 h-4 mr-2" /> Detener</> : <><Volume2 className="w-4 h-4 mr-2" /> Leer en voz alta</>}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ReaderToolsSheet;