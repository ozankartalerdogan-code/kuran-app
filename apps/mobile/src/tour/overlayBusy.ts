import { useSyncExternalStore } from "react";

const locks = new Set<symbol>();
const listeners = new Set<() => void>();
const contextualHints = new Set<symbol>();
export const isContextualHintOpen = () => contextualHints.size > 0;
// İpucu kendisini engellemeden değerlendirme isteğini durdurur.
export function beginContextualHint() {
  const token = Symbol();
  contextualHints.add(token);
  return () => { contextualHints.delete(token); };
}
export const isOverlayBusy = () => locks.size > 0;
const notify = () => listeners.forEach(listener => listener());
export function beginOverlay() {
  const token = Symbol();
  locks.add(token);
  notify();
  return () => { locks.delete(token); notify(); };
}
export async function withOverlayBusy<T>(action: () => Promise<T>): Promise<T> {
  const end = beginOverlay();
  try { return await action(); } finally { end(); }
}
export function useOverlayBusy() {
  return useSyncExternalStore(listener => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, isOverlayBusy, isOverlayBusy);
}
