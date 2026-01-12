# ✅ Checklist de Despliegue con Twilio

## 📋 Pre-Despliegue

### 1. Configuración Local
- [ ] Clonar repositorio
- [ ] Instalar dependencias del backend: `cd backend && pnpm install`
- [ ] Instalar dependencias del frontend: `pnpm install`
- [ ] Crear `.env.local` en `backend/` con variables de ejemplo
- [ ] Instalar Docker Desktop (para PostgreSQL local)
- [ ] Ejecutar Docker Compose: `docker-compose up -d`
- [ ] Verificar que PostgreSQL está funcionando
- [ ] Ejecutar backend en desarrollo: `cd backend && pnpm start:dev`
- [ ] Verificar Swagger en `http://localhost:3001/api/docs`
- [ ] Ejecutar frontend: `pnpm dev`
- [ ] Verificar que frontend carga correctamente

### 2. Setup de Twilio
- [ ] Crear cuenta en [twilio.com](https://www.twilio.com)
- [ ] Obtener **Account SID** y **Auth Token**
- [ ] Comprar número de teléfono (o usar Twilio Sandbox)
- [ ] Habilitar WhatsApp en Twilio Console
- [ ] Obtener número de teléfono para WhatsApp
- [ ] Generar **Webhook Token** seguro
- [ ] Leer guía completa: [TWILIO_SETUP.md](TWILIO_SETUP.md)

### 3. Testing Local con Twilio
- [ ] Configurar variables de Twilio en `.env.local`
- [ ] Verificar endpoint de salud: `GET /api/whatsapp/health`
- [ ] Probar envío de mensaje: `POST /api/whatsapp/send`
- [ ] Probar recepción de webhook (si tienes número de prueba)
- [ ] Verificar que los mensajes se guardan en BD

---

## 🚀 Despliegue en Railway

### 4. Preparar Repositorio Git
- [ ] Inicializar repositorio Git (si no existe)
- [ ] Crear `.gitignore` con:
  - `backend/.env*`
  - `backend/dist`
  - `backend/node_modules`
  - `.next`
  - `node_modules`
- [ ] Hacer commit de cambios
- [ ] Crear repositorio en GitHub (privado)
- [ ] Push del código

### 5. Setup de Railway
- [ ] Crear cuenta en [railway.app](https://railway.app)
- [ ] Crear nuevo proyecto
- [ ] Agregar PostgreSQL:
  - [ ] Click en "Add"
  - [ ] Seleccionar "PostgreSQL"
  - [ ] Copiar `DATABASE_URL`
- [ ] Agregar Backend NestJS:
  - [ ] Click en "New"
  - [ ] Conectar repositorio GitHub
  - [ ] Seleccionar rama `main`

### 6. Configurar Backend en Railway
- [ ] En pestaña "Variables", agregar:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3000`
  - [ ] `JWT_SECRET` (generar uno nuevo y seguro)
  - [ ] `JWT_EXPIRATION=7d`
  - [ ] `DATABASE_URL` (de PostgreSQL)
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_PHONE_NUMBER`
  - [ ] `TWILIO_WEBHOOK_TOKEN` (generar nuevo)
  - [ ] `FRONTEND_URL` (de tu dominio del frontend)
  - [ ] `TWILIO_WEBHOOK_URL` (URL del webhook)
- [ ] En "Settings", configurar:
  - [ ] Start Command: `npm run start:prod`
  - [ ] Build Command: `npm run build`
- [ ] Esperar a que compile y despliegue
- [ ] Obtener URL pública del backend
- [ ] Verificar que está corriendo: `GET /api/whatsapp/health`

### 7. Configurar Webhooks en Twilio Console
- [ ] Ir a Twilio Console
- [ ] Ir a **Messaging** → **Settings**
- [ ] Configurar webhook URL:
  - [ ] URL: `https://your-backend.railway.app/api/whatsapp/webhook`
  - [ ] Token: Tu `TWILIO_WEBHOOK_TOKEN`
- [ ] Guardar cambios
- [ ] Probar webhook desde Twilio Console

---

## 🌐 Despliegue Frontend (Vercel)

### 8. Preparar Frontend para Producción
- [ ] Crear archivo `.env.production`:
  ```env
  NEXT_PUBLIC_API_URL=https://your-backend.railway.app
  NEXT_PUBLIC_ENABLE_WHATSAPP=true
  ```
- [ ] Verificar que no hay errores de TypeScript: `tsc --noEmit`
- [ ] Hacer build local: `pnpm build`
- [ ] Probar build: `pnpm start`

### 9. Desplegar en Vercel
- [ ] Ir a [vercel.com](https://vercel.com)
- [ ] Conectar repositorio GitHub
- [ ] Seleccionar rama `main`
- [ ] Configurar:
  - [ ] **Root Directory**: `.` (raíz)
  - [ ] **Build Command**: `pnpm install && pnpm build`
  - [ ] **Output Directory**: `.next`
  - [ ] **Install Command**: `pnpm install`
- [ ] Agregar variables de entorno:
  - [ ] `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
  - [ ] `NEXT_PUBLIC_ENABLE_WHATSAPP=true`
- [ ] Hacer click en "Deploy"
- [ ] Esperar a que compile
- [ ] Obtener URL pública del frontend

### 10. Actualizar URLs en Backend (Railway)
- [ ] Volver a Railway
- [ ] Editar variable `FRONTEND_URL` con URL de Vercel
- [ ] Guardar cambios (redeploy automático)

---

## 🧪 Testing en Producción

### 11. Testing del Backend
- [ ] Verificar health check:
  ```bash
  curl https://your-backend.railway.app/api/whatsapp/health
  ```
- [ ] Testing de autenticación:
  ```bash
  curl -X POST https://your-backend.railway.app/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}'
  ```
- [ ] Verificar documentación Swagger:
  - [ ] `https://your-backend.railway.app/api/docs`
- [ ] Probar endpoints básicos con token JWT

### 12. Testing del Frontend
- [ ] Abrir URL de Vercel
- [ ] Probar página de login
- [ ] Crear cuenta de prueba
- [ ] Verificar que se conecta al backend
- [ ] Probar listar conversaciones
- [ ] Probar enviar mensaje (si tienes webhook configurado)

### 13. Testing de Webhooks
- [ ] Enviar mensaje de prueba desde Twilio Console
- [ ] Verificar que llega al backend
- [ ] Verificar que se guarda en BD
- [ ] Verificar que aparece en frontend

### 14. Testing de Sendler Webhooks
- [ ] Verificar que el webhook se envía cuando un mensaje se entrega
- [ ] Verificar que se actualiza el estado en BD
- [ ] Verificar que se refleja en frontend

---

## 🔒 Seguridad (Pre-Producción Real)

### 15. Antes de Usar en Producción Real

#### Credenciales y Secretos
- [ ] Cambiar `JWT_SECRET` a valor muy seguro
- [ ] Cambiar `TWILIO_WEBHOOK_TOKEN` a valor muy seguro
- [ ] Usar gestor de secretos (Railway Environment Variables)
- [ ] NO commitar `.env` a Git
- [ ] NO compartir tokens públicamente

#### Backend Security
- [ ] Verificar CORS está configurado correctamente
- [ ] Activar rate limiting en endpoints públicos
- [ ] Validar inputs en todos los endpoints
- [ ] Usar HTTPS en todas las URLs
- [ ] Activar HSTS headers

#### Frontend Security
- [ ] Verificar que tokens se guardan seguros (localStorage OK para MVP)
- [ ] Implementar refresh token rotation (opcional para MVP)
- [ ] Validar JWT antes de hacer request
- [ ] Implementar timeout de sesión

#### Base de Datos
- [ ] Hacer backup de base de datos
- [ ] Configurar auto-backups en Railway
- [ ] Verificar que BD no es pública
- [ ] Cambiar contraseña de PostgreSQL

---

## 📊 Monitoreo en Producción

### 16. Configurar Monitoreo
- [ ] Verificar logs en Railway:
  ```bash
  railway logs -f
  ```
- [ ] Configurar alertas en Railway (opcional)
- [ ] Monitorear uso de recursos (CPU, RAM, BD)
- [ ] Ver errores en Sentry (opcional)

### 17. Maintenance
- [ ] Revisar logs regularmente
- [ ] Hacer backups periódicos de BD
- [ ] Actualizar dependencias mensualmente
- [ ] Monitorear costos en Railway y Twilio
- [ ] Documentar cambios realizados

---

## 📞 Soporte Twilio

### Recursos Útiles
- [ ] [Documentación oficial de Twilio](https://www.twilio.com/docs/whatsapp)
- [ ] [Twilio Console](https://www.twilio.com/console)
- [ ] [Status Page de Twilio](https://status.twilio.com)
- [ ] [Pricing de Twilio](https://www.twilio.com/pricing/messaging)

### Troubleshooting Twilio
- [ ] Ver logs en Twilio Console → **Logs** → **Debugger**
- [ ] Verificar que el número tiene saldo
- [ ] Verificar que el webhook URL es pública
- [ ] Verificar que el token de webhook es correcto

---

## ✨ Post-Despliegue

### 18. Finalización
- [ ] Documentar credenciales en lugar seguro (1Password, LastPass, etc.)
- [ ] Crear guía de operación para el equipo
- [ ] Entrenar al equipo en uso del sistema
- [ ] Configurar email de notificaciones (opcional)
- [ ] Configurar backup automático (opcional)
- [ ] Crear runbook de incident response

---

## 🎉 ¡Listo!

Tu sistema está en producción. 

**Próximos pasos:**
- Monitorear la aplicación
- Recopilar feedback de usuarios
- Hacer iteraciones basadas en feedback
- Escalar según sea necesario

---

**Última actualización**: 2024  
**Versión**: 1.0.0 con Twilio Integration
