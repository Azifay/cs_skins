const jwt = require('jsonwebtoken');
const User = require('../models/users.model');

// Проверяет заголовок Authorization: Bearer <token>.
// Если токен валиден — кладёт пользователя в req.user.
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ message: 'No token provided, authorization denied' });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found, token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: 'Token is not valid', error: error.message });
  }
};

module.exports = auth;
