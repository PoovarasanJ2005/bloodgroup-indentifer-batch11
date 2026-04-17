import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  age: {
    type: Number,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  phone: {
    type: String,
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otpCode: {
    type: String,
    select: false,
  },
  otpExpiry: {
    type: Date,
    select: false,
  },
  fingerprintHashes: [{
    type: String,
  }],
  deviceInfo: [{
    userAgent: String,
    ip: String,
    lastLogin: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Calculate age before saving
userSchema.pre('save', async function (next) {
  // Calculate age
  if (this.isModified('dateOfBirth')) {
    const today = new Date();
    const dob = new Date(this.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    this.age = age;
  }

  // Hash password
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user is 18+
userSchema.methods.isAdult = function () {
  return this.age >= 18;
};

const User = mongoose.model('User', userSchema);
export default User;
