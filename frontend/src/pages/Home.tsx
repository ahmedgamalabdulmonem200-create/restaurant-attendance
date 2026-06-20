import { useState, useEffect } from "react";
import { CheckCircle2, Clock, ChevronDown, AlertTriangle } from "lucide-react";
import { CameraCapture } from "../components/CameraCapture";
import { EMPLOYEES } from "../lib/employees";

type Mode = "none" | "check-in" | "check-out";
type WarnFor = null | "tried-check-in" | "tried-check-out";

interface Status {
  isCheckedIn: boolean;
  lastCheckInTime: string | null;
}

interface SuccessData {
  type: string;
  timestamp: string;
  name: string;
}

export default function Home() {
  const [employeeName, setEmployeeName] = useState("");
  const [mode, setMode] = useState<Mode>("none");
  const [warnFor, setWarnFor] = useState<WarnFor>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeName) { setStatus(null); return; }
    setLoadingStatus(true);
    fetch(`/api/attendance/status?employeeName=${encodeURIComponent(employeeName)}`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  }, [employeeName]);

  const handleCapture = async (photo: string | null, lat: number, lng: number) => {
    if (mode === "none" || !employeeName) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeName, type: mode, latitude: lat, longitude: lng, photo }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuccessData({ type: mode, timestamp: data.timestamp, name: employeeName });
      setMode("none");
      setEmployeeName("");
      setStatus(null);
      setTimeout(() => setSuccessData(null), 5000);
    } catch {
      setError("فشل تسجيل الحضور. يرجى المحاولة مجدداً.");
      setMode("none");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = () => {
    if (status?.isCheckedIn) setWarnFor("tried-check-in");
    else setMode("check-in");
  };

  const handleCheckOut = () => {
    if (status && !status.isCheckedIn) setWarnFor("tried-check-out");
    else setMode("check-out");
  };

  const proceedCorrect = () => {
    setWarnFor(null);
    setMode(warnFor === "tried-check-in" ? "check-out" : "check-in");
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  if (successData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-blue-50">
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-1">
            {successData.type === "check-in" ? "تم تسجيل الحضور" : "تم تسجيل الانصراف"}
          </h2>
          <p className="text-gray-600 font-medium mb-1">{successData.name}</p>
          <p className="text-gray-400 text-sm flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(successData.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {mode !== "none" && (
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setMode("none")}
          isLoading={submitting}
        />
      )}

      {warnFor && (
        <div className="fixed inset-0 z-40 flex items-end justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg">تنبيه</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {warnFor === "tried-check-in"
                ? "أنت مسجَّل حضورك بالفعل. هل تريد تسجيل الانصراف؟"
                : "لم تسجل حضورك بعد. هل تريد تسجيل الحضور؟"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setWarnFor(null)}
                className="flex-1 border border-gray-200 rounded-lg py-2 font-medium text-gray-600 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={proceedCorrect}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
              >
                {warnFor === "tried-check-in" ? "تسجيل الانصراف" : "تسجيل الحضور"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl">تسجيل الحضور</h1>
          <a href="/admin" className="text-sm text-blue-600 hover:underline">الإدارة</a>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Employee selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700">اختر اسمك</label>
            <div className="relative">
              <select
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 pr-10 text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">-- اختر الموظف --</option>
                {EMPLOYEES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {employeeName && (
              <div className="text-sm text-center">
                {loadingStatus ? (
                  <span className="text-gray-400">جارٍ التحقق من الحالة...</span>
                ) : status ? (
                  <span className={`font-medium ${status.isCheckedIn ? "text-green-600" : "text-gray-500"}`}>
                    {status.isCheckedIn
                      ? `✓ حاضر منذ ${status.lastCheckInTime ? formatTime(status.lastCheckInTime) : ""}`
                      : "غير مسجَّل حضور"}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3">{error}</p>
          )}

          {/* Check in / out buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleCheckIn}
              disabled={!employeeName || loadingStatus}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl text-lg transition-all active:scale-95 shadow-lg shadow-green-200"
            >
              حضور
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!employeeName || loadingStatus}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl text-lg transition-all active:scale-95 shadow-lg shadow-red-200"
            >
              انصراف
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            عند الضغط، ستُطلب منك صورة سيلفي وموقعك الجغرافي
          </p>
        </div>
      </main>
    </div>
  );
}
