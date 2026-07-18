import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'

import { createForkifyGame, getForkifyPalette, readBestScore } from '../components/forkify/createForkifyGame'
import { renderForkifyScene } from '../components/forkify/renderForkifyScene'
import type { Phase, ResultsSummary } from '../components/forkify/types'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent } from '../lib/shadcn/card'

type StageSize = {
  viewportWidth: number
  viewportHeight: number
  width: number
  height: number
  dpr: number
  rotated: boolean
}

const INITIAL_RESULTS: ResultsSummary = {
  score: 0,
  pastaCollected: 0,
  badCollected: 0,
  combo: 0,
  bestCombo: 0,
  bestScore: 0,
}

function getStageSize(): StageSize {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 1280,
      viewportHeight: 720,
      width: 1280,
      height: 720,
      dpr: 1,
      rotated: false,
    }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const rotated = viewportHeight > viewportWidth

  return {
    viewportWidth,
    viewportHeight,
    width: rotated ? viewportHeight : viewportWidth,
    height: rotated ? viewportWidth : viewportHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    rotated,
  }
}

export default function ForkifyPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<ReturnType<typeof createForkifyGame> | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const sizeRef = useRef<StageSize>(getStageSize())
  const phaseRef = useRef<Phase>('splash')
  const bestScoreRef = useRef<number>(readBestScore())
  const resultsRef = useRef<ResultsSummary>(INITIAL_RESULTS)

  const [stageSize, setStageSize] = useState<StageSize>(() => getStageSize())
  const [phase, setPhase] = useState<Phase>('splash')
  const [bestScore, setBestScore] = useState<number>(() => readBestScore())
  const [results, setResults] = useState<ResultsSummary>(INITIAL_RESULTS)
  const palette = useMemo(() => getForkifyPalette(), [])

  const rotatedStageStyle = useMemo(() => {
    if (!stageSize.rotated) {
      return {
        width: `${stageSize.width}px`,
        height: `${stageSize.height}px`,
        transform: 'none',
        transformOrigin: 'top left',
      }
    }

    return {
      width: `${stageSize.width}px`,
      height: `${stageSize.height}px`,
      transform: 'rotate(90deg) translateY(-100%)',
      transformOrigin: 'top left',
    }
  }, [stageSize.height, stageSize.rotated, stageSize.width])

  useEffect(() => {
    const game = createForkifyGame(String(Date.now()), {
      onResults: (summary) => {
        resultsRef.current = summary
        bestScoreRef.current = summary.bestScore
        setResults(summary)
        setBestScore(summary.bestScore)
      },
    })

    gameRef.current = game
    const initialStageSize = getStageSize()
    sizeRef.current = initialStageSize
    setStageSize(initialStageSize)
    game.resize({ cssWidth: initialStageSize.width, cssHeight: initialStageSize.height, dpr: initialStageSize.dpr })

    const handleResize = () => {
      const next = getStageSize()
      sizeRef.current = next
      setStageSize(next)
      game.resize({ cssWidth: next.width, cssHeight: next.height, dpr: next.dpr })
    }

    const handleVisibility = () => {
      if (document.hidden) {
        lastTimeRef.current = null
      }
      game.setVisibility(document.hidden)
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }

    const handleCanvasPointerDown = (_event: PointerEvent) => {
      if (phaseRef.current === 'splash') {
        game.tap()
        phaseRef.current = 'playing'
        setPhase('playing')
      }
    }

    const renderLoop = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time
      }

      const dt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time
      game.update(dt)

      const snapshot = game.getSnapshot()
      if (snapshot.phase !== phaseRef.current) {
        phaseRef.current = snapshot.phase
        setPhase(snapshot.phase)
      }

      renderForkifyScene(canvas, snapshot, palette, sizeRef.current, {
        bestScore: bestScoreRef.current,
        resultSummary: phaseRef.current === 'results' ? resultsRef.current : null,
      })

      frameRef.current = window.requestAnimationFrame(renderLoop)
    }

    canvas.addEventListener('pointerdown', handleCanvasPointerDown)
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)
    frameRef.current = window.requestAnimationFrame(renderLoop)

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [palette])

  const stageClassName = 'absolute left-0 top-0 overflow-hidden bg-background'

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className={stageClassName} style={rotatedStageStyle}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          {phase === 'splash' ? (
            <Card className="w-full max-w-md border-border/80 bg-card/92 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center gap-6 px-8 py-10 text-center">
                <div className="space-y-3">
                  <div className="text-sm font-medium uppercase tracking-[0.32em] text-muted-foreground">Restaurant Logo</div>
                  <h1 className="text-5xl font-black tracking-tight text-foreground">🍝 Forkify 🍝</h1>
                </div>
                <div className="animate-pulse text-lg font-medium text-muted-foreground">Tap Anywhere</div>
              </CardContent>
            </Card>
          ) : null}

          {phase === 'results' ? (
            <Card className="w-full max-w-md border-border/80 bg-card/96 shadow-retool-lg backdrop-blur-sm">
              <CardContent className="space-y-8 px-8 py-8 text-center">
                <div className="space-y-3">
                  <Badge variant="destructive" className="mx-auto w-fit px-4 py-1 text-sm uppercase tracking-[0.24em]">
                    Game Over
                  </Badge>
                  <div className="space-y-1">
                    <div className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Final Score</div>
                    <div className="text-6xl font-black tracking-tight text-foreground">{results.score}</div>
                  </div>
                </div>

                <div className="grid gap-3 text-left text-lg">
                  <StatRow label="🍝 Pasta" value={results.pastaCollected} />
                  <StatRow label="🍕 Bad Food" value={results.badCollected} />
                  <StatRow label="🔥 Best Combo" value={`×${results.bestCombo}`} />
                  <StatRow label="🏆 Best Score" value={bestScore} />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="pointer-events-auto flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      gameRef.current?.restart()
                      resultsRef.current = INITIAL_RESULTS
                      setResults(INITIAL_RESULTS)
                      phaseRef.current = 'playing'
                      setPhase('playing')
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Play Again
                  </Button>
                  <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-secondary-foreground">
                    <Trophy className="h-4 w-4" />
                    <span className="font-semibold">Best {bestScore}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {phase !== 'results' ? (
          <div className="pointer-events-none absolute bottom-6 left-6">
            <Button
              size="lg"
              className="pointer-events-auto h-24 min-w-44 rounded-full bg-destructive px-10 text-lg font-black uppercase tracking-[0.24em] text-destructive-foreground shadow-retool-lg hover:bg-destructive/90"
              onClick={() => {
                gameRef.current?.tap()
                if (phaseRef.current === 'splash') {
                  phaseRef.current = 'playing'
                  setPhase('playing')
                }
              }}
              aria-label="Reverse vertical movement"
            >
              Tap
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  )
}
