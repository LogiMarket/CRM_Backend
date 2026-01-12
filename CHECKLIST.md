#  CHECKLIST FINAL - ANTES DE INICIAR

## 1️⃣ BASE DE DATOS
- [ ] Tienes Docker instalado
- [ ] docker-compose.yml existe en backend/
- [ ] PostgreSQL se puede iniciar: `docker-compose up -d`
- [ ] Puedes conectarte: `psql -h localhost -U postgres`

## 2 BACKEND (NestJS)
- [ ] package.json tiene todas las dependencias
- [ ] npm install corrió sin errores
- [ ] Tienes carpeta `src/modules/` con 6 módulos
- [ ] Cada módulo tiene: entity, service, controller, DTO
- [ ] app.module.ts tiene TypeOrmModule configurado
- [ ] .env.local fue creado desde .env.example

## 3 TWILIO (IMPORTANTE)
- [ ] Tienes cuenta Twilio activa
- [ ] Tienes TWILIO_ACCOUNT_SID
- [ ] Tienes TWILIO_AUTH_TOKEN
- [ ] Tienes TWILIO_PHONE_NUMBER (WhatsApp o regular)
- [ ] Todos están en .env.local

## 4 FRONTEND (Next.js)
- [ ] Está en: c:\Users\Bryan Mejía\OneDrive - LOGIMARKET\Documentos\Repositorios\internal-chat-mvp
- [ ] npm install corrió exitosamente
- [ ] package.json tiene shadcn/ui instalado
- [ ] Variables de entorno apuntan a http://localhost:3001

---

##  CUANDO TODO ESTÉ LISTO:

### Terminal 1 - Base de Datos
```bash
cd backend
docker-compose up -d
docker-compose logs postgres  # Ver que se inició
```

### Terminal 2 - Backend
```bash
cd backend
npm run start:dev
# Deberías ver: "[NestFactory] Application running on port 3001"
```

### Terminal 3 - Frontend
```bash
cd internal-chat-mvp
npm run dev
# Deberías ver: "Local: http://localhost:3000"
```

### Verificar en navegador
- Backend: http://localhost:3001/api/contacts (devolverá [])
- Frontend: http://localhost:3000 (deberías ver la UI)

---

##  ESTRUCTURA FINAL ESPERADA

```
backend/
 src/
    modules/
       contacts/
          entities/contact.entity.ts
          dto/
             create-contact.dto.ts
             update-contact.dto.ts
          contacts.service.ts
          contacts.controller.ts
          contacts.module.ts
       conversations/
          [mismo patrón]
       messages/
       orders/
       macros/
       conversation-tags/
       app.module.ts
    main.ts
 docker-compose.yml
 .env.example
 .env.local           COPIA DE .env.example
 package.json

internal-chat-mvp/
 app/
    layout.tsx
    page.tsx
    api/
    inbox/
    login/
    signup/
 components/
 package.json
```

---

##  COMANDOS PARA INICIAR

```bash
# Terminal 1
cd backend && docker-compose up -d

# Terminal 2
cd backend && npm install && npm run start:dev

# Terminal 3
cd internal-chat-mvp && npm install && npm run dev
```

---

##  PROBLEMAS COMUNES

### "Cannot find module '@nestjs/common'"
```bash
cd backend
rm -r node_modules
npm install
```

### "Port 3001 already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID XXXXX /F
```

### "Error: connect ECONNREFUSED 127.0.0.1:5432"
```bash
# PostgreSQL no está corriendo
docker-compose up -d
docker-compose ps  # Verifica que postgres está UP
```

---

##  SOPORTE TWILIO

Si necesitas configurar webhooks:
1. Ve a Twilio Console
2. Inicia WhatsApp Sandbox
3. Webhook URL: `https://tu-backend.com/api/whatsapp/webhook`
4. Método: POST

Para desarrollo local, usa ngrok:
```bash
ngrok http 3001
# Copias la URL que te da
```

---

##  CUANDO FUNCIONE

Backend debe devolver:
```json
[]
```

Al visitar: http://localhost:3001/api/contacts

---

**¿ESTÁS LISTO PARA INICIAR? **

Si todo el checklist está , simplemente:
1. Abre 3 terminales
2. Corre los 3 comandos de arriba
3. ¡Eso es todo!

Tu sistema estará funcionando con:
-  Frontend en localhost:3000
-  Backend en localhost:3001
-  Base de datos en localhost:5432
-  Listo para Twilio webhooks
