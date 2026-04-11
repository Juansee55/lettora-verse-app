import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  writerId: string;
  compact?: boolean;
}

const WriterSubscribeButton = ({ writerId, compact = false }: Props) => {
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, [writerId]);

  const checkSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === writerId) { setLoading(false); return; }

    const { data } = await supabase
      .from("writer_subscriptions")
      .select("id")
      .eq("subscriber_id", user.id)
      .eq("writer_id", writerId)
      .maybeSingle();

    setSubscribed(!!data);
    setLoading(false);
  };

  const toggleSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    if (subscribed) {
      await supabase
        .from("writer_subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("writer_id", writerId);
      setSubscribed(false);
      toast({ title: "Suscripción cancelada" });
    } else {
      await supabase.from("writer_subscriptions").insert({
        subscriber_id: user.id,
        writer_id: writerId,
      });
      setSubscribed(true);
      toast({ title: "¡Suscrito! 🔔", description: "Recibirás notificaciones de este escritor" });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <button disabled className={`flex items-center gap-1.5 ${compact ? "px-3 py-1.5" : "px-4 py-2"} rounded-full bg-muted`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleSubscription}
      className={`flex items-center gap-1.5 ${compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]"} rounded-full font-semibold transition-colors ${
        subscribed
          ? "bg-primary/10 text-primary"
          : "bg-primary text-primary-foreground"
      }`}
    >
      {subscribed ? (
        <>
          <Bell className="w-3.5 h-3.5 fill-current" />
          Suscrito
        </>
      ) : (
        <>
          <BellOff className="w-3.5 h-3.5" />
          Suscribirse
        </>
      )}
    </button>
  );
};

export default WriterSubscribeButton;
