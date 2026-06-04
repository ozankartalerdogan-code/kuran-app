"use client";

import { useState, useEffect, useCallback } from "react";

// Kabe koordinatları
const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

// Verilen konumdan Kabe'ye olan bearing (0–360, kuzeyden saat yönünde)
function calcQiblaBearing(lat: number, lng: number): number {
  const dLng = toRad(MECCA_LNG - lng);
  const lat1 = toRad(lat);
  const lat2 = toRad(MECCA_LAT);
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(x, y)) + 360) % 360;
}

// Kabe'ye olan mesafe (km)
function calcDistance(lat: number, lng: number): number {
  const R = 6371;
  const dLat = toRad(MECCA_LAT - lat);
  const dLng = toRad(MECCA_LNG - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(MECCA_LAT)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Status = "idle" | "loading" | "success" | "error" | "no_orientation";

export function KibleClient() {
  const [status, setStatus]         = useState<Status>("idle");
  const [errorMsg, setErrorMsg]     = useState("");
  const [qibla, setQibla]           = useState<number | null>(null);
  const [distance, setDistance]     = useState<number | null>(null);
  const [heading, setHeading]       = useState<number | null>(null); // cihaz yönü
  const [orientationGranted, setOrientationGranted] = useState(false);
  const [city, setCity]             = useState<string | null>(null);

  const getLocation = useCallback(() => {
    setStatus("loading");
    if (!navigator.geolocation) {
      setErrorMsg("Tarayıcınız konum özelliğini desteklemiyor.");
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const bearing = calcQiblaBearing(latitude, longitude);
        const dist = calcDistance(latitude, longitude);
        setQibla(bearing);
        setDistance(dist);
        setStatus("success");

        // Şehir adını reverse geocode ile al
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then((r) => r.json())
          .then((d) => {
            const c = d?.address?.city || d?.address?.town || d?.address?.village || null;
            setCity(c);
          })
          .catch(() => {});
      },
      (err) => {
        setErrorMsg(
          err.code === 1
            ? "Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini açın."
            : "Konum alınamadı. Lütfen tekrar deneyin."
        );
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // DeviceOrientation — iOS 13+ için izin gerekiyor
  const requestOrientation = useCallback(async () => {
    // @ts-expect-error requestPermission iOS-only, standart DOM tipinde yok
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        // @ts-expect-error requestPermission iOS-only, standart DOM tipinde yok
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === "granted") setOrientationGranted(true);
      } catch {
        setOrientationGranted(false);
      }
    } else {
      setOrientationGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!orientationGranted || status !== "success") return;

    const handler = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading: iOS (gerçek kuzey), alpha: Android (manyetik kuzey)
      const h =
        // @ts-expect-error webkitCompassHeading iOS-only, standart DOM tipinde yok
        e.webkitCompassHeading != null
          // @ts-expect-error webkitCompassHeading iOS-only, standart DOM tipinde yok
          ? e.webkitCompassHeading
          : e.alpha != null
          ? (360 - e.alpha) % 360
          : null;
      if (h !== null) setHeading(h);
    };

    window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
    window.addEventListener("deviceorientation", handler as EventListener, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.removeEventListener("deviceorientation", handler as EventListener, true);
    };
  }, [orientationGranted, status]);

  // Ok açısı: kıble yönü - cihaz yönü
  const arrowAngle = qibla !== null && heading !== null ? (qibla - heading + 360) % 360 : qibla;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-stone-950">
      <div className="mx-auto max-w-sm">
        {/* Başlık */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">🕋 Kıble Yönü</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Konumunuza göre Kabe&apos;nin yönünü bulun
          </p>
        </div>

        {/* Konum butonu */}
        {status === "idle" && (
          <button
            onClick={getLocation}
            className="mx-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-95"
          >
            📍 Konumumu Bul
          </button>
        )}

        {status === "loading" && (
          <div className="text-center text-stone-500 dark:text-stone-400">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            Konum alınıyor…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-800 dark:bg-red-950/30">
            <p className="mb-3 text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
            <button
              onClick={getLocation}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {status === "success" && qibla !== null && (
          <div className="space-y-6">
            {/* Şehir + mesafe */}
            <div className="text-center text-sm text-stone-500 dark:text-stone-400">
              {city && <span>{city} — </span>}
              {distance !== null && <span>Kabe&apos;ye {Math.round(distance).toLocaleString("tr-TR")} km</span>}
            </div>

            {/* Pusula */}
            <div className="relative mx-auto h-72 w-72">
              {/* Dış halka */}
              <div className="absolute inset-0 rounded-full border-4 border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-800">
                {/* Yön etiketleri */}
                {[
                  { label: "K", top: "4px", left: "50%", transform: "translateX(-50%)" },
                  { label: "G", bottom: "4px", left: "50%", transform: "translateX(-50%)" },
                  { label: "D", top: "50%", right: "8px", transform: "translateY(-50%)" },
                  { label: "B", top: "50%", left: "8px", transform: "translateY(-50%)" },
                ].map(({ label, ...style }) => (
                  <span
                    key={label}
                    className="absolute text-xs font-bold text-stone-400 dark:text-stone-500"
                    style={style as React.CSSProperties}
                  >
                    {label}
                  </span>
                ))}

                {/* Merkez nokta */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-stone-300 dark:bg-stone-600" />
                </div>
              </div>

              {/* Kıble oku */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${arrowAngle ?? qibla}deg)` }}
              >
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="h-28 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-transparent" />
                  {/* Ok ucu — Kabe ikonu */}
                  <div className="-mt-2 text-2xl">🕋</div>
                  <div className="h-20 w-1 rounded-full bg-gradient-to-t from-stone-300 to-transparent opacity-40" />
                </div>
              </div>
            </div>

            {/* Derece bilgisi */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800/50 dark:bg-emerald-950/20">
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {Math.round(qibla)}°
              </p>
              <p className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-500">
                Kuzeyden saat yönünde
              </p>
            </div>

            {/* Cihaz yönü */}
            {!orientationGranted && (
              <button
                onClick={requestOrientation}
                className="mx-auto flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
              >
                🧭 Canlı Pusula Aç
              </button>
            )}
            {orientationGranted && heading !== null && (
              <p className="text-center text-xs text-stone-400 dark:text-stone-500">
                Cihaz yönü: {Math.round(heading)}° — Ok Kabe&apos;yi gösteriyor
              </p>
            )}

            {/* Tekrar dene */}
            <button
              onClick={getLocation}
              className="mx-auto flex text-xs text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              Konumu yenile
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
