export const GAME_CONFIG = {
  worldWidth: 1600,
  worldHeight: 900,
  playerXRatio: 0.22,
  playerStartYRatio: 0.5,
  playerRadius: 24,
  forwardSpeed: 340,
  verticalSpeed: 260,
  maxPitch: 0.58,
  pastaScore: 10,
  badFoodScore: -15,
  wallForgiveness: 16,
  wallSafePadding: 64,
  wallBaseThickness: 108,
  wallMinGapStart: 360,
  wallMinGapEnd: 272,
  spawnInitialOffset: 220,
  spawnLookahead: 260,
  spawnSpacingStart: 340,
  spawnSpacingEnd: 205,
  popupLifetime: 0.78,
  deathDuration: 1.3,
  deathDriftSpeed: 290,
  deathScrollFactor: 0.8,
  difficultyDistance: 9000,
  idleScrollFactor: 0.24,
  maxDt: 1 / 30,
  storageKey: 'forkify-best-score',
} as const

export const FOOD_EMOJI_FONT = '38px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
export const HUD_FONT = '600 24px var(--font-sans, Inter, sans-serif)'
export const HUD_SCORE_FONT = '700 36px var(--font-sans, Inter, sans-serif)'
export const POPUP_FONT = '700 28px var(--font-sans, Inter, sans-serif)'
