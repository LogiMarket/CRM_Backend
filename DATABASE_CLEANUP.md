# Backend Database Cleanup Guide

## Error: TypeORM Synchronization Failed

Si ves el error: `column "phone_number" of relation "contacts" contains null values`

### Solución

#### 1. Ejecutar Script de Limpieza (Recomendado)

En Railway, abre una terminal y ejecuta:

```bash
npm install pg
node cleanup-contacts.js
```

Este script:
- Se conecta a la base de datos
- Actualiza todos los valores NULL en `contacts.phone_number`
- Asigna valores como: `unknown-{id}`
- Permite que TypeORM sincronice el esquema correctamente

#### 2. Verificar desde SQL (Alternativa)

Si prefieres ejecutar SQL directamente:

```sql
-- Ver cuántos NULLs hay:
SELECT COUNT(*) FROM contacts WHERE phone_number IS NULL;

-- Limpiar los NULLs:
UPDATE contacts SET phone_number = 'unknown-' || id::text WHERE phone_number IS NULL;

-- Verificar que se limpió:
SELECT COUNT(*) FROM contacts WHERE phone_number IS NULL;
```

#### 3. Cambios Realizados en el Backend

- ✅ `Contact.entity.ts`: phone_number ahora es nullable
- ✅ `contacts.service.ts`: Corregido last_seen_at → last_seen
- ✅ phone_number expandido de 20 a 100 caracteres

Después de limpiar, Railway redeploy automáticamente y debería funcionar.
