# SOP - Sistema Verify

## Procedimientos Operativos Estándar

---

## 1. Proyecto

**Nombre:** Verify - Sistema de Verificación de Identidad
**Ubicación:** `D:\anexaria\verify-system`
**Stack:** HTML/CSS/JS + Supabase (Auth, Storage, Edge Functions)
**Hosting:** DonWeb (deploy via Git)

---

## 2. Estructura del Proyecto

```
verify-system/
├── index.html                  # Login de administrador
├── admin/
│   └── index.html              # Panel administrativo
├── v/
│   └── index.html              # Flujo de verificación del cliente
├── css/
│   └── styles.css              # Estilos globales
├── js/
│   ├── config.js               # Configuración Supabase
│   ├── auth.js                 # Autenticación
│   ├── admin.js                # Lógica panel admin
│   └── client.js               # Lógica cliente
├── email-templates/
│   ├── verification.html       # Email de verificación
│   ├── approved.html           # Email de aprobación
│   └── rejected.html           # Email de rechazo
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 001_init.sql        # Schema de BD
│   └── functions/
│       └── send-status-email/
│           └── index.ts        # Edge Function
└── README.md
```

---

## 3. Configuración de Supabase

### 3.1 Proyecto
- **Dashboard:** https://supabase.com/dashboard/project/ceogbuepvunwyavltcgu
- **URL:** `https://ceogbuepvunwyavltcgu.supabase.co`
- **Anon Key:** Obtener de Settings > API

### 3.2 Ejecutar SQL
1. Ir a **SQL Editor** en el dashboard
2. Pegar y ejecutar el contenido de `supabase/migrations/001_init.sql`
3. Esto crea:
   - Tabla `verifications`
   - Tabla `admin_users`
   - RLS policies
   - Storage bucket `verification-files`
   - Función `update_verification_by_code`

### 3.3 Crear Usuario Admin
1. Ir a **Authentication > Users**
2. Click en **Add user** > Create new user
3. Completar email y contraseña
4. Copiar el UUID generado
5. Ejecutar en SQL Editor:
```sql
INSERT INTO admin_users (id, email) 
VALUES ('UUID_DEL_USUARIO', 'email@deladmin.com');
```

### 3.4 Variables de Entorno (Edge Functions)
1. Ir a **Edge Functions > Settings**
2. Agregar: `RESEND_API_KEY` = tu API key de Resend

### 3.5 Deploy Edge Function
```bash
npm install -g supabase
supabase login
supabase link --project-ref ceogbuepvunwyavltcgu
supabase functions deploy send-status-email
```

---

## 4. Configurar js/config.js

```javascript
const SUPABASE_CONFIG = {
  url: 'https://ceogbuepvunwyavltcgu.supabase.co',
  anonKey: 'TU_SUPABASE_ANON_KEY_AQUI',
  domain: 'https://tudominio.com',   // Tu dominio real
  commerceName: 'Verify',
  storageBucket: 'verification-files'
};
```

---

## 5. Configurar Subdominio en DonWeb

**Objetivo:** `verify.maxihogar.com` sin afectar el dominio principal.

### 5.1 Crear Subdominio
1. En panel DonWeb, ir a **Mi Sitio Web > Dominios**
2. Buscar la opción **Subdominios** o **Addon Domains**
3. Crear subdominio:
   - **Nombre:** `verify`
   - **Dominio padre:** `maxihogar.com`
   - **Directorio:** `public_html/verify` (o crear carpeta específica)
4. Guardar cambios

### 5.2 Apuntar el Subdominio
Si DonWeb no crea el subdominio automáticamente:
1. Ir a la gestión de DNS del dominio `maxihogar.com`
2. Agregar registro DNS:
   - **Tipo:** CNAME
   - **Nombre:** `verify`
   - **Valor:** `maxihogar.com` (o IP del hosting)
   - **TTL:** 3600

### 5.3 Estructura de Directorios
```
public_html/
├── (archivos del sitio principal maxihogar.com)
└── verify/
    ├── index.html
    ├── admin/
    ├── v/
    ├── css/
    └── js/
```

**IMPORTANTE:** Los archivos de Verify van dentro de la carpeta `verify/` para que no interfieran con el sitio principal.

---

## 6. Deploy en DonWeb via Git

### 5.1 Opción A: Repositorio Público (más simple)

1. **Subir código a GitHub:**
   ```bash
   cd D:\anexaria\verify-system
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/USUARIO/verify-system.git
   git push -u origin main
   ```

