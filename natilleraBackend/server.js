// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { sendWeeklyPaymentEmail, sendLoanPaymentEmail, sendLoanCreationEmail } = require('./emailService');
const { generateWeeklyReceipt, generateLoanPaymentReceipt } = require('./receiptService');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bd_natillera',
  password: process.env.DB_PASS || 'maderas2025',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

// ----------------- HELPERS -----------------
async function crear52Pagos(socioId) {
  // Inserta 52 filas (semana 1..52) si no existen
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

function handleError(res, e, msg = 'Error interno') {
  console.error(e);
  return res.status(500).json({ ok: false, error: msg });
}

// ----------------- SOCIOS -----------------

// Crear socio + generar 52 pagos
app.post('/api/socios', async (req, res) => {
  try {
    const {
      documento,
      nombre1,
      nombre2,
      apellido1,
      apellido2,
      correo,
      telefono,
      foto_url,
      firma_url,
    } = req.body;

    if (!documento || !nombre1 || !apellido1) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    // validar documento único
    const exists = await pool.query('SELECT id FROM socios WHERE documento=$1', [documento]);
    if (exists.rows.length) {
      return res.status(400).json({ ok: false, error: 'Documento ya registrado' });
    }

    const insert = await pool.query(
      `INSERT INTO socios (documento,nombre1,nombre2,apellido1,apellido2,correo,telefono,foto_url,firma_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url]
    );

    const socio = insert.rows[0];

    // crear 52 pagos iniciales
    await crear52Pagos(socio.id);

    return res.json({ ok: true, socio });
  } catch (e) {
    return handleError(res, e, 'No se pudo crear socio');
  }
});

// Listar socios (con búsqueda simple opcional)
app.get('/api/socios', async (req, res) => {
  try {
    const { search, status } = req.query;

    // Base de la consulta: tomamos socios y sumamos pagos.valor
    let q = `
      SELECT s.*,
             COALESCE(SUM(p.valor), 0) AS total_ahorrado
      FROM socios s
      LEFT JOIN pagos p ON p.socio_id = s.id
    `;

    const where = [];
    const params = [];

    // filtros (añadimos condiciones sobre la tabla "s")
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

    if (where.length) {
      q += ' WHERE ' + where.join(' AND ');
    }

    // Agrupamos por la PK para poder usar SUM(p.valor)
    q += ' GROUP BY s.id';

    // Orden (puedes cambiar por nombre u otro campo)
    q += ' ORDER BY s.id ASC';

    const { rows } = await pool.query(q, params);

    return res.json({ ok: true, socios: rows });
  } catch (e) {
    return handleError(res, e, 'No se pudieron listar socios');
  }
});


// Obtener 1 socio
app.get('/api/socios/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM socios WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Socio no encontrado' });
    return res.json({ ok: true, socio: rows[0] });
  } catch (e) {
    return handleError(res, e);
  }
});

// Editar socio
app.put('/api/socios/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url } = req.body;

    if (!documento || !nombre1 || !apellido1) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    // verificar documento no usado por otro
    const existOtros = await pool.query('SELECT id FROM socios WHERE documento=$1 AND id<>$2', [documento, id]);
    if (existOtros.rows.length) {
      return res.status(400).json({ ok: false, error: 'Documento ya registrado por otro socio' });
    }

    const { rows } = await pool.query(
      `UPDATE socios SET documento=$1,nombre1=$2,nombre2=$3,apellido1=$4,apellido2=$5,correo=$6,telefono=$7,foto_url=$8,firma_url=$9
       WHERE id=$10 RETURNING *`,
      [documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url, id]
    );

    return res.json({ ok: true, socio: rows[0] });
  } catch (e) {
    return handleError(res, e, 'No se pudo actualizar socio');
  }
});

// Cambiar estado (ACTIVO / INHABILITADO)
app.put('/api/socios/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['ACTIVO', 'INHABILITADO'].includes(estado)) return res.status(400).json({ ok: false, error: 'Estado inválido' });
    const { rows } = await pool.query('UPDATE socios SET estado=$1, inhabilitado_en = (CASE WHEN $1=$2 THEN now() ELSE NULL END) WHERE id=$3 RETURNING *', [estado, 'INHABILITADO', req.params.id]);
    return res.json({ ok: true, socio: rows[0] });
  } catch (e) {
    return handleError(res, e, 'No se pudo cambiar estado');
  }
});

// ----------------- PAGOS -----------------

// Obtener pagos por socio (espera 52 registros si fueron creados)
app.get('/api/socios/:id/pagos', async (req, res) => {
  try {
    const socioId = req.params.id;
    const { rows } = await pool.query('SELECT * FROM pagos WHERE socio_id=$1 ORDER BY semana', [socioId]);
    // si no hay filas -> crear 52 y reconsultar
    if (rows.length === 0) {
      await crear52Pagos(socioId);
      const r2 = await pool.query('SELECT * FROM pagos WHERE socio_id=$1 ORDER BY semana', [socioId]);
      return res.json({ ok: true, pagos: r2.rows });
    }
    return res.json({ ok: true, pagos: rows });
  } catch (e) {
    return handleError(res, e, 'No se pudieron obtener pagos');
  }
});

// Actualizar pago existente (PUT)
app.put('/api/pagos/:id', async (req, res) => {
  try {
    const pagoId = req.params.id;
    const { fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado, usuario } = req.body;

    // guardar historial (antes)
    const antes = await pool.query('SELECT * FROM pagos WHERE id=$1', [pagoId]);
    if (!antes.rows.length) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });

    await pool.query(
      `INSERT INTO pagos_historial (pago_id, socio_id, semana, cambios, usuario)
       VALUES ($1,$2,$3,$4,$5)`,
      [pagoId, antes.rows[0].socio_id, antes.rows[0].semana, JSON.stringify(antes.rows[0]), usuario || 'SYSTEM']
    );

    const { rows } = await pool.query(
      `UPDATE pagos SET fecha_pago=$1, forma_pago=$2, valor=$3, nombre_pagador=$4, firma_recibe=$5, estado=$6
       WHERE id=$7 RETURNING *`,
      [fecha_pago || null, forma_pago || null, valor || null, nombre_pagador || null, firma_recibe || null, estado || antes.rows[0].estado, pagoId]
    );

    const pago = rows[0];

    // Send email notification if payment was successful and has value
    const valorNum = parseFloat(pago.valor);
    console.log(`[PUT] Payment update: ID=${pago.id}, State=${pago.estado}, Val=${valorNum}`);

    if (pago.estado === 'PAGADO' && valorNum > 0) {
      // Get socio information
      const socioRes = await pool.query('SELECT * FROM socios WHERE id=$1', [pago.socio_id]);
      if (socioRes.rows.length > 0) {
        const socio = socioRes.rows[0];
        if (socio.correo) {
          console.log(`[PUT] Sending email to ${socio.correo} for payment ${pago.id}`);
          // Send email asynchronously (don't wait for it)
          sendWeeklyPaymentEmail(socio, pago).catch(err => {
            console.error('Error sending payment email:', err);
          });
        } else {
          console.log(`[PUT] Socio ${socio.id} has no email. Skipping notification.`);
        }
      }
    }

    return res.json({ ok: true, pago });
  } catch (e) {
    return handleError(res, e, 'No se pudo actualizar pago');
  }
});

// NEW: Crear/Upsert pago (POST /api/pagos)
// Permite crear un pago para un socio y semana.
// Si ya existe la fila (unique socio_id, semana) hace UPDATE (upsert).
app.post('/api/pagos', async (req, res) => {
  try {
    const { socio_id, semana, fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado, usuario } = req.body;

    if (!socio_id || !semana) return res.status(400).json({ ok: false, error: 'Faltan socio_id o semana' });
    const sNum = Number(semana);
    if (isNaN(sNum) || sNum < 1 || sNum > 52) return res.status(400).json({ ok: false, error: 'Semana inválida (1-52)' });

    // Verificar socio existe
    const socioQ = await pool.query('SELECT id FROM socios WHERE id=$1', [socio_id]);
    if (!socioQ.rows.length) return res.status(404).json({ ok: false, error: 'Socio no encontrado' });

    // Upsert: insert or update
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
      socio_id,
      sNum,
      fecha_pago || null,
      forma_pago || null,
      valor || null,
      nombre_pagador || null,
      firma_recibe || null,
      estado || 'PENDIENTE'
    ];

    const { rows } = await pool.query(q, params);
    const pago = rows[0];

    // Si hubo fila previa y fue actualización, registra historial
    // Intentamos obtener antes para comparar (opcional)
    // Para simplificar: insertamos entrada de historial indicando la acción
    await pool.query(
      `INSERT INTO pagos_historial (pago_id, socio_id, semana, cambios, usuario)
       VALUES ($1,$2,$3,$4,$5)`,
      [pago.id, pago.socio_id, pago.semana, JSON.stringify({ action: 'UPSERT', data: pago }), usuario || 'SYSTEM']
    );

    // Send email notification if payment was successful and has value
    const valorNum = parseFloat(pago.valor);
    console.log(`[POST] Payment upsert: ID=${pago.id}, State=${pago.estado}, Val=${valorNum}`);

    if (pago.estado === 'PAGADO' && valorNum > 0) {
      // Get socio information
      const socioRes = await pool.query('SELECT * FROM socios WHERE id=$1', [pago.socio_id]);
      if (socioRes.rows.length > 0) {
        const socio = socioRes.rows[0];
        if (socio.correo) {
          console.log(`[POST] Sending email to ${socio.correo} for payment ${pago.id}`);
          // Send email asynchronously (don't wait for it)
          sendWeeklyPaymentEmail(socio, pago).catch(err => {
            console.error('Error sending payment email:', err);
          });
        } else {
          console.log(`[POST] Socio ${socio.id} has no email. Skipping notification.`);
        }
      }
    }

    return res.json({ ok: true, pago });
  } catch (e) {
    return handleError(res, e, 'No se pudo crear/actualizar pago');
  }
});

// Descargar Recibo de Pago (Semanal)
app.get('/api/pagos/:id/recibo', async (req, res) => {
  try {
    const pagoId = req.params.id;
    // Get payment and socio info
    const pagoRes = await pool.query('SELECT * FROM pagos WHERE id=$1', [pagoId]);
    if (!pagoRes.rows.length) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });

    const pago = pagoRes.rows[0];
    const socioRes = await pool.query('SELECT * FROM socios WHERE id=$1', [pago.socio_id]);
    const socio = socioRes.rows[0];

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_semana_${pago.semana}_${socio.documento}.pdf`);

    const doc = generateWeeklyReceipt(pago, socio);
    doc.pipe(res);
    doc.end();

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Error generando recibo' });
  }
});

// ----------------- RIFAS (básico) -----------------
app.post('/api/rifas', async (req, res) => {
  try {
    const { nombre, descripcion, fecha_evento, frecuencia } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO rifas (nombre, descripcion, fecha_evento, frecuencia) VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre, descripcion, fecha_evento, frecuencia || null]
    );
    const rifa = rows[0];
    // crear 00..99 en rifa_numeros
    const inserts = [];
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      inserts.push(pool.query('INSERT INTO rifa_numeros (rifa_id, numero, precio) VALUES ($1,$2,$3)', [rifa.id, num, 20]));
    }
    await Promise.all(inserts);
    return res.json({ ok: true, rifa });
  } catch (e) {
    return handleError(res, e, 'No se pudo crear rifa');
  }
});

