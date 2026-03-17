const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Неавторизований доступ.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Недійсний токен.' });
  }
}

module.exports = authMiddleware;
