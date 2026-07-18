export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha
}

export function easeOutQuad(value: number) {
  return 1 - (1 - value) * (1 - value)
}

export function easeInCubic(value: number) {
  return value * value * value
}

export function distanceSquared(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

export function formatSignedScore(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

export function readCssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value ? `hsl(${value})` : fallback
}
