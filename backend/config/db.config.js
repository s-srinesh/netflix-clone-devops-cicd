import { Sequelize } from 'sequelize';
import pg from 'pg';
import { ENV_VARS } from './env.config.js';
import { getCurrentDateTime } from '../helpers/helper.js';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL } = ENV_VARS;

// Configure SSL for AWS Aurora / RDS PostgreSQL
const sslOptions = DB_SSL
  ? { require: true, rejectUnauthorized: false }
  : false;

/**
 * Sequelize instance configured for AWS Aurora / RDS PostgreSQL.
 */
export const sequelize = new Sequelize(DB_NAME, DB_USER, String(DB_PASSWORD || ''), {
  host: DB_HOST,
  port: DB_PORT || 5432,
  dialect: 'postgres',
  dialectModule: pg,
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
 * Connects to AWS Aurora / RDS PostgreSQL and synchronizes all tables.
 */
export const connectDB = async () => {
  try {
    // 1. Authenticate PostgreSQL connection
    await sequelize.authenticate();
    console.log(
      `PostgreSQL RDS connection established successfully at ${getCurrentDateTime()} (${DB_HOST}:${DB_PORT || 5432}/${DB_NAME})`
    );

    // 2. Sync all models with PostgreSQL database schema
    await sequelize.sync();
    console.log('PostgreSQL Database tables synchronized successfully.');
  } catch (error) {
    console.error(`\n❌ Error connecting to PostgreSQL Database: ${error.message}`);
    console.error(
      '👉 Tip: Check your AWS RDS PostgreSQL endpoint or credentials in .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)\n'
    );
  }
};
