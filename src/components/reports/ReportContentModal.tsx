import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "microstory" | "book" | "message";
  contentId: string;
  contentTitle?: string;
}

const REPORT_REASONS = [
  { key: "spam", label: "Spam", icon: "🚫" },
  { key: "harassment", label: "Acoso o bullying", icon: "😡" },
  { key: "inappropriate", label: "Contenido inapropiado", icon: "⚠️" },
  { key: "copyright", label: "Derechos de autor", icon: "©️" },
  { key: "other", label: "Otro motivo", icon: "📝" },
] as const;

const ReportContentModal = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
}: ReportContentModalProps) => {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: "Selecciona un motivo",
        description: "Elige por qué reportas este contenido.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para reportar.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    const { error } = await (supabase.from("content_reports" as any).insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason: selectedReason,
      description: description.trim() || null,
    } as any) as any);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reporte enviado",
        description: "Revisaremos tu reporte lo antes posible. Gracias.",
      });
      setSelectedReason(null);
      setDescription("");
      onClose();
    }
    setSending(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden"
          >
            {/* Pull indicator (mobile) */}
            <div className="pt-3 pb-1 sm:hidden">
              <div className="ios-pull-indicator" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-destructive" />
                <h2 className="font-display font-semibold text-[17px]">Reportar contenido</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content preview */}
            {contentTitle && (
              <div className="px-5 py-3 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-[13px] text-muted-foreground truncate">
                    {contentType === "book" ? "Libro" : "Microrrelato"}: <span className="font-medium text-foreground">{contentTitle}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Reasons */}
            <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
              <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                ¿Por qué reportas esto?
              </p>

              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.key}
                  onClick={() => setSelectedReason(reason.key)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    selectedReason === reason.key
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xl">{reason.icon}</span>
                  <span className={`text-[15px] font-medium ${
                    selectedReason === reason.key ? "text-primary" : "text-foreground"
                  }`}>
                    {reason.label}
                  </span>
                  {selectedReason === reason.key && (
                    <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    </div>
                  )}
                </button>
              ))}

              {/* Description */}
              <div className="pt-2">
                <Textarea
                  placeholder="Describe el problema (opcional)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  className="min-h-[80px] text-[15px] border-0 bg-muted/50 focus-visible:ring-1 resize-none rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground text-right mt-1">
                  {description.length}/500
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 pb-5 pt-2">
              <Button
                variant="destructive"
                className="w-full h-12 rounded-2xl text-[17px] font-semibold"
                onClick={handleSubmit}
                disabled={!selectedReason || sending}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Enviar reporte
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Los reportes falsos pueden resultar en restricciones de cuenta.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportContentModal;
