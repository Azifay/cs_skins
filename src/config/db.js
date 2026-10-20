const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI environment variable topilmadi! Render.com Dashboard -> Environment bo\'limida MONGODB_URI ni qo\'shing.'
      );
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:');
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
