import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Load .env file from possible locations:
 * - Current directory .env
 * - Parent directory ../.env
 * - backend/.env
 */
const candidatePaths = [
  path.resolve('.env'),
  path.resolve('../.env'),
  path.resolve('backend', '.env'),
];

let loadedPath = null;
for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedPath = envPath;
    break;
  }
}

if (!loadedPath) {
  dotenv.config(); // fallback to default
}

export const ENV_VARS = {
  // Server & App configuration
  PORT: process.env.SERVER_PORT || process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_HOST: process.env.CLIENT_HOST || 'localhost',
  CLIENT_PORT: process.env.CLIENT_PORT || 5173,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // AWS RDS / Aurora PostgreSQL Database configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
  DB_NAME: process.env.DB_NAME || 'postgres',
  DB_SSL: process.env.DB_SSL === 'true',

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'netflix_jwt_secret_dev_key_123',

  // TMDB API configuration
  TMDB_API_KEY: process.env.TMDB_API_KEY,

  // Mailtrap SMTP configuration
  MAILTRAP_TOKEN: process.env.MAILTRAP_TOKEN,
  MAILTRAP_ENDPOINT: process.env.MAILTRAP_ENDPOINT,
};
