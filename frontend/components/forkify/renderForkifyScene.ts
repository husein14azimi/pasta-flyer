import { FOOD_EMOJI_FONT, GAME_CONFIG, HUD_FONT, HUD_SCORE_FONT, POPUP_FONT } from './gameConfig'
import { clamp, formatSignedScore } from './math'
import { getScrollGradientColors } from './createForkifyGame'
import type { Palette, ResultsSummary, WorldSnapshot } from './types'

type RenderSize = {
  width: number
  height: number
  dpr: number
}

type OverlayState = {
  bestScore: number
  resultSummary: ResultsSummary | null
}

type ViewportMetrics = {
  scale: number
  offsetX: number
  offsetY: number
}

export function renderForkifyScene(
  canvas: HTMLCanvasElement,
  snapshot: WorldSnapshot,
  palette: Palette,
  size: RenderSize,
  overlayState: OverlayState,
) {
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const { width, height, dpr } = size
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  const metrics = getViewportMetrics(width, height)
  const shakeOffsetX = snapshot.shake > 0 ? Math.sin(snapshot.elapsedMs * 0.08) * snapshot.shake : 0
  const shakeOffsetY = snapshot.shake > 0 ? Math.cos(snapshot.elapsedMs * 0.12) * snapshot.shake * 0.55 : 0

  drawBackground(context, width, height, palette)

  context.save()
  context.translate(metrics.offsetX + shakeOffsetX, metrics.offsetY + shakeOffsetY)
  context.scale(metrics.scale, metrics.scale)

  drawCorridorGlow(context, palette)
  drawWalls(context, snapshot, palette, false)
  drawCollectibles(context, snapshot)
  drawFork(context, snapshot)
  drawScorePopups(context, snapshot)
  drawWalls(context, snapshot, palette, true)
  drawHud(context, snapshot, palette, overlayState)

  context.restore()
}

function getViewportMetrics(width: number, height: number): ViewportMetrics {
  const scale = Math.min(width / GAME_CONFIG.worldWidth, height / GAME_CONFIG.worldHeight)
  return {
    scale,
    offsetX: (width - GAME_CONFIG.worldWidth * scale) * 0.5,
    offsetY: (height - GAME_CONFIG.worldHeight * scale) * 0.5,
  }
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number, palette: Palette) {
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, palette.background)
  gradient.addColorStop(1, palette.card)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalAlpha = 0.16
  context.strokeStyle = palette.border
  context.lineWidth = 2
  for (let x = -height; x < width + height; x += 64) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x + height, height)
    context.stroke()
  }
  context.restore()
}

function drawCorridorGlow(context: CanvasRenderingContext2D, palette: Palette) {
  const gradient = context.createLinearGradient(0, 0, 0, GAME_CONFIG.worldHeight)
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.08)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(1, 'rgba(239, 68, 68, 0.08)')
  context.fillStyle = gradient
  context.fillRect(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight)

  context.save()
  context.strokeStyle = palette.border
  context.setLineDash([6, 16])
  context.globalAlpha = 0.35
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(0, GAME_CONFIG.worldHeight * 0.5)
  context.lineTo(GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight * 0.5)
  context.stroke()
  context.restore()
}

function drawWalls(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  palette: Palette,
  foregroundPass: boolean,
) {
  const topBase = foregroundPass ? 'rgba(255, 244, 214, 0.6)' : 'rgba(241, 180, 59, 0.95)'
  const bottomBase = foregroundPass ? 'rgba(255, 239, 194, 0.55)' : 'rgba(219, 158, 44, 0.95)'

  context.save()
  if (!foregroundPass) {
    context.fillStyle = topBase
    context.beginPath()
    context.moveTo(0, 0)
    for (const sample of snapshot.topWall) {
      context.lineTo(sample.x, sample.top)
    }
    context.lineTo(GAME_CONFIG.worldWidth, 0)
    context.closePath()
    context.fill()

    context.fillStyle = bottomBase
    context.beginPath()
    context.moveTo(0, GAME_CONFIG.worldHeight)
    for (const sample of snapshot.bottomWall) {
      context.lineTo(sample.x, GAME_CONFIG.worldHeight - sample.bottom)
    }
    context.lineTo(GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight)
    context.closePath()
    context.fill()
  }

  const strandCount = foregroundPass ? 8 : 15
  const strandWidth = foregroundPass ? 6 : 4
  const flow = (snapshot.elapsedMs * 0.24) % 120
  const scrollColors = getScrollGradientColors()
  const highlight = scrollColors[0]
  const transparent = scrollColors[1]
  const strandGradient = context.createLinearGradient(0, 0, GAME_CONFIG.worldWidth, 0)
  strandGradient.addColorStop(0, transparent)
  strandGradient.addColorStop(0.5, highlight)
  strandGradient.addColorStop(1, transparent)

  context.globalAlpha = foregroundPass ? 0.65 : 0.38
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = strandGradient
  context.lineWidth = strandWidth

  for (let strand = 0; strand < strandCount; strand += 1) {
    const topDepth = 18 + strand * (foregroundPass ? 7 : 9)
    const bottomDepth = 16 + strand * (foregroundPass ? 8 : 10)
    const xShift = ((strand * 19 + flow) % 120) - 60
    drawWallStrand(context, snapshot.topWall, topDepth, xShift, true)
    drawWallStrand(context, snapshot.bottomWall, bottomDepth, xShift * 0.8, false)
  }

  context.restore()

  if (!foregroundPass) {
    context.save()
    context.strokeStyle = palette.warning
    context.globalAlpha = 0.14
    context.lineWidth = 2
    context.beginPath()
    const firstTop = snapshot.topWall[0]
    if (firstTop) {
      context.moveTo(firstTop.x, firstTop.top)
    }
    for (const sample of snapshot.topWall) {
      context.lineTo(sample.x, sample.top)
    }
    context.stroke()
    context.beginPath()
    const firstBottom = snapshot.bottomWall[0]
    if (firstBottom) {
      context.moveTo(firstBottom.x, GAME_CONFIG.worldHeight - firstBottom.bottom)
    }
    for (const sample of snapshot.bottomWall) {
      context.lineTo(sample.x, GAME_CONFIG.worldHeight - sample.bottom)
    }
    context.stroke()
    context.restore()
  }
}

