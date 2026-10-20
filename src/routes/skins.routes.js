const express = require('express');
const {
  getAllSkins,
  getSkinById,
  createSkin,
  updateSkin,
  deleteSkin,
  searchSkins,
  filterSkins,
} = require('../controllers/skins.controllers');

const router = express.Router();

router.get('/', getAllSkins);
router.get('/search', searchSkins);
router.get('/filter', filterSkins);
router.get('/:id', getSkinById);
router.post('/', createSkin);
router.put('/:id', updateSkin);
router.delete('/:id', deleteSkin);

module.exports = router;
