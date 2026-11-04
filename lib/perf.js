// Small helpers so heavy effects only run where they will feel smooth.

// "Lite" = the visitor asked for less motion, or the device is modest.
export function isLite() {
  if (typeof window === "undefined") return true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return !!reduce || cores <= 4 || mem <= 3;
}

// Mouse / trackpad present (so hover effects make sense).
export function canHover() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
}
