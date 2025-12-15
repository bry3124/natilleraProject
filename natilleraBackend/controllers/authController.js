
const { query } = require('../config/db');
// In a real app, use bcrypt. For this "basic auth" request and MVP, we will use simple strings or basic hashing if available.
// Given no bcrypt installed and restriction on installing packages unless critical, we will use simple string compare for now 
// but warn about it. 
// "admin123" is the default.

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Simple manual check
        const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
        }

        const user = rows[0];

        // Security Warning: In production use bcrypt.compare(password, user.password)
        if (password !== user.password) {
            return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
        }

        // Generate a simple token (in real app use jwt)
        // Since we don't have jsonwebtoken package in the list (I checked package.json earlier but list_dir didn't show node_modules content, but server.js didn't require it)
        // I will implement a simple session-like token or just return success with user info for frontend to store state.
        // Actually, let's just return a "token" which is base64 of user id + random

        const token = Buffer.from(`${user.id}-${Date.now()}`).toString('base64');

        return res.json({
            ok: true,
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error de servidor' });
    }
};

const register = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if exists
        const check = await query('SELECT id FROM users WHERE username=$1', [username]);
        if (check.rows.length) return res.status(400).json({ ok: false, error: 'Usuario ya existe' });

        const { rows } = await query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, role',
            [username, password]
        );

        return res.json({ ok: true, user: rows[0] });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: 'Error creando usuario' });
    }
};

module.exports = { login, register };
