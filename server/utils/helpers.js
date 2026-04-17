import CryptoJS from 'crypto-js';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

// Generate JWT token
export const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// AES-256 Encryption
export const encryptData = (data) => {
  return CryptoJS.AES.encrypt(data, process.env.AES_SECRET_KEY).toString();
};

export const decryptData = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.AES_SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Encrypt file buffer
export const encryptBuffer = (buffer) => {
  const wordArray = CryptoJS.lib.WordArray.create(buffer);
  return CryptoJS.AES.encrypt(wordArray, process.env.AES_SECRET_KEY).toString();
};

// Generate OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email
export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Blood Group Predictor" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
};
