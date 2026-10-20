const multer = require('multer');

// Принимаем изображения в память (buffer) и дальше отдаём их в Cloudinary.
// Лимит 5 МБ, только картинки.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif|bmp)$/.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, png, webp, gif, bmp)'));
  },
});

// Обёртка для Express: ошибки multer (лимит, неверный тип) -> JSON 400
const uploadSingleImage = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = { upload, uploadSingleImage };
