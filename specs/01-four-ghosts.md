# Spec 01 — Cuatro Fantasmas con Comportamientos Clásicos

**Estado:** Implementado
**Fecha:** 2026-10-02
**Objetivo:** Implementar 4 fantasmas (Blinky, Pinky, Inky, Clyde) cada uno con comportamiento clásico de Pac-Man distinto, usando pathfinding real para Blinky.

## Alcance

**Incluido:**
- 4 fantasmas con comportamientos fijos: Blinky (persecución vía A*), Pinky (emboscada 4 casillas adelante), Inky (espejo de Blinky relativo a Pinky), Clyde (persigue lejos, aleatorio cerca)
- Pathfinding A* real recalculado cada frame para Blinky
- Posiciones de inicio dispersas en el laberinto (no todos en la jaula)
- Tipos de fantasma definidos en `maze.js` con nombres y comportamientos únicos
- `decideGhost()` en `game.js` extendido para manejar 4 tipos de comportamiento

**No incluido:**
- Cambio de modos persecución/dispersión/asustado
- Pellets de poder o estado vulnerable de fantasmas
- Lógica de jaula/liberación de fantasmas
- Ojos de fantasmas regresando a la jaula al ser comidos
- Animaciones de intermisión o escenas

## Modelo de Datos

### Definición de fantasma (en `maze.js`)
```js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },  // Blinky: zona superior
  { x: 14, y: 11, kind: 'pinky' },   // Pinky: zona superior
  { x: 13, y: 14, kind: 'inky' },    // Inky: zona jaula
  { x: 14, y: 14, kind: 'clyde' },   // Clyde: zona jaula
];
```

### Estado de ejecución del fantasma (en `game.js` createGame)
Cada fantasma tiene:
- `kind: 'blinky' | 'pinky' | 'inky' | 'clyde'`
- `targetX, targetY` — objetivo de persecución actual (para lógica de pathfinding/emboscada)
- `path: Array<{x,y}>` — ruta A* calculada (solo Blinky)

### Auxiliar de pathfinding (nuevo en `game.js` o util separado)
- `findPath(grid, fromX, fromY, toX, toY)` → `Array<{x,y}>` usando A* con heurística Manhattan
- Considera paredes (1) y puerta fantasma (3) como bloqueadas
- Maneja wrap de túnel en `TUNNEL_ROW`

## Plan de Implementación

1. **Actualizar `maze.js`**: Reemplazar `GHOST_STARTS` con 4 posiciones dispersas y tipos (blinky, pinky, inky, clyde).
2. **Agregar pathfinding A*** en `game.js`:
   - `neighbors(x, y, grid)` — celdas adyacentes válidas (maneja túnel)
   - `heuristic(ax, ay, bx, by)` — distancia Manhattan
   - `findPath(grid, sx, sy, tx, ty)` — retorna array de pasos {x,y}
3. **Extender `decideGhost(game, ghost)`** en `game.js` para 4 tipos:
   - **Blinky**: objetivo = posición de Pac-Man; calcular ruta A* cada frame; tomar primer paso
   - **Pinky**: objetivo = posición de Pac-Man + 4 casillas en la dirección que mira Pac-Man; calcular ruta A*; tomar primer paso
   - **Inky**: vector de Blinky a Pac-Man, duplicado; objetivo = esa posición; calcular ruta A*; tomar primer paso (necesita referencia a Blinky)
   - **Clyde**: si distancia a Pac-Man > 8 casillas → perseguir como Blinky; si no → dirección válida aleatoria
4. **Actualizar `createGame()`** en `game.js`: inicializar 4 fantasmas con nuevos tipos y posiciones.
5. **Actualizar `resetPositions()`** en `game.js`: restaurar los 4 a sus posiciones `GHOST_STARTS`.
6. **Verificar rendering** en `render.js`: el array `GHOST_COLORS` tiene 4 entradas (ya existentes: rojo, cyan, rosa, naranja).

## Criterios de Aceptación

- [ ] El juego inicia con 4 fantasmas en posiciones dispersas
- [ ] Blinky sigue a Pac-Man usando pathfinding A* (enrutamiento óptimo visible alrededor de paredes)
- [ ] Pinky apunta 4 casillas adelante de la dirección que mira Pac-Man
- [ ] Inky apunta a posición espejo relativa a Blinky
- [ ] Clyde persigue cuando está lejos (>8 casillas), se mueve aleatoriamente cuando está cerca
- [ ] Los 4 fantasmas renderizan con colores distintos (rojo, cyan, rosa, naranja)
- [ ] Colisión con cualquier fantasma quita una vida, reinicia las 4 posiciones
- [ ] Sin errores de consola; 60fps mantenidos en hardware típico

## Decisiones Tomadas y Descartadas

- **Decisión**: 4 comportamientos clásicos del Pac-Man original. *Razón*: El usuario pidió explícitamente Blinky/Pinky/Inky/Clyde.
- **Decisión**: A* cada frame para Blinky. *Razón*: El usuario eligió "cada frame" para precisión; el laberinto es pequeño (28x31), el costo es insignificante.
- **Decisión**: Comportamiento fijo por fantasma, sin cambio de modos. *Razón*: El usuario eligió "solo comportamiento fijo".
- **Decisión**: Posiciones de inicio dispersas. *Razón*: El usuario eligió "posiciones dispersas"; evita que los 4 se apilen en la jaula.
- **Descartado**: Temporizador de persecución/dispersión. *Razón*: Fuera de alcance según el usuario.
- **Descartado**: Pellets de poder / modo asustado. *Razón*: Fuera de alcance según el usuario.

## Riesgos Identificados

- **Rendimiento**: A* cada frame para 1 fantasma en grilla 28x31 es ~868 nodos en peor caso; trivial en JS pero verificar que no haya caídas de frame.
- **Dependencia de Inky**: Inky necesita la posición de Blinky para calcular objetivo; asegurar que Blinky se procese primero en el loop de fantasmas.
- **Manejo de túnel en pathfinding**: A* debe tratar la fila del túnel como aristas conectadas; verificar que la lógica de wrap coincida con `wrapTunnel()`.
- **"4 casillas adelante" de Pinky en bordes del laberinto**: El objetivo puede estar en una pared; recortar a la celda válida más cercana o caer de vuelta a la posición de Pac-Man.
