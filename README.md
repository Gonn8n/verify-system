# Verify System

Sistema de verificación de identidad para ecommerce.

## Estructura

```
verify-system/
├── index.html              # Login de administrador
├── admin/
│   └── index.html          # Panel administrativo
├── v/
│   └── index.html          # Flujo de verificación del cliente
├── css/
│   └── styles.css          # Estilos globales
├── js/
│   ├── config.js           # Configuración Supabase
│   ├── auth.js             # Lógica de autenticación
│   ├── admin.js            # Lógica del panel admin
│   └── client.js           # Lógica del cliente
├── email-templates/
│   ├── verification.html   # Email de verificación
│   ├── approved.html       # Email de aprobación
│   └── rejected.html       # Email de rechazo
└── supabase/
    ├── config.toml
    ├── migrations/
    │   └── 001_init.sql    # Schema de base de datos
    └── functions/
        └── send-status-email/
            └── index.ts    # Edge Function para emails
```

## Configuración

### 1. Supabase

1. Ir a tu dashboard: https://supabase.com/dashboard/project/ceogbuepvunwyavltcgu
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/migrations/001_init.sql`
3. Ir a **Storage** y crear un bucket llamado `verification-files` (privado)
4. Ir a **Authentication > Email Templates** y personalizar los emails si es necesario

### 2. Variables de Entorno (Edge Functions)

En el dashboard de Supabase, ir a **Edge Functions > Settings** y agregar:

- `RESEND_API_KEY`: Tu API key de Resend (https://resend.com)

### 3. Deploy Edge Function

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref ceogbuepvunwyavltcgu

# Deployar la función
supabase functions deploy send-status-email
```

### 4. Configurar Frontend

Editar `js/config.js`:

```javascript
const SUPABASE_CONFIG = {
  url: 'https://ceogbuepvunwyavltcgu.supabase.co',
  anonKey: 'TU_SUPABASE_ANON_KEY',  // Obtenerlo de Settings > API
  domain: 'https://verify.maxihogar.com',  // Subdominio para Verify
  commerceName: 'Verify',
  storageBucket: 'verification-files'
};
```

### 5. Crear Usuario Admin

1. Ir a **Authentication > Users** en el dashboard
2. Crear un nuevo usuario con email y contraseña
3. Copiar el UUID del usuario
4. Ejecutar en SQL Editor:

```sql
INSERT INTO admin_users (id, email) 
VALUES ('UUID_DEL_USUARIO', 'email@deladmin.com');
```

### 6. Deploy en DonWeb (Subdominio)

**Objetivo:** `verify.maxihogar.com` sin afectar el sitio principal.

1. **Crear subdominio en DonWeb:**
   - Panel > Mi Sitio Web > Dominios > Subdominios
   - Nombre: `verify`
   - Directorio: `public_html/verify`

2. **Subir código a GitHub:**
   ```bash
   cd D:\anexaria\verify-system
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/USUARIO/verify-system.git
   git push -u origin main
   ```

3. **Conectar en DonWeb:**
   - Panel > Mi Sitio Web > GIT > Crear nuevo
   - Repositorio: URL del repo
   - Rama: `main`
   - Directorio: `public_html/verify`
   - Click en Crear ahora

4. **Activar implementación automática (opcional):**
   - Copiar enlace de "Implementación automática"
   - En GitHub: Settings > Webhooks > Add webhook
   - Pegar en Payload URL

## Funcionalidades

### Panel Admin
- Login seguro con Supabase Auth
- Crear nuevas verificaciones con código único
- Ver todas las verificaciones con filtros por estado
- Ver detalle de cada verificación (documentos, datos)
- Cambiar estado (Pendiente, En Revisión, Aprobado, Rechazado)
- Enviar links por email, WhatsApp o copiar

### Flujo del Cliente
1. Recibe email con link de verificación
2. Ve intro con requisitos
3. Si no es mobile, muestra QR para escanear
4. Sube foto del frente del DNI
5. Sube foto del dorso del DNI
6. Graba video de prueba de vida
7. Sube foto de la tarjeta (solo últimos 4 dígitos visibles)
8. Mensaje de confirmación

### Estados
- **Pendiente**: Creado, esperando que el cliente complete
- **En Revisión**: Cliente completó, admin está revisando
- **Aprobado**: Verificación exitosa
- **Rechazado**: Verificación fallida

## Colores

- Primario: Rojo (#DC2626)
- Pendiente: Amarillo (#F59E0B)
- Revisión: Azul (#3B82F6)
- Aprobado: Verde (#10B981)
- Rechazado: Rojo (#EF4444)

## Fuente

Work Sans - https://fonts.google.com/specimen/Work+Sans
