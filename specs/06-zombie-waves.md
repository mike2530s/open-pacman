# Spec 06 — Invasión de Horda de Zombis

**Estado:** Implementado
**Fecha:** 2026-10-06
**Objetivo:** Reemplazar la configuración fija de 4 fantasmas con oleadas de spawner de zombis; los zombis persiguen vía A* pero son bloqueados por casillas destructibles hasta que se abran caminos.

## Alcance

**Incluido:**
- `zombieSpawnTimer` genera un zombi cada N frames en una casilla transitable a distancia >= D del jugador
- Entidad zombi: `{x, y, dir, speed, kind: 'zombie'}` reutilizando el movimiento de fantasmas
- Persecución: A* al jugador vía `findPath` sobre `getTile`
- Si la ruta está bloqueada por casilla `5`, el zombi espera o deambula; cuando el jugador/balas rompen bloques, la ruta se reabre
- Contacto mata al jugador (`d < 0.5`) → vida perdida, reiniciar posiciones
- HUD: conteo de zombis activos
- Límite máximo de zombis (ej. 12) para acotar el uso de CPU

**No incluido:**
- Tipos/variantes de zombis
- Rampa de dificultad más allá de la constante de intervalo de spawn
- Ataques a distancia de zombis

## Modelo de Datos

```js
game.zombies = [];
game.zombieSpawnTimer = 0;
const ZOMBIE_SPAWN_INTERVAL = 180; // frames
const MAX_ZOMBIES = 12;
const SPAWN_MIN_DIST = 8;
```

## Plan de Implementación

1. **game.js**: `spawnZombie(game)` elige una casilla transitable aleatoria lejos del jugador; el loop de actualización mueve zombis con `findPath` hacia pacman; rutas bloqueadas → dirección válida aleatoria.
2. **maze.js/game.js**: el pathfinding trata casilla `5` como bloqueada para zombis (las balas la abren).
3. **render.js**: dibujar zombis (fantasmas verdes); conteo en HUD.
4. Eliminar o deprecar `GHOST_STARTS`/ liberación de jaula.
