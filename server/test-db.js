import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

try {
  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  });

  console.log("SUCCESS: MongoDB Connected!");
  await mongoose.disconnect();
} catch (error) {
  console.error("ERROR:", error.message);
  console.error("NAME:", error.name);
  process.exitCode = 1;
}
