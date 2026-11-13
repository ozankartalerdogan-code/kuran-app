export function needsWelcome(done: string | null, started: string | null, notification: string | null,
  legacyTour: string | null, guideRaw: string | null): boolean {
  if (done === "1" || legacyTour !== null) return false;
  if (started === "1") return true;
  // Bu sürümün yarım kalan kurulumları bildirim tercihi yazmış olabilir.
  try {
    const guide = guideRaw === null ? null : JSON.parse(guideRaw);
    if (guideRaw !== null) return guide?.version === 7 && guide.status === "eligible";
  } catch { return false; }
  return notification === null;
}
