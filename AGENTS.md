# AGENTS.md — Verify Identity System

## Contexto del Proyecto
Sistema de verificación de identidad para ecommerce. Flujo cliente → upload documentos → admin revisa → aprueba/rechaza. Stack: Supabase (auth + DB + storage) + HTML/CSS/JS plano. Hosting: DonWeb via Git. AI: n8n + OpenAI GPT-4o.

## Convenciones
- **Idioma UI:** Español
- **Idioma código:** Inglés
- **Commit messages:** Español, descriptivos
- **Hosting:** DonWeb public_html/verify
- **Subdomain:** verify.maxihogar.com ✅

## Infraestructura
- Supabase project: `ceogbuepvunwyavltcgu`
- GitHub repo: `https://github.com/Gonn8n/verify-system.git`
- n8n self-hosted: `bot.anexaria.com`
- Webhook n8n: `https://bot.anexaria.com/webhook/verify`

## Pendientes

### 🔒 Seguridad: Bucket privado + URLs firmadas
- **Estado:** Pendiente
- **Descripción:** Cambiar el bucket `verification-files` a no público. En el workflow de n8n, generar URLs firmadas temporales (expiran en 5-10 minutos) antes de pasarlas a OpenAI. Así si alguien obtiene una URL, vence rápido.
- **Pasos:**
  1. `UPDATE storage.buckets SET public = false WHERE name = 'verification-files';`
  2. En n8n, antes de "Analyze with OpenAI", agregar nodo Code que genere URLs firmadas:
     - Usar Supabase `createSignedUrl` o `getSignedUrl` con expiración
  3. Pasar las URLs firmadas a OpenAI en vez de las URLs públicas
- **Prioridad:** Media

### 🎨 Frontend: Mejorar diseño visual
- **Estado:** Pendiente
- **Descripción:** Actualmente tiene un diseño básico. Se puede mejorar con:
  - Gradientes modernos
  - Glassmorphism en paneles
  - Animaciones suaves (transiciones, hover effects)
  - Tipografía más pulida
  - Cards con sombras sutiles
  - Dark mode opcional
- **Prioridad:** Baja

### 🌐 Dominio: Configurar verify.maxihogar.com
- **Estado:** ✅ Completado
- **URL:** `https://verify.maxihogar.com`
- **Prioridad:** Media

### 📊 Dashboard admin: Estadísticas
- **Estado:** Pendiente
- **Descripción:** Agregar estadísticas en el panel admin:
  - Total de verificaciones
  - Tasa de aprobación/rechazo
  - Score promedio de AI
  - Gráfico de tendencias
- **Prioridad:** Baja

### 🔐 Auth: Roles y permisos mejorados
- **Estado:** Pendiente
- **Descripción:** Actualmente solo hay admin y cliente. Se puede mejorar:
  - Roles: super_admin, admin, viewer
  - Logs de actividad
  - 2FA opcional
- **Prioridad:** Baja

## Historial de Cambios Recientes
- [2026-08-16] Workflow n8n simplificado: eliminados nodos paralelos de descarga, OpenAI recibe URLs directas
- [2026-08-16] Fix: `this.helpers.httpRequest()` en vez de `fetch` en Code nodes de n8n
- [2026-08-16] Geolocation, photo enlarge modal, video solo grabar (sin subir), status display en cliente
- [2026-08-15] SQL migrations ejecutadas, RLS policies, storage bucket público
