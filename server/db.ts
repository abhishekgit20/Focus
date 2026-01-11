// Database integration from blueprint:javascript_database
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for better performance
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool (reduced for remote DBs)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased to 10 seconds for remote databases
  query_timeout: 30000, // Query timeout: 30 seconds
  statement_timeout: 30000, // Statement timeout: 30 seconds
  // SSL configuration for remote databases (like Supabase)
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('amazonaws') 
    ? { rejectUnauthorized: false } 
    : false,
});

// Handle pool errors (don't exit process, just log)
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't exit - let the application continue and retry
});

// Test connection on startup (non-blocking)
(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');
  } catch (err: any) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please check your DATABASE_URL and ensure the database is accessible');
    console.error('If using Supabase, ensure your connection string includes SSL parameters');
  }
})();

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export const db = drizzle(pool, { schema });
