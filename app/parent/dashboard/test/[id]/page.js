"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { COLORS } from "../../../../../lib/theme";
import PaperPages from "../../../../../components/PaperPages";
import { SUBMIT_REASON_LABEL } from "../../../../../lib/onlineTestShared";

const PROBLEM_TEXT = {
  camera_off: "Your camera is off. Please turn it on — this is being written in the report.",
  camera_covered: "The camera looks covered or too dark.",
  no_face: "Your face is not visible in the camera.",
  multiple_faces: "More than one person is visible in the camera.",
  mic_off: "Your microphone is off. Please turn it on.",
  loud_noise: "Talking / loud noise is being heard.",
  fullscreen_exit: "You left full screen. Press the button to return.",
};

function AutoText({ value, onChange, minRows }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 15, lineHeight: 1.5, border: "1px solid #DBD8CC", borderRadius: 6, overflow: "hidden", resize: "none", fontFamily: "inherit" }}
    />
  );
}

// Rough gaze estimate from MediaPipe's 478 face landmarks (indices are the
// standard face-mesh layout: 468-477 are the iris points, added on top of
// the 468-point mesh). For each eye we see how far the iris sits between
// the eye's inner and outer corner, and how far up/down it sits between
// the eyelids. Values away from the centre (~0.5) mean the eyes are
// pointed somewhere other than the screen — sideways, or down at a phone
// / notes in the lap.
function isGazeAway(lm) {
  if (!lm || lm.length < 478) return false;

  function ratio(iris, cornerA, cornerB, lidTop, lidBottom) {
    const ix = lm[iris].x, iy = lm[iris].y;
    const x = (ix - lm[cornerA].x) / (lm[cornerB].x - lm[cornerA].x || 1);
    const y = (iy - lm[lidTop].y) / (lm[lidBottom].y - lm[lidTop].y || 1);
    return { x, y };
  }

  // Iris centres: 468 (left eye, viewer's right) and 473 (right eye).
  const left = ratio(468, 33, 133, 159, 145);
  const right = ratio(473, 263, 362, 386, 374);
  const x = (left.x + right.x) / 2;
  const y = (left.y + right.y) / 2;

  const sideways = x < 0.30 || x > 0.70;
  const upDown = y < 0.28 || y > 0.72;
  return sideways || upDown;
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function StudentTestPage() {
  const { id } = useParams();
  const [phase, setPhase] = useState("loading"); // loading | intro | running | done | closed
  const [info, setInfo] = useState(null); // from parent list (intro)
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({ mcq: {}, text: {} });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [tab, setTab] = useState("paper");
  const [wide, setWide] = useState(false);
  const [left, setLeft] = useState(0);
  const [online, setOnline] = useState(true);
  const [problems, setProblems] = useState({});
  const [doneReason, setDoneReason] = useState("student");
  const [submitting, setSubmitting] = useState(false);

  const answersRef = useRef(answers);
  const testRef = useRef(null);
  const offsetRef = useRef(0);
  const flagQ = useRef([]);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const faceRef = useRef(null);
  const audioRef = useRef({ ctx: null, analyser: null, buf: null });
  const canvasRef = useRef(null);
  const epRef = useRef({});
  const graceUntil = useRef(0);
  const hideAt = useRef(0);
  const blurLogged = useRef(false);
  const dirty = useRef(false);
  const syncing = useRef(false);
  const finished = useRef(false);
  const fsUsed = useRef(false);
  const hasMediaRef = useRef(true);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---- intro: is this test running? ----
  useEffect(() => {
    fetch("/api/online-tests/parent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const t = (d.live || []).find((x) => x.id === id);
        if (!t) {
          setPhase("closed");
        } else if (t.submitted) {
          setPhase("done");
        } else {
          setInfo(t);
          setPhase("intro");
        }
      })
      .catch(() => {
        setError("Could not load. Check your internet and refresh.");
        setPhase("closed");
      });
  }, [id]);

  const logFlag = useCallback((type, detail = "") => {
    if (Date.now() < graceUntil.current && type !== "face_check_unavailable") return;
    flagQ.current.push({
      cid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      type,
      detail,
      at: Date.now() + offsetRef.current,
    });
  }, []);

  const setProblem = (type, on) => setProblems((p) => (!!p[type] === on ? p : { ...p, [type]: on }));

  // ---- talk to the server ----
  const sync = useCallback(
    async (action = "save", extra = {}) => {
      if (syncing.current && action === "save") return null;
      syncing.current = true;
      const sending = flagQ.current.slice(0, 50);
      try {
        const res = await fetch(`/api/online-tests/${id}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, answers: answersRef.current, flags: sending, ...extra }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "failed");
        flagQ.current = flagQ.current.filter((f) => !sending.includes(f));
        dirty.current = false;
        setOnline(true);
        return d;
      } catch (e) {
        setOnline(false);
        return null;
      } finally {
        syncing.current = false;
      }
    },
    [id]
  );

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      audioRef.current.ctx?.close();
    } catch (e) {}
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const finish = useCallback(
    (reason) => {
      if (finished.current) return;
      finished.current = true;
      setDoneReason(reason || "student");
      stopMedia();
      setPhase("done");
    },
    [stopMedia]
  );

  const submit = useCallback(
    async (timeUp = false) => {
      setSubmitting(true);
      const d = await sync("submit", { timeUp });
      if (d?.closed) {
        finish(timeUp ? "time" : "student");
      } else if (timeUp) {
        // no internet at the last second: the server will finish it with the last saved answers
        finish("time");
      } else {
        alert("Could not submit — your internet seems to be down. Try again in a moment. Your answers are saved as soon as the connection returns.");
      }
      setSubmitting(false);
    },
    [sync, finish]
  );

  // ---- camera / mic ----
  async function acquireMedia() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot use the camera. Please open the site in Chrome (with https).");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: true });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play?.().catch(() => {});
    }
    try {
      audioRef.current.ctx?.close();
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      audioRef.current = { ctx, analyser, buf: new Uint8Array(analyser.fftSize) };
    } catch (e) {}
    return stream;
  }

  async function reacquire() {
    try {
      await acquireMedia();
      hasMediaRef.current = true;
      setProblem("camera_off", false);
      setProblem("mic_off", false);
    } catch (e) {
      alert("Could not turn the camera / microphone on. Please allow them in the browser settings.");
    }
  }

  async function startTest() {
    setError("");
    setStarting(true);
    let mediaFlag = null;
    try {
      await acquireMedia();
      hasMediaRef.current = true;
    } catch (e) {
      // Old / cheap phones often have no working camera, or the parent
      // refuses the permission. Either way the child must still be able
      // to take the test — we just note it instead of blocking them.
      hasMediaRef.current = false;
      mediaFlag = e?.name === "NotAllowedError" ? "camera_denied" : "camera_unavailable";
    }
    try {
      const res = await fetch(`/api/online-tests/${id}/attempt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enroll" }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not join the test.");
      offsetRef.current = new Date(d.serverNow).getTime() - Date.now();
      testRef.current = d.test;
      setTest(d.test);
      setAnswers(d.attempt.answers || { mcq: {}, text: {} });
      answersRef.current = d.attempt.answers || { mcq: {}, text: {} };
      if (d.attempt.submittedAt) {
        finish(d.attempt.submitReason);
        return;
      }
      if (mediaFlag) {
        flagQ.current.push({ cid: "start-" + mediaFlag, type: mediaFlag, detail: "", at: Date.now() + offsetRef.current });
      }
      try {
        if (document.documentElement.requestFullscreen && window.innerWidth >= 900) {
          await document.documentElement.requestFullscreen();
          fsUsed.current = true;
        }
      } catch (e) {}
      graceUntil.current = Date.now() + 6000;
      setPhase("running");
    } catch (e) {
      stopMedia();
      setError(e.message || "Could not join the test.");
    }
    setStarting(false);
  }

  // attach the camera picture once the running screen exists
  useEffect(() => {
    if (phase === "running" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [phase]);

  // ---- everything that happens while the test runs ----
  useEffect(() => {
    if (phase !== "running") return;

    const episode = (type, active, need) => {
      const e = (epRef.current[type] ||= { on: 0, off: 0, logged: false });
      if (active) {
        e.on++;
        e.off = 0;
        if (!e.logged && e.on >= need) {
          e.logged = true;
          logFlag(type);
          setProblem(type, true);
        }
      } else {
        e.off++;
        e.on = 0;
        if (e.logged && e.off >= 2) {
          e.logged = false;
          setProblem(type, false);
        }
      }
    };

    // Face + gaze check (runs inside this device; no picture is ever sent
    // anywhere — only "looking away" / "no face" events are reported).
    // FaceLandmarker gives both a face count (for no_face / multiple_faces)
    // and eye/iris landmarks (for gaze_away) from one model.
    (async () => {
      try {
        const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
        const vision = await import(/* webpackIgnore: true */ `${base}/vision_bundle.mjs`);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
        faceRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 3,
        });
      } catch (e) {
        logFlag("face_check_unavailable");
      }
    })();

    const monitor = setInterval(() => {
      if (!hasMediaRef.current) return; // no camera/mic on this device — nothing to check
      const stream = streamRef.current;
      const vTrack = stream?.getVideoTracks?.()[0];
      const aTrack = stream?.getAudioTracks?.()[0];
      episode("camera_off", !vTrack || vTrack.readyState === "ended" || !vTrack.enabled || vTrack.muted, 2);
      episode("mic_off", !aTrack || aTrack.readyState === "ended" || !aTrack.enabled || aTrack.muted, 2);

      const video = videoRef.current;
      const cameraOk = video && video.readyState >= 2 && vTrack && vTrack.readyState === "live" && !vTrack.muted;
      if (cameraOk) {
        try {
          const c = (canvasRef.current ||= document.createElement("canvas"));
          c.width = 32;
          c.height = 24;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, 32, 24);
          const px = ctx.getImageData(0, 0, 32, 24).data;
          let sum = 0;
          for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          episode("camera_covered", sum / (px.length / 4) < 22, 2);
        } catch (e) {}
        if (faceRef.current) {
          try {
            const result = faceRef.current.detectForVideo(video, performance.now());
            const n = result.faceLandmarks?.length || 0;
            episode("no_face", n === 0, 3);
            episode("multiple_faces", n > 1, 2);
            if (n === 1) {
              const away = isGazeAway(result.faceLandmarks[0]);
              episode("gaze_away", away, 4); // ~8s of sustained looking-away before it counts (blinks/glances don't)
            }
          } catch (e) {}
        }
      }

      const { analyser, buf } = audioRef.current;
      if (analyser && aTrack?.readyState === "live") {
        analyser.getByteTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          s += v * v;
        }
        episode("loud_noise", Math.sqrt(s / buf.length) > 0.1, 3);
      }
    }, 2000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hideAt.current = Date.now();
        logFlag("tab_hidden");
      } else if (hideAt.current) {
        const secs = Math.round((Date.now() - hideAt.current) / 1000);
        hideAt.current = 0;
        logFlag("tab_returned", `away for ${secs}s`);
      }
    };
    const onBlur = () => {
      setTimeout(() => {
        if (document.visibilityState === "visible" && !document.hasFocus() && !blurLogged.current) {
          blurLogged.current = true;
          logFlag("focus_lost");
        }
      }, 700);
    };
    const onFocus = () => {
      blurLogged.current = false;
    };
    const onFullscreen = () => {
      if (fsUsed.current && !document.fullscreenElement) {
        logFlag("fullscreen_exit");
        setProblem("fullscreen_exit", true);
      } else if (document.fullscreenElement) {
        setProblem("fullscreen_exit", false);
      }
    };
    const onPaste = (e) => {
      e.preventDefault();
      logFlag("paste_attempt");
    };
    const onCopy = (e) => {
      e.preventDefault();
      logFlag("copy_attempt");
    };
    const onContext = (e) => e.preventDefault();
    // Stops text arriving by any back door: paste from the keyboard
    // suggestion bar, drag-and-drop of text, "insert from clipboard" etc.
    const onBeforeInput = (e) => {
      const t = e.inputType || "";
      if (t === "insertFromPaste" || t === "insertFromPasteAsQuotation" || t === "insertFromYank" || t === "insertFromDrop") {
        e.preventDefault();
        logFlag("paste_attempt", t === "insertFromDrop" ? "dragged text" : "");
      }
    };
    const onDrop = (e) => {
      e.preventDefault();
      logFlag("paste_attempt", "dragged text");
    };
    const onDragStart = (e) => e.preventDefault();
    const onSelectStart = (e) => {
      // Selecting is only allowed inside the answer boxes (to fix typing).
      const el = e.target?.nodeType === 1 ? e.target : e.target?.parentElement;
      if (!el?.closest?.("textarea")) e.preventDefault();
    };
    const onKeyDown = (e) => {
      const key = String(e.key || "").toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["c", "v", "x", "p", "s", "u", "f", "g", "o"].includes(key)) {
        e.preventDefault();
        logFlag(key === "v" ? "paste_attempt" : key === "p" || key === "s" ? "print_attempt" : "copy_attempt", `keyboard shortcut ${e.ctrlKey ? "Ctrl" : "Cmd"}+${key.toUpperCase()}`);
      } else if (mod && e.shiftKey && ["i", "j", "c", "s"].includes(key)) {
        e.preventDefault();
        logFlag("devtools_attempt", `shortcut ${e.ctrlKey ? "Ctrl" : "Cmd"}+Shift+${key.toUpperCase()}`);
      } else if (e.key === "F12") {
        e.preventDefault();
        logFlag("devtools_attempt", "F12");
      } else if (e.key === "PrintScreen") {
        try { navigator.clipboard?.writeText(" "); } catch (err) {}
        logFlag("print_attempt", "PrintScreen key");
      }
    };
    const onBeforePrint = () => logFlag("print_attempt", "print dialog opened");
    const onOffline = () => {
      setOnline(false);
      logFlag("offline");
    };
    const onOnline = () => {
      setOnline(true);
      logFlag("online");
      sync("save");
    };
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("paste", onPaste);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("drop", onDrop, true);
    document.addEventListener("dragover", onDragStart, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);

    // timer + autosave
    let lastFull = 0;
    const tick = setInterval(() => {
      const t = testRef.current;
      if (!t) return;
      const remaining = new Date(t.endsAt).getTime() - (Date.now() + offsetRef.current);
      setLeft(remaining);
      if (remaining <= 0 && !finished.current) submit(true);
    }, 1000);

    const saver = setInterval(async () => {
      if (finished.current) return;
      const due = Date.now() - lastFull > 15000;
      if (dirty.current || flagQ.current.length > 0 || due) {
        if (due) lastFull = Date.now();
        const d = await sync("save");
        if (d?.closed) finish(d.submitReason);
      }
    }, 4000);

    return () => {
      clearInterval(monitor);
      clearInterval(tick);
      clearInterval(saver);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("drop", onDrop, true);
      document.removeEventListener("dragover", onDragStart, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function setMcq(n, letter) {
    setAnswers((a) => ({ ...a, mcq: { ...a.mcq, [n]: a.mcq[n] === letter ? undefined : letter } }));
    dirty.current = true;
  }
  function setText(key, value) {
    // A typed answer grows a few characters at a time. If a big block of
    // text appears in one go (pasted, voice-typed from another source, or
    // dropped in), it is refused and written in the teacher's report.
    const before = String(answersRef.current.text?.[key] || "");
    if (value.length - before.length > 40) {
      logFlag("paste_attempt", `${value.length - before.length} characters appeared at once`);
      return;
    }
    setAnswers((a) => ({ ...a, text: { ...a.text, [key]: value } }));
    dirty.current = true;
  }

  const bar = (children) => (
    <div style={{ background: COLORS.navy, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{children}</div>
  );

  // ---------------- screens ----------------
  if (phase === "loading") return <p style={{ padding: 24, fontSize: 13, color: COLORS.muted }}>Loading...</p>;

  if (phase === "closed")
    return (
      <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <p style={{ fontSize: 15, color: COLORS.ink }}>{error || "This test is not running right now."}</p>
        <a href="/parent/dashboard" style={{ color: COLORS.navy, fontSize: 13.5 }}>← Back to Parent Portal</a>
      </div>
    );

  if (phase === "done")
    return (
      <div style={{ padding: 24, maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
        <p style={{ fontSize: 40, margin: 0 }}>✅</p>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 20, color: COLORS.navy }}>Test submitted</p>
        <p style={{ fontSize: 13.5, color: COLORS.muted }}>{SUBMIT_REASON_LABEL[doneReason] || "Submitted."}</p>
        <p style={{ fontSize: 13.5, color: COLORS.muted }}>Your teacher will check the paper. The result will appear in the Parent Portal.</p>
        <a href="/parent/dashboard" style={{ display: "inline-block", marginTop: 10, background: COLORS.navy, color: "#fff", padding: "10px 20px", borderRadius: 5, fontSize: 13.5, textDecoration: "none" }}>Back to Parent Portal</a>
      </div>
    );

  if (phase === "intro")
    return (
      <div style={{ minHeight: "100vh", background: COLORS.tint }}>
        {bar(<p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Online Test</p>)}
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 18px" }}>
          <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 21, color: COLORS.navy, margin: "0 0 4px" }}>{info.title}</p>
          <p style={{ fontSize: 13.5, color: COLORS.muted, margin: "0 0 16px" }}>{info.subject ? `${info.subject} · ` : ""}{info.durationMin} minutes</p>
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 16, fontSize: 13.5, lineHeight: 1.6, color: COLORS.ink }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Before you start</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>The test ends at a fixed time. If you join late, you only get the time that is left.</li>
              <li>If your device has a camera and microphone, please keep them ON during the test.</li>
              <li>Do not leave this page, switch tabs or apps. Copy, paste, drag-and-drop, printing and screenshots are blocked, and every attempt is written in the teacher's report.</li>
              <li>Your answers are saved automatically. If the internet or power goes, what you wrote is submitted for you.</li>
              <li>You can still finish the test if something is noted — but every unusual activity is written in a report for the teacher.</li>
            </ul>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, margin: "16px 0", color: COLORS.ink }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I (parent) allow the school to use this device's camera and microphone during the test, if it has one. Photos and video are <strong>not saved</strong> — the device only checks for unusual activity. If this device has no working camera, my child can still take the test.</span>
          </label>
          {error && <p style={{ fontSize: 13, color: COLORS.red }}>{error}</p>}
          <button onClick={startTest} disabled={!consent || starting} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "13px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: !consent || starting ? 0.5 : 1 }}>
            {starting ? "Starting..." : "Start test"}
          </button>
          <p style={{ marginTop: 16 }}><a href="/parent/dashboard" style={{ color: COLORS.navy, fontSize: 13 }}>← Back</a></p>
        </div>
      </div>
    );

  // ---------------- running ----------------
  const t = test;
  const pages = t.pages || [];
  const activeProblems = Object.entries(problems).filter(([, on]) => on).map(([k]) => k);
  const mcqNums = Array.from({ length: t.mcqCount }, (_, i) => i + 1);
  const shortNums = Array.from({ length: t.shortCount }, (_, i) => i + 1);
  const longNums = Array.from({ length: t.longCount }, (_, i) => i + 1);

  const sheet = (
    <div style={{ padding: 14 }}>
      {t.mcqCount > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, margin: "0 0 10px" }}>MCQs — tap the correct option</p>
          {mcqNums.map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 30, fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{n}.</span>
              {["A", "B", "C", "D"].map((L) => {
                const on = answers.mcq[n] === L;
                return (
                  <button key={L} onClick={() => setMcq(n, L)} style={{ width: 44, height: 40, borderRadius: 20, border: `2px solid ${on ? COLORS.navy : "#C9C6BA"}`, background: on ? COLORS.navy : "#fff", color: on ? "#fff" : COLORS.ink, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    {L}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {shortNums.length > 0 && <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, margin: "0 0 10px" }}>Short questions</p>}
      {shortNums.map((n) => (
        <div key={"S" + n} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Short question {n}</label>
          <AutoText minRows={3} value={answers.text["S" + n] || ""} onChange={(v) => setText("S" + n, v)} />
        </div>
      ))}
      {longNums.length > 0 && <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, margin: "10px 0" }}>Long questions</p>}
      {longNums.map((n) => (
        <div key={"L" + n} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Long question {n}</label>
          <AutoText minRows={8} value={answers.text["L" + n] || ""} onChange={(v) => setText("L" + n, v)} />
        </div>
      ))}
      <button onClick={() => confirm("Submit your test now? You cannot change answers after this.") && submit(false)} disabled={submitting} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "13px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer", margin: "10px 0 60px" }}>
        {submitting ? "Submitting..." : "Submit test"}
      </button>
    </div>
  );

  const paperBox = <div style={{ padding: 10 }}><PaperPages pages={pages} /></div>;

  return (
    <div className="exam-secure" style={{ minHeight: "100vh", background: COLORS.tint, display: "flex", flexDirection: "column", height: wide ? "100vh" : "auto" }}>
      <style>{`
        .exam-secure, .exam-secure * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
        .exam-secure textarea { -webkit-user-select: text; user-select: text; }
        .exam-secure img { -webkit-user-drag: none; pointer-events: none; }
        @media print { body * { display: none !important; } body::after { content: "Printing is not allowed during the test."; display: block; padding: 40px; font-size: 20px; } }
      `}</style>
      {bar(
        <>
          <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 15, margin: 0 }}>{t.title}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11.5, color: online ? "#9BE28B" : "#FFB4B4" }}>{online ? "● Saved" : "● Offline — will sync"}</span>
            <span style={{ background: left < 5 * 60 * 1000 ? COLORS.red : "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 17, padding: "4px 12px", borderRadius: 5 }}>{fmt(left)}</span>
          </div>
        </>
      )}

      {activeProblems.length > 0 && (
        <div style={{ background: "#FCEBEB", color: "#791F1F", padding: "8px 16px", fontSize: 13 }}>
          {activeProblems.map((p) => (
            <div key={p}>
              ⚠ {PROBLEM_TEXT[p]}
              {(p === "camera_off" || p === "mic_off") && (
                <button onClick={reacquire} style={{ marginLeft: 8, fontSize: 12, padding: "3px 10px", cursor: "pointer" }}>Turn on</button>
              )}
              {p === "fullscreen_exit" && (
                <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} style={{ marginLeft: 8, fontSize: 12, padding: "3px 10px", cursor: "pointer" }}>Full screen</button>
              )}
            </div>
          ))}
        </div>
      )}

      {wide ? (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: 0 }}>
          <div style={{ overflowY: "auto", borderRight: `1px solid ${COLORS.border}` }}>{paperBox}</div>
          <div style={{ overflowY: "auto", background: "#fff" }}>{sheet}</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 5, background: "#fff", borderBottom: `1px solid ${COLORS.border}` }}>
            {[["paper", "Question paper"], ["answers", "My answers"]].map(([k, name]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "12px 0", fontSize: 14, fontWeight: 600, border: "none", background: "none", color: tab === k ? COLORS.red : COLORS.muted, borderBottom: `3px solid ${tab === k ? COLORS.red : "transparent"}`, cursor: "pointer" }}>
                {name}
              </button>
            ))}
          </div>
          <div style={{ background: tab === "answers" ? "#fff" : COLORS.tint }}>{tab === "paper" ? paperBox : sheet}</div>
        </>
      )}

      <video ref={videoRef} muted playsInline autoPlay style={{ position: "fixed", right: 10, bottom: 10, width: 104, height: 78, objectFit: "cover", borderRadius: 8, border: "2px solid #fff", transform: "scaleX(-1)", background: "#000", zIndex: 20, display: hasMediaRef.current ? "block" : "none" }} />
    </div>
  );
}
