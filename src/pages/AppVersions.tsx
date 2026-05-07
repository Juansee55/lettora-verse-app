import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const AppVersionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [versions, setVersions] = useState<any[]>([]);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const admin = !!r?.some((x: any) => x.role === "admin");
    setIsAdmin(admin);
    if (!admin) { navigate("/"); return; }
    load();
  })(); }, []);

  const load = async () => {
    const { data } = await supabase.from("app_versions").select("*").order("released_at", { ascending: false });
    setVersions(data || []);
  };

  const create = async () => {
    if (!version.trim()) return;
    const { error } = await supabase.from("app_versions").insert({
      version: version.trim(), release_notes: notes.trim() || null, is_current: true,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setVersion(""); setNotes("");
    toast({ title: "Versión publicada", description: "Los usuarios verán el aviso al abrir la app." });
    load();
  };

  const setCurrent = async (id: string) => {
    await supabase.from("app_versions").update({ is_current: true }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("app_versions").delete().eq("id", id);
    load();
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="ios-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary"><ArrowLeft className="w-5 h-5" /> Atrás</button>
          <p className="text-[17px] font-semibold">Versiones</p>
          <span className="w-10" />
        </div>
      </div>

      <div className="px-4 pt-6 max-w-xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold">Publicar nueva versión</h3>
          <Input placeholder="Ej: 1.9.4" value={version} onChange={(e) => setVersion(e.target.value)} className="rounded-xl" />
          <Textarea placeholder="Notas de la versión" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="rounded-xl" />
          <Button variant="ios" className="w-full" onClick={create}><Plus className="w-4 h-4 mr-1" /> Publicar</Button>
          <p className="text-[11px] text-muted-foreground">Marca esta versión como actual y avisa a los usuarios. No envía el binario automáticamente.</p>
        </div>

        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{v.version}</p>
                  {v.is_current && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Actual</span>}
                </div>
                <p className="text-[12px] text-muted-foreground mt-1 whitespace-pre-wrap">{v.release_notes || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(v.released_at).toLocaleString()}</p>
              </div>
              {!v.is_current && (
                <Button variant="ghost" size="icon" onClick={() => setCurrent(v.id)} title="Marcar como actual"><Star className="w-4 h-4" /></Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppVersionsPage;