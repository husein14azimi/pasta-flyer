# Forkify

Forkify is a lightweight, client-only arcade game built for quick restaurant wait-time sessions. The player controls a flying fork, collects pasta, dodges penalty foods, and survives inside a narrowing spaghetti corridor using a single input.

The implementation in this sandbox is intentionally simple, deterministic, and easy to extend.

## What the player experiences

- Instant launch with no login, backend, or setup
- Minimal splash screen with a single visual prompt
- One-button play: every tap reverses vertical movement
- Constant forward motion
- A fork that naturally tilts with its direction
- Animated spaghetti walls that feel organic and slightly forgiving
- Reusable collectible formations made of pasta and bad foods
- Score popups that originate from the fork
- A brief death sequence when the fork hits a wall
- Results screen with final score, pasta count, bad food count, best combo, and replay

## MVP feature set

Implemented for version 1:

- Single active red player slot
- Landscape game world rendered inside a single canvas
- Portrait-device support by rotating the rendered stage into a landscape presentation
- Deterministic seeded gameplay runs
- Distance-based difficulty ramp
- Local best score persistence via `localStorage`
- Pause behavior when the tab becomes hidden

Not implemented by design:

- Multiplayer
- Backend services
- Accounts
- Cloud save
- Sound and music
- Power-ups
- Online features

## Tech stack

This sandbox is Vite-powered, so the game is implemented with the available platform stack while preserving the product goals.

| Technology | Version | Why it is used |
| --- | --- | --- |
| React | 19.2.7 | Hosts the page shell, overlays, and lifecycle wiring around the canvas |
| TypeScript | 5.9.3 | Keeps gameplay, rendering, and data shapes strict and maintainable |
| Vite | 8.1.0 | Fast local development and static-friendly frontend bundling in this environment |
| Tailwind CSS | 3.4.19 | Minimal responsive layout and theme-aware overlay styling |
| shadcn/ui | bundled local components | Accessible buttons, cards, and badges for splash/results UI |
| Lucide React | 0.577.0 | Lightweight UI icons for replay and best-score presentation |
| Canvas 2D API | browser-native | Renders the full game scene without a game engine |
| requestAnimationFrame | browser-native | Drives the main update/render loop at display refresh rate |
| Pointer Events | browser-native | Supports touch and mouse with one unified input path |
| localStorage | browser-native | Stores the best score on the current device |

## High-level architecture

The game is separated into a few clear responsibilities:

- game configuration and constants
- deterministic random generation
- pattern library for collectible group spawning
- pure-ish gameplay state updates
- canvas rendering
- React page shell for lifecycle, overlays, replay, and rotated presentation

This keeps gameplay logic readable and makes future additions like more player slots or more pattern types straightforward.

## Module and file tree

```text
/
├── README.md
└── frontend/
    ├── App.tsx
    ├── pages/
    │   └── ForkifyPage.tsx
    └── components/
        └── forkify/
            ├── createForkifyGame.ts
            ├── gameConfig.ts
            ├── math.ts
            ├── patterns.ts
            ├── random.ts
            ├── renderForkifyScene.ts
            └── types.ts
```

## File responsibilities

### `frontend/App.tsx`
Application entry component. Mounts the Forkify page.

### `frontend/pages/ForkifyPage.tsx`
React host for the game.

Responsibilities:
- creates and owns the game controller
- manages resize and page-visibility events
- runs the animation loop
- renders splash and results overlays
- rotates the stage for phones held in portrait while preserving an internal landscape world
- exposes the single red tap button

### `frontend/components/forkify/gameConfig.ts`
Central home for gameplay constants.

Examples:
- world dimensions
- fork speed and movement values
- score values
- wall spacing
- spawn spacing
- death timing
- popup timing
- localStorage key

Keeping these in one place makes balancing much easier.

### `frontend/components/forkify/random.ts`
Deterministic pseudo-random utilities.

Contains:
- a seeded PRNG
- helper methods for ranges, integers, and picks
- a stable string-to-seed hash function

This allows each run to remain reproducible from its seed.

### `frontend/components/forkify/types.ts`
Shared TypeScript shapes for the game.

Contains types for:
- phases
- player state
- collectibles
- score popups
- stats
- wall samples
- results summary
- palette and rendering snapshot data

### `frontend/components/forkify/patterns.ts`
The collectible group library.

