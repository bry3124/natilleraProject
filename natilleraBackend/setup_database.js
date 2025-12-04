// Script to setup database tables
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bd_natillera',
    password: process.env.DB_PASS || 'maderas2025',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

async function setupDatabase() {
    const client = await pool.connect();

    try {
        console.log('📦 Conectando a la base de datos...');

        // Read the SQL schema file
        const schemaPath = path.join(__dirname, 'db_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📝 Ejecutando script de esquema...');

        // Execute the schema
        await client.query(schemaSql);

        console.log('✅ Tablas creadas exitosamente!');
        console.log('   - eventos');
        console.log('   - prestamos');
        console.log('   - prestamos_pagos');
        console.log('   - Índices creados');
        console.log('   - Datos de ejemplo insertados');

    } catch (error) {
        console.error('❌ Error al crear tablas:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupDatabase()
    .then(() => {
        console.log('\n🎉 Base de datos configurada correctamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error en la configuración:', error);
        process.exit(1);
    });
