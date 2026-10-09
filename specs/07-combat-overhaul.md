# Spec 07 — Revisión de Combate: Fantasmas Aliados, Cruces, Escudo y Memoria

**Estado:** Implementado
**Fecha:** 2026-10-06
**Objetivo:** Reemplazar los destructibles de casilla-5 con un mundo de solo paredes azules; los zombis muertos por armas se convierten en fantasmas aliados que cazan zombis; las cruces (ítem) matan fantasmas con K en línea recta; cada 1000 puntos otorga un escudo de daño de 15s; los chunks lejanos se desalojan para acotar la memoria.

## Alcance

**Incluido:**
- `generateChunk` deja de producir casilla `5`; solo casilla `1` (pared), `2` (punto), `4` (pellet), `0` (vacío)
- Las balas ya no rompen casillas; mueren en casilla `1` y matan zombis
- Zombi muerto por bala → eliminado, y un `ghost` aliado aparece en esa celda (`kind: 'ghost'`)
- Fantasma aliado: A* hacia el zombi más cercano vía `findPath`; contacto `d < 0.5` mata zombi (+100 puntuación); deambula inactivo cuando no hay zombis
- Ítem cruz: `crosses = [{x, y}]`; Pac-Man recoge al `d < 0.5` → `pacman.crosses++`; HUD `CRUCES n`
- Tecla `K`: consumir 1 cruz; matar fantasmas en línea recta desde Pac-Man a lo largo de `pacman.dir` hasta casilla `1`
- Escudo: cada múltiplo de 1000 en puntuación → `shieldTimer = 900` (15s @60fps); mientras está activo, el contacto con zombis destruye al zombi en lugar de costar una vida; `nextShieldAt` rastrea el umbral
- Desalojo de chunks: cada 60 frames, eliminar chunks a más de 3 chunks (Chebyshev/Manhattan) del chunk de Pac-Man; las ediciones en chunks desalojados se pierden (desalojo simple)

**No incluido:**
- Generación de casilla `5` (eliminada)
- Cruces que maten zombis (K apunta solo a fantasmas)
- Fantasmas aliados que reciban daño o mueran
- Deltas de chunks persistentes tras el desalojo

## Modelo de Datos

```js
game.zombies = [];                 // spec 06
game.ghosts = [];                  // nuevo: fantasmas aliados
game.crosses = [];                 // ítems cruz del mundo
game.pacman.crosses = 0;
game.shieldTimer = 0;
game.nextShieldAt = 1000;
```

Entidad fantasma aliado: `{x, y, dir, speed, kind: 'ghost'}`.

## Plan de Implementación

1. **maze.js**: eliminar casilla `5` de `generateChunk` (referencias a 5 en balas/`setTile` quedan inofensivas pero sin uso).
2. **game.js**: bala mata zombi → sacar zombi del array, agregar fantasma aliado; IA de fantasma aliado (`moveGhostAlly`) caza al zombi más cercano, contacto mata zombi (+100); sin ruta → deambular.
3. **game.js/main.js**: ítems cruz — spawnear en chunks (o aleatorio transitable cerca de pacman), recoger, conteo en HUD, manejador `K` mata fantasmas en línea hasta casilla `1`.
4. **game.js/render.js**: lógica de umbral del escudo; mientras `shieldTimer > 0` el contacto con zombis los destruye; dibujar anillo de escudo.
5. **maze.js**: desalojo de chunks cada 60 frames, radio 3 chunks alrededor del chunk del jugador.
6. Balas: eliminar rama de ruptura de casilla-5 (casilla 5 ya no existe).

## Criterios de Aceptación

- [ ] No se genera casilla `5` en nuevos chunks
- [ ] Bala mata zombi → aparece fantasma aliado en la misma celda
- [ ] Fantasma aliado persigue y mata zombis al contacto
- [ ] K consume una cruz y mata fantasmas en línea recta hasta la siguiente pared
- [ ] Cada 1000 puntos otorga escudo de 15s; el escudo destruye zombis al contacto
- [ ] Los chunks a más de 3 del chunk del jugador se eliminan del Map `chunks`
