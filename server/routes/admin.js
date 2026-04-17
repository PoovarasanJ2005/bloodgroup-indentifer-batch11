import express from 'express';
import User from '../models/User.js';
import Prediction from '../models/Prediction.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(protect, adminOnly);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalPredictions = await Prediction.countDocuments();
    const verifiedUsers = await User.countDocuments({ role: 'user', isVerified: true });

    // Blood group distribution
    const bloodGroupDist = await Prediction.aggregate([
      {
        $group: {
          _id: '$predictedBloodGroup',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
        }
      },
      { $sort: { count: -1 } },
    ]);

    // Predictions over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyPredictions = await Prediction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } },
    ]);

    // Recent predictions
    const recentPredictions = await Prediction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email');

    // Age distribution
    const ageDistribution = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [18, 25, 35, 45, 55, 65, 100],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      },
    ]);

    // Average confidence
    const avgConfResult = await Prediction.aggregate([
      { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } },
    ]);
    const avgConfidence = avgConfResult.length > 0 ? avgConfResult[0].avgConfidence : 0;

    res.json({
      success: true,
      dashboard: {
        totalUsers,
        totalPredictions,
        verifiedUsers,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        bloodGroupDist,
        dailyPredictions,
        recentPredictions,
        ageDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get All Users ────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-fingerprintHashes -deviceInfo');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get All Predictions (Monitor) ───────────────────────────────────────────
router.get('/predictions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const predictions = await Prediction.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .select('-encryptedImagePath -featureEmbedding');

    const total = await Prediction.countDocuments();

    res.json({
      success: true,
      predictions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Delete User ──────────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin.' });

    await Prediction.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'User and associated data deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
