const express = require('express');
const {
  getMyInventory,
  sellInventoryItem,
} = require('../controllers/inventory.controllers');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

// Все маршруты инвентаря требуют авторизации
router.get('/', auth, getMyInventory);

// Будущий маршрут — пока возвращает 501
router.post('/:id/sell', auth, sellInventoryItem);

module.exports = router;
