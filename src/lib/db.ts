import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  console.warn('⚠️ Warning: DATABASE_URL / DIRECT_URL is not set in environment variables.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  let retries = 2;
  
  while (retries >= 0) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (error: any) {
      if (retries > 0 && (error.message?.includes('timeout') || error.message?.includes('terminated') || error.message?.includes('ENOTFOUND'))) {
        console.warn(`Database query retry (${error.message}). Retrying in 500ms... (${retries} left)`);
        retries--;
        await new Promise((r) => setTimeout(r, 500));
      } else {
        console.error('Database query error:', error.message);
        throw error;
      }
    }
  }
  throw new Error('Database query failed after retries');
}

export default pool;
