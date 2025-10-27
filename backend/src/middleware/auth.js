const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify if the token is valid
exports.authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid auth header' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);

    if (!user) return res.status(401).json({ message: 'Invalid token user' });

    req.user = user; // attach user to the request object
    next();
  } catch (err) {
    console.error('Auth Error:', err);const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Verify JWT and attach user to request
exports.authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid auth header' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);

    if (!user) return res.status(401).json({ message: 'Invalid token user' });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ✅ General role-based middleware (replaces isAdmin/isStaff if you want)
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// ✅ Shortcuts for convenience
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

exports.isStaff = (req, res, next) => {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access only' });
  }
  next();
};

    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ✅ Middleware to allow only admins
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

// ✅ Middleware to allow only staff
exports.isStaff = (req, res, next) => {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access only' });
  }
  next();
};
