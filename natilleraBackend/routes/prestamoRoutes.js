const express = require('express');
const router = express.Router();
const controller = require('../controllers/prestamoController');

router.get('/', controller.getPrestamos);
router.post('/', controller.createPrestamo);
router.get('/:id', controller.getPrestamoById);
router.put('/:id', controller.updatePrestamo);
router.delete('/:id', controller.deletePrestamo);

// Nested payment routes
router.post('/:id/pagos', controller.registerPayment);
router.get('/:id/pagos', controller.getPrestamoPagos);

// Receipt route - Note: server.js had /api/prestamos/pagos/:id/recibo
// So we need to handle that structure.
// Since this router is likely mounted at /api/prestamos
// We can add a route for 'pagos/:id/recibo' BUT the ID in the URL is the PAGO ID, not the Prestamo ID.
// This creates a conflict if mounted under /api/prestamos/:id/...
// The original route was /api/prestamos/pagos/:id/recibo (where :id is pago id).
// To keep it clean, I will mount this specific route here, but it matches /pagos/:id/recibo which 
// might conflict if I had /:id/pagos (which I do).
// Express matches top-down.
// I will add `router.get('/pagos/:id/recibo', ...)` BEFORE `router.get('/:id', ...)` to avoid valid ID check issues? 
// No, 'pagos' is a literal, so it will match before :id parameter if defined first.

router.get('/pagos/:id/recibo', controller.getPrestamoReceipt);

module.exports = router;
