// Должен использоваться ПОСЛЕ auth: проверяет, что req.user.role === 'admin'.
const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = admin;
