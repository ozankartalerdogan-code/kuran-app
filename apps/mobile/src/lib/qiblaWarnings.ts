export const TILT_ENTER_DEG = 55;
export const TILT_FAST_ENTER_DEG = 75;
export const TILT_EXIT_DEG = 45;
export const TILT_ENTER_MS = 800;
export const TILT_FAST_MS = 250;
export const TILT_EXIT_MS = 600;
export const MAG_MIN_UT = 20;
export const MAG_MAX_UT = 75;
export const MAG_SAFE_MIN_UT = 24;
export const MAG_SAFE_MAX_UT = 70;
export const MAG_ENTER_MS = 1500;
export const MAG_EXIT_MS = 2000;
export const ACC_INVALID_MS = 1200;
export const ACC_LOW_MS = 1500;
export const ACC_OK_MS = 1500;

export type QiblaWarningKind =
  | "tilted"
  | "magnetic_interference"
  | "low_accuracy"
  | "stale_location";

type TimedWarning = Readonly<{
  active: boolean;
  enterSince: number | null;
  fastSince: number | null;
  exitSince: number | null;
}>;

export type QiblaWarningState = Readonly<{
  tilt: TimedWarning;
  magnetic: TimedWarning;
  accuracy: TimedWarning;
  locationStale: boolean;
}>;

const toDeg = (radians: number): number => radians * 180 / Math.PI;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function calcTiltFromRotation(betaRad: number, gammaRad: number): number | null {
  if (!Number.isFinite(betaRad) || !Number.isFinite(gammaRad)) return null;
  return toDeg(Math.acos(clamp(Math.cos(betaRad) * Math.cos(gammaRad), -1, 1)));
}

export function calcTiltFromAccel(x: number, y: number, z: number): number | null {
  const norm = Math.hypot(x, y, z);
  if (!Number.isFinite(norm) || norm < 0.5 || norm > 1.5) return null;
  return toDeg(Math.acos(clamp(Math.abs(z) / norm, 0, 1)));
}

export function calcMagneticMagnitude(x: number, y: number, z: number): number | null {
  const magnitude = Math.hypot(x, y, z);
  return Number.isFinite(magnitude) ? magnitude : null;
}

function createTimedWarning(active = false): TimedWarning {
  return { active, enterSince: null, fastSince: null, exitSince: null };
}

export function createWarningState(): QiblaWarningState {
  return {
    tilt: createTimedWarning(),
    magnetic: createTimedWarning(),
    accuracy: createTimedWarning(),
    locationStale: false,
  };
}

// Each condition owns its timer: breaking it resets only that timer.
function stepTimedWarning(
  state: TimedWarning,
  enter: boolean,
  exit: boolean,
  nowMs: number,
  enterMs: number,
  exitMs: number,
  fast = false,
  fastMs = 0,
): TimedWarning {
  if (state.active) {
    const exitSince = exit ? Math.min(state.exitSince ?? nowMs, nowMs) : null;
    if (exitSince !== null && nowMs - exitSince >= exitMs) return createTimedWarning();
    return { active: true, enterSince: null, fastSince: null, exitSince };
  }
  const enterSince = enter ? Math.min(state.enterSince ?? nowMs, nowMs) : null;
  const fastSince = fast ? Math.min(state.fastSince ?? nowMs, nowMs) : null;
  if (
    (enterSince !== null && nowMs - enterSince >= enterMs) ||
    (fastSince !== null && nowMs - fastSince >= fastMs)
  ) return createTimedWarning(true);
  return { active: false, enterSince, fastSince, exitSince: null };
}

export function stepTilt(
  state: QiblaWarningState, tiltDeg: number | null, nowMs: number,
): QiblaWarningState {
  if (tiltDeg === null || !Number.isFinite(tiltDeg)) return state;
  return {
    ...state,
    tilt: stepTimedWarning(state.tilt, tiltDeg >= TILT_ENTER_DEG, tiltDeg <= TILT_EXIT_DEG,
      nowMs, TILT_ENTER_MS, TILT_EXIT_MS, tiltDeg >= TILT_FAST_ENTER_DEG, TILT_FAST_MS),
  };
}

export function stepMagnetic(
  state: QiblaWarningState, fieldUt: number | null, nowMs: number,
): QiblaWarningState {
  if (fieldUt === null || !Number.isFinite(fieldUt)) return state;
  return {
    ...state,
    magnetic: stepTimedWarning(state.magnetic, fieldUt < MAG_MIN_UT || fieldUt > MAG_MAX_UT,
      fieldUt >= MAG_SAFE_MIN_UT && fieldUt <= MAG_SAFE_MAX_UT,
      nowMs, MAG_ENTER_MS, MAG_EXIT_MS),
  };
}

export function stepAccuracy(
  state: QiblaWarningState, accuracy: number | null, nowMs: number,
): QiblaWarningState {
  if (accuracy === null || !Number.isFinite(accuracy)) return state;
  return {
    ...state,
    accuracy: stepTimedWarning(state.accuracy, accuracy <= 1, accuracy >= 2,
      nowMs, ACC_LOW_MS, ACC_OK_MS, accuracy <= 0, ACC_INVALID_MS),
  };
}

export function setLocationStale(state: QiblaWarningState, stale: boolean): QiblaWarningState {
  return { ...state, locationStale: stale };
}

export function selectActiveWarning(
  state: QiblaWarningState, compassAvailable: boolean,
): QiblaWarningKind | null {
  if (compassAvailable) {
    if (state.tilt.active) return "tilted";
    if (state.magnetic.active) return "magnetic_interference";
    if (state.accuracy.active) return "low_accuracy";
  }
  return state.locationStale ? "stale_location" : null;
}

export function isSensorUnreliable(warning: QiblaWarningKind | null): boolean {
  return warning === "tilted" || warning === "magnetic_interference" || warning === "low_accuracy";
}
