import type { PatternTemplate } from './types'

export const PATTERN_LIBRARY: PatternTemplate[] = [
  {
    id: 'ladder-pass',
    width: 210,
    points: [
      { x: 0, y: -78, kind: 'pasta', emoji: '🍝' },
      { x: 72, y: -12, kind: 'bad', emoji: '🍕' },
      { x: 148, y: 68, kind: 'pasta', emoji: '🍝' },
    ],
  },
  {
    id: 'center-bait',
    width: 240,
    points: [
      { x: 0, y: 0, kind: 'pasta', emoji: '🍝' },
      { x: 76, y: -86, kind: 'bad', emoji: '🍔' },
      { x: 156, y: 92, kind: 'bad', emoji: '🍟' },
      { x: 208, y: 12, kind: 'pasta', emoji: '🍝' },
    ],
  },
  {
    id: 'stair-step',
    width: 260,
    points: [
      { x: 0, y: 94, kind: 'bad', emoji: '🍩' },
      { x: 74, y: 28, kind: 'pasta', emoji: '🍝' },
      { x: 150, y: -42, kind: 'pasta', emoji: '🍝' },
      { x: 220, y: -106, kind: 'bad', emoji: '🍣' },
    ],
  },
  {
    id: 'diamond-split',
    width: 228,
    points: [
      { x: 0, y: 0, kind: 'bad', emoji: '🍕' },
      { x: 76, y: -84, kind: 'pasta', emoji: '🍝' },
      { x: 76, y: 84, kind: 'pasta', emoji: '🍝' },
      { x: 164, y: 0, kind: 'bad', emoji: '🍔' },
    ],
  },
  {
    id: 'weave',
    width: 278,
    points: [
      { x: 0, y: -84, kind: 'pasta', emoji: '🍝' },
      { x: 70, y: 32, kind: 'bad', emoji: '🍟' },
      { x: 138, y: -12, kind: 'pasta', emoji: '🍝' },
      { x: 206, y: 94, kind: 'bad', emoji: '🍣' },
      { x: 262, y: 18, kind: 'pasta', emoji: '🍝' },
    ],
  },
  {
    id: 'risk-reward',
    width: 248,
    points: [
      { x: 0, y: -98, kind: 'bad', emoji: '🍔' },
      { x: 48, y: -18, kind: 'pasta', emoji: '🍝' },
      { x: 126, y: 34, kind: 'pasta', emoji: '🍝' },
      { x: 206, y: 106, kind: 'bad', emoji: '🍕' },
    ],
  },
]
