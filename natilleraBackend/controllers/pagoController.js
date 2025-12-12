const { pool, query } = require('../config/db');
const { sendWeeklyPaymentEmail } = require('../emailService');
const { generateWeeklyReceipt } = require('../receiptService');

// Helper duplicated for now to keep controllers independent
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

const getPagosBySocioId = async (req, res) => {
    try {
        const socioId = req.params.id;
        const { rows } = await query('SELECT * FROM pagos WHERE socio_id=$1 ORDER BY semana', [socioId]);
        if (rows.length === 0) {
            await crear52Pagos(socioId);
            const r2 = await query('SELECT * FROM pagos WHERE socio_id=$1 ORDER BY semana', [socioId]);
            return res.json({ ok: true, pagos: r2.rows });
        }
        return res.json({ ok: true, pagos: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudieron obtener pagos' });
    }
};

const updatePago = async (req, res) => {
    try {
        const pagoId = req.params.id;
        const { fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado, usuario } = req.body;

        const antes = await query('SELECT * FROM pagos WHERE id=$1', [pagoId]);
        if (!antes.rows.length) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });

        await query(
            `INSERT INTO pagos_historial (pago_id, socio_id, semana, cambios, usuario)
       VALUES ($1,$2,$3,$4,$5)`,
            [pagoId, antes.rows[0].socio_id, antes.rows[0].semana, JSON.stringify(antes.rows[0]), usuario || 'SYSTEM']
        );

        const { rows } = await query(
            `UPDATE pagos SET fecha_pago=$1, forma_pago=$2, valor=$3, nombre_pagador=$4, firma_recibe=$5, estado=$6
       WHERE id=$7 RETURNING *`,
            [fecha_pago || null, forma_pago || null, valor || null, nombre_pagador || null, firma_recibe || null, estado || antes.rows[0].estado, pagoId]
        );

        const pago = rows[0];
        const valorNum = parseFloat(pago.valor);

        if (pago.estado === 'PAGADO' && valorNum > 0) {
            const socioRes = await query('SELECT * FROM socios WHERE id=$1', [pago.socio_id]);
            if (socioRes.rows.length > 0) {
                const socio = socioRes.rows[0];
                if (socio.correo) {
                    sendWeeklyPaymentEmail(socio, pago).catch(err => console.error('Error sending payment email:', err));
                }
            }
        }

        return res.json({ ok: true, pago });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo actualizar pago' });
    }
};

const createOrUpdatePago = async (req, res) => {
    try {
        const { socio_id, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado, usuario } = req.body;

        if (!socio_id || !semana) return res.status(400).json({ ok: false, error: 'Faltan socio_id o semana' });
        const sNum = Number(semana);
        if (isNaN(sNum) || sNum < 1 || sNum > 52) return res.status(400).json({ ok: false, error: 'Semana inválida (1-52)' });

        const socioQ = await query('SELECT id FROM socios WHERE id=$1', [socio_id]);
        if (!socioQ.rows.length) return res.status(404).json({ ok: false, error: 'Socio no encontrado' });

        const q = `
      INSERT INTO pagos (socio_id, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (socio_id, semana) DO UPDATE
        SET fecha_pago = EXCLUDED.fecha_pago,
            forma_pago = EXCLUDED.forma_pago,
            valor = EXCLUDED.valor,
            nombre_pagador = EXCLUDED.nombre_pagador,
            firma_recibe = EXCLUDED.firma_recibe,
            estado = EXCLUDED.estado
      RETURNING *;
    `;
        const params = [
            socio_id, sNum, fecha_pago || null, forma_pago || null, valor || null,
            nombre_pagador || null, firma_recibe || null, estado || 'PENDIENTE'
        ];

        const { rows } = await query(q, params);
        const pago = rows[0];

        await query(
            `INSERT INTO pagos_historial (pago_id, socio_id, semana, cambios, usuario)
       VALUES ($1,$2,$3,$4,$5)`,
            [pago.id, pago.socio_id, pago.semana, JSON.stringify({ action: 'UPSERT', data: pago }), usuario || 'SYSTEM']
        );

        const valorNum = parseFloat(pago.valor);
        if (pago.estado === 'PAGADO' && valorNum > 0) {
            const socioRes = await query('SELECT * FROM socios WHERE id=$1', [pago.socio_id]);
            if (socioRes.rows.length > 0) {
                const socio = socioRes.rows[0];
                if (socio.correo) {
                    sendWeeklyPaymentEmail(socio, pago).catch(err => console.error('Error sending payment email:', err));
                }
            }
        }

        return res.json({ ok: true, pago });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo crear/actualizar pago' });
    }
};

const getReceipt = async (req, res) => {
    try {
        const pagoId = req.params.id;
        const pagoRes = await query('SELECT * FROM pagos WHERE id=$1', [pagoId]);
        if (!pagoRes.rows.length) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });

        const pago = pagoRes.rows[0];
        const socioRes = await query('SELECT * FROM socios WHERE id=$1', [pago.socio_id]);
        const socio = socioRes.rows[0];

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=recibo_semana_${pago.semana}_${socio.documento}.pdf`);

        const doc = generateWeeklyReceipt(pago, socio);
        doc.pipe(res);
        doc.end();

    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error generando recibo' });
    }
};

module.exports = {
    getPagosBySocioId,
    updatePago,
    createOrUpdatePago,
    getReceipt
};
