// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// =====================
// CONFIGURACIÓN DB
// =====================
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bd_natillera',
  password: 'maderas2025',
  port: 5432,
});

// =====================
// RUTAS: SOCIOS
// =====================

// Crear socio
app.post('/api/socios', async (req, res) => {
  try {
    const { documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url } = req.body;

    if (!documento || !nombre1 || !apellido1) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' });
    }

    // Validar documento único
    const exists = await pool.query('SELECT id FROM socios WHERE documento=$1', [documento]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'El documento ya está registrado' });
    }

    const result = await pool.query(
      `INSERT INTO socios
      (documento,nombre1,nombre2,apellido1,apellido2,correo,telefono,foto_url,firma_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [documento,nombre1,nombre2,apellido1,apellido2,correo,telefono,foto_url,firma_url]
    );

    res.json({ ok: true, socio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

// Listar socios
app.get('/api/socios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM socios ORDER BY id ASC');
    res.json({ ok: true, socios: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Obtener socio por id
app.get('/api/socios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM socios WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, error: 'No encontrado' });
    res.json({ ok: true, socio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Editar socio
app.put('/api/socios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { documento, nombre1, nombre2, apellido1, apellido2, correo, telefono, foto_url, firma_url } = req.body;

    if (!documento || !nombre1 || !apellido1) {
      return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' });
    }

    // Validar documento único
    const exists = await pool.query('SELECT id FROM socios WHERE documento=$1 AND id<>$2', [documento, id]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'El documento ya está registrado' });
    }

    const result = await pool.query(
      `UPDATE socios SET
        documento=$1, nombre1=$2, nombre2=$3, apellido1=$4, apellido2=$5,
        correo=$6, telefono=$7, foto_url=$8, firma_url=$9
       WHERE id=$10 RETURNING *`,
      [documento,nombre1,nombre2,apellido1,apellido2,correo,telefono,foto_url,firma_url,id]
    );

    res.json({ ok: true, socio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

// Inhabilitar socio
app.put('/api/socios/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const result = await pool.query(
      `UPDATE socios SET estado=$1, inhabilitado_en=now() WHERE id=$2 RETURNING *`,
      [estado, id]
    );

    res.json({ ok: true, socio: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// =====================
// RUTAS: PAGOS
// =====================

// Obtener pagos de un socio
app.get('/api/socios/:id/pagos', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM pagos WHERE socio_id=$1 ORDER BY semana ASC`,
      [id]
    );
    res.json({ ok: true, pagos: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Registrar/editar pago
app.put('/api/pagos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado, usuario } = req.body;

    // Guardar historial antes de actualizar
    const pagoActual = await pool.query('SELECT * FROM pagos WHERE id=$1', [id]);
    if (pagoActual.rows.length === 0) return res.status(404).json({ ok: false, error: 'Pago no encontrado' });

    await pool.query(
      `INSERT INTO pagos_historial (pago_id, socio_id, semana, cambios, usuario)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        id,
        pagoActual.rows[0].socio_id,
        pagoActual.rows[0].semana,
        JSON.stringify(pagoActual.rows[0]),
        usuario || 'Sistema'
      ]
    );

    const result = await pool.query(
      `UPDATE pagos SET fecha_pago=$1, forma_pago=$2, valor=$3, nombre_pagador=$4, firma_recibe=$5, estado=$6
       WHERE id=$7 RETURNING *`,
      [fecha_pago, forma_pago, valor, nombre_pagador, firma_recibe, estado, id]
    );

    res.json({ ok: true, pago: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// =====================
// RUTAS: RIFAS
// =====================

// Crear rifa
app.post('/api/rifas', async (req, res) => {
  try {
    const { nombre, descripcion, fecha_evento, frecuencia } = req.body;

    const result = await pool.query(
      `INSERT INTO rifas (nombre, descripcion, fecha_evento, frecuencia)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre, descripcion, fecha_evento, frecuencia]
    );

    res.json({ ok: true, rifa: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// Listar rifas
app.get('/api/rifas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rifas ORDER BY fecha_evento ASC');
    res.json({ ok: true, rifas: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// =====================
// START SERVER
// =====================
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
