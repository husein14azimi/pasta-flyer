export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number) {
    return min + (max - min) * this.next()
  }

  int(min: number, max: number) {
    return Math.floor(this.range(min, max + 1))
  }

  pick<T>(items: readonly T[]) {
    const index = Math.min(items.length - 1, Math.floor(this.next() * items.length))
    return items[index]
  }
}

export function hashSeed(seedText: string) {
  let hash = 2166136261

  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
