import { useState, useEffect, useCallback } from "react";
import { format, subDays, addDays } from "date-fns";
import {
  Users, ArrowRightCircle, ArrowLeftCircle, MapPin, Trash2,
  Search, ChevronLeft, ChevronRight, LogOut, Image as ImageIcon,
  FileDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { AdminGate, useAdminLogout } from "../components/AdminGate";

const TOKEN_KEY = "admin_token";

interface Record {
  id: number;
  employeeName: string;
  type: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
}

interface Summary {
  presentCount: number;
  checkIns: number;
  checkOuts: number;
}

// أول وآخر يوم في الشهر الحالي كقيم افتراضية لمدى التصدير
function firstOfMonth() {
  const d = new Date();
  return format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd");
}
function today() {
  return format(new Date(), "yyyy-MM-dd");
}

function AdminContent() {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [records, setRecords] = useState<Record[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState(firstOfMonth);
  const [exportTo, setExportTo]     = useState(today);
  const [exporting, setExporting]   = useState(false);
  const logout = useAdminLogout();

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({ date: dateStr });
      if (search) params.set("employeeName", search);
      const res = await fetch(`/api/attendance?${params}`);
      setRecords(await res.json());
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [dateStr, search]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/summary");
      setSummary(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف هذا السجل؟")) return;
    await fetch(`/api/attendance/${id}`, { method: "DELETE", headers: authHeaders });
    fetchRecords();
    fetchSummary();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ fromDate: exportFrom, toDate: exportTo });
      if (search) params.set("employeeName", search);
      const res = await fetch(`/api/attendance?${params}`);
      const data: Record[] = await res.json();

      if (data.length === 0) {
        alert("لا توجد سجلات في هذا المدى.");
        return;
      }

      const rows = data.map(r => ({
        "الاسم":   r.employeeName,
        "النوع":   r.type === "check-in" ? "حضور" : "انصراف",
        "التاريخ": format(new Date(r.timestamp), "yyyy-MM-dd"),
        "الوقت":   format(new Date(r.timestamp), "HH:mm"),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 8 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الحضور");
      const name = search
        ? `حضور-${search}-${exportFrom}-إلى-${exportTo}.xlsx`
        : `حضور-${exportFrom}-إلى-${exportTo}.xlsx`;
      XLSX.writeFile(wb, name);
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photo modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="selfie" className="max-w-full max-h-[80vh] rounded-xl" />
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <a href="/">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronRight className="h-5 w-5" />
            </button>
          </a>
          <div className="flex-1">
            <h1 className="font-bold text-lg">لوحة الإدارة</h1>
            <p className="text-xs text-gray-400 font-mono">{format(new Date(), "yyyy-MM-dd")}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Summary cards — today only */}
        {isToday && summary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{summary.presentCount}</p>
              <p className="text-xs text-gray-500">حاضر الآن</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <ArrowRightCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{summary.checkIns}</p>
              <p className="text-xs text-gray-500">حضور اليوم</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <ArrowLeftCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{summary.checkOuts}</p>
              <p className="text-xs text-gray-500">انصراف اليوم</p>
            </div>
          </div>
        )}

        {/* Date nav + search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="font-mono text-sm font-medium min-w-[110px] text-center">{dateStr}</span>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              disabled={isToday}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {!isToday && (
              <button onClick={() => setSelectedDate(new Date())} className="text-xs text-blue-600 hover:underline mr-2">
                اليوم
              </button>
            )}
          </div>
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث باسم الموظف..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 pr-9 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* قسم تصدير Excel بمدى تاريخ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">من تاريخ</label>
            <input
              type="date"
              value={exportFrom}
              max={exportTo}
              onChange={e => setExportFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">إلى تاريخ</label>
            <input
              type="date"
              value={exportTo}
              min={exportFrom}
              max={today()}
              onChange={e => setExportTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || !exportFrom || !exportTo}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            <FileDown className="h-4 w-4" />
            {exporting ? "جارٍ التصدير..." : "تصدير Excel"}
          </button>
          {search && (
            <span className="text-xs text-gray-400 self-center">
              مفلتر بـ: {search}
            </span>
          )}
        </div>

        {/* Records table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingRecords ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              جارٍ التحميل...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">لا توجد سجلات لهذا اليوم</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  {/* Photo */}
                  <div className="shrink-0">
                    {r.photo ? (
                      <button onClick={() => setSelectedPhoto(r.photo)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                        <img src={r.photo} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.employeeName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.type === "check-in" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {r.type === "check-in" ? <ArrowRightCircle className="h-3 w-3" /> : <ArrowLeftCircle className="h-3 w-3" />}
                        {r.type === "check-in" ? "حضور" : "انصراف"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{formatTime(r.timestamp)}</span>
                    </div>
                  </div>

                  {/* Location */}
                  {r.latitude && r.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-blue-500 hover:text-blue-700 p-1"
                      title="فتح الموقع"
                    >
                      <MapPin className="h-4 w-4" />
                    </a>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="shrink-0 text-gray-300 hover:text-red-500 p-1 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Admin() {
  return (
    <AdminGate>
      <AdminContent />
    </AdminGate>
  );
}
