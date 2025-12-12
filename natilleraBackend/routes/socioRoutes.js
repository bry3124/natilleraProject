const express = require('express');
const router = express.Router();
const controller = require('../controllers/socioController');
const pagoController = require('../controllers/pagoController');

router.get('/', controller.getSocios);
router.post('/', controller.createSocio);
router.get('/:id', controller.getSocioById);
router.put('/:id', controller.updateSocio);
router.put('/:id/estado', controller.updateSocioStatus);

// Payment routes nested under socios
router.get('/:id/pagos', pagoController.getPagosBySocioId);

module.exports = router;
