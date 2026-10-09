# Spec 04 — Infinite Procedural Maze (Drunkard Walk Chunks)

**State:** Implemented
**Date:** 2026-10-06
**Objective:** Replace the fixed 28x31 Pac-Man maze with an infinite, procedurally generated map streamed in chunks as the player moves, keeping vanilla JS globals and a mutable grid.

## Scope

**In:**
- Chunk-based world: `chunks: Map<"cx,cy", grid[][]>`, chunk size 16x16 (`CHUNK` constant)
- Deterministic generation: seed = hash(cx, cy, worldSeed)
- Drunkard walk carves floors inside each chunk
- Each chunk guarantees at least one opening on each border side so neighboring chunks connect
- `getTile(x, y)` resolves global coords to chunk, generating on demand
- Mutable per-chunk grids (broken blocks persist)
- Camera follows Pac-Man: canvas fixed size, draw offset so Pac-Man is centered
- Remove tunnel wrap (`TUNNEL_ROW`); pathfinding/neighbors clamp to known chunks
- Victory condition change: dots no longer finite; score/survival based (`dotsRemaining` dropped or repurposed)

**Not in:**
- Destructible block tiles (Spec 05)
- Projectiles/ammo (Spec 05)
- Zombie waves/spawner (Spec 06)
- Ghost pen/release logic tied to fixed maze

## Data Model

### Constants (`maze.js`)
```js
const CHUNK = 16;
const WORLD_SEED = (Math.random() * 1e9) | 0; // fixed value for debuggability
```

### Chunk store
```js
const chunks = new Map(); // "cx,cy" -> 2D array
```

### Tile values (provisional)
- `0` empty walkable
- `1` solid wall
- `2` dot remnant (keeps scoring)
- `4` power pellet (Spec 05 uses as ammo pickup)

### Helpers
- `chunkKey(cx, cy)`
- `generateChunk(cx, cy)` — drunkard walk carve + border openings
- `getTile(x, y)` / `setTile(x, y, v)`

## Implementation Plan

1. **maze.js**: replace static `MAZE`/`MAZE_STR` with `chunks`, `getTile`, `setTile`, `generateChunk` using seeded RNG (mulberry32).
2. **game.js**: `createGame` generates only the chunk containing `PACMAN_START`; collisions use `getTile`; ensure next chunk exists before moving; remove tunnel wrap.
3. **Pathfinding**: `neighbors`/`findPath` use global coords via `getTile`; unknown neighbors never auto-generate (prevents infinite expansion).
4. **render.js**: draw only visible tile range with camera offset; walls become filled tiles (arcade line style needs rework for non-contiguous borders).
5. **main.js**: canvas size constant if adjusted.
6. Update AGENTS.md notes about infinity.
