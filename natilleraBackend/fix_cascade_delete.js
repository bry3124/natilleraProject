// Script to fix foreign key constraint for cascade delete
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bd_natillera',
    password: process.env.DB_PASS || 'maderas2025',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

async function fixForeignKey() {
    const client = await pool.connect();

    try {
        console.log('📦 Conectando a la base de datos...');

        // Check if the constraint exists
        const checkConstraint = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'prestamos_pagos' 
      AND constraint_type = 'FOREIGN KEY'
    `);

        console.log('🔍 Restricciones encontradas:', checkConstraint.rows);

        // Drop existing foreign key constraint if it exists
        if (checkConstraint.rows.length > 0) {
            for (const row of checkConstraint.rows) {
                console.log(`🗑️  Eliminando restricción antigua: ${row.constraint_name}`);
                await client.query(`
          ALTER TABLE prestamos_pagos 
          DROP CONSTRAINT IF EXISTS ${row.constraint_name}
        `);
            }
        }

        // Add new foreign key with ON DELETE CASCADE
        console.log('➕ Agregando nueva restricción con CASCADE...');
        await client.query(`
      ALTER TABLE prestamos_pagos
      ADD CONSTRAINT prestamos_pagos_prestamo_id_fkey 
      FOREIGN KEY (prestamo_id) 
      REFERENCES prestamos(id) 
      ON DELETE CASCADE
    `);

        console.log('✅ Restricción actualizada exitosamente!');
        console.log('   Ahora los pagos se eliminarán automáticamente al eliminar un préstamo');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixForeignKey()
    .then(() => {
        console.log('\n🎉 Corrección completada!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error en la corrección:', error);
        process.exit(1);
    });
