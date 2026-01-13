const { Client } = require('pg');

const connectionString = 'postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway';

async function checkUsers() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name as role_name,
        r.description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY r.name, u.email;
    `);
    
    console.log('\n Usuarios con roles asignados:\n');
    result.rows.forEach(row => {
      console.log(` ${row.email}`);
      console.log(`  Nombre: ${row.name}`);
      console.log(`  Rol: ${row.role_name}`);
      console.log(`  Descripción: ${row.description}\n`);
    });
    
    console.log(`\nTotal: ${result.rows.length} usuarios`);
  } catch (error) {
    console.error(' Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
