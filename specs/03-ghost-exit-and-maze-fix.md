# Spec 03 — Ghost Exit Fix + Faithful Maze

**State:** Approved
**Date:** 2026-10-02
**Depends on:** SPEC 01, SPEC 02
**Objective:** Replace the malformed `MAZE_STR` with the faithful 28x31 level-1 Pac-Man layout so ghosts can actually leave the pen and walls connect correctly, and fix ghost release/respawn so they exit the pen onto the map and eaten ghosts return as eyes instead of teleporting.

## Scope

**In:**
- Replace `MAZE_STR` in `maze.js` with the faithful 28x31 layout (all rows exactly 28 chars; rows 1 and 29 currently 26 chars, and the pen-surrounding corridor in row 11 is sealed)
- Update `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `POWER_PELLET_POSITIONS` to match the new maze:
  - `TUNNEL_ROW = 14`
  - `PACMAN_START = { x: 13, y: 23 }` (row 23 uses ' ' for its cell)
  - Blinky starts outside the pen above the door `{ x: 13, y: 11 }`; Pinky/Inky/Clyde inside pen `{ x: 12|13|14, y: 14 }` (cells ' ' / former 'G')
  - Power pellets at the 4 arcade positions: `(1,3), (26,3), (1,23), (26,23)`
- Pen interior cells become ' ' (0); doors stay '-' (3)
- Ghost release: Blinky active from start; Pinky released after `PINKY_RELEASE` ms; Inky after `INKY_RELEASE` or N dots; Clyde after `CLYDE_RELEASE` or M dots. Until released, ghosts stay in pen moving up/down (original pen bounce) or idle
- Fix eaten-ghost respawn: remove immediate `respawnTimer = RESPAWN_DELAY` on collision; eyes use existing A*/door pathfinding to pen, and `respawnTimer` only starts when eyes arrive at `PEN_CENTER`
- Released ghosts pathfind through the door like normal ghosts (door passable for 'ghost'), so they walk out onto the map — no teleport

**Not in:**
- Scatter/chase mode timers
- Pen-bounce attract animation (ghosts may idle instead)
- Changes to frightened-mode scoring, power pellet logic, or wall rendering style (`drawWalls` already connects adjacent wall cells; only the data was broken)

## Data Model

### `maze.js`
```js
const MAZE_STR = [
  // 31 rows x 28 chars, faithful level-1 layout (legend unchanged:
  // '#'=1, '.'=2, ' '=0, '-'=3, 'o'=4), ghost house rows 13-15 cols 11-16 as ' '
];
const TUNNEL_ROW = 14;
const PACMAN_START = { x: 13, y: 23 };
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },
  { x: 13, y: 14, kind: 'pinky' },
  { x: 12, y: 14, kind: 'inky' },
  { x: 14, y: 14, kind: 'clyde' },
];
const POWER_PELLET_POSITIONS = [
  { x: 1, y: 3 }, { x: 26, y: 3 }, { x: 1, y: 23 }, { x: 26, y: 23 },
];
```

### `game.js` constants
```js
const PINKY_RELEASE = 240;   // frames (~4s @60fps)
const INKY_RELEASE_DOTS = 30;
const CLYDE_RELEASE_DOTS = 60;
```

### Ghost runtime additions
```js
ghosts: GHOST_STARTS.map(g => ({
  // ...existing
  released: g.kind === 'blinky', // blinky active from start
})),
```

## Implementation Plan

1. **Replace `MAZE_STR`** in `maze.js` with the faithful layout; sed-replace rows and assert every row is 28 chars at parse time (throw on mismatch).
2. **Update maze constants**: `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `POWER_PELLET_POSITIONS` as above.
3. **Update `createGame()`**: add `released` flag (blinky true, others false); count dots/pellets from new grid.
4. **Add release checks in `update()`**: before moving ghosts, release Pinky when frame counter or power ends; Inky/Clyde when `dotsEaten` reaches thresholds. Track `game.frame` counter.
5. **Update `moveGhost()`**: if `!g.released`, keep ghost inside pen (idle or vertical bounce between rows 13-15) and skip decideGhost; once released, normal movement with `g.dir = 'up'` toward the door.
6. **Fix eaten respawn**: in collision handler do NOT set `respawnTimer`; in `moveGhost` eaten branch, only set `respawnTimer = RESPAWN_DELAY` (and snap to `PEN_CENTER`) when eyes arrive at the pen center; remove `g.respawnTimer = RESPAWN_DELAY` from the collision block.
7. **Sanity in `decideGhost()`**: when `!g.released`, skip A* targeting (pen movement only).
8. **Verify**: reload browser; all 4 dots counters consistent; Pac-Man start cell empty.

## Acceptance Criteria

- [ ] Every `MAZE_STR` row is exactly 28 characters (add a parse-time check)
- [ ] Maze renders symmetric, walls continuous, tunnel row wraps both edges
- [ ] Blinky moves immediately; Pinky/Inky/Clyde remain in pen until released, then walk up through the door onto the map (no teleport)
- [ ] Eaten ghost's eyes travel from death point through walls-free path to pen, then ghost waits `RESPAWN_DELAY` and rejoins play
- [ ] Power pellets appear at `(1,3),(26,3),(1,23),(26,23)` and trigger frightened mode
- [ ] No console errors; 60fps maintained

## Decisions Taken and Discarded

- **Decision**: Faithful 28x31 maze (with correct row 11 corridor connectivity). *Reason*: Previous layout sealed the pen surroundings; ghosts had no route to the map.
- **Decision**: Release via time (Pinky) + dot counts (Inky/Clyde). *Reason*: User chose "tiempo + contador de dots".
- **Decision**: Blinky outside pen at door; rest inside. *Reason*: User chose this spawn split.
- **Decision**: Door passable only for ghosts (unchanged). *Reason*: Matches original; Pac-Man still blocked.
- **Discarded**: Pen side-to-side bounce animation; ghosts idle vertically instead. *Reason*: Keep visual change minimal; "paredes" fix was data-only.

## Identified Risks

- **A* through door into pen**: chase A* may route ghosts back into the pen corridor; acceptable visually but verify ghosts don't oscillate at the door.
- **Tunnel wrap in A* neighbors**: new layout's tunnel row must still wrap; verify `TUNNEL_ROW` unchanged (14).
- **Row width regressions**: add the 28-char runtime check so future edits fail loudly.