2. **En panel DonWeb (Ferozo):**
   - Ir a **Mi Sitio Web > GIT**
   - Click en **Crear nuevo**
   - Completar:
     - **Repositorio:** URL HTTPS del repo (ej: `https://github.com/USUARIO/verify-system.git`)
     - **Rama:** `main`
     - **Directorio:** `public_html/verify` (para subdominio verify.maxihogar.com)
   - Click en **Crear ahora**

3. **IMPORTANTE:** El directorio de destino debe estar **completamente vacío**
   - Si ya existe contenido en `public_html/verify`, eliminarlo primero

4. **Activar Implementación Automática (opcional):**
   - Copiar el enlace de "Implementación automática"
   - En GitHub: **Settings > Webhooks > Add webhook**
   - Pegar en **Payload URL**
   - Click en **Add webhook**
   - Ahora cada push se deploya automáticamente

### 5.2 Opción B: Repositorio Privado (más seguro)

1. **Generar clave SSH en DonWeb:**
   - En panel GIT, click en **Clave SSH**
   - Click en **Generar clave SSH**
   - Copiar la clave generada

2. **Agregar Deploy Key en GitHub:**
   - En repositorio: **Settings > Deploy keys > Add deploy key**
   - **Title:** Descriptivo (ej: "DonWeb Hosting")
   - **Key:** Pegar la clave copiada
   - Click en **Add key**

3. **Obtener URL SSH:**
   - En GitHub: **Code > SSH**
   - Copiar la URL (ej: `git@github.com:USUARIO/verify-system.git`)

4. **En panel DonWeb:**
   - Ir a **Mi Sitio Web > GIT > Crear nuevo**
   - **Repositorio:** URL SSH copiada
   - **Rama:** `main`
   - **Directorio:** `public_html/verify`
   - Click en **Crear ahora**

### 5.3 Forzar Actualización
- Si el repo se actualizó, click en **Desplegar** en el panel GIT

---

## 7. Configurar Redirecciones (SPA)

Para que las URLs limpias funcionen (`/v/?code=XXX`):

1. En DonWeb, ir a **Mi Sitio Web > Administrador de Archivos**
2. Crear archivo `.htaccess` en `public_html/verify` con:

```apache
RewriteEngine On
RewriteBase /verify/

# Redirigir rutas de verificación
RewriteRule ^v/?$ /verify/v/index.html [L,QSA]
RewriteRule ^admin/?$ /verify/admin/index.html [L,QSA]
```

---

## 7. Checklist de Pruebas

### 7.1 Antes del Deploy
- [ ] SQL ejecutado en Supabase
- [ ] Usuario admin creado y en tabla `admin_users`
- [ ] `config.js` con anon key correcta
- [ ] Bucket `verification-files` creado en Storage
- [ ] Edge Function deployada (si se usa para emails)

### 7.2 Después del Deploy
- [ ] Login funciona: `https://verify.maxihogar.com/`
- [ ] Panel admin carga: `https://verify.maxihogar.com/admin/`
- [ ] Crear verificación genera código único
- [ ] Link de verificación funciona: `https://verify.maxihogar.com/v/?code=XXX`
- [ ] Flujo del cliente funciona en mobile
- [ ] Archivos se suben a Storage
- [ ] Estados se actualizan correctamente
- [ ] Sitio principal `maxihogar.com` no se ve afectado

---

## 8. Flujo del Sistema

```
Admin crea verificación
        ↓
Se genera código único (ej: HUYR8QOHYW48K78BFAP4A6)
        ↓
Admin envía link al cliente (email/WhatsApp/copiar)
        ↓
Cliente abre link → Ve intro → Sube DNI → Graba video → Sube tarjeta
        ↓
Archivos se guardan en Supabase Storage
        ↓
Admin ve documentos en panel → Cambia estado
        ↓
Email automático al cliente (aprobado/rechazado)
```

---

## 9. Estados

| Estado | Color | Descripción |
|--------|-------|-------------|
| `pending` | Amarillo (#F59E0B) | Creado, esperando cliente |
| `in_review` | Azul (#3B82F6) | Cliente completó, en revisión |
| `approved` | Verde (#10B981) | Verificación exitosa |
| `rejected` | Rojo (#EF4444) | Verificación fallida |

---

## 10. Contactos y Recursos

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ceogbuepvunwyavltcgu
- **DonWeb Panel:** https://micuenta.donweb.com/
- **Resend (emails):** https://resend.com
- **Documentación DonWeb GIT:** https://soporte.donweb.com/hc/es/articles/18963699495956

---

## 11. Notas

- La fuente usada es **Work Sans** de Google Fonts
- Color primario: **Rojo (#DC2626)**
- El cliente NO necesita login para subir documentos
- Los archivos se suben via Storage policy pública (INSERT)
- La actualización del registro se hace via función SECURITY DEFINER

---

*Última actualización: 2026-08-13*
