# Spec 07 — Combat Overhaul: Ghost Allies, Crosses, Shield & Memory

**State:** Implemented
**Date:** 2026-10-06
**Objective:** Replace tile-5 destructibles with blue-wall-only world; zombies killed by weapons convert to allied ghosts that hunt zombies; crosses (item) kill ghosts via K in a straight line; every 1000 points grants a 15s damage shield; far chunks are evicted to bound memory.

## Scope

**In:**
- `generateChunk` stops producing tile `5`; only tile `1` (wall), `2` (dot), `4` (pellet), `0` (empty)
- Bullets no longer break tiles; they die on tile `1` and kill zombies
- Zombie killed by bullet → eliminated, and an allied `ghost` spawns at that cell (`kind: 'ghost'`)
- Allied ghost: A* toward nearest zombie via `findPath`; contact `d < 0.5` kills zombie (+100 score); idle wander when no zombies
- Cross item: `crosses = [{x, y}]`; Pacman picks up at `d < 0.5` → `pacman.crosses++`; HUD `CRUCES n`
- `K` key: consume 1 cross; kill ghosts in straight line from Pacman along `pacman.dir` until tile `1`
- Shield: every multiple of 1000 score → `shieldTimer = 900` (15s @60fps); while active, zombie contact destroys the zombie instead of costing a life; `nextShieldAt` tracks threshold
- Chunk eviction: every 60 frames, drop chunks farther than 3 chunks (Chebyshev/Manhattan) from Pacman's chunk; edits in evicted chunks are lost (simple eviction)

**Not in:**
- Tile `5` generation (removed)
- Cross kills zombies (K targets ghosts only)
- Ghost allies taking damage or dying
- Persistent chunk deltas across eviction

## Data Model

```js
game.zombies = [];                 // spec 06
game.ghosts = [];                  // new: allied ghosts
game.crosses = [];                 // world cross items
game.pacman.crosses = 0;
game.shieldTimer = 0;
game.nextShieldAt = 1000;
```

Ghost ally entity: `{x, y, dir, speed, kind: 'ghost'}`.

## Implementation Plan

1. **maze.js**: remove tile `5` from `generateChunk` (bullets/`setTile` references to 5 stay harmless but unused).
2. **game.js**: bullet kills zombie → splice zombie, push allied ghost; ghost ally AI (`moveGhostAlly`) hunts nearest zombie, contact kills zombie (+100); no path → wander.
3. **game.js/main.js**: cross items — spawn in chunks (or random walkable near pacman), pickup, HUD count, `K` handler kills ghosts in line until tile `1`.
4. **game.js/render.js**: shield threshold logic; while `shieldTimer > 0` zombie contact destroys zombie; draw shield ring.
5. **maze.js**: chunk eviction every 60 frames, radius 3 chunks around player chunk.
6. Bullets: remove tile-5 breaking branch (tile 5 no longer exists).

## Acceptance Criteria

- [ ] No tile `5` generated in new chunks
- [ ] Bullet kills zombie → ghost ally appears at same cell
- [ ] Ghost ally chases and kills zombies on contact
- [ ] K consumes a cross and kills ghosts in a straight line to the next wall
- [ ] Every 1000 points grants 15s shield; shield destroys zombies on contact
- [ ] Chunks beyond 3 from player chunk are removed from `chunks` Map
