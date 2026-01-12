-- Internal Chat MVP - Database Schema
-- Created: January 11, 2026
-- Database: internal_chat_mvp
-- ORM: TypeORM

-- ============================================
-- TABLE: users (Agentes/Administradores)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'supervisor')),
    avatar_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- TABLE: contacts (Clientes de WhatsApp)
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);

-- ============================================
-- TABLE: conversations (Conversaciones con clientes)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'resolved')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_agent ON conversations(assigned_agent_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- ============================================
-- TABLE: messages (Mensajes de conversaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'contact')),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    is_from_whatsapp BOOLEAN DEFAULT FALSE,
    whatsapp_message_id VARCHAR(255), -- Twilio SID
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_is_from_whatsapp ON messages(is_from_whatsapp);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);

-- ============================================
-- TABLE: orders (Órdenes de clientes)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) NOT NULL UNIQUE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL,
    items JSONB,
    shipping_address TEXT,
    tracking_number VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_contact ON orders(contact_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ============================================
-- TABLE: macros (Respuestas rápidas)
-- ============================================
CREATE TABLE IF NOT EXISTS macros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    shortcut VARCHAR(50) NOT NULL UNIQUE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_macros_created_by ON macros(created_by_id);
CREATE INDEX idx_macros_shortcut ON macros(shortcut);
CREATE INDEX idx_macros_is_active ON macros(is_active);

-- ============================================
-- TABLE: conversation_tags (Etiquetas para conversaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_tags_conversation ON conversation_tags(conversation_id);
CREATE INDEX idx_conversation_tags_tag ON conversation_tags(tag);

-- ============================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_macros_updated_at BEFORE UPDATE ON macros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Opcional - comentado)
-- ============================================
-- Descomenta si necesitas datos de prueba

-- INSERT INTO users (email, password_hash, name, role, status)
-- VALUES (
--   'admin@test.com',
--   '$2a$10$...', -- bcrypt hash of 'password123'
--   'Admin User',
--   'admin',
--   'available'
-- );

-- ============================================
-- NOTAS:
-- ============================================
-- 1. TypeORM creará estas tablas automáticamente si DATABASE_SYNCHRONIZE=true
-- 2. Este archivo SQL es para referencia y setup manual si es necesario
-- 3. Los índices están creados para optimizar queries comunes
-- 4. Los UUIDs se generan automáticamente con gen_random_uuid()
-- 5. Los timestamps se manejan automáticamente
