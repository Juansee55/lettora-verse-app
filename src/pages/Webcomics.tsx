import { useEffect, useState } from "react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import BackButton from "@/components/navigation/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Image as ImageIcon } from "lucide-react";

type WC = { id: string; title: string; description: string | null; author_id: string };
type Ep = { id: string; title: string; episode_number: number; panel_urls: string[] };

const Webcomics = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [list, setList] = useState<WC[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<WC | null>(null);
  const [episodes, setEpisodes] = useState<Ep[]>([]);
  const [epTitle, setEpTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); load(); }, []);
  useEffect(() => { if (selected) loadEpisodes(selected.id); }, [selected]);

  const load = async () => {
    const { data } = await supabase.from("webcomics").select("*").eq("is_published", true).order("created_at", { ascending: false });
    setList((data ?? []) as WC[]);
  };
  const loadEpisodes = async (id: string) => {
    const { data } = await supabase.from("webcomic_episodes").select("*").eq("webcomic_id", id).order("episode_number");
    setEpisodes((data ?? []) as Ep[]);
  };

  const create = async () => {
    if (!title.trim() || !uid) return;
    const { error } = await supabase.from("webcomics").insert({ title, description: desc || null, author_id: uid });
    if (error) return toast.error(error.message);
    setTitle(""); setDesc(""); setCreating(false); load();
  };

  const addEpisode = async (files: FileList | null) => {
    if (!files || !selected || !uid || !epTitle.trim()) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const path = `${uid}/${selected.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("webcomic-panels").upload(path, f);
        if (error) throw error;
        const { data: signed } = await supabase.storage.from("webcomic-panels").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) urls.push(signed.signedUrl);
      }
      const nextNum = (episodes[episodes.length - 1]?.episode_number ?? 0) + 1;
      await supabase.from("webcomic_episodes").insert({ webcomic_id: selected.id, title: epTitle, episode_number: nextNum, panel_urls: urls });
      setEpTitle(""); loadEpisodes(selected.id); toast.success("Episodio publicado");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  if (selected) return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title={selected.title} leftAction={<button onClick={() => setSelected(null)} className="text-primary text-sm">Volver</button>} />
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {selected.author_id === uid && (
          <div className="liquid-glass rounded-2xl p-3 space-y-2">
            <input value={epTitle} onChange={e => setEpTitle(e.target.value)} placeholder="Título del episodio" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <label className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center justify-center gap-2 cursor-pointer">
              <ImageIcon className="w-4 h-4" /> {uploading ? "Subiendo..." : "Subir paneles"}
              <input type="file" multiple accept="image/*" className="hidden" onChange={e => addEpisode(e.target.files)} disabled={uploading} />
            </label>
          </div>
        )}
        {episodes.map(ep => (
          <div key={ep.id} className="space-y-2">
            <h3 className="text-sm font-semibold">EP {ep.episode_number}. {ep.title}</h3>
            <div className="space-y-1">{ep.panel_urls.map((u, i) => <img key={i} src={u} className="w-full rounded-xl" />)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-safe bg-background">
      <IOSHeader title="Webcómics" leftAction={<BackButton />} rightAction={<button onClick={() => setCreating(v => !v)} className="text-primary"><Plus className="w-5 h-5" /></button>} />
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {creating && (
          <div className="liquid-glass rounded-2xl p-4 space-y-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Descripción" className="w-full bg-muted/60 rounded-xl px-3 py-2 text-sm" />
            <button onClick={create} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm">Crear webcómic</button>
          </div>
        )}
        {list.map(w => (
          <div key={w.id} onClick={() => setSelected(w)} className="liquid-glass rounded-2xl p-4 cursor-pointer">
            <h3 className="font-semibold">{w.title}</h3>
            {w.description && <p className="text-xs text-muted-foreground mt-1">{w.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Webcomics;