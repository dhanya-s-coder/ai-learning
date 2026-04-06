import mongoose from "mongoose";

const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai-learning-app";

export async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });
  return mongoose.connection;
}
