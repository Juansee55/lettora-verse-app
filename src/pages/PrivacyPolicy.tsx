import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IOSHeader } from "@/components/ios/IOSHeader";

interface Doc {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: string;
  updated_at: string;
}

const TABS = [
  { slug: "privacy-policy", label: "Privacidad" },
  { slug: "terms", label: "Términos" },
];

const renderLine = (line: string, i: number) => {
  if (line.startsWith("## ")) {
    return <h2 key={i} className="text-[17px] font-semibold mt-5 mb-1.5">{line.slice(3)}</h2>;
  }
  if (line.startsWith("- ")) {
    return <li key={i} className="text-[15px] text-muted-foreground ml-4 list-disc">{line.slice(2)}</li>;
  }
  if (!line.trim()) return <div key={i} className="h-2" />;
  return <p key={i} className="text-[15px] leading-relaxed text-muted-foreground">{line}</p>;
};

const PrivacyPolicyPage = () => {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const slug = params.get("doc") || "privacy-policy";
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "", version: "" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        setIsAdmin((roles || []).some((r: any) => r.role === "admin"));
      }
      const { data } = await supabase.from("legal_documents").select("*").eq("slug", slug).maybeSingle();
      setDoc((data as any) || null);
      setEditing(false);
      setLoading(false);
    })();
  }, [slug]);

  const startEdit = () => {
    if (!doc) return;
    setDraft({ title: doc.title, content: doc.content, version: doc.version });
    setEditing(true);
  };

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("legal_documents")
      .update({ title: draft.title, content: draft.content, version: draft.version, updated_by: user?.id })
      .eq("id", doc.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
      return;
    }
    setDoc(data as any);
    setEditing(false);
    toast({ title: "Documento actualizado" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <IOSHeader
        title={doc?.title || "Política de Privacidad"}
        subtitle={doc ? `Versión ${doc.version} · ${new Date(doc.updated_at).toLocaleDateString()}` : undefined}
        rightAction={
          isAdmin && doc ? (
            editing ? (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={startEdit}><Pencil className="w-4 h-4" /></Button>
            )
          ) : undefined
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
          {TABS.map((t) => (
            <button
              key={t.slug}
              onClick={() => setParams({ doc: t.slug })}
              className={`flex-1 py-2 rounded-xl text-[14px] font-medium transition-colors ${
                slug === t.slug ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !doc ? (
          <p className="text-center text-muted-foreground py-16">Documento no disponible.</p>
        ) : editing ? (
          <div className="space-y-3">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título" className="rounded-xl" />
            <Input value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} placeholder="Versión" className="rounded-xl" />
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Contenido (usa ## para títulos y - para listas)"
              className="rounded-xl min-h-[420px] font-mono text-[13px]"
            />
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border/50 p-5"
          >
            {doc.content.split("\n").map(renderLine)}
          </motion.article>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
