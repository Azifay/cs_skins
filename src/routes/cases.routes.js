const express = require('express');
const {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  openCase,
} = require('../controllers/cases.controllers');
const auth = require('../middlewares/auth.middleware');
const admin = require('../middlewares/admin.middleware');

const router = express.Router();

// Публичные
router.get('/', getAllCases);
router.get('/:id', getCaseById);

// Админские
router.post('/', auth, admin, createCase);
router.put('/:id', auth, admin, updateCase);
router.delete('/:id', auth, admin, deleteCase);

// Будущий маршрут — пока возвращает 501
router.post('/:id/open', auth, openCase);

module.exports = router;
