# Spec 05 — Projectiles & Ammo Power Pellets

**State:** Implemented
**Date:** 2026-10-06
**Objective:** Add shooting: Space fires bullets from Pac-Man; power pellets grant ammo/gun time; bullets break destructible tiles and kill enemies.

## Scope

**In:**
- `Space` key in `main.js` keydown → fire single bullet per press
- Player fields: `hasGun`, `ammo`, `gunTimer`
- Power pellet pickup: `ammo += 15` or `gunTimer = 8.0`
- `bullets = []`; bullet `{x, y, vx, vy, radius: 0.2}`; speed 2x player
- Bullet update: move, die on tile `1`, break tile `5` → `0` (via `setTile`)
- Bullet vs enemy: `d < 0.5` kills zombie, +score
- HUD: ammo / gunTimer remaining
- New tile `5` = destructible block, generated in `generateChunk` (distinct color from wall `1`). Tile `2` stays dot, `4` stays power pellet (now also gives ammo).

**Not in:**
- Explosions/bombs
- Spread/multishot
- Enemy bullets

## Data Model

```js
game.bullets = [];
game.pacman.ammo = 0;
game.pacman.gunTimer = 0;
```

## Implementation Plan

1. **main.js**: Space handler with preventDefault.
2. **game.js**: `fireBullet(game)`; bullet loop in `update`; tile collision via `getTile`/`setTile`; enemy collision; ammo/timer decrement.
3. **maze.js**: `generateChunk` sprinkles tile `5` destructible blocks on floor cells.
4. **render.js**: draw bullets as small arcs; tile `5` color; HUD ammo.
5. Win/lose unchanged.
