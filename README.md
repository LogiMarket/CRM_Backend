# Twilio WhatsApp - Configuración de variables de entorno

Para enviar y recibir mensajes de WhatsApp usando Twilio, asegúrate de agregar las siguientes variables de entorno en Railway (panel de variables):


Ejemplo concreto usando tus datos de Twilio:
```
TWILIO_ACCOUNT_SID=xxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+14155238886
TWILIO_TEMPLATE_CONTENT_SID=HXb5b62575e6e4ff6129ad7c8efe1f983e
# (Opcional) Si usas servicios de mensajería:
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Token para validar webhooks (opcional, si tu backend lo requiere)
TWILIO_WEBHOOK_TOKEN=algún-token-seguro
```

**Notas:**
- El `TWILIO_AUTH_TOKEN` lo obtienes en el dashboard de Twilio (haz clic en el icono de ojo para verlo).
- El número de teléfono debe ser el que aparece en "WhatsApp senders" en Twilio.
- El `TWILIO_TEMPLATE_CONTENT_SID` corresponde al ID de la plantilla aprobada en Content Template Builder.
- Si usas el sandbox, los destinatarios deben estar registrados como participantes.
- Configura la URL de webhook en Twilio/Sandbox para que apunte a tu endpoint `/api/whatsapp/webhook` desplegado en Railway.

**Notas:**
- El número de teléfono debe ser el que aparece en "WhatsApp senders" en Twilio.
- El `TWILIO_TEMPLATE_CONTENT_SID` corresponde al ID de la plantilla aprobada en Content Template Builder.
- Si usas el sandbox, los destinatarios deben estar registrados como participantes.
- Configura la URL de webhook en Twilio/Sandbox para que apunte a tu endpoint `/api/whatsapp/webhook` desplegado en Railway.

Ejemplo de endpoint para webhook:
```
https://<tu-backend-railway>.up.railway.app/api/whatsapp/webhook
```

Con esto, tu backend podrá enviar y recibir mensajes de WhatsApp usando Twilio.
# 🚀 Internal Chat MVP - Backend NestJS

> Backend API completo para gestión de conversaciones con WhatsApp a través de Twilio

## 📋 Descripción

Backend desarrollado en NestJS que proporciona una API REST completa para gestionar conversaciones de WhatsApp, autenticación de usuarios, macros, órdenes y más. Integrado con Twilio para envío y recepción de mensajes.

## ✨ Características

- 🔐 **Autenticación JWT** con Passport.js
- 💬 **Gestión de Conversaciones** con asignación de agentes
- 📱 **Integración Twilio WhatsApp** para mensajería
- 👥 **Gestión de Usuarios** y contactos
- 📦 **Sistema de Órdenes** vinculado a clientes
- 🏷️ **Macros/Respuestas Rápidas** reutilizables
- 📊 **PostgreSQL** con TypeORM
- 📖 **Documentación Swagger** integrada
- 🔄 **Webhooks** de Twilio configurables

## 🛠️ Stack Tecnológico

- **Framework**: NestJS 10.x
- **ORM**: TypeORM
- **Base de Datos**: PostgreSQL 15+
- **Autenticación**: Passport.js + JWT
- **Validación**: class-validator + class-transformer
- **Documentación**: Swagger/OpenAPI
- **Integración**: Twilio SDK 4.10.0

## 📂 Estructura del Proyecto

