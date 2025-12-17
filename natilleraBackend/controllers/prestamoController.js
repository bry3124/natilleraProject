const { pool, query } = require('../config/db');
const { sendLoanCreationEmail, sendLoanPaymentEmail } = require('../emailService');
const { generateLoanPaymentReceipt } = require('../receiptService');

const getPrestamos = async (req, res) => {
    try {
        const { status, socio_id } = req.query;
        let q = `
      SELECT p.*, 
             s.nombre1, s.apellido1, s.documento,
             COALESCE(SUM(pp.monto_pago), 0) as total_pagado
      FROM prestamos p
      LEFT JOIN socios s ON p.socio_id = s.id
      LEFT JOIN prestamos_pagos pp ON pp.prestamo_id = p.id
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            params.push(status);
            q += ` AND p.estado = $${params.length}`;
        }
        if (socio_id) {
            params.push(socio_id);
            q += ` AND p.socio_id = $${params.length}`;
        }

        q += ' GROUP BY p.id, s.nombre1, s.apellido1, s.documento ORDER BY p.created_at DESC';

        const { rows } = await query(q, params);
        return res.json({ ok: true, prestamos: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudieron listar préstamos' });
    }
};

const createPrestamo = async (req, res) => {
    try {
        const { socio_id, monto, tasa_interes, plazo_meses, fecha_vencimiento, observaciones } = req.body;

        if (!socio_id || !monto) {
            return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
        }

        const socioQ = await query('SELECT id FROM socios WHERE id=$1', [socio_id]);
        if (!socioQ.rows.length) {
            return res.status(404).json({ ok: false, error: 'Socio no encontrado' });
        }

        const today = new Date();
        const fechaAprobacion = today.toISOString().split('T')[0];
        let fechaVencimiento = fecha_vencimiento;
        if (!fechaVencimiento && plazo_meses) {
            const vencimiento = new Date(today);
            vencimiento.setMonth(vencimiento.getMonth() + parseInt(plazo_meses || 12));
            fechaVencimiento = vencimiento.toISOString().split('T')[0];
        }

        const tasaDecimal = parseFloat(tasa_interes || 0) / 100;
        const montoTotal = parseFloat(monto) * (1 + tasaDecimal);

        const { rows } = await query(
            `INSERT INTO prestamos (socio_id, monto, tasa_interes, plazo_meses, fecha_aprobacion, fecha_vencimiento, monto_total, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [socio_id, monto, tasa_interes || 0, plazo_meses || 12, fechaAprobacion, fechaVencimiento, montoTotal, observaciones]
        );

        const tempPrestamo = rows[0];
        const codigo = `PRE-${tempPrestamo.id.toString().padStart(4, '0')}`;

        // Update the loan with the generated code
        const { rows: finalRows } = await query(
            'UPDATE prestamos SET codigo = $1 WHERE id = $2 RETURNING *',
            [codigo, tempPrestamo.id]
        );

        const prestamo = finalRows[0];

        // Background email
        (async () => {
            try {
                const socioResult = await query('SELECT * FROM socios WHERE id = $1', [socio_id]);
                if (socioResult.rows.length > 0) {
                    await sendLoanCreationEmail(socioResult.rows[0], prestamo);
                }
            } catch (err) {
                console.error('⚠️ Failed to send loan creation email (background):', err.message);
            }
        })();

        return res.json({ ok: true, prestamo });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo crear préstamo' });
    }
};

