const express = require('express');
const router = express.Router();
const controller = require('../controllers/pagoController');

router.post('/', controller.createOrUpdatePago); // POST /api/pagos
router.put('/:id', controller.updatePago);       // PUT /api/pagos/:id
router.get('/:id/recibo', controller.getReceipt); // GET /api/pagos/:id/recibo

// Note: getPagosBySocioId is typically mounted under specific route or handled here?
// In server.js it was GET /api/socios/:id/pagos.
// We should probably route this in socioRoutes.js OR handle it in router logic.
// For MVC purity, resources usually have their own routes.
// However, since we are splitting by resource, this route "belongs" to Pagos resource but accessed via Socio ID.
// Option 1: Keep it in socioRoutes.js and call PagoController. (Better for URL structure consistency in file)
// Option 2: Put it here as /socios/:id (Bad)
// I will export getPagosBySocioId and use it in socioRoutes.js. 
// Adding it here would require the route to be /api/pagos/socios/:id which changes API.
// So I will NOT add it to this file's default exports for the router, but expose the controller function.

module.exports = router;
