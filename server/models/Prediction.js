import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  predictionId: {
    type: String,
    required: true,
    unique: true,
  },
  predictedBloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-'],
  },
  confidence: {
    type: Number,
    required: true,
  },
  allProbabilities: {
    type: Map,
    of: Number,
  },
  fingerprintHash: {
    type: String,
    required: true,
  },
  featureEmbedding: {
    type: String,
  },
  encryptedImagePath: {
    type: String,
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'pending'],
    default: 'completed',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
predictionSchema.index({ user: 1, createdAt: -1 });
predictionSchema.index({ fingerprintHash: 1 });

const Prediction = mongoose.model('Prediction', predictionSchema);
export default Prediction;
