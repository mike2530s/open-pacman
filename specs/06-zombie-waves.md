# Spec 06 — Zombie Horde Invasion

**State:** Implemented
**Date:** 2026-10-06
**Objective:** Replace fixed 4-ghost setup with zombie spawner waves; zombies chase via A* but are blocked by destructible tiles until paths open.

## Scope

**In:**
- `zombieSpawnTimer` spawns zombie every N frames in a walkable tile at distance >= D from player
- Zombie entity: `{x, y, dir, speed, kind: 'zombie'}` reusing ghost movement
- Chase: A* to player via `findPath` over `getTile`
- If path blocked by tile `5`, zombie waits or wanders; when player/bullets break blocks, path reopens
- Contact kills player (`d < 0.5`) → life lost, reset positions
- HUD: active zombie count
- Cap max zombies (e.g. 12) to bound CPU

**Not in:**
- Zombie types/variants
- Difficulty ramp beyond spawn interval constant
- Zombie ranged attacks

## Data Model

```js
game.zombies = [];
game.zombieSpawnTimer = 0;
const ZOMBIE_SPAWN_INTERVAL = 180; // frames
const MAX_ZOMBIES = 12;
const SPAWN_MIN_DIST = 8;
```

## Implementation Plan

1. **game.js**: `spawnZombie(game)` picks random walkable tile far from player; update loop moves zombies with `findPath` to pacman; blocked paths → random valid dir.
2. **maze.js/game.js**: pathfinding treats tile `5` as blocked for zombies (bullets open it).
3. **render.js**: draw zombies (green ghosts); HUD count.
4. Remove or deprecate `GHOST_STARTS`/ pen release.
