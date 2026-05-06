import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Upload, Download, Trash2, Package, Smartphone, FileBox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";
import IOSBottomNav from "@/components/navigation/IOSBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Build {
  id: string;
  platform: "apk" | "obb";
  version: string;
  file_path: string;
  file_size: number;
  notes: string | null;
  created_at: string;
}

const formatBytes = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
};

const AppBuildsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [platform, setPlatform] = useState<"apk" | "obb">("apk");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: ok } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!ok) {
        toast({ title: "Acceso denegado", variant: "destructive" });
        navigate("/home"); return;
      }
      setIsAdmin(true);
      await fetchBuilds();
      setLoading(false);
    })();
  }, []);

  const fetchBuilds = async () => {
    const { data } = await (supabase as any).from("app_builds").select("*").order("created_at", { ascending: false });
    setBuilds(data || []);
  };

  const handleUpload = async () => {
    if (!file || !version.trim()) {
      toast({ title: "Faltan datos", description: "Selecciona archivo y versión", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");
      const ext = platform === "apk" ? "apk" : "obb";
      const path = `${platform}/lettora-${version}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("app-builds").upload(path, file, {
        contentType: platform === "apk" ? "application/vnd.android.package-archive" : "application/octet-stream",
      });
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase as any).from("app_builds").insert({
        uploaded_by: user.id, platform, version, file_path: path, file_size: file.size, notes: notes || null,
      });
      if (insErr) throw insErr;
      toast({ title: "Build subida", description: `${platform.toUpperCase()} v${version}` });
      setFile(null); setVersion(""); setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      fetchBuilds();
    } catch (e: any) {
      toast({ title: "Error al subir", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (b: Build) => {
    const { data, error } = await supabase.storage.from("app-builds").createSignedUrl(b.file_path, 60 * 5);
    if (error || !data) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (b: Build) => {
    if (!confirm(`¿Eliminar ${b.platform.toUpperCase()} v${b.version}?`)) return;
    await supabase.storage.from("app-builds").remove([b.file_path]);
    await (supabase as any).from("app_builds").delete().eq("id", b.id);
    fetchBuilds();
    toast({ title: "Build eliminada" });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      <IOSHeader title="App Builds" large subtitle="Solo administradores" />
      <div className="px-4 space-y-5 pt-2">
        {/* Upload card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="liquid-glass rounded-3xl p-5 border border-border/50 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold">Subir nueva build</h2>
              <p className="text-[12px] text-muted-foreground">APK o expansión OBB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPlatform("apk")}
              className={`p-3 rounded-2xl border-2 transition-all ${platform === "apk" ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
            >
              <Smartphone className="w-5 h-5 mx-auto mb-1" />
              <p className="text-[13px] font-semibold">APK</p>
            </button>
            <button
              onClick={() => setPlatform("obb")}
              className={`p-3 rounded-2xl border-2 transition-all ${platform === "obb" ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
            >
              <FileBox className="w-5 h-5 mx-auto mb-1" />
              <p className="text-[13px] font-semibold">OBB</p>
            </button>
          </div>

          <Input placeholder="Versión (ej. 1.9.4)" value={version} onChange={(e) => setVersion(e.target.value)} className="rounded-xl h-11" />
          <Textarea placeholder="Notas de versión (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl resize-none" rows={3} />

          <div>
            <input
              ref={fileRef}
              type="file"
              accept={platform === "apk" ? ".apk,application/vnd.android.package-archive" : ".obb,application/octet-stream"}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="build-file"
            />
            <label htmlFor="build-file" className="block cursor-pointer p-4 border-2 border-dashed border-border rounded-2xl text-center active:bg-muted/40">
              <Package className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[13px] font-medium">{file ? file.name : "Seleccionar archivo"}</p>
              {file && <p className="text-[11px] text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>}
            </label>
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="w-full rounded-2xl h-12 font-semibold">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar build"}
          </Button>
        </motion.div>

        {/* List */}
        <div>
          <h3 className="text-[15px] font-bold mb-3 px-1">Builds subidas ({builds.length})</h3>
          {builds.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
              <p className="text-[13px] text-muted-foreground">Aún no hay builds.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {builds.map((b) => (
                <div key={b.id} className="liquid-glass rounded-2xl p-4 flex items-center gap-3 border border-border/40">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${b.platform === "apk" ? "bg-emerald-500/15 text-emerald-500" : "bg-blue-500/15 text-blue-500"}`}>
                    {b.platform === "apk" ? <Smartphone className="w-5 h-5" /> : <FileBox className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold">{b.platform.toUpperCase()} v{b.version}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(b.file_size)} · {new Date(b.created_at).toLocaleDateString()}</p>
                    {b.notes && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{b.notes}</p>}
                  </div>
                  <button onClick={() => handleDownload(b)} className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center active:opacity-60">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(b)} className="w-9 h-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center active:opacity-60">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <IOSBottomNav />
    </div>
  );
};

export default AppBuildsPage;
