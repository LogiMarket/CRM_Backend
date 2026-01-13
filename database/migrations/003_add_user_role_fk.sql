-- ===================================================
-- Migración: Agregar FK entre users y roles
-- Fecha: 2026-01-13
-- ===================================================

-- 1. Agregar constraint de foreign key
ALTER TABLE users
ADD CONSTRAINT fk_users_roles
FOREIGN KEY (role_id) REFERENCES roles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 2. Obtener el ID del rol "Administrador" para asignarlo
DO $$
DECLARE
  admin_role_id UUID;
  agent_role_id UUID;
  supervisor_role_id UUID;
BEGIN
  -- Obtener ID del rol Administrador
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrador' LIMIT 1;
  
  -- Obtener ID del rol Agente (si existe)
  SELECT id INTO agent_role_id FROM roles WHERE name = 'Agente' LIMIT 1;
  
  -- Obtener ID del rol Supervisor (si existe)
  SELECT id INTO supervisor_role_id FROM roles WHERE name = 'Supervisor' LIMIT 1;
  
  -- Si no existe el rol Admin, crearlo
  IF admin_role_id IS NULL THEN
    INSERT INTO roles (id, name, description, permissions, is_active)
    VALUES (
      gen_random_uuid(),
      'Administrador',
      'Acceso completo al sistema',
      '{"conversations": {"read": true, "write": true, "delete": true}, "contacts": {"read": true, "write": true, "delete": true}, "users": {"read": true, "write": true, "delete": true}, "orders": {"read": true, "write": true, "delete": true}, "macros": {"read": true, "write": true, "delete": true}, "settings": {"read": true, "write": true}, "reports": {"read": true}, "whatsapp": {"send": true, "receive": true}}'::jsonb,
      true
    )
    RETURNING id INTO admin_role_id;
  END IF;
  
  -- Si no existe el rol Supervisor, crearlo
  IF supervisor_role_id IS NULL THEN
    INSERT INTO roles (id, name, description, permissions, is_active)
    VALUES (
      gen_random_uuid(),
      'Supervisor',
      'Gestión de agentes y conversaciones',
      '{"conversations": {"read": true, "write": true, "delete": false}, "contacts": {"read": true, "write": true, "delete": false}, "users": {"read": true, "write": true, "delete": false}, "orders": {"read": true, "write": true, "delete": false}, "macros": {"read": true, "write": true, "delete": true}, "settings": {"read": true, "write": false}, "reports": {"read": true}, "whatsapp": {"send": true, "receive": true}}'::jsonb,
      true
    )
    RETURNING id INTO supervisor_role_id;
  END IF;
  
  -- Si no existe el rol Agente, crearlo
  IF agent_role_id IS NULL THEN
    INSERT INTO roles (id, name, description, permissions, is_active)
    VALUES (
      gen_random_uuid(),
      'Agente',
      'Atención de conversaciones asignadas',
      '{"conversations": {"read": true, "write": true, "delete": false}, "contacts": {"read": true, "write": false, "delete": false}, "users": {"read": false, "write": false, "delete": false}, "orders": {"read": true, "write": false, "delete": false}, "macros": {"read": true, "write": false, "delete": false}, "settings": {"read": true, "write": false}, "reports": {"read": false}, "whatsapp": {"send": true, "receive": true}}'::jsonb,
      true
    )
    RETURNING id INTO agent_role_id;
  END IF;
  
  -- 3. Asignar rol Admin al primer usuario (asumiendo que es el admin)
  UPDATE users
  SET role_id = admin_role_id
  WHERE role_id IS NULL
  AND email LIKE '%admin%' OR email LIKE '%bryan%'
  LIMIT 1;
  
  -- 4. Asignar rol Agente a los usuarios restantes sin rol
  UPDATE users
  SET role_id = agent_role_id
  WHERE role_id IS NULL;
  
END $$;

-- 5. Crear índice para mejorar performance de queries por rol
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 6. Verificar la migración
SELECT 
  u.id,
  u.name,
  u.email,
  r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;
