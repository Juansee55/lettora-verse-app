import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type PermissionStatus } from "@capacitor/local-notifications";

export const LOCAL_NOTIFICATION_CHANNEL_ID = "lettora_local_notifications";
const WEB_NOTIFICATION_ICON = "/icon-192.png";
const NATIVE_FCM_ENABLED = import.meta.env.VITE_ENABLE_NATIVE_PUSH === "true";

export interface LocalNotificationInput {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  tag?: string;
  type?: string;
}

const isNative = () => Capacitor.isNativePlatform();

const stableNotificationId = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash % 2_000_000_000) || 1;
};

export const localNotificationPermission = async (): Promise<"granted" | "denied" | "prompt" | "unsupported"> => {
  if (isNative()) {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return "granted";
    if (status.display === "denied") return "denied";
    return "prompt";
  }

  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
};

const ensureNativeChannel = async () => {
  await LocalNotifications.createChannel({
    id: LOCAL_NOTIFICATION_CHANNEL_ID,
    name: "Lettora",
    description: "Mensajes, actividad, novedades y anuncios de Lettora",
    importance: 5,
    visibility: 1,
    sound: "default",
    vibration: true,
  });
};

export const requestLocalNotificationPermission = async () => {
  if (isNative()) {
    const current = await LocalNotifications.checkPermissions();
    const status: PermissionStatus = current.display === "prompt" || current.display === "prompt-with-rationale"
      ? await LocalNotifications.requestPermissions()
      : current;
    if (status.display === "granted") await ensureNativeChannel();
    return status.display === "granted" ? "granted" : status.display === "denied" ? "denied" : "prompt";
  }

  if (typeof Notification === "undefined") return "unsupported" as const;
  return Notification.requestPermission();
};

const getLink = (link?: string | null) => {
  if (typeof link !== "string" || !link.startsWith("/")) return "/notifications";
  return link;
};

const hasWebPushSubscription = async () => {
  if (isNative() || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    return Boolean(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
};

export const showLocalNotification = async (notification: LocalNotificationInput) => {
  // FCM already renders the Android system notification when enabled. Keep the
  // local channel as a fallback for builds where FCM is intentionally disabled.
  if (isNative() && NATIVE_FCM_ENABLED) return false;

  if (isNative()) {
    if (await localNotificationPermission() !== "granted") return false;
    await ensureNativeChannel();
    await LocalNotifications.schedule({
      notifications: [{
        id: stableNotificationId(notification.id),
        title: notification.title,
        body: notification.body,
        channelId: LOCAL_NOTIFICATION_CHANNEL_ID,
        smallIcon: "ic_notification",
        iconColor: "#7C3AED",
        extra: { url: getLink(notification.link), type: notification.type || "notification" },
        schedule: { at: new Date(Date.now() + 250) },
      }],
    });
    return true;
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  // A subscribed service worker already displays the corresponding background
  // push. Avoid a duplicate browser notification while the app is open.
  if (await hasWebPushSubscription()) return false;

  const instance = new Notification(notification.title, {
    body: notification.body,
    icon: WEB_NOTIFICATION_ICON,
    badge: WEB_NOTIFICATION_ICON,
    tag: notification.tag || notification.id,
    data: { url: getLink(notification.link), type: notification.type || "notification" },
  });
  instance.onclick = () => {
    window.focus();
    window.location.assign(getLink(notification.link));
    instance.close();
  };
  return true;
};

export const setupLocalNotificationActions = async () => {
  if (!isNative()) return undefined;
  return LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const url = event.notification.extra?.url;
    if (typeof url === "string" && url.startsWith("/")) window.location.assign(url);
  });
};
