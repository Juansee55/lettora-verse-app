import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@lettora.app";
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type NotificationCategory = "chat" | "social" | "announcements";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function categoryFor(type: string): NotificationCategory {
  if (type === "message") return "chat";
  if (["like", "comment", "follow", "mention", "chapter_like", "new_reader"].includes(type)) return "social";
  return "announcements";
}

function base64UrlEncode(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function textBase64UrlEncode(input: string): string {
  return base64UrlEncode(new TextEncoder().encode(input));
}

async function createFcmAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = textBase64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = textBase64UrlEncode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const pem = account.private_key.replace(/\\n/g, "\n");
  const keyData = Uint8Array.from(atob(pem.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replaceAll("\n", "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`FCM OAuth token error: ${response.status}`);
  const data = await response.json();
  return data.access_token as string;
}

async function sendFcm(tokens: string[], title: string, message: string, link: string, type: string) {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw || tokens.length === 0) return { sent: 0, invalid: [] as string[], skipped: "not-configured" };
  const account = JSON.parse(raw) as ServiceAccount;
  const accessToken = await createFcmAccessToken(account);
  const results = await Promise.allSettled(tokens.map(async (token) => {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body: message },
          data: { link, type },
          android: {
            priority: "high",
            notification: { channel_id: "lettora_notifications", icon: "ic_notification" },
          },
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      const invalid = response.status === 404 || body.includes("UNREGISTERED") || body.includes("INVALID_ARGUMENT");
      throw Object.assign(new Error(`FCM ${response.status}: ${body}`), { invalid });
    }
    return token;
  }));
  const invalid = results.flatMap((result, index) => result.status === "rejected" && result.reason?.invalid ? [tokens[index]] : []);
  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    invalid,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const expected = Deno.env.get("INTERNAL_PUSH_SECRET");
  const provided = req.headers.get("x-internal-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json();
    const { user_id, type, title, message, link } = payload;
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("push_preferences").eq("id", user_id).maybeSingle();
    const prefs = profile?.push_preferences || { chat: true, social: true, announcements: true };
    if (prefs[categoryFor(type || "")] === false) {
      return new Response(JSON.stringify({ skipped: "user-pref" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = message || "";
    const webResults = VAPID_PUBLIC && VAPID_PRIVATE
      ? await sendWebPush(user_id, title, body, link || "/home", type || "notification")
      : { sent: 0, total: 0 };

    const { data: devices } = await supabase.from("device_push_tokens").select("id, token").eq("user_id", user_id).eq("platform", "android");
    const fcmResults = await sendFcm((devices || []).map((device) => device.token), title, body, link || "/home", type || "notification");
    if (fcmResults.invalid.length > 0) {
      await supabase.from("device_push_tokens").delete().in("token", fcmResults.invalid);
    }

    return new Response(JSON.stringify({ web: webResults, android: fcmResults }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("send-push error", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function sendWebPush(userId: string, title: string, message: string, link: string, type: string) {
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, total: 0 };
  const body = JSON.stringify({ title, body: message, url: link, tag: type });
  const results = await Promise.allSettled(subs.map((subscription) => webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, body,
  ).catch(async (error) => {
    if (error?.statusCode === 404 || error?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
    throw error;
  })));
  return { sent: results.filter((result) => result.status === "fulfilled").length, total: subs.length };
}
