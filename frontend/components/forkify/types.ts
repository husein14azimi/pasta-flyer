export type CollectibleKind = 'pasta' | 'bad'

export type FoodEmoji = '🍝' | '🍕' | '🍔' | '🍟' | '🍩' | '🍣'

export type Phase = 'splash' | 'playing' | 'dying' | 'results'

export type WallSample = {
  x: number
  top: number
  bottom: number
}

export type Collectible = {
  id: string
  x: number
  y: number
  radius: number
  kind: CollectibleKind
  emoji: FoodEmoji
}

export type ScorePopup = {
  id: string
  x: number
  y: number
  value: number
  age: number
}

export type Stats = {
  score: number
  pastaCollected: number
  badCollected: number
  combo: number
  bestCombo: number
}

export type PlayerState = {
  x: number
  y: number
  vy: number
  radius: number
  ascending: boolean
  hasTapped: boolean
  angle: number
  alive: boolean
  embeddedAtY: number | null
}

export type Dimensions = {
  cssWidth: number
  cssHeight: number
  dpr: number
}

export type PatternPoint = {
  x: number
  y: number
  kind: CollectibleKind
  emoji: FoodEmoji
}

export type PatternTemplate = {
  id: string
  width: number
  points: PatternPoint[]
}

export type ResultsSummary = Stats & {
  bestScore: number
}

export type Palette = {
  background: string
  card: string
  foreground: string
  muted: string
  border: string
  danger: string
  success: string
  warning: string
  primary: string
}

export type WorldSnapshot = {
  phase: Phase
  score: number
  pastaCollected: number
  badCollected: number
  bestCombo: number
  distance: number
  topWall: WallSample[]
  bottomWall: WallSample[]
  collectibles: Collectible[]
  popups: ScorePopup[]
  player: PlayerState
  elapsedMs: number
  shake: number
}
