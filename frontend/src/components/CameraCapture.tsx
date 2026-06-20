import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, MapPin, X, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  onCapture: (photo: string | null, lat: number, lng: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CameraCapture({ onCapture, onCancel, isLoading }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [gpsStatus, setGpsStatus] = useState<"pending" | "ok" | "denied">("pending");
  const [camStatus, setCamStatus] = useState<"pending" | "ok" | "denied">("pending");
  const [videoReady, setVideoReady] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initializing, setInitializing] = useState(true);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const requestGps = useCallback(async () => {
    setGpsStatus("pending");
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          setGpsStatus("ok");
          resolve(coords);
        },
        () => {
          setGpsStatus("denied");
          resolve(null);
        },
        { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
      );
    });
  }, []);

  const requestCamera = useCallback(async () => {
    setCamStatus("pending");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamStatus("ok");
    } catch {
      setCamStatus("denied");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await requestGps();
      if (mounted) await requestCamera();
      if (mounted) setInitializing(false);
    })();
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [requestGps, requestCamera, stopCamera]);

  useEffect(() => {
    if (camStatus !== "ok" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.addEventListener("canplay", () => setVideoReady(true), { once: true });
    video.play().catch(() => {});
  }, [camStatus]);

  const handleCapture = () => {
    if (!location) return;
    let photo: string | null = null;
    if (camStatus === "ok" && videoRef.current && videoReady) {
      const v = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 640;
      canvas.height = v.videoHeight || 480;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      photo = canvas.toDataURL("image/jpeg", 0.8);
    }
    onCapture(photo, location.lat, location.lng);
  };

  if (!initializing && gpsStatus === "denied") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-8 text-center">
        <button onClick={onCancel} className="absolute top-5 left-5 text-white/60 hover:text-white">
          <X className="h-6 w-6" />
        </button>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-full p-5 mb-6">
          <AlertTriangle className="h-12 w-12 text-amber-400" />
        </div>
        <h2 className="text-white text-xl font-bold mb-3">الموقع الجغرافي مطلوب</h2>
        <p className="text-white/60 text-sm max-w-xs mb-8">
          يجب منح إذن الموقع لإتمام التسجيل. افتح إعدادات المتصفح وادمح الموقع.
        </p>
        <button
          onClick={async () => { setInitializing(true); await requestGps(); setInitializing(false); }}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
        >
          <RefreshCw className="h-4 w-4" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const captureDisabled = isLoading || initializing || gpsStatus !== "ok" || (camStatus === "ok" && !videoReady);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex gap-2 items-center text-sm font-mono">
          <MapPin className={`h-4 w-4 ${gpsStatus === "ok" ? "text-green-400" : gpsStatus === "denied" ? "text-red-400" : "text-white/40 animate-pulse"}`} />
          <span className={gpsStatus === "ok" ? "text-green-400" : gpsStatus === "denied" ? "text-red-400" : "text-white/50"}>
            {gpsStatus === "ok" ? `${location!.lat.toFixed(4)}, ${location!.lng.toFixed(4)}` : gpsStatus === "denied" ? "الموقع مرفوض" : "جارٍ تحديد الموقع..."}
          </span>
        </div>
        <button onClick={onCancel} disabled={isLoading} className="text-white hover:text-white/60 p-2">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-zinc-900 overflow-hidden">
        {initializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-6 h-6 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            <p className="text-white/50 text-sm">{gpsStatus === "pending" ? "جارٍ تحديد الموقع..." : "جارٍ تشغيل الكاميرا..."}</p>
          </div>
        )}
        {!initializing && camStatus === "denied" && (
          <div className="text-white/50 text-center p-6">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">الكاميرا غير متاحة</p>
            <p className="text-sm mt-2 text-white/40">سيُسجَّل بدون صورة مع الموقع فقط</p>
          </div>
        )}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${camStatus === "ok" && videoReady ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      <div className="p-8 bg-black flex flex-col items-center gap-3">
        {gpsStatus === "pending" && !initializing && (
          <p className="text-amber-400 text-xs animate-pulse">في انتظار الموقع...</p>
        )}
        <button
          onClick={handleCapture}
          disabled={captureDisabled}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
        >
          <div className="w-full h-full bg-white rounded-full" />
        </button>
      </div>
    </div>
  );
}
