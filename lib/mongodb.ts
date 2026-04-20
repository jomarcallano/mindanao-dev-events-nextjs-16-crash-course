import mongoose, { Mongoose } from "mongoose";


interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // `var` is required for global augmentation in TypeScript.
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Reuse the same cache across hot reloads in development.
const cache: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

export async function connectToDatabase(): Promise<Mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable.");
  }

  // Return the existing connection if already established.
  if (cache.conn) {
    return cache.conn;
  }

  // Create the initial connection promise once and reuse it.
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Reset the promise so a new connection attempt can be made.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
