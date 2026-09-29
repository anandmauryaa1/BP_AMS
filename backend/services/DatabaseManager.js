import mongoose from 'mongoose';

/**
 * Singleton class to manage MongoDB database connections.
 * Ensures a single connection instance across serverless execution and app lifecycles.
 */
class DatabaseManager {
    static instance = null;
    connectionPromise = null;

    constructor() {
        if (DatabaseManager.instance) {
            return DatabaseManager.instance;
        }
        DatabaseManager.instance = this;
    }

    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    async connect() {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendance_db';

        // 1. Connection already active
        if (mongoose.connection.readyState >= 1) {
            return mongoose.connection;
        }

        // 2. Connection request already in flight
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // 3. Initiate new connection with optimized pool options
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        this.connectionPromise = mongoose.connect(uri, opts)
            .then((m) => {
                console.log('[DatabaseManager] Connected to MongoDB successfully.');
                return m.connection;
            })
            .catch((err) => {
                this.connectionPromise = null;
                console.error('[DatabaseManager] MongoDB connection error:', err);
                throw err;
            });

        return this.connectionPromise;
    }

    async disconnect() {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            this.connectionPromise = null;
            console.log('[DatabaseManager] Disconnected from MongoDB.');
        }
    }
}

export const databaseManager = DatabaseManager.getInstance();
export default DatabaseManager;
