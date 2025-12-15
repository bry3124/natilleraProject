const { query } = require('../config/db');

const getSummary = async (req, res) => {
    try {
        // Random 5-10 socios
        const randomCount = Math.floor(Math.random() * 6) + 5;
        const sociosRes = await query(`
      SELECT s.*, COALESCE(SUM(p.valor), 0) as total_ahorrado
      FROM socios s
      LEFT JOIN pagos p ON p.socio_id = s.id
      WHERE s.estado = 'ACTIVO'
      GROUP BY s.id
      ORDER BY RANDOM()
      LIMIT $1
    `, [randomCount]);

        // Last 5 eventos
        const eventosRes = await query(`
      SELECT * FROM eventos
      ORDER BY fecha DESC, created_at DESC
      LIMIT 5
    `);

        // Random pending prestamos
        const prestamosRes = await query(`
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

        // Stats calculations
        const statsRes = await query(`
            SELECT 
                (SELECT COUNT(*) FROM socios WHERE estado = 'ACTIVO') as total_socios,
                (SELECT COUNT(*) FROM eventos WHERE estado = 'UPCOMING') as eventos_proximos,
                (SELECT COUNT(*) FROM prestamos WHERE estado = 'PENDIENTE') as prestamos_pendientes,
                (SELECT COALESCE(SUM(valor), 0) FROM pagos WHERE estado = 'PAGADO') as total_ahorrado
        `);
        const stats = statsRes.rows[0];

        return res.json({
            ok: true,
            stats: {
                total_socios: parseInt(stats.total_socios),
                eventos_proximos: parseInt(stats.eventos_proximos),
                prestamos_pendientes: parseInt(stats.prestamos_pendientes),
                total_ahorrado: parseFloat(stats.total_ahorrado)
            },
            socios: sociosRes.rows,
            eventos: eventosRes.rows,
            prestamos: prestamosRes.rows
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error cargando dashboard' });
    }
};

module.exports = {
    getSummary
};
