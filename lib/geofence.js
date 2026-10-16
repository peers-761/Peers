// School location — corrected from an on-the-ground Google Maps pin
// (2 Oct 2026). Update these if the pin ever needs correcting again.
export const SCHOOL_LAT = 31.6008961;
export const SCHOOL_LNG = 74.3405751;

// Base campus radius — how far from the pin the school grounds are
// assumed to extend (the school is fairly large, so this is generous).
export const GEOFENCE_RADIUS_METERS = 20;

// Phone GPS is never pixel-perfect — a reading of "35m away" while
// physically standing on the exact pinned spot is normal, especially with
// a weak signal or indoors. Every GPS reading comes with its own
// "accuracy" value (the radius, in meters, the phone itself says the
// reading could be off by) — a good practice is to allow for that
// uncertainty instead of comparing against a single hard-coded number
// that assumes perfect GPS. This is capped so a wildly inaccurate or
// spoofed reading can't be used to bypass the check from far away.
export const MAX_ACCURACY_ALLOWANCE_METERS = 50;

// Haversine formula — distance between two lat/lng points in meters.
export function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// `accuracy` is the phone's own reported GPS uncertainty radius (meters),
// e.g. from navigator.geolocation's position.coords.accuracy. Optional —
// if not provided (older client), this behaves exactly as a plain
// fixed-radius check.
export function isWithinSchoolGeofence(lat, lng, accuracy) {
  const distance = distanceInMeters(lat, lng, SCHOOL_LAT, SCHOOL_LNG);
  const allowance = Math.min(Number(accuracy) || 0, MAX_ACCURACY_ALLOWANCE_METERS);
  return distance <= GEOFENCE_RADIUS_METERS + allowance;
}
