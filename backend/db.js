import { databaseManager } from './services/DatabaseManager.js';

export async function connectToDatabase() {
    return databaseManager.connect();
}

