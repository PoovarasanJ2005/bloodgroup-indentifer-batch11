import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - require authentication
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized. Invalid token.' });
  }
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
};

// Age verification middleware (18+)
export const ageVerification = (req, res, next) => {
  const { dateOfBirth } = req.body;
  if (!dateOfBirth) {
    return res.status(400).json({ error: 'Date of birth is required.' });
  }

  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 18) {
    return res.status(403).json({
      error: 'Age restriction: You must be 18 or older to use this system.',
      reasons: [
        'Ethical concerns regarding biometric data usage for minors',
        'Legal compliance with data protection laws',
        'Biological variability in fingerprint patterns during growth',
        'Security risks of storing minors\' biometric data'
      ]
    });
  }

  next();
};
