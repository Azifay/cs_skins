const express = require('express');
const {
  uploadImage,
  replaceImage,
  deleteImage,
} = require('../controllers/uploads.controllers');
const { uploadSingleImage } = require('../middlewares/upload.middleware');
const auth = require('../middlewares/auth.middleware');
const admin = require('../middlewares/admin.middleware');

const router = express.Router();

// Управление изображениями — только для админа
router.post('/', auth, admin, uploadSingleImage('image'), uploadImage);
// Замена картинки на том же public_id — без создания нового файла в папке
router.put('/*publicId', auth, admin, uploadSingleImage('image'), replaceImage);
router.delete('/*publicId', auth, admin, deleteImage);

module.exports = router;
