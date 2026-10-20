const cloudinary = require('../config/cloudinary');

const FOLDER = 'cs2-skin-store';

// multer хранит файл в памяти -> превращаем буфер в data-URI для Cloudinary.
const toDataURI = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

// POST /api/uploads (админ, multipart/form-data, поле "image")
// Загружает изображение в Cloudinary и возвращает его URL.
// Этот URL потом указывается в поле `image` скина или кейса.
// Фильтр только-изображений (jpeg/png/webp/gif/bmp) и лимит 5 МБ
// заданы в middlewares/upload.middleware.js.
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File "image" is required' });
    }

    const result = await cloudinary.uploader.upload(toDataURI(req.file), {
      folder: FOLDER,
    });

    res.status(201).json({
      message: 'Image uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
};

// PUT /api/uploads/*publicId (админ, multipart/form-data, поле "image")
// ЗАМЕНЯЕТ существующее изображение на том же месте:
// тот же public_id перезаписывается (overwrite), новый файл в папку
// НЕ создаётся — список ресурсов в cs2-skin-store не растёт.
// Возвращает новый URL (у ресурса появляется новая версия) и старый publicId.
const replaceImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File "image" is required' });
    }

    // Express 5 отдаёт wildcard-параметр массивом сегментов;
    // склеиваем обратно в "folder/name".
    const publicId = [].concat(req.params.publicId).join('/');

    const result = await cloudinary.uploader.upload(toDataURI(req.file), {
      public_id: publicId,
      overwrite: true,
      unique_filename: false,
    });

    res.status(200).json({
      message: 'Image replaced in place',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error replacing image', error: error.message });
  }
};

// DELETE /api/uploads/*publicId (админ)
// Удаляет изображение из Cloudinary по его public_id.
const deleteImage = async (req, res) => {
  try {
    // Express 5 отдаёт wildcard-параметр массивом сегментов;
    // склеиваем обратно в "folder/name" для cloudinary.destroy().
    const publicId = [].concat(req.params.publicId).join('/');
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      return res.status(400).json({ message: 'Error deleting image', details: result });
    }

    res.status(200).json({ message: 'Image deleted', publicId });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
};

module.exports = {
  uploadImage,
  replaceImage,
  deleteImage,
};
