"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "../../../lib/theme";
import { registerFingerprint, verifyFingerprint, webAuthnSupported } from "../../../lib/webauthnBrowser";

function minutesSinceMidnight() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function timeStrToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const FALLBACK_SETTINGS = {
  attendanceStartTime: "07:15",
  attendanceHardCutoff: "09:25",
};

// Testing mode is OFF — matches the same flag in
// /api/teacher-attendance/route.js. The real attendance window (Admin →
// Contact Settings) is enforced again.
const ATTENDANCE_WINDOW_DISABLED_FOR_TESTING = false;

export default function TeacherSelfAttendancePage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // checking | idle | registering | verifying | locating | done | error
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [fingerprintRegistered, setFingerprintRegistered] = useState(null);
  const [supported, setSupported] = useState(true);

  async function load() {
    const [attRes, fpRes] = await Promise.all([
      fetch("/api/teacher-attendance", { cache: "no-store" }),
      fetch("/api/webauthn/status", { cache: "no-store" }),
    ]);
    if (!attRes.ok) {
      router.push("/teacher");
      return;
    }
    const data = await attRes.json();
    setRecord(data.record);
    const s = { ...FALLBACK_SETTINGS, ...(data.settings || {}) };
    setSettings(s);

    if (fpRes.ok) {
      const fpData = await fpRes.json();
      setFingerprintRegistered(fpData.registered);
    }
    setSupported(webAuthnSupported());
    setStatus("idle");

    const pastCutoff = !ATTENDANCE_WINDOW_DISABLED_FOR_TESTING && minutesSinceMidnight() > timeStrToMinutes(s.attendanceHardCutoff);
    if (pastCutoff && !data.record) {
      setError(`Attendance can only be marked before ${s.attendanceHardCutoff}. Please contact the admin office.`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRegisterFingerprint() {
    setStatus("registering");
    setError("");
    try {
      await registerFingerprint();
      setFingerprintRegistered(true);
      setStatus("idle");
    } catch (err) {
      setError(err.message || "Could not register fingerprint. Please try again.");
      setStatus("idle");
    }
  }

  function markAttendance() {
    setError("");
    doFingerprintThenLocation();
  }

  async function doFingerprintThenLocation() {
    setStatus("verifying");
    try {
      await verifyFingerprint();
    } catch (err) {
      setError(err.message || "Fingerprint did not match. Attendance not marked.");
      setStatus("idle");
      return;
    }

    setStatus("locating");
    if (!("geolocation" in navigator)) {
      setError("This device doesn't support location services.");
      setStatus("idle");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch("/api/teacher-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            deviceInfo: navigator.userAgent,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // When it's a geofence miss, the exact GPS reading is included —
          // show it too, since it's the quickest way to confirm/correct the
          // stored school coordinates (just stand at the gate and read it off).
          const extra = data.detectedLat
            ? ` [Your reading: ${data.detectedLat.toFixed(7)}, ${data.detectedLng.toFixed(7)}]`
            : "";
          setError((data.error || "Could not mark attendance.") + extra);
          setStatus("idle");
          return;
        }
        setRecord(data.record);
        setStatus("done");
      },
      () => {
        setError("Could not get your location. Please enable GPS/location permission and try again.");
        setStatus("idle");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "0 0 6px" }}>
          Self Attendance
        </p>
        <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 24px" }}>
          Fingerprint verification + being on the school premises are both required.
        </p>

        {status === "checking" && <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>}

        {!supported && (
          <div style={{ background: "#FCEBEB", border: "1px solid #E8B4B4", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: "#791F1F", margin: 0 }}>
              This device/browser doesn't support fingerprint verification. Please use a phone with
              fingerprint or Face ID, or contact the admin office.
            </p>
          </div>
        )}

        {record ? (
          <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "16px 18px" }}>
            <p style={{ fontSize: 14, color: "#27500A", margin: "0 0 4px", fontWeight: 600 }}>✓ Attendance marked</p>
            <p style={{ fontSize: 12.5, color: "#27500A", margin: 0 }}>
              {new Date(record.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        ) : fingerprintRegistered === false && supported ? (
          <>
            <p style={{ fontSize: 12.5, color: COLORS.gold, margin: "0 0 14px" }}>
              First time here — register your fingerprint once, then use it every day.
            </p>
            <button
              onClick={handleRegisterFingerprint}
              disabled={status === "registering"}
              style={{ width: "100%", background: COLORS.navy, color: "#fff", border: "none", borderRadius: 6, padding: "13px 0", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
            >
              {status === "registering" ? "Registering..." : "👆 Register Fingerprint"}
            </button>
            {error && <p style={{ fontSize: 12.5, color: COLORS.red, marginTop: 12 }}>{error}</p>}
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 14px" }}>
              {ATTENDANCE_WINDOW_DISABLED_FOR_TESTING
                ? "Testing mode: time window is OFF, attendance can be marked any time (you must still be on campus)."
                : `Attendance window: ${settings.attendanceStartTime} – ${settings.attendanceHardCutoff}`}
            </p>
            <button
              onClick={markAttendance}
              disabled={status === "locating" || status === "verifying" || !supported || (!ATTENDANCE_WINDOW_DISABLED_FOR_TESTING && minutesSinceMidnight() > timeStrToMinutes(settings.attendanceHardCutoff))}
              style={{ width: "100%", background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "13px 0", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
            >
              {status === "verifying" ? "👆 Scan fingerprint..." : status === "locating" ? "Checking location..." : "👆 Mark My Attendance"}
            </button>
            {error && <p style={{ fontSize: 12.5, color: COLORS.red, marginTop: 12 }}>{error}</p>}
          </>
        )}

        <a href="/teacher/dashboard" style={{ display: "inline-block", marginTop: 20, fontSize: 12.5, color: COLORS.muted }}>
          Go to attendance dashboard →
        </a>
      </div>
    </div>
  );
}
