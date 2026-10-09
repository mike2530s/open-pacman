# Spec 01 — Four Ghosts with Classic Behaviors

**State:** Implemented
**Date:** 2026-10-02
**Objective:** Implement 4 ghosts (Blinky, Pinky, Inky, Clyde) each with distinct classic Pac-Man behavior, using real pathfinding for Blinky.

## Scope

**In:**
- 4 ghosts with fixed behaviors: Blinky (chase via A*), Pinky (ambush 4 tiles ahead), Inky (mirror of Blinky relative to Pinky), Clyde (chase far, random near)
- Real A* pathfinding recalculated every frame for Blinky
- Dispersed starting positions across the maze (not all in pen)
- Ghost types defined in `maze.js` with unique names and behaviors
- `decideGhost()` in `game.js` extended to handle 4 behavior types

**Not in:**
- Chase/scatter/frightened mode switching
- Power pellets or vulnerable ghost state
- Ghost house/pen release logic
- Ghost eyes returning to pen when eaten
- Intermission animations or cutscenes

## Data Model

### Ghost definition (in `maze.js`)
```js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },  // Blinky: top area
  { x: 14, y: 11, kind: 'pinky' },   // Pinky: top area
  { x: 13, y: 14, kind: 'inky' },    // Inky: pen area
  { x: 14, y: 14, kind: 'clyde' },   // Clyde: pen area
];
```

### Ghost runtime state (in `game.js` createGame)
Each ghost gets:
- `kind: 'blinky' | 'pinky' | 'inky' | 'clyde'`
- `targetX, targetY` — current chase target (for pathfinding/ambush logic)
- `path: Array<{x,y}>` — computed A* path (Blinky only)

### Pathfinding helper (new in `game.js` or separate util)
- `findPath(grid, fromX, fromY, toX, toY)` → `Array<{x,y}>` using A* with Manhattan heuristic
- Considers walls (1) and ghost-door (3) as blocked
- Handles tunnel wrap at `TUNNEL_ROW`

## Implementation Plan

1. **Update `maze.js`**: Replace `GHOST_STARTS` with 4 dispersed positions and kinds (blinky, pinky, inky, clyde).
2. **Add A* pathfinding** in `game.js`:
   - `neighbors(x, y, grid)` — valid adjacent cells (handles tunnel)
   - `heuristic(ax, ay, bx, by)` — Manhattan distance
   - `findPath(grid, sx, sy, tx, ty)` — returns array of {x,y} steps
3. **Extend `decideGhost(game, ghost)`** in `game.js` for 4 kinds:
   - **Blinky**: target = Pac-Man position; compute A* path every frame; take first step
   - **Pinky**: target = Pac-Man position + 4 tiles in Pac-Man's facing direction; compute A* path; take first step
   - **Inky**: vector from Blinky to Pac-Man, doubled; target = that position; compute A* path; take first step (needs Blinky reference)
   - **Clyde**: if distance to Pac-Man > 8 tiles → chase like Blinky; else → random valid direction
4. **Update `createGame()`** in `game.js`: initialize 4 ghosts with new kinds and positions.
5. **Update `resetPositions()`** in `game.js`: restore all 4 to their `GHOST_STARTS` positions.
6. **Verify rendering** in `render.js`: `GHOST_COLORS` array has 4 entries (already: red, cyan, pink, orange).

## Acceptance Criteria

- [ ] Game starts with 4 ghosts at dispersed positions
- [ ] Blinky follows Pac-Man using A* pathfinding (visible optimal routing around walls)
- [ ] Pinky targets 4 tiles ahead of Pac-Man's facing direction
- [ ] Inky targets mirrored position relative to Blinky
- [ ] Clyde chases when far (>8 tiles), moves randomly when close
- [ ] All 4 ghosts render with distinct colors (red, cyan, pink, orange)
- [ ] Collision with any ghost loses a life, resets all 4 positions
- [ ] No console errors; 60fps maintained on typical hardware

## Decisions Taken and Discarded

- **Decision**: 4 classic behaviors from original Pac-Man. *Reason*: User explicitly requested Blinky/Pinky/Inky/Clyde.
- **Decision**: A* every frame for Blinky. *Reason*: User chose "cada frame" for precision; maze is small (28x31), cost is negligible.
- **Decision**: Fixed behavior per ghost, no mode switching. *Reason*: User chose "solo comportamiento fijo".
- **Decision**: Dispersed starting positions. *Reason*: User chose "posiciones dispersas"; avoids all 4 stacking in pen.
- **Discarded**: Chase/scatter timer. *Reason*: Out of scope per user.
- **Discarded**: Power pellets / frightened mode. *Reason*: Out of scope per user.

## Identified Risks

- **Performance**: A* every frame for 1 ghost on 28x31 grid is ~868 nodes worst case; trivial in JS but verify no frame drops.
- **Inky dependency**: Inky needs Blinky's position to compute target; ensure Blinky is processed first in ghost loop.
- **Tunnel handling in pathfinding**: A* must treat tunnel row as connected edges; verify wrap logic matches `wrapTunnel()`.
- **Pinky's "4 tiles ahead" at maze edges**: Target may be in wall; clamp to nearest valid cell or fallback to Pac-Man position.
