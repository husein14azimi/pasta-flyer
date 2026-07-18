import { GAME_CONFIG } from './gameConfig'
import { clamp, distanceSquared, easeInCubic, easeOutQuad, lerp } from './math'
import { PATTERN_LIBRARY } from './patterns'
import { SeededRandom, hashSeed } from './random'
import type {
  Collectible,
  Dimensions,
  FoodEmoji,
  Palette,
  PatternTemplate,
  Phase,
  PlayerState,
  ResultsSummary,
  ScorePopup,
  Stats,
  WallSample,
  WorldSnapshot,
} from './types'

type Callbacks = {
  onResults: (results: ResultsSummary) => void
}

type GameController = {
  start: () => void
  restart: () => void
  tap: () => void
  resize: (dimensions: Dimensions) => void
  setVisibility: (hidden: boolean) => void
  update: (dtSeconds: number) => void
  getSnapshot: () => WorldSnapshot
}

const WALL_SEGMENTS = 80
const COLLECTIBLE_RADIUS = 24
const PLAYER_TILT_DAMPING = 8
const BAD_EMOJIS: FoodEmoji[] = ['🍕', '🍔', '🍟', '🍩', '🍣']
const SCROLL_GRADIENT_COLORS = ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'] as const

export function createForkifyGame(seedText: string, callbacks: Callbacks): GameController {
  const initialSeed = hashSeed(seedText)
  let random = new SeededRandom(initialSeed)
  let runCount = 0

  let phase: Phase = 'splash'
  let player = createPlayer()
  let stats = createStats()
  let distance = 0
  let elapsedMs = 0
  let deathTimer = 0
  let screenShake = 0
  let bestScore = readBestScore()
  let isHidden = false
  let deathEmbedDirection = 0
  let collectibles: Collectible[] = []
  let popups: ScorePopup[] = []
  let nextSpawnX = GAME_CONFIG.worldWidth + GAME_CONFIG.spawnInitialOffset

  function createPlayer(): PlayerState {
    return {
      x: GAME_CONFIG.worldWidth * GAME_CONFIG.playerXRatio,
      y: GAME_CONFIG.worldHeight * GAME_CONFIG.playerStartYRatio,
      vy: 0,
      radius: GAME_CONFIG.playerRadius,
      ascending: false,
      hasTapped: false,
      angle: 0,
      alive: true,
      embeddedAtY: null,
    }
  }

  function createStats(): Stats {
    return {
      score: 0,
      pastaCollected: 0,
      badCollected: 0,
      combo: 0,
      bestCombo: 0,
    }
  }

  function restartRun() {
    random = new SeededRandom((initialSeed + Math.imul(runCount, 1013904223)) >>> 0)
    runCount += 1
    phase = 'playing'
    player = createPlayer()
    stats = createStats()
    distance = 0
    elapsedMs = 0
    deathTimer = 0
    screenShake = 0
    collectibles = []
    popups = []
    nextSpawnX = GAME_CONFIG.worldWidth + GAME_CONFIG.spawnInitialOffset
    ensureSpawnCoverage()
  }

  function start() {
    if (phase === 'splash') {
      restartRun()
    }
  }

  function restart() {
    restartRun()
  }

  function tap() {
    if (phase === 'splash') {
      start()
      return
    }

    if (phase === 'results') {
      restart()
      return
    }

    if (phase !== 'playing') {
      return
    }

    if (!player.hasTapped) {
      player.hasTapped = true
      player.ascending = true
      return
    }

    player.ascending = !player.ascending
  }

  function resize(_nextDimensions: Dimensions) {
    // The world uses a fixed internal landscape coordinate system.
  }

  function setVisibility(hidden: boolean) {
    isHidden = hidden
  }

  function getDifficulty() {
    return clamp(distance / GAME_CONFIG.difficultyDistance, 0, 1)
  }

  function getCorridorGapAt(progress: number) {
    return lerp(GAME_CONFIG.wallMinGapStart, GAME_CONFIG.wallMinGapEnd, progress)
  }

  function sampleCorridor(x: number): WallSample {
    const progress = getDifficulty()
    const baseGap = getCorridorGapAt(progress)
    const normalizedX = x / 410
    const topNoise =
      Math.sin(normalizedX * 1.31 + 0.4) * 34 +
      Math.sin(normalizedX * 2.47 + 1.3) * 18 +
      Math.sin(normalizedX * 4.18 + 2.1) * 12
    const bottomNoise =
      Math.sin(normalizedX * 1.18 + 2.2) * 28 +
      Math.sin(normalizedX * 2.92 + 0.6) * 20 +
      Math.sin(normalizedX * 4.6 + 1.8) * 14
    const driftNoise = Math.sin(normalizedX * 0.58 + 0.9) * 32 * (0.35 + progress * 0.65)
    const topThickness = GAME_CONFIG.wallBaseThickness + topNoise * (0.8 + progress * 0.45) + driftNoise
    const bottomThickness = GAME_CONFIG.wallBaseThickness + bottomNoise * (0.75 + progress * 0.55) - driftNoise * 0.7
    const gap = Math.max(baseGap, GAME_CONFIG.wallMinGapEnd)

    let top = clamp(topThickness, 58, GAME_CONFIG.worldHeight - gap - 90)
    let bottom = clamp(bottomThickness, 58, GAME_CONFIG.worldHeight - gap - top)

    const usedSpace = top + bottom + gap
    if (usedSpace > GAME_CONFIG.worldHeight) {
      const overflow = usedSpace - GAME_CONFIG.worldHeight
      top = Math.max(58, top - overflow * 0.5)
      bottom = Math.max(58, bottom - overflow * 0.5)
    }

    return {
      x,
      top,
      bottom,
    }
  }

  function getWallCollisionBounds(worldX: number) {
    const corridor = sampleCorridor(worldX)
    return {
      topBoundary: corridor.top - GAME_CONFIG.wallForgiveness,
      bottomBoundary: GAME_CONFIG.worldHeight - corridor.bottom + GAME_CONFIG.wallForgiveness,
      sample: corridor,
    }
  }

  function clampPatternCenterY(template: PatternTemplate) {
    const minYOffset = Math.min(...template.points.map((point) => point.y))
    const maxYOffset = Math.max(...template.points.map((point) => point.y))
    const sample = sampleCorridor(nextSpawnX + template.width * 0.5)
    const topLimit = sample.top + GAME_CONFIG.wallSafePadding - minYOffset
    const bottomLimit = GAME_CONFIG.worldHeight - sample.bottom - GAME_CONFIG.wallSafePadding - maxYOffset
    return {
      min: topLimit,
      max: bottomLimit,
    }
  }

  function createPatternPattern(template: PatternTemplate) {
    const difficulty = getDifficulty()
    const safeRange = clampPatternCenterY(template)
    const fallbackCenter = GAME_CONFIG.worldHeight * 0.5
    const centerY =
      safeRange.min < safeRange.max
        ? random.range(safeRange.min, safeRange.max)
        : fallbackCenter

    const spawned: Collectible[] = template.points.map((point, index) => ({
      id: `${template.id}-${Math.round(nextSpawnX)}-${index}-${Math.round(distance)}`,
      x: nextSpawnX + point.x,
      y: centerY + point.y * (0.95 + difficulty * 0.08),
      radius: COLLECTIBLE_RADIUS,
      kind: point.kind,
      emoji: point.kind === 'pasta' ? '🍝' : BAD_EMOJIS[random.int(0, BAD_EMOJIS.length - 1)]!,
    }))

    collectibles.push(...spawned)
    const spacing = lerp(GAME_CONFIG.spawnSpacingStart, GAME_CONFIG.spawnSpacingEnd, difficulty)
    nextSpawnX += template.width + spacing + random.range(-22, 24)
  }

  function ensureSpawnCoverage() {
    while (nextSpawnX < GAME_CONFIG.worldWidth + GAME_CONFIG.spawnLookahead) {
      createPatternPattern(PATTERN_LIBRARY[random.int(0, PATTERN_LIBRARY.length - 1)]!)
    }
  }

  function collectItem(item: Collectible) {
    const scoreDelta = item.kind === 'pasta' ? GAME_CONFIG.pastaScore : GAME_CONFIG.badFoodScore
    stats.score += scoreDelta

    if (item.kind === 'pasta') {
      stats.pastaCollected += 1
      stats.combo += 1
      stats.bestCombo = Math.max(stats.bestCombo, stats.combo)
    } else {
      stats.badCollected += 1
      stats.combo = 0
    }

    popups.push({
      id: `${item.id}-popup`,
      x: player.x + 12,
      y: player.y - 14,
      value: scoreDelta,
      age: 0,
    })
  }

  function triggerDeath(embedDirection: number) {
    if (phase !== 'playing') {
      return
    }

    phase = 'dying'
    deathTimer = 0
    screenShake = 12
    deathEmbedDirection = embedDirection
    player.alive = false
    player.vy = 0
    player.embeddedAtY = player.y
  }

  function finalizeResults() {
    phase = 'results'
    bestScore = Math.max(bestScore, stats.score)
    writeBestScore(bestScore)
    callbacks.onResults({
      ...stats,
      bestScore,
    })
  }

  function updatePlaying(dtSeconds: number) {
    const difficulty = getDifficulty()
    const speed = GAME_CONFIG.forwardSpeed * (1 + difficulty * 0.26)
    distance += speed * dtSeconds
    elapsedMs += dtSeconds * 1000

    player.vy = player.hasTapped ? (player.ascending ? -GAME_CONFIG.verticalSpeed : GAME_CONFIG.verticalSpeed) : 0
    player.y += player.vy * dtSeconds
    const targetAngle = Math.atan2(player.vy, GAME_CONFIG.forwardSpeed)
    player.angle = lerp(player.angle, clamp(targetAngle, -GAME_CONFIG.maxPitch, GAME_CONFIG.maxPitch), clamp(dtSeconds * PLAYER_TILT_DAMPING, 0, 1))

    const playerBounds = getWallCollisionBounds(player.x)
    const hitTop = player.y - player.radius <= playerBounds.topBoundary
    const hitBottom = player.y + player.radius >= playerBounds.bottomBoundary
    if (hitTop || hitBottom) {
      player.y = clamp(player.y, playerBounds.topBoundary + player.radius, playerBounds.bottomBoundary - player.radius)
      triggerDeath(hitTop ? -1 : 1)
      return
    }

    const scrollSpeed = speed
    nextSpawnX -= scrollSpeed * dtSeconds
    collectibles = collectibles.filter((item) => item.x + item.radius > -80)

    for (const item of collectibles) {
      item.x -= scrollSpeed * dtSeconds
    }

    const remaining: Collectible[] = []
    for (const item of collectibles) {
      const hitRadius = player.radius + item.radius
      const hit = distanceSquared(player.x, player.y, item.x, item.y) <= hitRadius * hitRadius
      if (hit) {
        collectItem(item)
      } else {
        remaining.push(item)
      }
    }
    collectibles = remaining

    for (const popup of popups) {
      popup.age += dtSeconds
      popup.y -= 38 * dtSeconds
    }
    popups = popups.filter((popup) => popup.age < GAME_CONFIG.popupLifetime)

    if (screenShake > 0) {
      screenShake = Math.max(0, screenShake - dtSeconds * 28)
    }

    ensureSpawnCoverage()
  }

  function updateDying(dtSeconds: number) {
    elapsedMs += dtSeconds * 1000
    deathTimer += dtSeconds
    const deathProgress = clamp(deathTimer / GAME_CONFIG.deathDuration, 0, 1)
    const eased = easeOutQuad(deathProgress)

    if (player.embeddedAtY !== null) {
      player.y = lerp(player.embeddedAtY, player.embeddedAtY + deathEmbedDirection * 14, easeInCubic(deathProgress))
    }

    const deathScrollSpeed = GAME_CONFIG.forwardSpeed * 0.9
    player.x -= GAME_CONFIG.deathDriftSpeed * dtSeconds * (1 + deathProgress * GAME_CONFIG.deathScrollFactor)
    player.angle = lerp(player.angle, -0.15, clamp(dtSeconds * 6, 0, 1))

    nextSpawnX -= deathScrollSpeed * dtSeconds
    collectibles = collectibles.filter((item) => item.x + item.radius > -80)
    for (const item of collectibles) {
      item.x -= deathScrollSpeed * dtSeconds
    }

    for (const popup of popups) {
      popup.age += dtSeconds
      popup.y -= 34 * dtSeconds
    }
    popups = popups.filter((popup) => popup.age < GAME_CONFIG.popupLifetime)
    screenShake = lerp(screenShake, 0, clamp(dtSeconds * 10, 0, 1))

    if (eased >= 1) {
      finalizeResults()
    }
  }

  function update(dtSeconds: number) {
    if (isHidden) {
      return
    }

    const dt = Math.min(dtSeconds, GAME_CONFIG.maxDt)

    if (phase === 'playing') {
      updatePlaying(dt)
      return
    }

    if (phase === 'dying') {
      updateDying(dt)
      return
    }

    if (phase === 'splash') {
      elapsedMs += dt * 1000
      const idleScrollSpeed = GAME_CONFIG.forwardSpeed * GAME_CONFIG.idleScrollFactor
      nextSpawnX -= idleScrollSpeed * dt
      ensureSpawnCoverage()
      for (const item of collectibles) {
        item.x -= idleScrollSpeed * dt
      }
      collectibles = collectibles.filter((item) => item.x + item.radius > -80)
      return
    }

    elapsedMs += dt * 1000
  }

  function buildWallSamples() {
    const topWall: WallSample[] = []
    const bottomWall: WallSample[] = []
    const step = GAME_CONFIG.worldWidth / WALL_SEGMENTS

    for (let index = 0; index <= WALL_SEGMENTS; index += 1) {
      const x = index * step
      const sample = sampleCorridor(x)
      topWall.push(sample)
      bottomWall.push(sample)
    }

    return { topWall, bottomWall }
  }

  function getSnapshot(): WorldSnapshot {
    const walls = buildWallSamples()
    return {
      phase,
      score: stats.score,
      pastaCollected: stats.pastaCollected,
      badCollected: stats.badCollected,
      bestCombo: stats.bestCombo,
      distance,
      topWall: walls.topWall,
      bottomWall: walls.bottomWall,
      collectibles,
      popups,
      player,
      elapsedMs,
      shake: screenShake,
    }
  }

  phase = 'splash'
  nextSpawnX = GAME_CONFIG.worldWidth + GAME_CONFIG.spawnInitialOffset
  ensureSpawnCoverage()

  return {
    start,
    restart,
    tap,
    resize,
    setVisibility,
    update,
    getSnapshot,
  }
}

