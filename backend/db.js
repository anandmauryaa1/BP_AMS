import mongoose from 'mongoose';
export async function connectToDatabase() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendance_db';
    if (mongoose.connection.readyState >= 1) {
        return mongoose;
    }
    const opts = {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    };
    return mongoose.connect(uri, opts);
}
