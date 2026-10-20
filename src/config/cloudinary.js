const cloudinary = require('cloudinary').v2;

// Берёт доступы из переменной окружения CLOUDINARY_URL
// (вида cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

module.exports = cloudinary;
