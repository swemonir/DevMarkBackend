const connectDB = async () => {
  try {
    const mongoose = require("mongoose");
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devmark_dev');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    console.log("⚠️  Server will continue without database connection");
    console.log("💡 Start MongoDB to enable full functionality");
  }
};

module.exports = connectDB;
