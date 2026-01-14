const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Read migration file
    const migrationFile = path.join(__dirname, 'database/migrations/004_expand_phone_number_fields.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('🔄 Ejecutando migración 004...');
    await client.query(sql);
    console.log('✅ Migración 004 ejecutada exitosamente');

    // Verify the changes
    const result = await client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name IN ('contacts', 'conversations')
      AND column_name IN ('phone_number', 'customer_phone', 'name')
      ORDER BY table_name, column_name;
    `);

    console.log('\n📋 Verificación de campos:');
    result.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
    });

    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
