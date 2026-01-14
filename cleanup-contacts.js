const pg = require('pg');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
  try {
    console.log('Conectando a la base de datos...');
    await client.connect();

    console.log('Limpiando valores NULL en contacts.phone_number...');
    const result = await client.query(`
      UPDATE contacts SET phone_number = 'unknown-' || id::text WHERE phone_number IS NULL
    `);

    console.log(`✓ Actualizadas ${result.rowCount} filas`);
    console.log('✓ Limpieza completada exitosamente');

    await client.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();
