const { query } = require('../config/db');

const getEventos = async (req, res) => {
    try {
        const { status, tipo } = req.query;
        let q = 'SELECT * FROM eventos WHERE 1=1';
        const params = [];

        if (status) {
            params.push(status);
            q += ` AND estado = $${params.length}`;
        }
        if (tipo) {
            params.push(tipo);
            q += ` AND tipo = $${params.length}`;
        }

        q += ' ORDER BY fecha DESC';

        const { rows } = await query(q, params);
        return res.json({ ok: true, eventos: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudieron listar eventos' });
    }
};

const createEvento = async (req, res) => {
    try {
        const { nombre, descripcion, fecha, tipo, estado } = req.body;
        if (!nombre || !fecha) {
            return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
        }

        const { rows } = await query(
            `INSERT INTO eventos (nombre, descripcion, fecha, tipo, estado)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nombre, descripcion, fecha, tipo || 'GENERAL', estado || 'UPCOMING']
        );

        return res.json({ ok: true, evento: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo crear evento' });
    }
};

const getEventoById = async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Evento no encontrado' });
        return res.json({ ok: true, evento: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error interno' });
    }
};

const updateEvento = async (req, res) => {
    try {
        const { nombre, descripcion, fecha, tipo, estado } = req.body;
        if (!nombre || !fecha) {
            return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
        }

        const { rows } = await query(
            `UPDATE eventos SET nombre=$1, descripcion=$2, fecha=$3, tipo=$4, estado=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
            [nombre, descripcion, fecha, tipo, estado, req.params.id]
        );

        if (!rows.length) return res.status(404).json({ ok: false, error: 'Evento no encontrado' });
        return res.json({ ok: true, evento: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo actualizar evento' });
    }
};

const deleteEvento = async (req, res) => {
    try {
        const { rows } = await query('DELETE FROM eventos WHERE id=$1 RETURNING *', [req.params.id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Evento no encontrado' });
        return res.json({ ok: true, evento: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo eliminar evento' });
    }
};

module.exports = {
    getEventos,
    createEvento,
    getEventoById,
    updateEvento,
    deleteEvento
};