```
backend/
├── src/
│   ├── main.ts                    # Punto de entrada
│   ├── app.module.ts              # Módulo principal
│   ├── config/
│   │   └── database.config.ts     # Configuración de BD
│   └── modules/
│       ├── auth/                  # Autenticación JWT
│       │   ├── auth.service.ts
│       │   ├── auth.controller.ts
│       │   ├── guards/
│       │   └── strategies/
│       ├── users/                 # Gestión de usuarios
│       │   ├── entities/user.entity.ts
│       │   ├── users.service.ts
│       │   └── users.controller.ts
│       ├── contacts/              # Contactos de WhatsApp
│       │   ├── entities/contact.entity.ts
│       │   ├── contacts.service.ts
│       │   └── contacts.controller.ts
│       ├── conversations/         # Conversaciones
│       │   ├── entities/conversation.entity.ts
│       │   ├── conversations.service.ts
│       │   └── conversations.controller.ts
│       ├── messages/              # Mensajes
│       │   ├── entities/message.entity.ts
│       │   ├── messages.service.ts
│       │   └── messages.controller.ts
│       ├── orders/                # Órdenes
│       │   ├── entities/order.entity.ts
│       │   ├── orders.service.ts
│       │   └── orders.controller.ts
│       ├── macros/                # Respuestas rápidas
│       │   ├── entities/macro.entity.ts
│       │   ├── macros.service.ts
│       │   └── macros.controller.ts
│       ├── conversation-tags/     # Etiquetas
│       │   ├── entities/conversation-tag.entity.ts
│       │   ├── conversation-tags.service.ts
│       │   └── conversation-tags.controller.ts
│       └── whatsapp/              # Integración Twilio
│           ├── whatsapp.service.ts
│           ├── whatsapp.controller.ts
│           └── whatsapp.module.ts
├── .env.example                   # Variables de entorno
├── package.json
├── tsconfig.json
└── README.md

```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ y pnpm
- PostgreSQL 15+
- Cuenta de Twilio con WhatsApp habilitado

### Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <tu-repo>
   cd internal-chat-mvp/backend
   ```

2. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env.local
   ```

   Editar `.env.local`:
   ```env
   # Database
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=internal_chat_mvp
   DATABASE_USER=postgres
   DATABASE_PASSWORD=postgres

   # JWT
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRATION=7d

   # Twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_WEBHOOK_TOKEN=your-webhook-token

   # Server
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Iniciar PostgreSQL** (con Docker):
   ```bash
   # Desde la carpeta backend
   docker-compose up -d
   ```

5. **Ejecutar migraciones** (opcional - TypeORM sync automático):
   ```bash
   pnpm run migration:run
   ```

6. **Iniciar el servidor**:
   ```bash
   pnpm start:dev
   ```

   El backend estará disponible en `http://localhost:3001`

### Verificar Instalación

- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/whatsapp/health

## 📖 API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup` | Registrar usuario | No |
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/logout` | Cerrar sesión | Sí |
| GET | `/auth/me` | Usuario actual | Sí |

### Usuarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/users` | Listar usuarios | Sí |
| GET | `/users/agents` | Listar agentes | Sí |
| GET | `/users/:id` | Obtener usuario | Sí |
| PUT | `/users/:id` | Actualizar usuario | Sí |
| PATCH | `/users/:id/status` | Cambiar estado | Sí |

### Conversaciones

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/conversations` | Listar conversaciones | Sí |
| GET | `/conversations/:id` | Obtener conversación | Sí |
| POST | `/conversations` | Crear conversación | Sí |
| PUT | `/conversations/:id` | Actualizar conversación | Sí |
| POST | `/conversations/:id/assign` | Asignar agente | Sí |

### Mensajes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/conversations/:id/messages` | Listar mensajes | Sí |
| POST | `/conversations/:id/messages` | Enviar mensaje | Sí |
| PUT | `/messages/:id` | Actualizar mensaje | Sí |

### WhatsApp (Twilio)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/whatsapp/webhook` | Webhook de Twilio | No |
| GET | `/whatsapp/health` | Health check | Sí |
| POST | `/whatsapp/send` | Enviar mensaje | Sí |
| POST | `/whatsapp/send-template` | Enviar plantilla | Sí |
| GET | `/whatsapp/message-status` | Estado de mensaje | Sí |
| GET | `/whatsapp/phone-numbers` | Números disponibles | Sí |

