import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import predictionRoutes from './routes/prediction.js';
import adminRoutes from './routes/admin.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please try again later.' },
});
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ─── Seed Admin User ─────────────────────────────────────────────────────────
const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@bloodgroup.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        dateOfBirth: new Date('1990-01-01'),
        role: 'admin',
        isVerified: true,
      });
      console.log('👤 Default admin user created');
    }
  } catch (error) {
    console.log('Admin seed skipped:', error.message);
  }
};

// ─── Start Server ────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 ML API expected at ${process.env.ML_API_URL}`);
    console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI}\n`);
  });
};

startServer();
