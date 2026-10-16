"use client";

import { useState, useEffect, useCallback } from "react";
import { COLORS } from "../lib/theme";
import { VAPID_PUBLIC_KEY } from "../lib/vapid";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSetup({ role = "admin", studentId = null, description }) {
  // checking | idle | asking | enabled | denied | error
  const [status, setStatus] = useState("checking");

  const enableNotifications = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("error");
      return;
    }

    setStatus("asking");
    try {
      // NOTE: this must run in direct response to a user tap. Browsers
      // silently ignore permission requests that aren't triggered by a
      // real user gesture — there is no way to show this popup fully
      // automatically, by design (anti-spam protection built into every
      // browser).
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, role, studentId }),
      });

      setStatus("enabled");
    } catch (err) {
      setStatus("error");
    }
  }, [role, studentId]);

  useEffect(() => {
    if (!("Notification" in window)) {
      setStatus("error");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      // Already granted at the browser level — silently re-subscribe to
      // sync the role for this device, no prompt shown.
      enableNotifications();
      return;
    }
    // Not yet asked. Browsers require an actual tap to show the prompt —
    // we can't auto-trigger it — so just show the button/modal.
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") {
    return null;
  }

  if (status === "enabled") {
    return (
      <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "14px 18px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: "#27500A", margin: 0 }}>Notifications enabled on this device.</p>
      </div>
    );
  }

  const defaultDescription =
    role === "parent"
      ? "Turn on notifications so you know as soon as the school posts a new notice."
      : "Turn on notifications to know as soon as attendance is marked or a notice is posted.";

  // For parents, this is required — show it as a full, hard-to-miss
  // overlay the first time they land on their dashboard, instead of a
  // small banner that's easy to scroll past.
  if (role === "parent" && (status === "idle" || status === "asking")) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(12,18,48,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          zIndex: 200,
        }}
      >
        <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 340, width: "100%", textAlign: "center" }}>
          <p style={{ fontSize: 30, margin: "0 0 12px" }}>🔔</p>
          <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 17, color: COLORS.navy, margin: "0 0 8px" }}>
            Turn on notifications
          </p>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
            {description || defaultDescription} Tap below, then choose "Allow" on the popup.
          </p>
          <button
            onClick={enableNotifications}
            disabled={status === "asking"}
            style={{ width: "100%", background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "12px 0", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 10 }}
          >
            {status === "asking" ? "Requesting..." : "Enable notifications"}
          </button>
        </div>
      </div>
    );
  }

  // Denied / error / non-parent idle state — regular inline banner.
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "16px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div>
        <p style={{ fontSize: 13.5, color: COLORS.ink, margin: "0 0 2px", fontWeight: 500 }}>Get notified on this device</p>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>{description || defaultDescription}</p>
        {status === "denied" && (
          <p style={{ fontSize: 12, color: COLORS.red, margin: "6px 0 0" }}>
            Notifications were blocked. Enable them from your browser's site settings (tap the lock/info
            icon next to the address bar → Notifications → Allow), then reload this page.
          </p>
        )}
        {status === "error" && (
          <p style={{ fontSize: 12, color: COLORS.red, margin: "6px 0 0" }}>This browser doesn't support notifications.</p>
        )}
      </div>
      {status !== "denied" && status !== "error" && (
        <button
          onClick={enableNotifications}
          style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Enable notifications
        </button>
      )}
    </div>
  );
}
