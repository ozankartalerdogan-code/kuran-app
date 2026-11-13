export type Rect = { x: number; y: number; width: number; height: number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function clipTarget(target: Rect, bounds: Rect): Rect | null {
  if (![...Object.values(target), ...Object.values(bounds)].every(Number.isFinite) || target.width <= 0 || target.height <= 0) return null;
  const x = Math.max(target.x, bounds.x), y = Math.max(target.y, bounds.y);
  const right = Math.min(target.x + target.width, bounds.x + bounds.width);
  const bottom = Math.min(target.y + target.height, bounds.y + bounds.height);
  return right - x > 4 && bottom - y > 4 ? { x, y, width: right - x, height: bottom - y } : null;
}
export function placeTourCard(target: Rect, bounds: Rect, measuredHeight: number) {
  const width = Math.min(400, Math.max(0, bounds.width - 32));
  const x = bounds.x + (bounds.width - width) / 2;
  const height = Math.min(measuredHeight, Math.max(0, bounds.height - 32));
  const above = target.y - 16 - height;
  const below = target.y + target.height + 16;
  const fitsAbove = above >= bounds.y + 16;
  const fitsBelow = below + height <= bounds.y + bounds.height - 16;
  const arrow = fitsAbove ? "down" : fitsBelow ? "up" : null;
  const y = fitsAbove ? above : fitsBelow ? below : bounds.y + (bounds.height - height) / 2;
  return { x, y, width, maxHeight: bounds.height - 32, arrow,
    arrowX: clamp(target.x + target.width / 2 - x, 24, width - 24) };
}

// Ölçülen sekme içeriği sistem gezinme alanını dışlar; dolgu bu sınırı aşamaz.
export function tourSpotlight(target: Rect, bounds: Rect): Rect | null {
  const padded = { x: target.x - 4, y: target.y - 4, width: target.width + 8, height: target.height + 8 };
  const content = clipTarget(padded, target);
  return content ? clipTarget(content, bounds) : null;
}
