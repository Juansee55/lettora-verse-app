import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "lettora_device_id";

export const getDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

const detectDeviceName = (): { name: string; platform: string } => {
  const ua = navigator.userAgent;
  let platform = "Web";
  let name = "Navegador";
  if (/iPhone/i.test(ua)) { platform = "iOS"; name = "iPhone"; }
  else if (/iPad/i.test(ua)) { platform = "iPadOS"; name = "iPad"; }
  else if (/Android/i.test(ua)) { platform = "Android"; name = /Mobile/i.test(ua) ? "Android Phone" : "Android Tablet"; }
  else if (/Macintosh/i.test(ua)) { platform = "macOS"; name = "Mac"; }
  else if (/Windows/i.test(ua)) { platform = "Windows"; name = "PC Windows"; }
  else if (/Linux/i.test(ua)) { platform = "Linux"; name = "Linux"; }
  else if (/SmartTV|Tizen|Web0S|WebOS/i.test(ua)) { platform = "Smart TV"; name = "Smart TV"; }

  let browser = "";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  if (browser) name = `${name} · ${browser}`;
  return { name, platform };
};

/**
 * Tracks the current device as a session row and watches for remote revocation.
 * When the row is deleted or has revoked_at set from another device, signs out here.
 */
export const useSessionTracker = () => {
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const register = async (userId: string) => {
      const deviceId = getDeviceId();
      const { name, platform } = detectDeviceName();
      await supabase
        .from("user_sessions")
        .upsert(
          {
            user_id: userId,
            device_id: deviceId,
            device_name: name,
            platform,
            user_agent: navigator.userAgent.slice(0, 500),
            last_seen: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "user_id,device_id" }
        );

      // Heartbeat every 2 minutes
      intervalId = setInterval(async () => {
        await supabase
          .from("user_sessions")
          .update({ last_seen: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("device_id", deviceId);
      }, 120_000);

      // Listen for remote revocation
      const channel = supabase
        .channel(`user_sessions:${userId}:${deviceId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_sessions", filter: `user_id=eq.${userId}` },
          async (payload: any) => {
            const row = payload.new || payload.old;
            if (!row || row.device_id !== deviceId) return;
            if (payload.eventType === "DELETE" || (payload.new && payload.new.revoked_at)) {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }
          }
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
        if (intervalId) clearInterval(intervalId);
      };
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) register(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        register(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        if (cleanup) cleanup();
        cleanup = null;
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      if (cleanup) cleanup();
    };
  }, []);
};
