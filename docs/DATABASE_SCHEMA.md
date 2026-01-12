# 📊 Estructura de la Base de Datos

## Overview

La base de datos tiene **7 tablas principales** que definen toda la estructura del sistema de chat con WhatsApp.

---

## 📁 Dónde están las Entidades

```
backend/
└── src/
    ├── modules/
    │   ├── users/
    │   │   └── entities/
    │   │       └── user.entity.ts           ← Tabla: users
    │   ├── contacts/
    │   │   └── entities/
    │   │       └── contact.entity.ts        ← Tabla: contacts
    │   ├── conversations/
    │   │   └── entities/
    │   │       └── conversation.entity.ts   ← Tabla: conversations
    │   ├── messages/
    │   │   └── entities/
    │   │       └── message.entity.ts        ← Tabla: messages
    │   ├── orders/
    │   │   └── entities/
    │   │       └── order.entity.ts          ← Tabla: orders
    │   ├── macros/
    │   │   └── entities/
    │   │       └── macro.entity.ts          ← Tabla: macros
    │   └── conversation-tags/
    │       └── entities/
    │           └── conversation-tag.entity.ts ← Tabla: conversation_tags
    │
    └── database/
        └── schema.sql                       ← SQL completo
```

---

## 📋 Tablas de la Base de Datos

### 1️⃣ **users** - Agentes y Administradores