const getPrestamoById = async (req, res) => {
    try {
        const { rows } = await query(`
      SELECT p.*, 
             s.nombre1, s.apellido1, s.documento,
             COALESCE(SUM(pp.monto_pago), 0) as total_pagado
      FROM prestamos p
      LEFT JOIN socios s ON p.socio_id = s.id
      LEFT JOIN prestamos_pagos pp ON pp.prestamo_id = p.id
      WHERE p.id=$1
      GROUP BY p.id, s.nombre1, s.apellido1, s.documento
    `, [req.params.id]);

        if (!rows.length) return res.status(404).json({ ok: false, error: 'Préstamo no encontrado' });
        return res.json({ ok: true, prestamo: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error interno' });
    }
};

const updatePrestamo = async (req, res) => {
    try {
        const { monto, tasa_interes, plazo_meses, fecha_aprobacion, fecha_vencimiento, estado, observaciones } = req.body;

        const tasaDecimal = parseFloat(tasa_interes || 0) / 100;
        const montoTotal = parseFloat(monto) * (1 + tasaDecimal);

        const { rows } = await query(
            `UPDATE prestamos 
       SET monto=$1, tasa_interes=$2, plazo_meses=$3, fecha_aprobacion=$4, 
           fecha_vencimiento=$5, estado=$6, monto_total=$7, observaciones=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
            [monto, tasa_interes, plazo_meses, fecha_aprobacion, fecha_vencimiento, estado, montoTotal, observaciones, req.params.id]
        );

        if (!rows.length) return res.status(404).json({ ok: false, error: 'Préstamo no encontrado' });
        return res.json({ ok: true, prestamo: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo actualizar préstamo' });
    }
};

const deletePrestamo = async (req, res) => {
    try {
        console.log('🗑️  DELETE request received for prestamo ID:', req.params.id);
        const { rows } = await query('DELETE FROM prestamos WHERE id=$1 RETURNING *', [req.params.id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Préstamo no encontrado' });
        return res.json({ ok: true, prestamo: rows[0] });
    } catch (e) {
        console.error('❌ Error deleting prestamo:', e.message);
        return res.status(500).json({ ok: false, error: 'No se pudo eliminar préstamo' });
    }
};

const registerPayment = async (req, res) => {
    try {
        const { fecha_pago, monto_pago, forma_pago, observaciones } = req.body;

        if (!monto_pago || monto_pago <= 0) {
            return res.status(400).json({ ok: false, error: 'Monto de pago requerido y debe ser mayor a 0' });
        }

        const loanCheck = await query(`
      SELECT p.estado, p.monto_total, COALESCE(SUM(pp.monto_pago), 0) as total_pagado
      FROM prestamos p
      LEFT JOIN prestamos_pagos pp ON pp.prestamo_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [req.params.id]);

        if (!loanCheck.rows.length) {
            return res.status(404).json({ ok: false, error: 'Préstamo no encontrado' });
        }

        const { estado, monto_total, total_pagado } = loanCheck.rows[0];

        if (estado === 'PAGADO') {
            return res.status(400).json({
                ok: false,
                error: 'Este préstamo ya ha sido pagado en su totalidad. No se pueden registrar más abonos.'
            });
        }

        const saldoPendiente = parseFloat(monto_total) - parseFloat(total_pagado);

        if (parseFloat(monto_pago) > (saldoPendiente + 1)) {
            return res.status(400).json({
                ok: false,
                error: `El monto del abono excede el saldo pendiente ($${Math.round(saldoPendiente)}).`
            });
        }

        const fechaPagoFinal = fecha_pago || new Date().toISOString().split('T')[0];

        const { rows } = await query(
            `INSERT INTO prestamos_pagos (prestamo_id, fecha_pago, monto_pago, forma_pago, observaciones)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.params.id, fechaPagoFinal, monto_pago, forma_pago, observaciones]
        );

        const prestamoRes = await query(`
      SELECT p.*, s.nombre1, s.apellido1, s.correo, s.documento, s.telefono, s.whatsapp_enabled,
             COALESCE(SUM(pp.monto_pago), 0) as total_pagado
      FROM prestamos p
      LEFT JOIN socios s ON p.socio_id = s.id
      LEFT JOIN prestamos_pagos pp ON pp.prestamo_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, s.nombre1, s.apellido1, s.correo, s.documento, s.telefono, s.whatsapp_enabled
    `, [req.params.id]);

        if (prestamoRes.rows.length > 0) {
            const prestamo = prestamoRes.rows[0];
            const montoTotal = Number(prestamo.monto_total) || Number(prestamo.monto);
            const totalPagado = Number(prestamo.total_pagado);

            const epsilon = 1.0;
            const isPaid = (totalPagado + epsilon) >= montoTotal;

            if (isPaid) {
                await query(
                    `UPDATE prestamos SET estado = 'PAGADO', updated_at = NOW() WHERE id = $1`,
                    [req.params.id]
                );
                prestamo.estado = 'PAGADO';
            }

            if (prestamo.correo) {
                const socio = {
                    id: prestamo.socio_id,
                    nombre1: prestamo.nombre1,
                    apellido1: prestamo.apellido1,
                    correo: prestamo.correo,
                    documento: prestamo.documento,
                    telefono: prestamo.telefono,
                    whatsapp_enabled: prestamo.whatsapp_enabled
                };
                sendLoanPaymentEmail(socio, prestamo, rows[0]).catch(err => console.error('❌ Error sending loan payment email:', err));
            }
        }

        return res.json({ ok: true, pago: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'No se pudo registrar pago' });
    }
};

const getPrestamoPagos = async (req, res) => {
    try {
        const { rows } = await query(
            'SELECT * FROM prestamos_pagos WHERE prestamo_id=$1 ORDER BY fecha_pago DESC',
            [req.params.id]
        );
        return res.json({ ok: true, pagos: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error interno' });
    }
};

const getPrestamoReceipt = async (req, res) => {
    try {
        const pagoId = req.params.id;

        const pagoRes = await query('SELECT * FROM prestamos_pagos WHERE id=$1', [pagoId]);
        if (!pagoRes.rows.length) return res.status(404).json({ ok: false, error: 'Abono no encontrado' });
        const pago = pagoRes.rows[0];

        const prestamoRes = await query('SELECT * FROM prestamos WHERE id=$1', [pago.prestamo_id]);
        const prestamo = prestamoRes.rows[0];

        const socioRes = await query('SELECT * FROM socios WHERE id=$1', [prestamo.socio_id]);
        const socio = socioRes.rows[0];

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=recibo_prestamo_${prestamo.id}_abono_${pago.id}.pdf`);

        const doc = generateLoanPaymentReceipt(pago, prestamo, socio);
        doc.pipe(res);
        doc.end();

    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error generando recibo' });
    }
};

module.exports = {
    getPrestamos,
    createPrestamo,
    getPrestamoById,
    updatePrestamo,
    deletePrestamo,
    registerPayment,
    getPrestamoPagos,
    getPrestamoReceipt
};
