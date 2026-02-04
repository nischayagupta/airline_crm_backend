const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // 🔹 Header se Authorization uthao
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    // 🔹 "Bearer TOKEN" se sirf token nikalo
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    // 🔹 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 YAHI JWT BACKEND KO MILTA HAI
    req.user = decoded; // { id, role }

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;
