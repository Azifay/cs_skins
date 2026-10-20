const express = require('express');
const {
  register,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/users.controllers');
const auth = require('../middlewares/auth.middleware');
const admin = require('../middlewares/admin.middleware');

const router = express.Router();

// Публичные
router.post('/register', register);
router.post('/login', login);

// Защищённые
router.get('/', auth, admin, getAllUsers);
router.get('/:id', auth, getUserById);
router.put('/:id', auth, updateUser);
router.delete('/:id', auth, admin, deleteUser);

module.exports = router;
