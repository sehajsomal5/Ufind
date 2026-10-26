import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ufind'
  try {
    const conn = await mongoose.connect(uri)
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`)
    throw error
  }
}
