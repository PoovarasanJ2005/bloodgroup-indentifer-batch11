import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let databaseConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    databaseConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    databaseConnected = false;
    console.error(`MongoDB connection error: ${error.message}`);
    return false;
  }
};

export const isDatabaseConnected = () => databaseConnected;

export default connectDB;
