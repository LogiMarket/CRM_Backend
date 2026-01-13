# Migración de Roles - Instrucciones

## ✅ Cambios Implementados

### Backend
1. ✅ **users.service.ts** - Siempre carga la relación `role`
2. ✅ **auth.controller.ts** - Incluye `role` en JWT y respuesta de login
3. ✅ **SQL Migration** - Crea FK, asigna roles y crea índice

### Estructura de Roles
- **Administrador**: Acceso completo
- **Supervisor**: Gestión de agentes y conversaciones
- **Agente**: Solo conversaciones asignadas

## 🗄️ Ejecutar Migración en Railway

### Opción 1: Railway Dashboard (Recomendado)

1. Ve a https://railway.app/project/[PROJECT_ID]
2. Click en tu servicio de PostgreSQL
3. Click en pestaña "Query"
4. Copia y pega el contenido de `database/migrations/003_add_user_role_fk.sql`
5. Click en "Run Query"

### Opción 2: Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link [PROJECT_ID]

# Ejecutar migration
railway run psql < database/migrations/003_add_user_role_fk.sql
```

### Opción 3: Conectar Directamente con psql

```bash
# Obtener DATABASE_URL de Railway
# Variables → DATABASE_URL

psql "postgresql://postgres:PASSWORD@HOST:PORT/railway" < database/migrations/003_add_user_role_fk.sql
```

## 🔍 Verificar Migración

Ejecuta este query para validar:

```sql
SELECT 
  u.id,
  u.name,
  u.email,
  r.name as role_name,
  r.description as role_description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;
```

**Resultado esperado:**
- Todos los usuarios deben tener `role_name` y `role_description`
- El usuario admin debe tener rol "Administrador"
- Los demás deben tener rol "Agente"

## 📊 Validar Foreign Key

```sql
SELECT
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='users';
```

Debe aparecer: `fk_users_roles` → `users.role_id` → `roles.id`

## 🧪 Probar el Sistema

### 1. Login con Usuario Existente

```bash
POST https://crmbackend-production-4e4d.up.railway.app/api/auth/login
Content-Type: application/json

{
  "email": "bmeijas.ruiz@gmail.com",
  "password": "tu-password"
}
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": "7d",
  "user": {
    "id": "uuid",
    "email": "bmeijas.ruiz@gmail.com",
    "name": "Bryan Mejía",
    "role": "Administrador",
    "role_id": "uuid-del-rol"
  }
}
```

### 2. Verificar Token Incluye Rol

Decodifica el JWT en https://jwt.io

Payload debe contener:
```json
{
  "email": "bmeijas.ruiz@gmail.com",
  "sub": "user-uuid",
  "role": "Administrador",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 3. Probar Endpoint Protegido

```bash
GET https://crmbackend-production-4e4d.up.railway.app/api/users/agents
Authorization: Bearer [TOKEN]
```

- ✅ Con rol **Administrador** o **Supervisor**: Debe retornar lista de agentes
- ❌ Con rol **Agente**: Debe retornar **403 Forbidden**

## 🚀 Desplegar Cambios

```bash
# Desde la carpeta backend
cd "C:\Users\Bryan Mejía\OneDrive - LOGIMARKET\Documentos\Repositorios\CRM\backend"

# Verificar cambios
git status

# Commit
git add .
git commit -m "feat: Add role-based authentication and FK constraint"

# Push (Railway redeploy automático)
git push origin main
```

## 📝 Notas Importantes

1. **La migración SQL debe ejecutarse ANTES del deploy del backend**
2. Si un usuario no tiene rol, el sistema asignará "agent" por defecto
3. Los nuevos usuarios creados via signup tendrán `role_id` NULL inicialmente
4. Para asignar roles a nuevos usuarios, usa el endpoint `PUT /users/:id` con `role_id`

## 🔧 Rollback (si algo sale mal)

```sql
-- Quitar FK
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_roles;

-- Quitar índice
DROP INDEX IF EXISTS idx_users_role_id;

-- Poner role_id en NULL
UPDATE users SET role_id = NULL;
```

## ✅ Checklist Final

- [ ] Ejecutar migración SQL en Railway PostgreSQL
- [ ] Verificar que todos los usuarios tienen role_id asignado
- [ ] Verificar que existe FK entre users.role_id y roles.id
- [ ] Commit y push cambios del backend
- [ ] Esperar deploy automático en Railway
- [ ] Probar login - verificar que respuesta incluye `role`
- [ ] Decodificar JWT - verificar que incluye `role` en payload
- [ ] Probar endpoint protegido (GET /users/agents) con diferentes roles
- [ ] Verificar que agentes ven solo sus conversaciones
- [ ] Verificar que admin puede ver todas las conversaciones
