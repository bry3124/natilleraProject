const { query, pool } = require('../config/db');

const createRifa = async (req, res) => {
    try {
        const { nombre, descripcion, fecha_evento, frecuencia } = req.body;
        const { rows } = await query(
            `INSERT INTO rifas (nombre, descripcion, fecha_evento, frecuencia) VALUES ($1,$2,$3,$4) RETURNING *`,
            [nombre, descripcion, fecha_evento, frecuencia || null]
        );
        const rifa = rows[0];
        // crear 00..99 en rifa_numeros
        const inserts = [];
        for (let i = 0; i < 100; i++) {
            const num = i.toString().padStart(2, '0');
            inserts.push(query('INSERT INTO rifa_numeros (rifa_id, numero, precio) VALUES ($1,$2,$3)', [rifa.id, num, 20]));
        }
        await Promise.all(inserts);
        return res.json({ ok: true, rifa });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo crear rifa' });
    }
};

const getRifas = async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM rifas ORDER BY fecha_evento DESC');
        return res.json({ ok: true, rifas: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error interno' });
    }
};

module.exports = {
    createRifa,
    getRifas
};
