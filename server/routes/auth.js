import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken, generateOTP, sendEmail } from '../utils/helpers.js';
import { protect, ageVerification } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth required'),
  ],
  validate,
  ageVerification,
  async (req, res) => {
    try {
      const { name, email, password, dateOfBirth, phone } = req.body;

      // Check existing user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered.' });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        dateOfBirth,
        phone,
      });

      // Generate OTP for verification
      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await user.save();

      // Send verification email (non-blocking)
      sendEmail(email, 'Verify Your Account - Blood Group Predictor', `
        <div style="font-family:Arial; padding:20px; background:#0a0a0f; color:#fff;">
          <h2 style="color:#7c3aed;">Welcome to Blood Group Predictor!</h2>
          <p>Hello ${name}, your verification code is:</p>
          <h1 style="color:#a855f7; letter-spacing:8px;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `).catch(err => console.log('Email failed (non-critical):', err.message));

      const token = generateToken(user._id, user.role);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please verify your email.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Track device info
      user.deviceInfo.push({
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        lastLogin: new Date(),
      });
      // Keep only last 10 device entries
      if (user.deviceInfo.length > 10) {
        user.deviceInfo = user.deviceInfo.slice(-10);
      }
      await user.save();

      const token = generateToken(user._id, user.role);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─── Verify OTP ───────────────────────────────────────────────────────────────
router.post('/verify-otp', protect, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id).select('+otpCode +otpExpiry');

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ error: 'No OTP requested.' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Profile ──────────────────────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Update Profile ───────────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
