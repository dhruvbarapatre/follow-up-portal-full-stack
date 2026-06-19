const mongoose = require("mongoose");

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("Please add MONGO_URI to your environment variables.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 30000,
      bufferCommands: false,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
