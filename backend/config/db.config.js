import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import { ENV_VARS } from './env.config.js';
import { getCurrentDateTime } from '../helpers/helper.js';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL } = ENV_VARS;

const sslOptions = DB_SSL ? { rejectUnauthorized: false } : undefined;

/**
 * Sequelize instance for AWS RDS MySQL connection.
 */
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions: sslOptions ? { ssl: sslOptions } : {},
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

/**
 * Connects to the AWS RDS MySQL database and synchronizes all models.
 * Automatically ensures the database schema exists on the MySQL server.
 */
export const connectDB = async () => {
  try {
    // 1. Ensure target database exists on MySQL server
    try {
      const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: sslOptions,
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
      await connection.end();
    } catch (dbInitErr) {
      // In some managed environments (e.g. restricted RDS user), CREATE DATABASE may be restricted
      // Proceed to authenticate directly to the existing DB
      console.warn(`Database creation check skipped: ${dbInitErr.message}`);
    }

    // 2. Authenticate Sequelize connection
    await sequelize.authenticate();
    console.log(
      `MySQL RDS connection established successfully at ${getCurrentDateTime()} (${DB_HOST}:${DB_PORT}/${DB_NAME})`
    );

    // 3. Sync all models with database schema
    await sequelize.sync();
    console.log('MySQL Database tables synchronized successfully.');
  } catch (error) {
    console.error(`Error connecting to MySQL RDS Database: ${error.message}`);
    throw error;
  }
};
