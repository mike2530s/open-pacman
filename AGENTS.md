# open-pacman — Agent Guide

## Project
Vanilla JS Pac-Man clone (spec-driven learning project). No build step, no dependencies.

## Structure
```
src/
├── index.html      # Entry point
├── css/style.css   # Minimal styling
└── js/
    ├── main.js     # Loop, input, overlays
    ├── game.js     # State, rules, movement, collisions
    ├── maze.js     # Infinite world: chunk store, getTile/setTile, generator
    └── render.js   # Canvas drawing (tiles, dots, entities, HUD)
```

## Run
Open `src/index.html` in a browser. No server needed.

## Key Globals (window)
- `createGame()` — fresh game state
- `update(game)` — advances one tick
- `draw(ctx, game, frame)` — renders to canvas
- `PACMAN_START`, `GHOST_STARTS` — spawn constants
- `getTile(x,y)`, `setTile(x,y,v)`, `chunks`, `CHUNK` — world accessors
- `DIRS` — direction vectors

## Architecture Notes
- **No modules** — scripts load in order via `<script>` tags, share globals
- **Game loop** in `main.js` uses `requestAnimationFrame`
- **Maze** is procedurally generated in 16x16 chunks (drunkard walk), streamed via `getTile`/`setTile`; no tunnel wrap
- **Camera**: render centers on Pac-Man, only visible tiles drawn
- **Ghosts**: A* chase via `findPath`, personalities blinky/pinky/inky/clyde
- **Collision** radius: 0.5 cells

## Conventions
- Spanish comments/messages in code
- No linting, formatting, or test tooling configured
- All state mutation happens in `game.js` functions

## Common Tasks
- **Modify level**: edit `generateChunk` in `maze.js`
- **Tune speeds**: `PACMAN_SPEED`, `GHOST_SPEED` in `game.js`
- **Add ghost types**: extend `decideGhost()` in `game.js`
- **Change rendering**: edit `render.js` drawing functions