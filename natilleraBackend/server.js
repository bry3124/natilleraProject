const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- SOCIOS ---
// Crear socio
app.post('/api/socios', async (req, res) => {
    try {
        const { nombre1, nombre2, apellido1, apellido2, correo, telefono } = req.body;
        const q = `INSERT INTO socios (nombre1,nombre2,apellido1,apellido2,correo,telefono)
                VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
        const { rows } = await db.query(q, [nombre1, nombre2, apellido1, apellido2, correo, telefono]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando socio' });
    }
});

// Modificar socio
app.put('/api/socios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre1, nombre2, apellido1, apellido2, correo, telefono } = req.body;
        const q = `UPDATE socios SET nombre1=$1,nombre2=$2,apellido1=$3,apellido2=$4,correo=$5,telefono=$6
                WHERE id=$7 RETURNING *`;
        const { rows } = await db.query(q, [nombre1, nombre2, apellido1, apellido2, correo, telefono, id]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error actualizando socio' });
    }
});

// Obtener todos los socios
app.get('/api/socios', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM socios ORDER BY nombre1, apellido1');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo socios' });
    }
});

// Obtener un socio por id
app.get('/api/socios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query('SELECT * FROM socios WHERE id=$1', [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo socio' });
    }
});

// --- PAGOS ---
// Registrar/actualizar pago por semana
app.post('/api/pagos', async (req, res) => {
    try {
        const { socio_id, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado } = req.body;
        // upsert: si ya existe actualiza, sino inserta
        const q = `
            INSERT INTO pagos (socio_id, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (socio_id, semana) DO UPDATE SET
                fecha_pago = EXCLUDED.fecha_pago,
                forma_pago = EXCLUDED.forma_pago,
                valor = EXCLUDED.valor,
                nombre_pagador = EXCLUDED.nombre_pagador,
                firma_recibe = EXCLUDED.firma_recibe,
                estado = EXCLUDED.estado
            RETURNING *`;
        const { rows } = await db.query(q, [socio_id, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado || 'PENDIENTE']);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando pago' });
    }
});

// Obtener pagos por socio
app.get('/api/socios/:id/pagos', async (req, res) => {
    try {
        const socio_id = req.params.id;
        const q = `SELECT * FROM pagos WHERE socio_id=$1 ORDER BY semana`;
        const { rows } = await db.query(q, [socio_id]);
        // si no existen registros, crear plantilla de 52 semanas vacías
        if (rows.length === 0) {
            const inserts = [];
            for (let s=1; s<=52; s++) {
                inserts.push(db.query(`INSERT INTO pagos (socio_id, semana, estado) VALUES ($1,$2,'PENDIENTE') RETURNING *`, [socio_id, s]));
            }
            const results = await Promise.all(inserts);
            return res.json(results.map(r=>r.rows[0]));
        }
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error obteniendo pagos' });
        }
});

// Obtener todos los pagos (opcional)
app.get('/api/pagos', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT p.*, s.nombre1, s.apellido1 FROM pagos p LEFT JOIN socios s ON s.id=p.socio_id ORDER BY socio_id, semana');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo pagos' });
    }
});

// --- RIFAS ---
// Crear rifa
app.post('/api/rifas', async (req, res) => {
    try {
        const { nombre, descripcion, fecha_evento, frecuencia } = req.body;
        const q = `INSERT INTO rifas (nombre, descripcion, fecha_evento, frecuencia) VALUES ($1,$2,$3,$4) RETURNING *`;
        const { rows } = await db.query(q, [nombre, descripcion, fecha_evento, frecuencia]);
        const rifa = rows[0];

        // crear numeros 00..99 para la rifa con precio por defecto 20
        const inserts = [];
        for (let i=0;i<100;i++){
        const num = i.toString().padStart(2,'0');
        inserts.push(db.query(`INSERT INTO rifa_numeros (rifa_id, numero, precio) VALUES ($1,$2,$3)`, [rifa.id, num, 20]));
        }
        await Promise.all(inserts);
        res.json(rifa);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando rifa' });
    }
});

// Obtener rifas
app.get('/api/rifas', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM rifas ORDER BY fecha_evento DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo rifas' });
    }
    });

// Obtener numeros de una rifa
app.get('/api/rifas/:id/numeros', async (req, res) => {
    try {
        const rifa_id = req.params.id;
        const { rows } = await db.query('SELECT rn.*, s.nombre1, s.apellido1, s.correo FROM rifa_numeros rn LEFT JOIN socios s ON s.id = rn.socio_id WHERE rn.rifa_id=$1 ORDER BY numero', [rifa_id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo numeros' });
    }
});

// Comprar/Asignar numero
app.post('/api/rifas/:id/numero/assign', async (req, res) => {
    try {
        const rifa_id = req.params.id;
        const { numero, socio_id } = req.body;
        const q = `UPDATE rifa_numeros SET socio_id=$1, comprado_en=now() WHERE rifa_id=$2 AND numero=$3 RETURNING *`;
        const { rows } = await db.query(q, [socio_id, rifa_id, numero]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error asignando numero' });
    }
});

// Sortear ganador (elige random numero asignado)
app.post('/api/rifas/:id/sorteo', async (req, res) => {
    try {
        const rifa_id = req.params.id;
        const q = `SELECT * FROM rifa_numeros WHERE rifa_id=$1 AND socio_id IS NOT NULL`;
        const { rows } = await db.query(q, [rifa_id]);
        if (rows.length === 0) return res.status(400).json({ error: 'No hay numeros asignados' });

        const ganador = rows[Math.floor(Math.random()*rows.length)];
        // registrar ganador
        const premio = 2000; // Si quieres otra lógica, ajusta
        await db.query(`INSERT INTO rifa_ganadores (rifa_id, numero_ganador, socio_id, premio) VALUES ($1,$2,$3,$4)`, [rifa_id, ganador.numero, ganador.socio_id, premio]);
        res.json({ ganador: ganador.numero, socio_id: ganador.socio_id, premio });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en sorteo' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
