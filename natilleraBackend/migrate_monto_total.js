// Script to add monto_total column to prestamos table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bd_natillera',
    password: process.env.DB_PASS || 'maderas2025',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

async function addMontoTotal() {
    const client = await pool.connect();

    try {
        console.log('📦 Conectando a la base de datos...');

        // Add monto_total column
        console.log('📝 Agregando columna monto_total...');
        await client.query(`
      ALTER TABLE prestamos 
      ADD COLUMN IF NOT EXISTS monto_total DECIMAL(12,2)
    `);

        // Update existing records
        console.log('🔄 Actualizando préstamos existentes...');
        const result = await client.query(`
      UPDATE prestamos 
      SET monto_total = monto * (1 + COALESCE(tasa_interes, 0) / 100)
      WHERE monto_total IS NULL
    `);

        console.log(`✅ Columna agregada exitosamente!`);
        console.log(`   ${result.rowCount} préstamos actualizados`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addMontoTotal()
    .then(() => {
        console.log('\n🎉 Migración completada!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error en la migración:', error);
        process.exit(1);
    });
