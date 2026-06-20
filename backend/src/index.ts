import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth";
import attendanceRouter from "./routes/attendance";
import { initDb } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const IS_PROD = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/admin", authRouter);
app.use("/api/attendance", attendanceRouter);
app.get("/api/healthz", (_req, res) => res.json({ ok: true }));

// في الإنتاج: يخدّم ملفات الواجهة (React) من نفس السيرفر
if (IS_PROD) {
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.use((_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT ?? 3001);

// أنشئ الجداول أولاً، ثم ابدأ الاستماع
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`السيرفر يعمل على http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("فشل الاتصال بقاعدة البيانات:", err);
    process.exit(1);
  });