export function readBestScore() {
  if (typeof window === 'undefined') {
    return 0
  }

  const stored = window.localStorage.getItem(GAME_CONFIG.storageKey)
  if (!stored) {
    return 0
  }

  const parsed = Number(stored)
  return Number.isFinite(parsed) ? parsed : 0
}

export function writeBestScore(score: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(GAME_CONFIG.storageKey, String(score))
}

export function getForkifyPalette(): Palette {
  if (typeof window === 'undefined') {
    return {
      background: '#f7f2eb',
      card: '#fffaf3',
      foreground: '#2f1e17',
      muted: '#7b665f',
      border: '#d8c3b4',
      danger: '#c2410c',
      success: '#166534',
      warning: '#f59e0b',
      primary: '#8b1e3f',
    }
  }

  const styles = getComputedStyle(document.documentElement)
  const value = (name: string, fallback: string) => {
    const raw = styles.getPropertyValue(name).trim()
    return raw ? `hsl(${raw})` : fallback
  }

  return {
    background: value('--background', '#f7f2eb'),
    card: value('--card', '#fffaf3'),
    foreground: value('--foreground', '#2f1e17'),
    muted: value('--muted-foreground', '#7b665f'),
    border: value('--border', '#d8c3b4'),
    danger: value('--destructive', '#c2410c'),
    success: value('--success', '#166534'),
    warning: value('--warning', '#f59e0b'),
    primary: value('--primary', '#8b1e3f'),
  }
}

export function getScrollGradientColors() {
  return SCROLL_GRADIENT_COLORS
}
