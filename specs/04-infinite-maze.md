# Spec 04 — Laberinto Procedural Infinito (Chunks con Drunkard Walk)

**Estado:** Implementado
**Fecha:** 2026-10-06
**Objetivo:** Reemplazar el laberinto fijo 28x31 de Pac-Man con un mapa infinito generado proceduralmente, transmitido en chunks a medida que el jugador se mueve, manteniendo globals en JS puro y una grilla mutable.

## Alcance

**Incluido:**
- Mundo basado en chunks: `chunks: Map<"cx,cy", grid[][]>`, tamaño de chunk 16x16 (constante `CHUNK`)
- Generación determinista: semilla = hash(cx, cy, worldSeed)
- El drunkard walk excava pisos dentro de cada chunk
- Cada chunk garantiza al menos una abertura en cada lado de su borde para que los chunks vecinos conecten
- `getTile(x, y)` resuelve coordenadas globales al chunk, generando bajo demanda
- Grillas por chunk mutables (bloques rotos persisten)
- La cámara sigue a Pac-Man: tamaño de canvas fijo, offset de dibujo para que Pac-Man esté centrado
- Eliminar wrap de túnel (`TUNNEL_ROW`); pathfinding/vecinos se limitan a chunks conocidos
- Cambio de condición de victoria: los puntos ya no son finitos; puntuación/supervivencia (`dotsRemaining` se elimina o reutiliza)

**No incluido:**
- Casillas destructibles (Spec 05)
- Proyectiles/munición (Spec 05)
- Oleadas de zombis/spawner (Spec 06)
- Lógica de jaula/liberación de fantasmas ligada al laberinto fijo

## Modelo de Datos

### Constantes (`maze.js`)
```js
const CHUNK = 16;
const WORLD_SEED = (Math.random() * 1e9) | 0; // valor fijo para depuración
```

### Almacén de chunks
```js
const chunks = new Map(); // "cx,cy" -> array 2D
```

### Valores de casilla (provisional)
- `0` vacío transitable
- `1` pared sólida
- `2` punto (mantiene puntuación)
- `4` pellet de poder (Spec 05 lo usa como recogida de munición)

### Auxiliares
- `chunkKey(cx, cy)`
- `generateChunk(cx, cy)` — drunkard walk + aberturas en bordes
- `getTile(x, y)` / `setTile(x, y, v)`

## Plan de Implementación

1. **maze.js**: reemplazar `MAZE`/`MAZE_STR` estáticos con `chunks`, `getTile`, `setTile`, `generateChunk` usando RNG con semilla (mulberry32).
2. **game.js**: `createGame` genera solo el chunk que contiene `PACMAN_START`; las colisiones usan `getTile`; asegurar que el siguiente chunk exista antes de moverse; eliminar wrap de túnel.
3. **Pathfinding**: `neighbors`/`findPath` usan coordenadas globales vía `getTile`; los vecinos desconocidos nunca se auto-generan (previene expansión infinita).
4. **render.js**: dibujar solo el rango de casillas visible con offset de cámara; las paredes se convierten en casillas rellenas (el estilo de línea arcade necesita rework para bordes no contiguos).
5. **main.js**: tamaño de canvas constante si se ajusta.
6. Actualizar notas de AGENTS.md sobre la infinidad.