Important detail:
- collectibles are authored as reusable formations instead of one-off single spawns
- each pattern mixes reward and risk differently
- this is the main place to expand fair encounter variety later

### `frontend/components/forkify/math.ts`
Small utility helpers used across the game.

Includes:
- clamping
- interpolation
- easing helpers
- squared-distance collision checks
- signed score formatting

### `frontend/components/forkify/createForkifyGame.ts`
The gameplay engine.

Responsibilities:
- owns authoritative game state
- handles splash, play, death, and results phases
- updates fork movement and tap behavior
- computes wall shape samples
- spawns collectible groups
- applies scoring and combo logic
- emits score popups from the fork
- performs wall collision checks with forgiving bounds
- runs death animation state
- stores and reads best score

This is the main logic module and is intentionally kept engine-free.

### `frontend/components/forkify/renderForkifyScene.ts`
Canvas renderer for the game world.

Responsibilities:
- sizes the canvas for the current viewport and DPR
- paints the background
- renders spaghetti walls and moving noodle strands
- renders collectibles
- renders the fork
- renders floating score text
- renders the simple HUD slots

The renderer consumes snapshots rather than owning rules, which keeps rendering and gameplay decoupled.

## Core gameplay rules implemented

### Fork movement

- The fork moves forward automatically by scrolling the world leftward
- Before the first tap, the fork flies straight horizontally
- The first tap always sets upward movement
- Every next tap alternates between upward and downward vertical motion
- The player never controls forward speed
- The fork rotates toward its travel direction

### Scoring

Default values in config:

- pasta: `+10`
- bad food: `-15`

The values are centralized so they can be rebalanced without touching the rest of the game.

### Combo tracking

- pasta increases combo
- bad food breaks combo
- best combo is captured for the results screen

### Walls

- top and bottom walls are sampled independently
- visible noodles extend beyond the effective collision edge
- difficulty gradually reduces corridor size and increases motion complexity
- the corridor is clamped to remain playable

### Collectibles

- spawn from a pattern library only
- scroll smoothly from right to left
- include one good collectible type in MVP: `🍝`
- include bad collectible types: `🍕 🍔 🍟 🍩 🍣`

## Rendering approach

The game is rendered into a single `<canvas>` element.

Why this works well here:
- minimal overhead
- predictable mobile performance
- easy control over motion, layering, and effects
- simple deployment as a static site

The scene renderer uses an internal fixed landscape coordinate system. If the phone is physically held upright, the stage container rotates so the game still presents as landscape without changing internal world math.

## Performance notes

The implementation is designed to stay lightweight:

- no physics engine
- no backend calls
- no image asset pipeline required for MVP gameplay elements
- capped frame delta to avoid huge simulation jumps
- simple deterministic spawn logic
- pause when the page is hidden

## Extensibility notes

The code is organized so future additions remain incremental.

Examples:
- more player HUD slots can be activated without replacing the current game structure
- more collectible groups can be added in `patterns.ts`
- future power-ups can be added as new collectible kinds and effect handlers
- difficulty tuning can happen inside `gameConfig.ts`
- best-score persistence can grow into a larger settings model later

## How to iterate on balance

The main tuning levers are:

- `forwardSpeed`
- `verticalSpeed`
- `wallMinGapStart`
- `wallMinGapEnd`
- `spawnSpacingStart`
- `spawnSpacingEnd`
- `pastaScore`
- `badFoodScore`
- entries in `PATTERN_LIBRARY`

For future polish, the safest place to improve perceived quality is usually:
1. collectible pattern fairness
2. wall visual richness
3. death animation feel
4. HUD polish

## Definition-of-done mapping

The current implementation is built to satisfy the MVP checklist by providing:

- instant static launch
- one-button fork control
- horizontal start and alternating vertical motion
- animated organic spaghetti walls
- grouped collectible spawning
- scoring for pasta and bad food
- fork-origin score popups
- wall-hit death sequence leading to results
- replay flow with score stats
- client-only execution on a lightweight stack

## Future enhancement ideas

If the MVP is expanded later, these are natural next steps:

- add reserved V2 foods like `🍰` and `🌶`
- add sound design
- surface seed display/debug mode for balancing
- save more stats locally
- enable the currently empty HUD slots for additional players
- add lightweight SVG branding on the splash screen

## Summary

Forkify is implemented as a deterministic, canvas-based arcade loop wrapped by a thin React shell. The codebase is intentionally compact, readable, and modular so the MVP stays fast now and remains easy to extend later.
