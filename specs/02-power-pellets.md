# Spec 02 — Power Pellets & Frightened Mode

**State:** Implemented
**Date:** 2026-10-02
**Objective:** Add 4 power pellets at maze corners; eating one makes ghosts frightened (blue, slower, random movement) for a timer, awarding escalating points (200/400/800/1600) per ghost eaten.

## Scope

**In:**
- 4 power pellets at maze corners (positions in `maze.js`)
- New tile type: power pellet (value 4 in grid)
- Ghost frightened state: blue color, reduced speed, random movement
- Frightened timer (configurable, e.g., 7 seconds at 60fps = ~420 frames)
- Escalating points: 1st ghost=200, 2nd=400, 3rd=800, 4th=1600 (resets per power pellet)
- Ghosts flash white when timer < 2s (warning)
- Eaten ghosts return to pen (eyes only), respawn after delay
- Power pellets persist in `game.grid` (mutated when eaten)

**Not in:**
- Cutscene/intermission when all ghosts eaten
- Multiple power pellets active simultaneously (only one timer)
- Fruit bonuses
- High score persistence

## Data Model

### Maze additions (`maze.js`)
```js
// Tile values: 0=empty, 1=wall, 2=dot, 3=ghost-door, 4=power-pellet
const POWER_PELLET_POSITIONS = [
  { x: 1, y: 1 },      // top-left
  { x: 26, y: 1 },     // top-right
  { x: 1, y: 29 },     // bottom-left
  { x: 26, y: 29 },    // bottom-right
];
```

### Game state additions (`game.js` createGame)
```js
return {
  // ...existing fields
  powerPelletsRemaining: 4,
  frightenedTimer: 0,
  ghostsEatenThisPower: 0,  // for escalating points
};
```

### Ghost runtime additions
```js
ghosts: GHOST_STARTS.map( ( g ) => ( {
  // ...existing
  frightened: false,
  eaten: false,
  respawnTimer: 0,
} ) ),
```

### Constants (`game.js`)
```js
const FRIGHTENED_DURATION = 420;  // frames @ 60fps = 7s
const FRIGHTENED_SPEED = 0.05;    // half normal speed
const FLASH_THRESHOLD = 120;      // frames < 2s = flash
const FRIGHTENED_POINTS = [200, 400, 800, 1600];
const RESPAWN_DELAY = 120;        // frames before ghost leaves pen
```

## Implementation Plan

1. **Update `maze.js`**: Add power pellet tile value (4), parse in `MAZE_STR`, add `POWER_PELLET_POSITIONS` constant, initialize in `MAZE`.
2. **Update `game.js` constants**: Add `FRIGHTENED_DURATION`, `FRIGHTENED_SPEED`, `FLASH_THRESHOLD`, `FRIGHTENED_POINTS`, `RESPAWN_DELAY`.
3. **Update `createGame()`**: Initialize `powerPelletsRemaining`, `frightenedTimer`, `ghostsEatenThisPower`; add `frightened`, `eaten`, `respawnTimer` to each ghost.
4. **Update `movePacman()`**: Detect eating power pellet (grid value 4) → start frightened mode, reset `ghostsEatenThisPower`.
5. **Add `startFrightenedMode(game)`**: Set `frightenedTimer = FRIGHTENED_DURATION`, set all ghosts `frightened=true`, `speed=FRIGHTENED_SPEED`.
6. **Update `decideGhost()`**: If `g.frightened` → random valid direction (no A*); if `g.eaten` → move toward pen (A* to pen center), then respawn.
7. **Update `moveGhost()`**: Handle `frightened` timer countdown; flash logic; handle `eaten` state (eyes only, return to pen).
8. **Update collision in `update()`**: If `g.frightened` and not `g.eaten` → eat ghost: score += `FRIGHTENED_POINTS[ghostsEatenThisPower]`, `ghostsEatenThisPower++`, `g.eaten=true`, `g.frightened=false`, `g.speed=GHOST_SPEED`, `g.respawnTimer=RESPAWN_DELAY`.
9. **Update `render.js`**: Draw power pellets (larger, flashing); draw frightened ghosts (blue body, white flash near end); draw eaten ghosts (eyes only).
10. **Update `resetPositions()`**: Reset `frightened`, `eaten`, `respawnTimer` on life loss.

## Acceptance Criteria

- [ ] 4 power pellets visible at maze corners (larger, flashing)
- [ ] Eating power pellet triggers frightened mode (all 4 ghosts)
- [ ] Frightened ghosts: blue, slower, random movement
- [ ] Ghosts flash white when <2s remaining
- [ ] Eating frightened ghost: awards 200→400→800→1600, ghost becomes eyes-only
- [ ] Eaten ghost returns to pen, respawns after delay
- [ ] Frightened mode ends after timer → ghosts resume normal behavior
- [ ] No console errors; 60fps maintained

## Decisions Taken and Discarded

- **Decision**: 4 power pellets at fixed corners. *Reason*: User chose "esquinas (original)".
- **Decision**: Full frightened behavior (blue, slow, random, flash, eyes return). *Reason*: User chose "fantasmas azules, velocidad reducida, movimiento aleatorio".
- **Decision**: Escalating points 200/400/800/1600 per power pellet. *Reason*: User chose "timer configurable + puntos escalonados".
- **Decision**: Single frightened timer (no stacking). *Reason*: Simpler, matches original behavior.
- **Discarded**: Fruit bonuses, high scores, cutscenes. *Reason*: Out of scope.

## Identified Risks

- **Ghost respawn logic**: Eyes returning to pen needs A* pathfinding to pen center; verify no infinite loops.
- **Flash timing**: Frame-based timer must sync with 60fps; test at different frame rates.
- **Power pellet rendering**: Must distinguish from dots visually (larger, pulsing).
- **State conflicts**: Ghost can't be both frightened and eaten; ensure mutually exclusive.