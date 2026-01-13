# Guía de Implementación de Guards de Roles - Backend NestJS

## ✅ Cambios Realizados

Se han implementado los siguientes componentes en el backend NestJS:

### 1. **RolesGuard** (`src/guards/roles.guard.ts`)
- Guard que valida roles de usuario
- Se ejecuta automáticamente en todos los endpoints marcados con `@Roles()`
- Registrado globalmente en AppModule

### 2. **Roles Decorator** (`src/decorators/roles.decorator.ts`)
- Decorador `@Roles()` para especificar roles permitidos
- Uso: `@Roles('admin', 'supervisor')`

### 3. **AppModule Actualizado** (`src/app.module.ts`)
- Importa `APP_GUARD` de `@nestjs/core`
- Registra `RolesGuard` como guard global

### 4. **UsersController Actualizado** (`src/modules/users/users.controller.ts`)
Permisos por endpoint:
- `GET /users` - Solo autenticado (JWT)
- `GET /users/agents` - **Admin, Supervisor** ✅
- `GET /users/:id` - Solo autenticado
- `POST /users` - **Solo Admin** ✅
- `PUT /users/:id` - **Admin, Supervisor** ✅
- `DELETE /users/:id` - **Solo Admin** ✅

### 5. **ConversationsController Actualizado** (`src/modules/conversations/conversations.controller.ts`)
Permisos por endpoint:
- `GET /conversations` - **Admin, Supervisor, Agent** ✅
  - Agentes ven SOLO sus conversaciones asignadas
- `POST /conversations` - **Admin, Supervisor** ✅
- `PATCH /conversations/:id` - **Admin, Supervisor** ✅
- `POST /conversations/:id/assign` - **Admin, Supervisor, Agent** ✅
- `DELETE /conversations/:id` - **Solo Admin** ✅

## 🚀 Pasos para Desplegar en Railway

### 1. Compilar el Proyecto Localmente
```bash
cd "C:\Users\Bryan Mejía\OneDrive - LOGIMARKET\Documentos\Repositorios\CRM\backend"
npm install
npm run build
```

### 2. Verificar que Compila sin Errores
```bash
npm run test
# o si tienes tests
npm run lint
```

### 3. Commit y Push a GitHub
```bash
git add .
git commit -m "feat: Implement RolesGuard for role-based access control"
git push origin main
```

### 4. Railway Redeploy
- Ir a: https://railway.app/project/[PROJECT_ID]
- Los cambios se desplegarán automáticamente
- Verificar logs en la pestaña "Deployments"

## 📋 Tabla de Control de Acceso

| Recurso | Admin | Supervisor | Agent | Nota |
|---------|-------|-----------|-------|------|
| **GET /users** | ✅ | ✅ | ✅ | Autenticación requerida |
| **GET /users/agents** | ✅ | ✅ | ❌ | Solo gestores |
| **POST /users** | ✅ | ❌ | ❌ | Solo crear nuevos |
| **PUT /users/:id** | ✅ | ✅ | ❌ | Editar usuarios |
| **DELETE /users/:id** | ✅ | ❌ | ❌ | Solo admin |
| **GET /conversations** | ✅ (todas) | ✅ (todas) | ✅ (solo suyas) | Filtrado automático |
| **POST /conversations** | ✅ | ✅ | ❌ | Crear nuevas |
| **PATCH /conversations/:id** | ✅ | ✅ | ❌ | Editar |
| **POST /conversations/:id/assign** | ✅ | ✅ | ✅ | Asignar agente |
| **DELETE /conversations/:id** | ✅ | ❌ | ❌ | Solo admin |

## 🔒 Comportamiento de Errores

Cuando un usuario intenta acceder a un recurso sin permisos:

**HTTP 403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "User role 'agent' does not have access to this resource. Required roles: admin",
  "error": "Forbidden"
}
```

## 🔄 Sincronización Frontend-Backend

### Lado del Frontend (Next.js)
- Hook `useUserRole()` obtiene el rol del usuario
- `lib/permissions.ts` define permisos locales
- Sidebar oculta tabs según rol
- Componentes protegidos bloquean acceso

### Lado del Backend (NestJS)
- `RolesGuard` valida roles en cada request
- `@Roles()` especifica permisos requeridos
- Responde 403 si usuario no tiene rol

## ✔️ Próximos Pasos

1. **Crear método `findAgents()`** en UsersService (si no existe)
   ```typescript
   findAgents() {
     return this.userRepository.find({
       where: { roles: { name: In(['agent', 'supervisor']) } }
     })
   }
   ```

2. **Crear método `findByAssignedAgent()`** en ConversationsService (si no existe)
   ```typescript
   findByAssignedAgent(agentId: string) {
     return this.conversationRepository.find({
       where: { assigned_agent_id: agentId }
     })
   }
   ```

3. **Crear método `assignAgent()`** en ConversationsService (si no existe)
   ```typescript
   assignAgent(conversationId: string, agentId: string) {
     return this.conversationRepository.update(conversationId, {
       assigned_agent_id: agentId
     })
   }
   ```

## 🧪 Testing

Para probar los permisos en Postman/Insomnia:

1. Login como Admin:
   ```
   POST /api/auth/login
   Body: { email: "admin@example.com", password: "..." }
   ```

2. Tomar el token JWT y agregarlo al header:
   ```
   Authorization: Bearer [TOKEN]
   ```

3. Intentar acceder a rutas protegidas:
   ```
   GET /api/users/agents (✅ debe funcionar)
   ```

4. Cambiar a token de Agent y probar:
   ```
   GET /api/users/agents (❌ debe retornar 403)
   GET /api/conversations (✅ debe retornar solo sus conversaciones)
   ```

## 📚 Referencias

- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [JWT Strategy en NestJS](https://docs.nestjs.com/recipes/passport)

## ⚙️ Configuración de Variantes

Si tienes ambientes (local, staging, production):

**.env.production**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=production
```

**.env.local** (para desarrollo local)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=crm_db
JWT_SECRET=test-secret
NODE_ENV=development
```

El sistema automáticamente elegirá la config correcta.
