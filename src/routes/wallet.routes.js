const express = require('express');
const {
  getWallet,
  recharge,
  getHistory,
} = require('../controllers/wallet.controllers');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', auth, getWallet);
// Пополнение кошелька и история операций (recharge-history)
router.post('/recharge', auth, recharge);
router.get('/history', auth, getHistory);

module.exports = router;
