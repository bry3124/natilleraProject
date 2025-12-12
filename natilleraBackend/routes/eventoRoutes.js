const express = require('express');
const router = express.Router();
const controller = require('../controllers/eventoController');

router.get('/', controller.getEventos);
router.post('/', controller.createEvento);
router.get('/:id', controller.getEventoById);
router.put('/:id', controller.updateEvento);
router.delete('/:id', controller.deleteEvento);

module.exports = router;
