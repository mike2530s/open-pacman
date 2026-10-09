# Spec 05 — Proyectiles y Pellets de Poder como Munición

**Estado:** Implementado
**Fecha:** 2026-10-06
**Objetivo:** Agregar disparos: Espacio dispara balas desde Pac-Man; los pellets de poder otorgan munición/tiempo de arma; las balas rompen casillas destructibles y matan enemigos.

## Alcance

**Incluido:**
- Tecla `Space` en `main.js` keydown → disparar una bala por pulsación
- Campos del jugador: `hasGun`, `ammo`, `gunTimer`
- Recogida de pellet de poder: `ammo += 15` o `gunTimer = 8.0`
- `bullets = []`; bala `{x, y, vx, vy, radius: 0.2}`; velocidad 2x la del jugador
- Actualización de bala: moverse, morir en casilla `1`, romper casilla `5` → `0` (vía `setTile`)
- Bala vs enemigo: `d < 0.5` mata zombie, +puntuación
- HUD: munición / tiempo de arma restante
- Nueva casilla `5` = bloque destructible, generado en `generateChunk` (color distinto a pared `1`). Casilla `2` sigue siendo punto, `4` sigue siendo pellet de poder (ahora también da munición).

**No incluido:**
- Explosiones/bombas
- Dispersión/disparo múltiple
- Balas enemigas

## Modelo de Datos

```js
game.bullets = [];
game.pacman.ammo = 0;
game.pacman.gunTimer = 0;
```

## Plan de Implementación

1. **main.js**: manejador de Space con preventDefault.
2. **game.js**: `fireBullet(game)`; loop de balas en `update`; colisión con casillas vía `getTile`/`setTile`; colisión con enemigos; decremento de munición/temporizador.
3. **maze.js**: `generateChunk` esparce casillas `5` de bloques destructibles en celdas del piso.
4. **render.js**: dibujar balas como arcos pequeños; color de casilla `5`; munición en HUD.
5. Condición de victoria/derrota sin cambios.
