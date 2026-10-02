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
    ├── maze.js     # Level data (28x31), constants
    └── render.js   # Canvas drawing (walls, dots, entities, HUD)
```

## Run
Open `src/index.html` in a browser. No server needed.

## Key Globals (window)
- `createGame()` — fresh game state
- `update(game)` — advances one tick
- `draw(ctx, game, frame)` — renders to canvas
- `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS` — level constants
- `DIRS` — direction vectors

## Architecture Notes
- **No modules** — scripts load in order via `<script>` tags, share globals
- **Game loop** in `main.js` uses `requestAnimationFrame`
- **Maze** is parsed from strings at load; each game copies `MAZE` to `game.grid` (mutable)
- **Tunnel** at row 14 wraps X coordinate
- **Ghosts**: `hunter` chases Pac-Man (Manhattan), `random` picks valid dir
- **Collision** radius: 0.5 cells

## Conventions
- Spanish comments/messages in code
- No linting, formatting, or test tooling configured
- All state mutation happens in `game.js` functions

## Common Tasks
- **Modify level**: edit `MAZE_STR` in `maze.js`
- **Tune speeds**: `PACMAN_SPEED`, `GHOST_SPEED` in `game.js`
- **Add ghost types**: extend `decideGhost()` in `game.js`
- **Change rendering**: edit `render.js` drawing functions