import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Mất kết nối MongoDB');
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  const { host, name } = mongoose.connection;
  console.log(`[db] Đã kết nối MongoDB: ${host}/${name}`);
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