```typescript
{
  id: UUID,                    // Identificador único
  email: string,               // Email único
  password_hash: string,       // Password encriptado
  name: string,                // Nombre del agente
  role: 'admin' | 'agent' | 'supervisor',
  avatar_url: string,          // URL de foto de perfil
  status: 'available' | 'busy' | 'offline',
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `email` (UNIQUE)
- `role`
- `status`

---

### 2️⃣ **contacts** - Clientes de WhatsApp

```typescript
{
  id: UUID,
  phone_number: string,        // +34612345678 (UNIQUE)
  name: string,                // Nombre del cliente
  avatar_url: string,          // Foto de WhatsApp
  last_seen: Date,             // Último visto
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `phone_number` (UNIQUE)
- `created_at`

**Relaciones:**
- ↔️ Múltiples `conversations`
- ↔️ Múltiples `orders`

---

### 3️⃣ **conversations** - Chats con Clientes

```typescript
{
  id: UUID,
  contact_id: UUID,            // FK → contacts
  assigned_agent_id: UUID,     // FK → users (agente asignado)
  status: 'active' | 'paused' | 'resolved',
  priority: 'low' | 'medium' | 'high',
  notes: string,               // Notas internas
  last_message_at: Date,       // Último mensaje
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `contact_id` (FK)
- `assigned_agent_id` (FK)
- `status`
- `created_at`

**Relaciones:**
- ← `contact` (many-to-one)
- ← `assigned_agent` (many-to-one)
- → Múltiples `messages`
- → Múltiples `conversation_tags`

---

### 4️⃣ **messages** - Mensajes de Conversaciones

```typescript
{
  id: UUID,
  conversation_id: UUID,       // FK → conversations
  sender_type: 'user' | 'contact',
  sender_id: UUID,             // FK → users (si es user)
  content: string,             // Texto del mensaje
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video',
  is_from_whatsapp: boolean,   // Vino de WhatsApp?
  whatsapp_message_id: string, // Twilio message SID
  is_read: boolean,            // Leído?
  read_at: Date,               // Cuándo se leyó
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `conversation_id` (FK)
- `sender_id` (FK)
- `is_from_whatsapp`
- `whatsapp_message_id` (Twilio SID)
- `created_at`

**Relaciones:**
- ← `conversation` (many-to-one)
- ← `sender` (many-to-one)

---

### 5️⃣ **orders** - Órdenes de Clientes

```typescript
{
  id: UUID,
  order_number: string,        // "ORD-001" (UNIQUE)
  contact_id: UUID,            // FK → contacts
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  total_amount: decimal,       // Monto total
  items: JSON,                 // Array de items
  shipping_address: string,    // Dirección de envío
  tracking_number: string,     // Número de seguimiento
  notes: string,               // Notas de la orden
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `contact_id` (FK)
- `order_number` (UNIQUE)
- `status`
- `created_at`

**Relaciones:**
- ← `contact` (many-to-one)

---

### 6️⃣ **macros** - Respuestas Rápidas

```typescript
{
  id: UUID,
  title: string,               // "Saludo inicial"
  content: string,             // "Hola! ¿En qué te puedo ayudar?"
  shortcut: string,            // "!saludo" (UNIQUE)
  created_by_id: UUID,         // FK → users
  usage_count: bigint,         // Cuántas veces usado
  is_active: boolean,          // Activado?
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `created_by_id` (FK)
- `shortcut` (UNIQUE)
- `is_active`

**Relaciones:**
- ← `created_by` (many-to-one)

---

### 7️⃣ **conversation_tags** - Etiquetas para Conversaciones

```typescript
{
  id: UUID,
  conversation_id: UUID,       // FK → conversations
  tag: string,                 // "vip", "urgent", etc.
  created_at: Date
}
```

**Índices:**
- `conversation_id` (FK)
- `tag`

**Relaciones:**
- ← `conversation` (many-to-one)

---

## 🔗 Diagrama de Relaciones

```
users (agentes)
  ├─→ conversations (asignado como agente)
  ├─→ messages (autor del mensaje)
  └─→ macros (creador)

contacts (clientes)
  ├─→ conversations
  └─→ orders

conversations
  ├─← contact
  ├─← assigned_agent (user)
  ├─→ messages
  └─→ conversation_tags

messages
  ├─← conversation
  ├─← sender (user)

orders
  └─← contact

macros
  └─← created_by (user)

conversation_tags
  └─← conversation
```

---

## 🚀 Cómo se Crea la Base de Datos

### Opción 1: TypeORM Auto-Create (Recomendado)

En `.env.local`:
```env
DATABASE_SYNCHRONIZE=true
```

TypeORM creará automáticamente todas las tablas al iniciar:

```bash
cd backend
docker-compose up -d
pnpm start:dev
```

### Opción 2: SQL Manual

```bash
# Conectar a PostgreSQL
psql -h localhost -U postgres -d internal_chat_mvp

# Ejecutar el script
\i src/database/schema.sql
```

---

## 📊 Tamaño de Datos Esperado

| Tabla | Ejemplo de Filas | Tipo de Datos |
|-------|-----------------|--------------|
| users | 5-50 | Pequeño |
| contacts | 100-10,000 | Medio |
| conversations | 100-50,000 | Medio-Grande |
| messages | 1,000-1M+ | Grande |
| orders | 100-100,000 | Medio |
| macros | 10-100 | Pequeño |
| conversation_tags | 1,000-500,000 | Medio |

---

## 🔍 Queries Comunes

### Obtener conversaciones activas de un cliente

```sql
SELECT c.*, u.name as agent_name
FROM conversations c
LEFT JOIN users u ON c.assigned_agent_id = u.id
WHERE c.contact_id = 'xxx' AND c.status = 'active'
ORDER BY c.last_message_at DESC;
```

### Obtener mensajes de una conversación

```sql
SELECT * FROM messages
WHERE conversation_id = 'xxx'
ORDER BY created_at DESC
LIMIT 50;
```

### Obtener órdenes de un cliente

```sql
SELECT * FROM orders
WHERE contact_id = 'xxx'
ORDER BY created_at DESC;
```

---

## 🛡️ Seguridad

- ✅ UUIDs para evitar enumeration
- ✅ Password hasheado (bcryptjs)
- ✅ Índices para performance
- ✅ Foreign keys con cascada
- ✅ Timestamps automáticos
- ✅ JSON validado (JSONB en PostgreSQL)

---

## 📝 Notas Importantes

1. **TypeORM maneja todo**: No necesitas crear tablas manualmente si `DATABASE_SYNCHRONIZE=true`
2. **UUIDs automáticos**: Se generan con `gen_random_uuid()`
3. **Timestamps automáticos**: `created_at` y `updated_at` se manejan automáticamente
4. **Índices optimizados**: Creados en campos que se usan frecuentemente
5. **Triggers SQL**: Para actualizar `updated_at` automáticamente

---

## 🔄 Relaciones Clave

### User → Conversation
Un usuario (agente) puede estar asignado a múltiples conversaciones.

### Contact → Conversation
Un contacto puede tener múltiples conversaciones.

### Conversation → Message
Una conversación tiene múltiples mensajes.

### Contact → Order
Un contacto puede tener múltiples órdenes.

---

## 📚 Ver Entidades TypeORM

```typescript
// En: backend/src/modules/*/entities/*.entity.ts

// Ejemplo:
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // ... más campos
}
```

---

## ✅ Verificación

Después de iniciar el backend, verifica que la BD está creada:

```bash
# En pgAdmin (http://localhost:5050)
# O en psql:
psql -h localhost -U postgres -d internal_chat_mvp
\dt  # Listar todas las tablas
```

Deberías ver:
```
users
contacts
conversations
messages
orders
macros
conversation_tags
```

---

**Documento creado**: Enero 11, 2026  
**Versión**: 1.0.0  
**ORM**: TypeORM  
**Base de Datos**: PostgreSQL 15+
