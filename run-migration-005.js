const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL no está configurada');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    const migrationFile = path.join(
      __dirname,
      'database/migrations/005_add_message_media_support.sql',
    );
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    console.log('🔄 Ejecutando migración 005 (media support)...');
    await client.query(sql);
    console.log('✅ Migración 005 ejecutada exitosamente');

    const verify = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name IN ('media_id','media_mime_type','media_sha256','media_filename','media_caption','media_url','metadata')
      ORDER BY column_name;
    `);

    console.log('\n📋 Verificación de columnas media en messages:');
    verify.rows.forEach((row) => {
      console.log(`  messages.${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error en migración 005:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
