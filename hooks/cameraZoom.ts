/**
 * Calcula o novo nível de zoom (0..1) a partir do baseZoom e da escala do pinch.
 * scale > 1 = pinch out (zoom in). scale < 1 = pinch in (zoom out).
 */
export function calculateZoomFromPinch(
  baseZoom: number,
  pinchScale: number,
  sensitivity: number = 0.5,
): number {
  const next = baseZoom + (pinchScale - 1) * sensitivity;
  return Math.max(0, Math.min(1, next));
}
