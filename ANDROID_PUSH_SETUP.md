# Notificaciones Android de Lettora

La aplicación ya incluye el registro nativo de tokens FCM, permisos Android 13+, canal `lettora_notifications`, manejo de notificaciones en primer plano y navegación al tocar un aviso. Para evitar cierres en APKs que todavía no tienen Firebase configurado, el registro nativo está desactivado por defecto y se activa compilando con `VITE_ENABLE_NATIVE_PUSH=true`.

## Firebase

En Firebase Console crea o selecciona un proyecto y registra una aplicación Android con este paquete:

```text
com.lettora.verse
```

Descarga `google-services.json` y colócalo en:

```text
android/app/google-services.json
```

No subas ese archivo al repositorio si el proyecto exige proteger su configuración. El Gradle de la aplicación detecta el archivo automáticamente. Después de añadirlo, genera el build con `VITE_ENABLE_NATIVE_PUSH=true` para activar el registro FCM nativo.

## Supabase Edge Function

Configura estos secretos en la función `send-push`:

```text
INTERNAL_PUSH_SECRET=<secreto-compartido-con-el-webhook>
FCM_SERVICE_ACCOUNT_JSON=<JSON-completo-de-la-cuenta-de-servicio-de-Firebase>
VAPID_PUBLIC_KEY=<opcional-para-web-push>
VAPID_PRIVATE_KEY=<opcional-para-web-push>
VAPID_SUBJECT=mailto:admin@lettora.app
```

La cuenta de servicio debe tener permiso para enviar mensajes de Firebase Cloud Messaging. `FCM_SERVICE_ACCOUNT_JSON` debe permanecer como secreto y nunca escribirse en código fuente.

## Base de datos

Aplica la migración:

```text
supabase/migrations/20260812000000_notifications_push_android_and_events.sql
```

Esta migración crea `device_push_tokens`, añade datos estructurados a `notifications`, notifica a seguidores cuando un libro pasa a publicado y genera avisos para todos los usuarios cuando un administrador publica una noticia activa.

## Webhook de entrega

Configura un Database Webhook de Supabase para `public.notifications` en eventos `INSERT`, apuntando a la función `send-push`. El webhook debe enviar el encabezado:

```text
x-internal-secret: <el-mismo-valor-de-INTERNAL_PUSH_SECRET>
```

El cuerpo debe incluir al menos:

```json
{
  "user_id": "{{$record.user_id}}",
  "type": "{{$record.type}}",
  "title": "{{$record.title}}",
  "message": "{{$record.message}}",
  "link": "{{$record.link}}"
}
```

Sin Firebase configurado, el centro de notificaciones dentro de la aplicación seguirá funcionando, pero los avisos push de Android no podrán entregarse fuera de la aplicación.
