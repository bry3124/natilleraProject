const { pool, query } = require('../config/db');

// Helper moved here or separate file
async function crear52Pagos(socioId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let s = 1; s <= 52; s++) {
            await client.query(
                `INSERT INTO pagos (socio_id, semana, estado)
           VALUES ($1, $2, 'PENDIENTE')
           ON CONFLICT (socio_id, semana) DO NOTHING`,
                [socioId, s]
            );
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

const getSocios = async (req, res) => {
    try {
        const { search, status } = req.query;
        let q = `
      SELECT s.*,
             COALESCE(SUM(p.valor), 0) AS total_ahorrado
      FROM socios s
      LEFT JOIN pagos p ON p.socio_id = s.id
    `;
        const where = [];
        const params = [];

        if (status) {
            params.push(status);
            where.push(`s.estado = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            where.push(`(
        s.documento ILIKE $${params.length}
        OR s.nombre1 ILIKE $${params.length}
        OR s.nombre2 ILIKE $${params.length}
        OR s.apellido1 ILIKE $${params.length}
        OR s.apellido2 ILIKE $${params.length}
        OR s.correo ILIKE $${params.length}
        OR s.telefono ILIKE $${params.length}
      )`);
        }

        if (where.length) q += ' WHERE ' + where.join(' AND ');
        q += ' GROUP BY s.id ORDER BY s.id ASC';

        const { rows } = await query(q, params);
        return res.json({ ok: true, socios: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudieron listar socios' });
    }
};

const getSocioById = async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM socios WHERE id=$1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Socio no encontrado' });
        return res.json({ ok: true, socio: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error interno' });
    }
};

const createSocio = async (req, res) => {
    try {
        const {
            documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url,
        } = req.body;

        if (!documento || !nombre1 || !apellido1) {
            return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
        }

        const exists = await query('SELECT id FROM socios WHERE documento=$1', [documento]);
        if (exists.rows.length) {
            return res.status(400).json({ ok: false, error: 'Documento ya registrado' });
        }

        const insert = await query(
            `INSERT INTO socios (documento,nombre1,nombre2,apellido1,apellido2,correo,telefono,foto_url,firma_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url]
        );

        const socio = insert.rows[0];
        await crear52Pagos(socio.id);

        return res.json({ ok: true, socio });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo crear socio' });
    }
};

const updateSocio = async (req, res) => {
    try {
        const id = req.params.id;
        const { documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url } = req.body;

        if (!documento || !nombre1 || !apellido1) {
            return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
        }

        const existOtros = await query('SELECT id FROM socios WHERE documento=$1 AND id<>$2', [documento, id]);
        if (existOtros.rows.length) {
            return res.status(400).json({ ok: false, error: 'Documento ya registrado por otro socio' });
        }

        const { rows } = await query(
            `UPDATE socios SET documento=$1,nombre1=$2,nombre2=$3,apellido1=$4,apellido2=$5,correo=$6,telefono=$7,foto_url=$8,firma_url=$9
       WHERE id=$10 RETURNING *`,
            [documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url, id]
        );

        return res.json({ ok: true, socio: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo actualizar socio' });
    }
};

const updateSocioStatus = async (req, res) => {
    try {
        const { estado } = req.body;
        if (!['ACTIVO', 'INHABILITADO'].includes(estado)) return res.status(400).json({ ok: false, error: 'Estado inválido' });
        const { rows } = await query('UPDATE socios SET estado=$1, inhabilitado_en = (CASE WHEN $1=$2 THEN now() ELSE NULL END) WHERE id=$3 RETURNING *', [estado, 'INHABILITADO', req.params.id]);
        return res.json({ ok: true, socio: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo cambiar estado' });
    }
};

module.exports = {
    getSocios,
    getSocioById,
    createSocio,
    updateSocio,
    updateSocioStatus
};