app.get('/api/rifas', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rifas ORDER BY fecha_evento DESC');
    return res.json({ ok: true, rifas: rows });
  } catch (e) { return handleError(res, e); }
});

// ----------------- EVENTOS -----------------
app.get('/api/eventos', async (req, res) => {
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

    const { rows } = await pool.query(q, params);
    return res.json({ ok: true, eventos: rows });
  } catch (e) { return handleError(res, e, 'No se pudieron listar eventos'); }
});

app.post('/api/eventos', async (req, res) => {
  try {
    const { nombre, descripcion, fecha, tipo, estado } = req.body;
    if (!nombre || !fecha) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO eventos (nombre, descripcion, fecha, tipo, estado)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, descripcion, fecha, tipo || 'GENERAL', estado || 'UPCOMING']
    );

    return res.json({ ok: true, evento: rows[0] });
  } catch (e) { return handleError(res, e, 'No se pudo crear evento'); }
});

app.get('/api/eventos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM eventos WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Evento no encontrado' });
    return res.json({ ok: true, evento: rows[0] });
  } catch (e) { return handleError(res, e); }
});

app.put('/api/eventos/:id', async (req, res) => {
  try {
    const { nombre, descripcion, fecha, tipo, estado } = req.body;
    if (!nombre || !fecha) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    const { rows } = await pool.query(
      `UPDATE eventos SET nombre=$1, descripcion=$2, fecha=$3, tipo=$4, estado=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [nombre, descripcion, fecha, tipo, estado, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ ok: false, error: 'Evento no encontrado' });
    return res.json({ ok: true, evento: rows[0] });
  } catch (e) { return handleError(res, e, 'No se pudo actualizar evento'); }
});

app.delete('/api/eventos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM eventos WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Evento no encontrado' });
    return res.json({ ok: true, evento: rows[0] });
  } catch (e) { return handleError(res, e, 'No se pudo eliminar evento'); }
});

// ----------------- PRESTAMOS -----------------
app.get('/api/prestamos', async (req, res) => {
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

    const { rows } = await pool.query(q, params);
    return res.json({ ok: true, prestamos: rows });
  } catch (e) { return handleError(res, e, 'No se pudieron listar préstamos'); }
});

app.post('/api/prestamos', async (req, res) => {
  try {
    const { socio_id, monto, tasa_interes, plazo_meses, fecha_vencimiento, observaciones } = req.body;

    if (!socio_id || !monto) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    // Verify socio exists
    const socioQ = await pool.query('SELECT id FROM socios WHERE id=$1', [socio_id]);
    if (!socioQ.rows.length) {
      return res.status(404).json({ ok: false, error: 'Socio no encontrado' });
    }

    // Auto-set fecha_aprobacion to current date
    const today = new Date();
    const fechaAprobacion = today.toISOString().split('T')[0];

    // Auto-calculate fecha_vencimiento if not provided
    let fechaVencimiento = fecha_vencimiento;
    if (!fechaVencimiento && plazo_meses) {
      const vencimiento = new Date(today);
      vencimiento.setMonth(vencimiento.getMonth() + parseInt(plazo_meses || 12));
      fechaVencimiento = vencimiento.toISOString().split('T')[0];
    }

    // Calculate monto_total with interest (simple interest formula)
    // Formula: monto_total = monto * (1 + tasa_interes/100)
    const tasaDecimal = parseFloat(tasa_interes || 0) / 100;
    const montoTotal = parseFloat(monto) * (1 + tasaDecimal);

    const { rows } = await pool.query(
      `INSERT INTO prestamos (socio_id, monto, tasa_interes, plazo_meses, fecha_aprobacion, fecha_vencimiento, monto_total, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [socio_id, monto, tasa_interes || 0, plazo_meses || 12, fechaAprobacion, fechaVencimiento, montoTotal, observaciones]
    );

    const prestamo = rows[0];

    // Notification Logic (Non-blocking)
    (async () => {
      try {
        const socioResult = await pool.query('SELECT * FROM socios WHERE id = $1', [socio_id]);
        if (socioResult.rows.length > 0) {
          await sendLoanCreationEmail(socioResult.rows[0], prestamo);
        }
      } catch (err) {
        console.error('⚠️ Failed to send loan creation email (background):', err.message);
      }
    })();

    return res.json({ ok: true, prestamo });
  } catch (e) { return handleError(res, e, 'No se pudo crear préstamo'); }
});

app.get('/api/prestamos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
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
  } catch (e) { return handleError(res, e); }
});

