import { useState } from "react";
import { BarChart3, Search, ThumbsUp, Eye, Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface BookResult {
  id: string;
  title: string;
  cover_url: string | null;
  likes_count: number | null;
  reads_count: number | null;
}

const BookStatsModal = ({ isOpen, onClose }: Props) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [book, setBook] = useState<BookResult | null>(null);
  const [likesChange, setLikesChange] = useState(0);
  const [readsChange, setReadsChange] = useState(0);
  const [saving, setSaving] = useState(false);

  const searchBook = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("books")
      .select("id, title, cover_url, likes_count, reads_count")
      .ilike("title", `%${search}%`)
      .limit(1)
      .maybeSingle();

    setBook(data);
    setLikesChange(0);
    setReadsChange(0);
    setSearching(false);
    if (!data) toast({ title: "Libro no encontrado", variant: "destructive" });
  };

  const applyChanges = async () => {
    if (!book || (likesChange === 0 && readsChange === 0)) return;
    setSaving(true);

    const { error } = await supabase.rpc("admin_update_book_stats", {
      p_book_id: book.id,
      p_likes_delta: likesChange,
      p_reads_delta: readsChange,
    });

    if (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    } else {
      toast({ title: "✅ Estadísticas actualizadas" });
      setBook({
        ...book,
        likes_count: Math.max(0, (book.likes_count || 0) + likesChange),
        reads_count: Math.max(0, (book.reads_count || 0) + readsChange),
      });
      setLikesChange(0);
      setReadsChange(0);
    }
    setSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Gestionar estadísticas
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar libro por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchBook()}
              className="flex-1 h-10 px-4 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button onClick={searchBook} disabled={searching} className="rounded-xl">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {book && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {book.cover_url && <img src={book.cover_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] truncate">{book.title}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {book.likes_count || 0}
                    </span>
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {book.reads_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Likes control */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" /> Likes ({likesChange >= 0 ? "+" : ""}{likesChange})
                </label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full"
                    onClick={() => setLikesChange(prev => prev - 10)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl"
                    onClick={() => setLikesChange(prev => prev - 1)}>-1</Button>
                  <span className="font-bold text-[16px] min-w-[40px] text-center">{likesChange}</span>
                  <Button variant="outline" size="sm" className="rounded-xl"
                    onClick={() => setLikesChange(prev => prev + 1)}>+1</Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full"
                    onClick={() => setLikesChange(prev => prev + 10)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Reads control */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Vistas ({readsChange >= 0 ? "+" : ""}{readsChange})
                </label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full"
                    onClick={() => setReadsChange(prev => prev - 10)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl"
                    onClick={() => setReadsChange(prev => prev - 1)}>-1</Button>
                  <span className="font-bold text-[16px] min-w-[40px] text-center">{readsChange}</span>
                  <Button variant="outline" size="sm" className="rounded-xl"
                    onClick={() => setReadsChange(prev => prev + 1)}>+1</Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full"
                    onClick={() => setReadsChange(prev => prev + 10)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <Button onClick={applyChanges} disabled={saving || (likesChange === 0 && readsChange === 0)} className="w-full rounded-xl">
                {saving ? "Aplicando..." : "Aplicar cambios"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookStatsModal;
