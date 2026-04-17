import express from 'express';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Prediction from '../models/Prediction.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { encryptBuffer, sendEmail } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Multer config for fingerprint upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, BMP, TIFF images are allowed.'));
    }
  },
});

// ─── Predict Blood Group ──────────────────────────────────────────────────────
router.post('/predict', protect, upload.single('fingerprint'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No fingerprint image uploaded.' });
    }

    // Send to Flask ML API
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('fingerprint', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const mlResponse = await axios.post(
      `${process.env.ML_API_URL}/api/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000,
      }
    );

    const mlResult = mlResponse.data;

    if (!mlResult.success) {
      return res.status(500).json({ error: 'Prediction failed.' });
    }

    // Check for duplicate fingerprint
    const existingPrediction = await Prediction.findOne({
      fingerprintHash: mlResult.fingerprint_hash,
      user: { $ne: req.user._id },
    });

    let duplicateWarning = null;
    if (existingPrediction) {
      duplicateWarning = 'This fingerprint has been registered by another user. Suspicious activity flagged.';
      // Could notify admin here
    }

    // Store fingerprint hash in user record
    if (!req.user.fingerprintHashes.includes(mlResult.fingerprint_hash)) {
      req.user.fingerprintHashes.push(mlResult.fingerprint_hash);
      await req.user.save();
    }

    // Encrypt and store fingerprint image
    const encryptedData = encryptBuffer(req.file.buffer);
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'encrypted');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const encryptedPath = path.join(uploadsDir, `${mlResult.prediction_id}.enc`);
    fs.writeFileSync(encryptedPath, encryptedData);

    // Save prediction to database
    const prediction = await Prediction.create({
      user: req.user._id,
      predictionId: mlResult.prediction_id,
      predictedBloodGroup: mlResult.predicted_blood_group,
      confidence: mlResult.confidence,
      allProbabilities: mlResult.all_probabilities,
      fingerprintHash: mlResult.fingerprint_hash,
      featureEmbedding: mlResult.feature_embedding,
      encryptedImagePath: encryptedPath,
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });

    // Send email notification (non-blocking)
    sendEmail(req.user.email, 'Blood Group Prediction Result', `
      <div style="font-family:Arial; padding:20px; background:#0a0a0f; color:#fff; border-radius:12px;">
        <h2 style="color:#7c3aed;">🩸 Blood Group Prediction Result</h2>
        <p>Hello ${req.user.name},</p>
        <div style="background:rgba(124,58,237,0.15); padding:20px; border-radius:8px; margin:15px 0;">
          <h1 style="color:#a855f7; text-align:center; font-size:36px; margin:0;">
            ${mlResult.predicted_blood_group}
          </h1>
          <p style="text-align:center; color:#c4b5fd;">Confidence: ${mlResult.confidence}%</p>
        </div>
        <p style="color:#9ca3af; font-size:12px;">
          Prediction ID: ${mlResult.prediction_id}<br>
          Date: ${new Date().toLocaleString()}
        </p>
      </div>
    `).catch(err => console.log('Email notification failed:', err.message));

    res.json({
      success: true,
      prediction: {
        id: prediction._id,
        predictionId: prediction.predictionId,
        predictedBloodGroup: prediction.predictedBloodGroup,
        confidence: prediction.confidence,
        allProbabilities: mlResult.all_probabilities,
        createdAt: prediction.createdAt,
      },
      duplicateWarning,
    });
  } catch (error) {
    console.error('Prediction error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service unavailable. Please try again later.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Prediction History ───────────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const predictions = await Prediction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-encryptedImagePath -featureEmbedding');

    const total = await Prediction.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      predictions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Single Prediction ────────────────────────────────────────────────────
router.get('/prediction/:id', protect, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('-encryptedImagePath');

    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found.' });
    }

    res.json({ success: true, prediction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── User Stats ───────────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const totalPredictions = await Prediction.countDocuments({ user: req.user._id });

    const bloodGroupStats = await Prediction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$predictedBloodGroup',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
        }
      },
      { $sort: { count: -1 } },
    ]);

    const recentPredictions = await Prediction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('predictedBloodGroup confidence createdAt predictionId');

    res.json({
      success: true,
      stats: {
        totalPredictions,
        bloodGroupStats,
        recentPredictions,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
