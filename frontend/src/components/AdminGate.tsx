import { useState, useEffect, useCallback } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

const TOKEN_KEY = "admin_token";

async function verifyToken(token: string) {
  const res = await fetch("/api/admin/verify", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.valid === true;
}

async function login(password: string): Promise<string | null> {
  const res = await fetch("/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.token ?? null;
}

export function useAdminLogout() {
  return () => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
  };
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const checkToken = useCallback(async () => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && (await verifyToken(saved))) {
      setStatus("unlocked");
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setStatus("locked");
    }
  }, []);

  useEffect(() => { checkToken(); }, [checkToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);
    const token = await login(password);
    setPending(false);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setStatus("unlocked");
    } else {
      setError("كلمة المرور غير صحيحة");
      setPassword("");
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
            <p className="text-gray-500 text-sm">أدخل كلمة المرور للمتابعة</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                dir="ltr"
                className="w-full border rounded-lg px-4 py-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}
            <button
              type="submit"
              disabled={pending || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {pending ? "جارٍ التحقق..." : "دخول"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
