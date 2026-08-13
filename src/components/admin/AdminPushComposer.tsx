import { useState } from "react";
import { Bell, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminPushComposer = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/notifications");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ recipients: number; android: number; web: number } | null>(null);

  const sendBroadcast = async () => {
    const safeTitle = title.trim();
    const safeMessage = message.trim();
    if (!safeTitle || !safeMessage) {
      toast({ title: "Completa el título y el mensaje", variant: "destructive" });
      return;
    }
    setSending(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: {
        broadcast: true,
        title: safeTitle,
        message: safeMessage,
        link: link.trim().startsWith("/") ? link.trim() : "/notifications",
      },
    });
    setSending(false);
    if (error || data?.error) {
      toast({ title: "No se pudo enviar el anuncio", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setResult({ recipients: data.recipients || 0, android: data.android?.sent || 0, web: data.web?.sent || 0 });
    setTitle("");
    setMessage("");
    toast({ title: "Anuncio enviado", description: `Se creó para ${data.recipients || 0} usuarios.` });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-primary" />
            Notificación global
          </CardTitle>
          <p className="text-sm text-muted-foreground">Envía un anuncio a los usuarios que tienen activadas las notificaciones de anuncios.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            El envío está protegido: solo los administradores pueden ejecutar esta acción.
          </div>
          <div className="space-y-2">
            <label htmlFor="broadcast-title" className="text-sm font-medium">Título</label>
            <Input id="broadcast-title" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Novedades de Lettora" />
          </div>
          <div className="space-y-2">
            <label htmlFor="broadcast-message" className="text-sm font-medium">Mensaje</label>
            <Textarea id="broadcast-message" maxLength={500} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe el anuncio para la comunidad..." />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="broadcast-link" className="text-sm font-medium">Destino interno opcional</label>
            <Input id="broadcast-link" value={link} onChange={(event) => setLink(event.target.value)} placeholder="/notifications" />
          </div>
          <Button className="w-full rounded-xl" onClick={sendBroadcast} disabled={sending || !title.trim() || !message.trim()}>
            {sending ? <><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Enviando...</> : <><Send className="w-4 h-4 mr-2" />Enviar a todos</>}
          </Button>
          {result && <p className="text-sm text-muted-foreground">Destinatarios: {result.recipients} · Android: {result.android} · Web: {result.web}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPushComposer;
