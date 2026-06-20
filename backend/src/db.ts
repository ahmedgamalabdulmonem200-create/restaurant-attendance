import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL غير موجود في متغيرات البيئة");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL مطلوب لـ Neon، ونتجاهله إذا كنا على localhost
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

// تشغيل مرة واحدة عند بدء السيرفر — يُنشئ الجدول إذا لم يكن موجوداً
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id            SERIAL PRIMARY KEY,
      employee_name TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('check-in', 'check-out')),
      timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      latitude      REAL,
      longitude     REAL,
      photo         TEXT
    )
  `);
}
