import { Router } from "express";
import crypto from "crypto";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const SIGNING_SECRET = process.env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function signToken(ts: number) {
  return crypto.createHmac("sha256", SIGNING_SECRET).update(`admin:${ts}`).digest("hex");
}

export function makeToken() {
  const ts = Date.now();
  return `${ts}.${signToken(ts)}`;
}

export function verifyToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [tsPart, sig] = parts;
  const ts = parseInt(tsPart, 10);
  if (isNaN(ts)) return false;
  if (Date.now() - ts > TOKEN_TTL_MS) return false;
  const expected = signToken(ts);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// POST /api/admin/auth
router.post("/auth", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    return;
  }
  res.json({ token: makeToken() });
});

// GET /api/admin/verify
router.get("/verify", (req, res) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !verifyToken(token)) {
    res.status(401).json({ valid: false });
    return;
  }
  res.json({ valid: true });
});

export default router;
