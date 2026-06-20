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
    
    // Drop unique index on date if it exists to allow multiple same-day events
    try {
      await conn.connection.db.collection("attendances").dropIndex("date_1");
      console.log("Successfully dropped unique index on date in attendances");
    } catch (e) {
      console.log("Unique index on date not found or already dropped.");
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
