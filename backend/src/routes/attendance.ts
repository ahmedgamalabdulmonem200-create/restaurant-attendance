import { Router } from "express";
import { pool } from "../db";
import { verifyToken } from "./auth";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  next();
}

// GET /api/attendance — قائمة السجلات مع فلاتر اختيارية
router.get("/", async (req, res) => {
  const { employeeName, date } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (employeeName) {
    conditions.push(`employee_name ILIKE $${i++}`);
    params.push(`%${employeeName}%`);
  }
  if (date) {
    conditions.push(`DATE(timestamp AT TIME ZONE 'UTC') = $${i++}::date`);
    params.push(date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT * FROM attendance ${where} ORDER BY timestamp DESC`,
    params
  );

  res.json(rows.map((r) => ({
    id: r.id,
    employeeName: r.employee_name,
    type: r.type,
    timestamp: r.timestamp,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    photo: r.photo ?? null,
  })));
});

// GET /api/attendance/status?employeeName=...
router.get("/status", async (req, res) => {
  const { employeeName } = req.query as Record<string, string>;
  if (!employeeName) {
    res.status(400).json({ error: "employeeName مطلوب" });
    return;
  }

  const { rows } = await pool.query(
    "SELECT * FROM attendance WHERE employee_name = $1 ORDER BY timestamp DESC LIMIT 1",
    [employeeName]
  );

  const last = rows[0];
  const isCheckedIn = last?.type === "check-in";
  res.json({ isCheckedIn, lastCheckInTime: isCheckedIn ? last.timestamp : null });
});

// GET /api/attendance/summary — إحصائيات اليوم
router.get("/summary", async (req, res) => {
  const todayUTC = new Date().toISOString().slice(0, 10);

  const [checkInsRes, checkOutsRes, presentRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE type='check-in' AND DATE(timestamp AT TIME ZONE 'UTC')=$1::date`,
      [todayUTC]
    ),
    pool.query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE type='check-out' AND DATE(timestamp AT TIME ZONE 'UTC')=$1::date`,
      [todayUTC]
    ),
    pool.query(
      `SELECT COUNT(*) AS cnt FROM (
        SELECT DISTINCT ON (employee_name) employee_name, type
        FROM attendance
        WHERE DATE(timestamp AT TIME ZONE 'UTC') = $1::date
        ORDER BY employee_name, timestamp DESC
      ) sub WHERE type = 'check-in'`,
      [todayUTC]
    ),
  ]);

  res.json({
    date: todayUTC,
    checkIns: Number(checkInsRes.rows[0].cnt),
    checkOuts: Number(checkOutsRes.rows[0].cnt),
    presentCount: Number(presentRes.rows[0].cnt),
  });
});

// POST /api/attendance — تسجيل حضور أو انصراف
router.post("/", async (req, res) => {
  const { employeeName, type, latitude, longitude, photo } = req.body as {
    employeeName?: string;
    type?: string;
    latitude?: number;
    longitude?: number;
    photo?: string;
  };

  if (!employeeName || !type || !["check-in", "check-out"].includes(type)) {
    res.status(400).json({ error: "بيانات غير صحيحة" });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO attendance (employee_name, type, latitude, longitude, photo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [employeeName, type, latitude ?? null, longitude ?? null, photo ?? null]
  );

  const r = rows[0];
  res.status(201).json({
    id: r.id,
    employeeName: r.employee_name,
    type: r.type,
    timestamp: r.timestamp,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    photo: r.photo ?? null,
  });
});

// DELETE /api/attendance/:id — للأدمن فقط
router.delete("/:id", requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM attendance WHERE id = $1", [Number(req.params.id)]);
  res.json({ success: true });
});

export default router;
