export function pinchScale(startScale: number, startDistance: number, distance: number): number {
  if (startDistance <= 0 || distance <= 0) return startScale;
  return Math.min(2.5, Math.max(0.5, startScale * distance / startDistance));
}
