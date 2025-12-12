const express = require('express');
const router = express.Router();
const controller = require('../controllers/rifaController');

router.get('/', controller.getRifas);
router.post('/', controller.createRifa);

module.exports = router;
