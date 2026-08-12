# Referencias de notificaciones push

## Capacitor Push Notifications

Fuente: https://capacitorjs.com/docs/apis/push-notifications

La API oficial de Capacitor para notificaciones push usa Firebase Cloud Messaging en Android. Requiere instalar `@capacitor/push-notifications`, sincronizar Capacitor y añadir `google-services.json` dentro de `android/app/`. En Android 13 o superior hay que llamar a `checkPermissions()` y `requestPermissions()` antes de registrar el dispositivo. La API expone eventos de registro, error, recepción y acción al tocar la notificación. También recomienda crear un canal Android y definir un icono blanco sobre fondo transparente para las notificaciones.

## Guía Firebase para Capacitor

Fuente: https://capacitorjs.com/docs/guides/push-notifications-firebase

La configuración de Android necesita registrar el paquete `com.lettora.verse` en Firebase y descargar `google-services.json`. El archivo se coloca en `android/app/`; no se debe versionar públicamente. La integración usa FCM para emitir tokens y recibir notificaciones.

## Supabase y FCM

Fuente: https://supabase.com/docs/guides/functions/examples/push-notifications

Supabase recomienda guardar los tokens FCM asociados al usuario y usar una Edge Function disparada cuando se inserta una fila en `public.notifications`. La Edge Function autentica contra FCM HTTP v1 mediante una cuenta de servicio de Firebase. La clave de cuenta de servicio debe guardarse como secreto y nunca dentro del repositorio.

## Estado del proyecto

Lettora ya tiene una tabla `public.notifications`, triggers para followers, likes, likes de capítulos, comentarios, lectores nuevos, mensajes y menciones, además de la pantalla `Notifications.tsx`. También existe push web basado en `push_subscriptions` y una Edge Function `send-push`, pero el cliente Android aún no registra tokens FCM porque no está instalado el plugin nativo ni está configurado Firebase.
