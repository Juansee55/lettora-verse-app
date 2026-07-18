import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, ChevronRight, RotateCcw } from "lucide-react";

type Node = { id: string; title: string | null; content: string; is_start: boolean; is_ending: boolean };
type Choice = { id: string; from_node_id: string; to_node_id: string; label: string };

const InteractiveStory = () => {
  const { chapterId } = useParams();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [nt, setNt] = useState(""); const [nc, setNc] = useState(""); const [ne, setNe] = useState(false);
  const [lf, setLf] = useState(""); const [lt, setLt] = useState(""); const [ll, setLl] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  useEffect(() => { if (chapterId) load(); }, [chapterId, uid]);

  const load = async () => {
    if (!chapterId) return;
    const { data: ch } = await supabase.from("chapters").select("book:books(author_id)").eq("id", chapterId).maybeSingle();
    setIsAuthor(!!uid && (ch as any)?.book?.author_id === uid);
    const { data: n } = await supabase.from("story_nodes").select("*").eq("chapter_id", chapterId).order("position");
    const list = (n ?? []) as Node[];
    setNodes(list);
    setCurrentId(list.find(x => x.is_start)?.id ?? list[0]?.id ?? null);
    if (list.length) {
      const { data: c } = await supabase.from("story_choices").select("*").in("from_node_id", list.map(x => x.id));
      setChoices((c ?? []) as Choice[]);
    }
  };

  const addNode = async () => {
    if (!chapterId || !nc.trim()) return;
    const { error } = await supabase.from("story_nodes").insert({ chapter_id: chapterId, title: nt || null, content: nc, is_start: nodes.length === 0, is_ending: ne, position: nodes.length });
    if (error) return toast.error(error.message);
    setNt(""); setNc(""); setNe(false); load();
  };
  const addChoice = async () => {
    if (!lf || !lt || !ll) return;
    const { error } = await supabase.from("story_choices").insert({ from_node_id: lf, to_node_id: lt, label: ll });
    if (error) return toast.error(error.message);
    setLl(""); load();
  };

  const current = nodes.find(n => n.id === currentId);
  const cur = choices.filter(c => c.from_node_id === currentId);

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title="Historia interactiva" leftAction={<BackButton />} rightAction={isAuthor && (<button onClick={() => setMode(m => m === "read" ? "edit" : "read")} className="text-primary text-sm">{mode === "read" ? "Editar" : "Leer"}</button>)} />
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {mode === "read" && (
          <>
            {!current && <p className="text-center text-muted-foreground py-10">Sin nodos aún.</p>}
            {current && (
              <div className="liquid-glass rounded-2xl p-5">
                {current.title && <h3 className="font-semibold mb-2">{current.title}</h3>}
                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{current.content}</p>
                {current.is_ending && <p className="mt-4 text-center text-sm text-primary font-semibold">— Final —</p>}
                <div className="mt-5 space-y-2">
                  {cur.map(c => (
                    <button key={c.id} onClick={() => setCurrentId(c.to_node_id)} className="w-full py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium flex items-center justify-between px-4">
                      <span>{c.label}</span><ChevronRight className="w-4 h-4" />
                    </button>
                  ))}
                  {(current.is_ending || cur.length === 0) && (
                    <button onClick={() => setCurrentId(nodes.find(n => n.is_start)?.id ?? null)} className="w-full py-2 rounded-xl bg-muted text-sm flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Reiniciar</button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {mode === "edit" && (
          <>
            <div className="liquid-glass rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo nodo</p>
              <input value={nt} onChange={e => setNt(e.target.value)} placeholder="Título (opcional)" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
              <textarea value={nc} onChange={e => setNc(e.target.value)} rows={4} placeholder="Contenido..." className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
              <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={ne} onChange={e => setNe(e.target.checked)} /> Es un final</label>
              <button onClick={addNode} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm">Crear nodo</button>
            </div>
            <div className="liquid-glass rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold">Nueva opción</p>
              <select value={lf} onChange={e => setLf(e.target.value)} className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm"><option value="">Desde nodo…</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.title || n.content.slice(0, 40)}</option>)}</select>
              <select value={lt} onChange={e => setLt(e.target.value)} className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm"><option value="">Hacia nodo…</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.title || n.content.slice(0, 40)}</option>)}</select>
              <input value={ll} onChange={e => setLl(e.target.value)} placeholder="Texto de la opción" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
              <button onClick={addChoice} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm">Añadir opción</button>
            </div>
            <div className="text-xs text-muted-foreground">Nodos: {nodes.length} · Opciones: {choices.length}</div>
          </>
        )}
      </div>
    </div>
  );
};
export default InteractiveStory;