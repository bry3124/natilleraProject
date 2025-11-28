// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

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
    if (!['ACTIVO','INHABILITADO'].includes(estado)) return res.status(400).json({ ok:false, error:'Estado inválido' });
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
    if (!antes.rows.length) return res.status(404).json({ ok:false, error:'Pago no encontrado' });

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

    return res.json({ ok: true, pago: rows[0] });
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
    if (isNaN(sNum) || sNum < 1 || sNum > 52) return res.status(400).json({ ok:false, error:'Semana inválida (1-52)' });

    // Verificar socio existe
    const socioQ = await pool.query('SELECT id FROM socios WHERE id=$1', [socio_id]);
    if (!socioQ.rows.length) return res.status(404).json({ ok:false, error:'Socio no encontrado' });

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

    return res.json({ ok: true, pago });
  } catch (e) {
    return handleError(res, e, 'No se pudo crear/actualizar pago');
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
    for (let i=0;i<100;i++){
      const num = i.toString().padStart(2,'0');
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

// ----------------- START -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