app.put('/api/prestamos/:id', async (req, res) => {
  try {
    const { monto, tasa_interes, plazo_meses, fecha_aprobacion, fecha_vencimiento, estado, observaciones } = req.body;

    // Recalculate monto_total with interest
    const tasaDecimal = parseFloat(tasa_interes || 0) / 100;
    const montoTotal = parseFloat(monto) * (1 + tasaDecimal);

    const { rows } = await pool.query(
      `UPDATE prestamos 
       SET monto=$1, tasa_interes=$2, plazo_meses=$3, fecha_aprobacion=$4, 
           fecha_vencimiento=$5, estado=$6, monto_total=$7, observaciones=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [monto, tasa_interes, plazo_meses, fecha_aprobacion, fecha_vencimiento, estado, montoTotal, observaciones, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ ok: false, error: 'Préstamo no encontrado' });
    return res.json({ ok: true, prestamo: rows[0] });
  } catch (e) { return handleError(res, e, 'No se pudo actualizar préstamo'); }
});

app.delete('/api/prestamos/:id', async (req, res) => {
  try {
    console.log('🗑️  DELETE request received for prestamo ID:', req.params.id);

    const { rows } = await pool.query('DELETE FROM prestamos WHERE id=$1 RETURNING *', [req.params.id]);

    console.log('📊 Delete result:', rows.length > 0 ? 'SUCCESS' : 'NOT FOUND');
    if (rows.length > 0) {
      console.log('✅ Deleted prestamo:', rows[0].id, '-', rows[0].monto);
    }

    if (!rows.length) return res.status(404).json({ ok: false, error: 'Préstamo no encontrado' });
    return res.json({ ok: true, prestamo: rows[0] });
  } catch (e) {
    console.error('❌ Error deleting prestamo:', e.message);
    return handleError(res, e, 'No se pudo eliminar préstamo');
  }
});

// Register payment for a loan
app.post('/api/prestamos/:id/pagos', async (req, res) => {
  try {
    const { fecha_pago, monto_pago, forma_pago, observaciones } = req.body;

    if (!monto_pago || monto_pago <= 0) {
      return res.status(400).json({ ok: false, error: 'Monto de pago requerido y debe ser mayor a 0' });
    }

    // Check if loan is already fully paid and validate amount
    const loanCheck = await pool.query(`
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

    // Validate that payment amount does not exceed pending balance (with 1 peso tolerance)
    if (parseFloat(monto_pago) > (saldoPendiente + 1)) {
      return res.status(400).json({
        ok: false,
        error: `El monto del abono excede el saldo pendiente ($${Math.round(saldoPendiente)}).`
      });
    }

    // Auto-set fecha_pago to current date if not provided
    const fechaPagoFinal = fecha_pago || new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `INSERT INTO prestamos_pagos (prestamo_id, fecha_pago, monto_pago, forma_pago, observaciones)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, fechaPagoFinal, monto_pago, forma_pago, observaciones]
    );

    // Check if loan is fully paid and update status to PAGADO
    const prestamoRes = await pool.query(`
      SELECT p.*, s.nombre1, s.apellido1, s.correo, s.documento,
             COALESCE(SUM(pp.monto_pago), 0) as total_pagado
      FROM prestamos p
      LEFT JOIN socios s ON p.socio_id = s.id
      LEFT JOIN prestamos_pagos pp ON pp.prestamo_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, s.nombre1, s.apellido1, s.correo, s.documento
    `, [req.params.id]);

    if (prestamoRes.rows.length > 0) {
      const prestamo = prestamoRes.rows[0];
      const montoTotal = Number(prestamo.monto_total) || Number(prestamo.monto);
      const totalPagado = Number(prestamo.total_pagado);

      // Use epsilon for float comparison to avoid rounding errors
      const epsilon = 1.0; // Tolerance of 1 peso
      const isPaid = (totalPagado + epsilon) >= montoTotal;

      console.log(`💰 Loan Payment Check [ID ${prestamo.id}]: Total=${montoTotal.toFixed(2)}, Paid=${totalPagado.toFixed(2)}, IsPaid=${isPaid}`);

      // If the loan is fully paid, update status to PAGADO
      if (isPaid) {
        console.log(`✅ Marking loan ${prestamo.id} as PAGADO`);
        await pool.query(
          `UPDATE prestamos SET estado = 'PAGADO', updated_at = NOW() WHERE id = $1`,
          [req.params.id]
        );
        prestamo.estado = 'PAGADO'; // Update local object for email
      }

      // Send email notification if socio has email
      if (prestamo.correo) {
        console.log(`📧 Sending payment email to ${prestamo.correo} for Loan ${prestamo.id}`);
        const socio = {
          nombre1: prestamo.nombre1,
          apellido1: prestamo.apellido1,
          correo: prestamo.correo,
          documento: prestamo.documento
        };

        // Send email asynchronously (don't wait for it)
        sendLoanPaymentEmail(socio, prestamo, rows[0]).catch(err => {
          console.error('❌ Error sending loan payment email:', err);
        });
      } else {
        console.warn(`⚠️ No email found for socio in loan ${prestamo.id}, skipping notification.`);
      }
    }

    return res.json({ ok: true, pago: rows[0] });
  } catch (e) { return handleError(res, e, 'No se pudo registrar pago'); }
});

// Get payments for a loan
app.get('/api/prestamos/:id/pagos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM prestamos_pagos WHERE prestamo_id=$1 ORDER BY fecha_pago DESC',
      [req.params.id]
    );
    return res.json({ ok: true, pagos: rows });
  } catch (e) { return handleError(res, e); }
});

// Descargar Recibo de Abono a Préstamo
app.get('/api/prestamos/pagos/:id/recibo', async (req, res) => {
  try {
    const pagoId = req.params.id;

    // Get pago info
    const pagoRes = await pool.query('SELECT * FROM prestamos_pagos WHERE id=$1', [pagoId]);
    if (!pagoRes.rows.length) return res.status(404).json({ ok: false, error: 'Abono no encontrado' });
    const pago = pagoRes.rows[0];

    // Get prestamo info
    const prestamoRes = await pool.query('SELECT * FROM prestamos WHERE id=$1', [pago.prestamo_id]);
    const prestamo = prestamoRes.rows[0];

    // Get socio info
    const socioRes = await pool.query('SELECT * FROM socios WHERE id=$1', [prestamo.socio_id]);
    const socio = socioRes.rows[0];

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_prestamo_${prestamo.id}_abono_${pago.id}.pdf`);

    const doc = generateLoanPaymentReceipt(pago, prestamo, socio);
    doc.pipe(res);
    doc.end();

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Error generando recibo' });
  }
});

