import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// VAPID public key — must match the one stored as VAPID_PUBLIC_KEY secret on backend
const VAPID_PUBLIC_KEY =
  "BFHYpyIq4r-ecOkIgm6qUQZQz-fN9bvgdPje0ElPlgBGoLQRM4JA-MN0W8e-xVu0u_N8fVAYl3whxsOZ2CtjZYs";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname === "localhost");

const SHOULD_REGISTER_SW = !isInIframe && !isPreviewHost && "serviceWorker" in navigator;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // Online/offline
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Detect installed
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsInstalled(standalone || (window.navigator as any).standalone === true);
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Register SW (production only, NEVER in iframe/preview)
  useEffect(() => {
    if (!SHOULD_REGISTER_SW) {
      // Cleanup any existing SW from previous sessions in preview
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        }).catch(() => {});
      }
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      })
      .catch((err) => console.warn("SW register failed:", err));
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    return outcome === "accepted";
  }, [installPrompt]);

  const subscribePush = useCallback(async () => {
    if (!SHOULD_REGISTER_SW) {
      return { ok: false, reason: "preview" as const };
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") return { ok: false, reason: "denied" as const };

      const reg = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      });

      const json = sub.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, reason: "no-auth" as const };

      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: "user_id,endpoint" });

      setPushSubscribed(true);
      return { ok: true };
    } catch (e) {
      console.error("subscribePush error", e);
      return { ok: false, reason: "error" as const };
    }
  }, []);

  const unsubscribePush = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
    setPushSubscribed(false);
  }, []);

  return {
    isOnline,
    isInstalled,
    canInstall: !!installPrompt,
    promptInstall,
    notificationPermission,
    pushSubscribed,
    subscribePush,
    unsubscribePush,
    pushSupported: SHOULD_REGISTER_SW && "PushManager" in window,
  };
};