### Macros

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/macros` | Listar macros | Sí |
| POST | `/macros` | Crear macro | Sí |
| PUT | `/macros/:id` | Actualizar macro | Sí |
| DELETE | `/macros/:id` | Eliminar macro | Sí |
| POST | `/macros/:id/use` | Usar macro | Sí |

### Órdenes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/orders` | Listar órdenes | Sí |
| GET | `/orders/:id` | Obtener orden | Sí |
| POST | `/orders` | Crear orden | Sí |
| PUT | `/orders/:id` | Actualizar orden | Sí |
| PATCH | `/orders/:id/status` | Cambiar estado | Sí |

## 🔐 Autenticación

La API usa JWT (JSON Web Tokens) para autenticación. Para acceder a endpoints protegidos:

1. **Obtener token**:
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'
   ```

2. **Usar token en requests**:
   ```bash
   curl -X GET http://localhost:3001/conversations \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## 📱 Integración con Twilio

### Configuración del Webhook

1. En Twilio Console, ir a **Messaging** → **Settings**
2. Configurar webhook URL: `https://your-backend-url.com/api/whatsapp/webhook`
3. Agregar `TWILIO_WEBHOOK_TOKEN` en variables de entorno
4. Twilio enviará webhooks cuando lleguen mensajes

### Enviar Mensaje

```typescript
POST /whatsapp/send
{
  "phoneNumber": "+34612345678",
  "message": "Hola desde Twilio"
}
```

### Verificar Estado

```typescript
GET /whatsapp/message-status?message_id=SM123456789
```

## 🧪 Testing

### Testing Manual con curl

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Listar conversaciones
curl -X GET http://localhost:3001/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Enviar mensaje WhatsApp
curl -X POST http://localhost:3001/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+34612345678","message":"Test"}'
```

### Testing con Swagger

1. Abrir http://localhost:3001/api/docs
2. Hacer clic en **Authorize**
3. Ingresar token JWT
4. Probar endpoints

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm start` | Ejecutar en producción |
| `pnpm start:dev` | Ejecutar en desarrollo (watch mode) |
| `pnpm start:debug` | Ejecutar en modo debug |
| `pnpm build` | Compilar proyecto |
| `pnpm test` | Ejecutar tests |
| `pnpm lint` | Ejecutar linter |
| `pnpm format` | Formatear código |

## 🚀 Despliegue

### Railway

1. Crear proyecto en [railway.app](https://railway.app)
2. Agregar PostgreSQL
3. Agregar servicio desde Git
4. Configurar variables de entorno
5. Deploy automático

Ver guía completa: [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

## 📚 Documentación Adicional

- [Guía de Configuración de Twilio](docs/TWILIO_SETUP.md)
- [Guía de Despliegue](docs/DEPLOYMENT_GUIDE.md)
- [Checklist de Despliegue](docs/DEPLOYMENT_CHECKLIST.md)
- [Próximos Pasos](docs/NEXT_STEPS.md)
- [Resumen de Migración](docs/TWILIO_MIGRATION_SUMMARY.md)
- [Setup de Docker](docs/DOCKER_SETUP.md)

## 🛠️ Troubleshooting

### Error: "Cannot connect to database"
**Solución**: Verificar que PostgreSQL está corriendo y credenciales son correctas

### Error: "Twilio credentials not configured"
**Solución**: Verificar variables `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` en `.env.local`

### Error: "JWT token expired"
**Solución**: Hacer login nuevamente para obtener nuevo token

### Webhook no recibe mensajes
**Solución**: 
1. Verificar URL del webhook en Twilio Console
2. Verificar `TWILIO_WEBHOOK_TOKEN` es correcto
3. Ver logs: `railway logs -f`

## 📄 Licencia

MIT

## 👥 Contribución

Pull requests son bienvenidos. Para cambios mayores, por favor abrir un issue primero.

---

**Desarrollado por**: LOGIMARKET  
**Última actualización**: 2024  
**Versión**: 1.0.0
