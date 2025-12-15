const { query, pool } = require('../config/db');
const { sendRifaWinnerEmail } = require('../emailService');

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


const getTickets = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await query('SELECT * FROM rifa_numeros WHERE rifa_id = $1 ORDER BY numero', [id]);
        return res.json({ ok: true, tickets: rows });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error obteniendo tickets' });
    }
};

const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_cliente, estado, telefono_cliente } = req.body;

        const { rows } = await query(
            `UPDATE rifa_numeros 
             SET nombre_cliente = $1, estado = $2, telefono_cliente = $3
             WHERE id = $4 RETURNING *`,
            [nombre_cliente, estado, telefono_cliente, id]
        );

        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });

        return res.json({ ok: true, ticket: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error actualizando ticket' });
    }
};

const distributeTickets = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');

        // 1. Get Active Socios
        const sociosRes = await client.query("SELECT * FROM socios WHERE estado = 'ACTIVO'");
        const socios = sociosRes.rows;
        const totalSocios = socios.length;

        if (totalSocios === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ ok: false, error: 'No hay socios activos para repartir' });
        }

        // 2. Prepare numbers 00-99
        let numbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

        // 3. Shuffle numbers (Fisher-Yates)
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        // 4. Calculate distribution
        const ticketsPerSocio = Math.floor(100 / totalSocios);
        const remainder = 100 % totalSocios; // These go to 'La Natillera'

        // 5. Clear current assignments (set to DISPONIBLE first)
        // We might want to preserve PAID ones? User said "assign numbers for the first time", 
        // implies clean slate or only for unassigned. 
        // User also said "numbers once assigned don't change", but asked for a "reassign" button.
        // We will overwrite everything for "Reassign" as per request imply logic.
        await client.query("UPDATE rifa_numeros SET nombre_cliente = NULL, telefono_cliente = NULL, estado = 'DISPONIBLE' WHERE rifa_id = $1", [id]);

        // 6. Assign to Socios
        let numberIndex = 0;
        for (const socio of socios) {
            const socioName = `${socio.nombre1} ${socio.apellido1}`;
            for (let k = 0; k < ticketsPerSocio; k++) {
                const num = numbers[numberIndex++];
                await client.query(
                    `UPDATE rifa_numeros 
                     SET nombre_cliente = $1, telefono_cliente = $2, estado = 'RESERVADO' 
                     WHERE rifa_id = $3 AND numero = $4`,
                    [socioName, socio.telefono || '', id, num]
                );
            }
        }

        // 7. Assign Remainder to 'La Natillera'
        while (numberIndex < 100) {
            const num = numbers[numberIndex++];
            await client.query(
                `UPDATE rifa_numeros 
                 SET nombre_cliente = 'La Natillera', estado = 'RESERVADO' 
                 WHERE rifa_id = $1 AND numero = $2`,
                [id, num]
            );
        }

        await client.query('COMMIT');
        return res.json({ ok: true, message: 'Tickets distribuidos exitosamente' });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error distribuyendo tickets' });
    } finally {
        client.release();
    }
};
const getTicketsByDocument = async (req, res) => {
    try {
        const { documento } = req.params;

        // 1. Find Socio Name
        const socioRes = await query('SELECT * FROM socios WHERE documento = $1', [documento]);
        if (socioRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Socio no encontrado' });
        }

        const socio = socioRes.rows[0];
        const nombreCliente = `${socio.nombre1} ${socio.apellido1}`;

        // 2. Find Tickets by Name
        // Note: This matches exact name string. Ideally IDs should be used but based on current schema we use name.
        const ticketsRes = await query(`
            SELECT r.nombre as rifa_nombre, r.fecha_evento, rn.numero, rn.estado, rn.precio
            FROM rifa_numeros rn
            JOIN rifas r ON rn.rifa_id = r.id
            WHERE rn.nombre_cliente = $1
            ORDER BY r.fecha_evento DESC, rn.numero
        `, [nombreCliente]);

        return res.json({
            ok: true,
            socio: { nombre: nombreCliente, documento: socio.documento },
            tickets: ticketsRes.rows
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error consultando tickets' });
    }
};

const markWinner = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero } = req.body;

        // 1. Update Rifa with winning number
        const { rows } = await query(
            'UPDATE rifas SET numero_ganador = $1 WHERE id = $2 RETURNING *',
            [numero, id]
        );

        if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Rifa no encontrada' });
        const rifa = rows[0];

        // 2. Find the winner ticket
        const ticketRes = await query(
            'SELECT * FROM rifa_numeros WHERE rifa_id = $1 AND numero = $2',
            [id, numero]
        );

        if (ticketRes.rows.length > 0) {
            const ticket = ticketRes.rows[0];
            // 3. Find Socio by Phone if available (most reliable link we currently have)
            if (ticket.telefono_cliente) {
                const socioRes = await query('SELECT * FROM socios WHERE telefono = $1', [ticket.telefono_cliente]);
                if (socioRes.rows.length > 0) {
                    const socio = socioRes.rows[0];
                    console.log(`🏆 Found winner socio: ${socio.nombre1} ${socio.apellido1} (${socio.correo})`);

                    // 4. Send Email (async, don't block response)
                    sendRifaWinnerEmail(socio, rifa, numero).catch(e => console.error('Error sending email async:', e));
                }
            }
        }

        return res.json({ ok: true, rifa });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error registrando ganador' });
    }
};

module.exports = {
    createRifa,
    getRifas,
    getTickets,
    updateTicket,
    distributeTickets,
    getTicketsByDocument,
    markWinner
};
