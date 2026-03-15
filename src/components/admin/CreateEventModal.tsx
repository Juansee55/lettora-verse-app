import { useState } from "react";
import { Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateEventModal = ({ isOpen, onClose, onCreated }: Props) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: "Escribe un título", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      description: description.trim() || null,
      rules: rules.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error al crear evento", variant: "destructive" });
    } else {
      toast({ title: "🎉 Evento creado" });
      setTitle("");
      setDescription("");
      setRules("");
      onCreated();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Crear evento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Título del evento *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-4 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <textarea
            placeholder="Reglas del evento (opcional)"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-muted/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <Button onClick={handleCreate} disabled={saving} className="w-full rounded-xl">
            {saving ? "Creando..." : "Crear evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventModal;
