# Guía de Despliegue: Backend NestJS + Railway + Twilio WhatsApp

## 📋 Índice
1. [Preparación del Backend](#preparación-del-backend)
2. [Setup en Railway](#setup-en-railway)
3. [Configuración de Twilio WhatsApp](#configuración-de-twilio-whatsapp)
4. [Conectar Frontend a Backend](#conectar-frontend-a-backend)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Preparación del Backend

### 1. Instalar dependencias

```bash
cd backend
pnpm install
```

### 2. Crear archivo `.env.local`

```bash
cp .env.example .env.local
```

### 3. Configurar para desarrollo local

Editar `.env.local`:

```env
NODE_ENV=development
PORT=3001

# Local database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=internal_chat_mvp

JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION=7d

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_TOKEN=your-webhook-verification-token

FRONTEND_URL=http://localhost:3000
TWILIO_WEBHOOK_URL=http://localhost:3001/api/whatsapp/webhook
```

### 4. Ejecutar en desarrollo

```bash
pnpm start:dev
```

Verifica:
- Backend en `http://localhost:3001`
- Swagger docs en `http://localhost:3001/docs`

---

## Setup en Railway

### 1. Crear cuenta y proyecto

1. Ir a https://railway.app
2. Sign up / Login
3. Crear nuevo proyecto

### 2. Agregar PostgreSQL

1. Click en "Add"
2. Seleccionar "PostgreSQL"
3. Railway crea automáticamente la BD

### 3. Obtener credenciales

En el dashboard de la BD:
- Click en "Connect"
- Copiar las credenciales

Veras algo como:
```
DATABASE_URL=postgresql://postgres:password@containers-us-west-74.railway.app:5432/railway
```

### 4. Agregar Backend NestJS

1. Click en "New"
2. Seleccionar "GitHub Repo" (si lo tienes en Git)
3. O seleccionar "Docker" para desplegar manualmente

### 5. Configurar variables de entorno

En el proyecto NestJS en Railway:

**En la pestaña "Variables"**, agregar:

```env
NODE_ENV=production
PORT=3000

# De PostgreSQL
DATABASE_URL=postgresql://postgres:password@containers-us-west-74.railway.app:5432/railway

# JWT
JWT_SECRET=your_production_secret_key_very_secure
JWT_EXPIRATION=7d

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_TOKEN=your-webhook-verification-token

FRONTEND_URL=https://your-frontend-domain.com
TWILIO_WEBHOOK_URL=https://your-backend-domain.railway.app/api/whatsapp/webhook
```

### 6. Configurar build y start

En Railway, en la pestaña "Settings":

- **Root Directory**: `backend` (si monorepo)
- **Start Command**: `npm run start:prod`
- **Build Command**: `npm run build` (opcional, si lo tienes)

### 7. Desplegar

En la pestaña "Deployments":
- Click en "Deploy"
- Esperar a que compile e inicie

Obtén la URL pública (ej: `https://internal-chat-backend.railway.app`)

---

## Configuración de Twilio WhatsApp

Para instrucciones detalladas sobre cómo configurar Twilio, consulta la guía completa en [TWILIO_SETUP.md](TWILIO_SETUP.md).

### Resumen Rápido:

1. **Crear cuenta en Twilio**: https://www.twilio.com/console
2. **Obtener credenciales**:
   - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Auth Token: (visible en la consola)
3. **Comprar/Obtener número**: Ir a **Phone Numbers** → **Buy a Number**
4. **Habilitar WhatsApp Sandbox**: 
   - Ve a **Messaging** → **Senders** → **WhatsApp**
   - Habilita el sandbox
5. **Configurar webhook**:
   - URL: `https://your-backend-domain.railway.app/api/whatsapp/webhook`
   - Token: Tu `TWILIO_WEBHOOK_TOKEN`
6. **Actualizar variables en Railway**: Como se muestra arriba

### Verificar Integración:

```bash
# Verificar que el endpoint de salud funciona
curl -X GET https://your-backend-domain.railway.app/api/whatsapp/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Respuesta esperada:
```json
{
  "status": "connected",
  "twilioConnected": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Conectar Frontend a Backend

### En el frontend (Next.js)

Actualizar todas las llamadas API en `app/api/` para apuntar al backend NestJS.

#### 1. Crear archivo de configuración

Crear `lib/api-client.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const apiClient = {
  async get(endpoint: string, options?: RequestInit) {
    const token = localStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async post(endpoint: string, body?: any, options?: RequestInit) {
    return this.get(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async put(endpoint: string, body?: any, options?: RequestInit) {
    return this.get(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async delete(endpoint: string, options?: RequestInit) {
    return this.get(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};
```

#### 2. Actualizar variable de entorno

En `app/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1  # Desarrollo
# o en .env.production:
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1  # Producción
```

#### 3. Actualizar componentes

Ejemplo en `components/auth.tsx`:

```typescript
import { apiClient } from '@/lib/api-client';

// Login
const handleLogin = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', {
    email,
    password,
  });
  
  localStorage.setItem('access_token', response.access_token);
  router.push('/inbox');
};

// Signup
const handleSignup = async (email: string, password: string, name: string) => {
  const response = await apiClient.post('/auth/signup', {
    email,
    password,
    name,
  });
  
  localStorage.setItem('access_token', response.access_token);
  router.push('/inbox');
};
```

#### 4. Actualizar llamadas en los componentes

Reemplazar todas las llamadas a `/api/...` con `apiClient`:

```typescript
// Antes (Next.js API routes)
const data = await fetch('/api/conversations').then(r => r.json());

// Después (Backend NestJS)
const data = await apiClient.get('/conversations');
```

---

## Testing

### Probar autenticación

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Signup
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Probar endpoints protegidos

```bash
# Obtener el token del login
TOKEN=eyJhbGciOiJIUzI1NiIs...

# Listar usuarios
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

### Probar WhatsApp webhook

```bash
# Verificación de salud
curl -X GET http://localhost:3001/api/whatsapp/health \
  -H "Authorization: Bearer $TOKEN"

# Enviar mensaje
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+34612345678",
    "message": "Hola desde Twilio!"
  }'

# Obtener estado de mensaje
curl -X GET "http://localhost:3001/api/whatsapp/message-status?message_id=SM123456789" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Error: "Cannot find module"

```bash
pnpm install
pnpm run build
```

### Error: Database connection refused

Verificar:
1. `DATABASE_URL` es correcto en `.env.local`
2. PostgreSQL está corriendo localmente
3. En Railway: verificar BD está deployada

```bash
# Probar conexión
psql postgresql://user:password@host:5432/database
```

### Error: CORS blocked

Verificar `CORS_ORIGIN` en backend:
- Development: `http://localhost:3000`
- Production: Tu dominio real

### Error: WhatsApp webhook not working

1. Verificar `TWILIO_WEBHOOK_TOKEN` es correcto
2. Verificar URL pública en Twilio Console
3. Ver logs en Railway:

```bash
railway logs -f
```

4. Verificar que el endpoint está accesible:

```bash
curl -X GET https://your-backend-domain.railway.app/api/whatsapp/health
```

### Error: JWT token invalid

1. Cambiar `JWT_SECRET` en production
2. Verificar token se guarda en localStorage
3. Verificar formato: `Authorization: Bearer <token>`

---

## ✅ Checklist Final

- [ ] Backend deployado en Railway
- [ ] Base de datos PostgreSQL creada en Railway
- [ ] Variables de entorno configuradas
- [ ] Endpoints básicos funcionan
- [ ] Webhook de WhatsApp verificado
- [ ] Frontend actualizado con nueva API URL
- [ ] CORS configurado correctamente
- [ ] JWT token funcionando
- [ ] Mensajes de WhatsApp se reciben en BD
- [ ] Frontend conectado al backend

---

¡Listo! 🚀 Tu sistema de chat está operacional.
