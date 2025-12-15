const express = require('express');
const router = express.Router();
const controller = require('../controllers/rifaController');

router.get('/', controller.getRifas);
router.post('/', controller.createRifa);
router.get('/:id/tickets', controller.getTickets);
router.put('/tickets/:id', controller.updateTicket);
router.post('/:id/distribute', controller.distributeTickets);
router.get('/tickets-by-doc/:documento', controller.getTicketsByDocument);
router.post('/:id/winner', controller.markWinner);

module.exports = router;