function drawWallStrand(
  context: CanvasRenderingContext2D,
  wall: WorldSnapshot['topWall'],
  depth: number,
  xShift: number,
  topWall: boolean,
) {
  context.beginPath()
  wall.forEach((sample, index) => {
    const x = sample.x + xShift + Math.sin((sample.x + depth * 8 + xShift * 6) * 0.02) * 3
    const edge = topWall ? sample.top : GAME_CONFIG.worldHeight - sample.bottom
    const y = topWall ? edge - depth : edge + depth
    if (index === 0) {
      context.moveTo(x, y)
      return
    }
    context.lineTo(x, y)
  })
  context.stroke()
}

function drawCollectibles(context: CanvasRenderingContext2D, snapshot: WorldSnapshot) {
  context.save()
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = FOOD_EMOJI_FONT

  for (const item of snapshot.collectibles) {
    const pulse = 1 + Math.sin((snapshot.elapsedMs * 0.008) + item.x * 0.03) * 0.04
    context.save()
    context.translate(item.x, item.y)
    context.scale(pulse, pulse)
    context.fillText(item.emoji, 0, 0)
    context.restore()
  }

  context.restore()
}

function drawFork(context: CanvasRenderingContext2D, snapshot: WorldSnapshot) {
  const { player } = snapshot

  context.save()
  context.translate(player.x, player.y)
  context.rotate(player.angle)

  const metalGradient = context.createLinearGradient(-36, -12, 42, 16)
  metalGradient.addColorStop(0, '#f8fafc')
  metalGradient.addColorStop(0.45, '#cbd5e1')
  metalGradient.addColorStop(1, '#94a3b8')

  context.shadowColor = 'rgba(15, 23, 42, 0.3)'
  context.shadowBlur = 16
  context.shadowOffsetY = 6

  context.fillStyle = metalGradient
  context.beginPath()
  context.moveTo(-36, -8)
  context.quadraticCurveTo(-10, -16, 20, -12)
  context.lineTo(42, -12)
  context.lineTo(42, 12)
  context.lineTo(20, 12)
  context.quadraticCurveTo(-10, 16, -36, 8)
  context.closePath()
  context.fill()

  context.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(-28, -2)
  context.lineTo(22, -7)
  context.stroke()

  context.shadowBlur = 0
  context.shadowOffsetY = 0
  context.fillStyle = '#cbd5e1'
  const tineXs = [30, 38, 46]
  for (const tineX of tineXs) {
    context.fillRect(tineX, -16, 5, 32)
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.6)'
  context.beginPath()
  context.arc(-12, -4, 3, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawScorePopups(context: CanvasRenderingContext2D, snapshot: WorldSnapshot) {
  context.save()
  context.font = POPUP_FONT
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  for (const popup of snapshot.popups) {
    const life = clamp(1 - popup.age / GAME_CONFIG.popupLifetime, 0, 1)
    context.globalAlpha = life
    context.fillStyle = popup.value > 0 ? '#166534' : '#b91c1c'
    context.fillText(formatSignedScore(popup.value), popup.x, popup.y)
  }

  context.restore()
}

function drawHud(
  context: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  palette: Palette,
  overlayState: OverlayState,
) {
  drawHudCard(context, 28, 24, 210, 92, 'RED PLAYER', String(snapshot.score), '#991b1b', '#fee2e2')
  drawHudCard(context, GAME_CONFIG.worldWidth - 238, 24, 210, 92, '', '', '#166534', 'rgba(220,252,231,0.35)', 'GREEN')
  drawHudCard(context, 28, GAME_CONFIG.worldHeight - 116, 210, 92, 'RED PLAYER', String(snapshot.score), '#b91c1c', 'rgba(254,226,226,0.55)')
  drawHudCard(
    context,
    GAME_CONFIG.worldWidth - 238,
    GAME_CONFIG.worldHeight - 116,
    210,
    92,
    '',
    '',
    '#1d4ed8',
    'rgba(219,234,254,0.5)',
    'BLUE',
  )

  context.save()
  context.font = '600 18px var(--font-sans, Inter, sans-serif)'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillStyle = palette.muted
  context.fillText(`BEST ${Math.max(overlayState.bestScore, overlayState.resultSummary?.bestScore ?? 0)}`, 34, 138)
  context.restore()
}

function drawHudCard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  accent: string,
  background: string,
  placeholderLabel?: string,
) {
  context.save()
  context.fillStyle = background
  roundRect(context, x, y, width, height, 22)
  context.fill()

  context.strokeStyle = accent
  context.lineWidth = 3
  roundRect(context, x, y, width, height, 22)
  context.stroke()

  if (label) {
    context.fillStyle = accent
    context.font = HUD_FONT
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillText(label, x + 18, y + 16)
  } else if (placeholderLabel) {
    context.fillStyle = accent
    context.globalAlpha = 0.45
    context.font = HUD_FONT
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillText(placeholderLabel, x + 18, y + 16)
    context.globalAlpha = 1
  }

  if (value) {
    context.fillStyle = '#111827'
    context.font = HUD_SCORE_FONT
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    context.fillText(value, x + 18, y + 72)
  }

  context.restore()
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}
