const { Client } = require('pg');

const connectionString = 'postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway';

const sql = `
ALTER TABLE users ADD CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

DO $$
DECLARE
  admin_role_id UUID;
  supervisor_role_id UUID;
  agent_role_id UUID;
BEGIN
  INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Administrador', 'Acceso completo al sistema', '{"conversations":{"read":true,"write":true,"delete":true},"contacts":{"read":true,"write":true,"delete":true},"users":{"read":true,"write":true,"delete":true},"orders":{"read":true,"write":true,"delete":true},"macros":{"read":true,"write":true,"delete":true},"settings":{"read":true,"write":true,"delete":true},"reports":{"read":true,"write":true,"delete":true},"whatsapp":{"read":true,"write":true,"delete":true}}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING RETURNING id INTO admin_role_id;
  IF admin_role_id IS NULL THEN SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrador'; END IF;
  
  INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Supervisor', 'Gestión de agentes y conversaciones', '{"conversations":{"read":true,"write":true,"delete":false},"contacts":{"read":true,"write":true,"delete":false},"users":{"read":true,"write":true,"delete":false},"orders":{"read":true,"write":true,"delete":false},"macros":{"read":true,"write":true,"delete":false},"settings":{"read":true,"write":false,"delete":false},"reports":{"read":true,"write":false,"delete":false},"whatsapp":{"read":true,"write":true,"delete":false}}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING RETURNING id INTO supervisor_role_id;
  IF supervisor_role_id IS NULL THEN SELECT id INTO supervisor_role_id FROM roles WHERE name = 'Supervisor'; END IF;
  
  INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Agente', 'Atención de conversaciones asignadas', '{"conversations":{"read":true,"write":true,"delete":false},"contacts":{"read":true,"write":false,"delete":false},"users":{"read":false,"write":false,"delete":false},"orders":{"read":true,"write":false,"delete":false},"macros":{"read":true,"write":false,"delete":false},"settings":{"read":true,"write":false,"delete":false},"reports":{"read":false,"write":false,"delete":false},"whatsapp":{"read":false,"write":false,"delete":false}}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING RETURNING id INTO agent_role_id;
  IF agent_role_id IS NULL THEN SELECT id INTO agent_role_id FROM roles WHERE name = 'Agente'; END IF;
  
  UPDATE users SET role_id = admin_role_id WHERE (email LIKE '%admin%' OR email LIKE '%bryan%') AND role_id IS NULL;
  UPDATE users SET role_id = agent_role_id WHERE role_id IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

SELECT u.id, u.name, u.email, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id;
`;

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    console.log(' Conectando a la base de datos...');
    await client.connect();
    
    console.log('  Ejecutando migración SQL...');
    const result = await client.query(sql);
    
    console.log(' Migración completada exitosamente!');
    console.log('\n Usuarios con roles asignados:');
    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`   - ${row.email}: ${row.role_name}`);
      });
    }
  } catch (error) {
    console.error(' Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