// ----------------- DASHBOARD -----------------
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // Get random 5-10 socios
    const randomCount = Math.floor(Math.random() * 6) + 5; // 5 to 10
    const sociosRes = await pool.query(`
      SELECT s.*, COALESCE(SUM(p.valor), 0) as total_ahorrado
      FROM socios s
      LEFT JOIN pagos p ON p.socio_id = s.id
      WHERE s.estado = 'ACTIVO'
      GROUP BY s.id
      ORDER BY RANDOM()
      LIMIT $1
    `, [randomCount]);

    // Get last 5 eventos
    const eventosRes = await pool.query(`
      SELECT * FROM eventos
      ORDER BY fecha DESC, created_at DESC
      LIMIT 5
    `);

    // Get random pending prestamos
    const prestamosRes = await pool.query(`
      SELECT p.*, 
             s.nombre1, s.apellido1, s.documento,
             COALESCE(SUM(pp.monto_pago), 0) as total_pagado
      FROM prestamos p
      LEFT JOIN socios s ON p.socio_id = s.id
      LEFT JOIN prestamos_pagos pp ON pp.prestamo_id = p.id
      WHERE p.estado = 'PENDIENTE'
      GROUP BY p.id, s.nombre1, s.apellido1, s.documento
      ORDER BY RANDOM()
      LIMIT 10
    `);

    // Get stats
    const statsRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM socios WHERE estado = 'ACTIVO') as total_socios,
        (SELECT COUNT(*) FROM eventos WHERE estado = 'UPCOMING') as eventos_proximos,
        (SELECT COUNT(*) FROM prestamos WHERE estado = 'PENDIENTE') as prestamos_pendientes,
        (SELECT COALESCE(SUM(valor), 0) FROM pagos WHERE estado = 'PAGADO') as total_ahorrado
    `);

    return res.json({
      ok: true,
      socios: sociosRes.rows,
      eventos: eventosRes.rows,
      prestamos: prestamosRes.rows,
      stats: statsRes.rows[0]
    });
  } catch (e) { return handleError(res, e, 'No se pudo obtener resumen del dashboard'); }
});

// ----------------- START -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
