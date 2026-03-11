import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('يرجى تعريف متغير MONGODB_URI في ملف .env.local');
}

// Module-level singleton — works correctly in both Node.js and Cloudflare Workers.
// Cloudflare Workers do not reliably share `globalThis` state across requests,
// so we use a plain module-level variable instead of global caching.
let conn: typeof mongoose | null = null;
let promise: Promise<typeof mongoose> | null = null;

export async function connectDB() {
  if (conn && mongoose.connection.readyState === 1) {
    return conn;
  }

  if (!promise || mongoose.connection.readyState !== 2) {
    promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 2,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
    }).then((m) => {
      console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
      return m;
    });
  }

  try {
    conn = await promise;
  } catch (e) {
    promise = null;
    throw e;
  }

  return conn;
}
