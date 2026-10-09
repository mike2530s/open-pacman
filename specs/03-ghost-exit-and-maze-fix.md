# Spec 03 — Corrección de Salida de Fantasmas + Laberinto Fiel

**Estado:** Implementado
**Fecha:** 2026-10-02
**Depende de:** SPEC 01, SPEC 02
**Objetivo:** Reemplazar el `MAZE_STR` malformado con el diseño fiel 28x31 del nivel 1 de Pac-Man para que los fantasmas puedan salir de la jaula y las paredes conecten correctamente; corregir la liberación/reaparición de fantasmas para que salgan por la puerta hacia el mapa y los fantasmas comidos regresen como ojos en lugar de teleportarse.

## Alcance

**Incluido:**
- Reemplazar `MAZE_STR` en `maze.js` con el diseño fiel 28x31 (todas las filas exactamente 28 chars; filas 1 y 29 actualmente con 26 chars, y el corredor que rodea la jaula en la fila 11 está sellado)
- Actualizar `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `POWER_PELLET_POSITIONS` para coincidir con el nuevo laberinto:
  - `TUNNEL_ROW = 14`
  - `PACMAN_START = { x: 13, y: 23 }` (fila 23 usa ' ' para su celda)
  - Blinky inicia fuera de la jaula sobre la puerta `{ x: 13, y: 11 }`; Pinky/Inky/Clyde dentro de la jaula `{ x: 12|13|14, y: 14 }` (celdas ' ' / antiguo 'G')
  - Pellets de poder en las 4 posiciones arcade: `(1,3), (26,3), (1,23), (26,23)`
- Celdas interiores de la jaula se vuelven ' ' (0); las puertas permanecen '-' (3)
- Liberación de fantasmas: Blinky activo desde el inicio; Pinky liberado tras `PINKY_RELEASE` ms; Inky tras `INKY_RELEASE` o N puntos; Clyde tras `CLYDE_RELEASE` o M puntos. Hasta ser liberados, los fantasmas permanecen en la jaula moviéndose arriba/abajo (rebote original de jaula) o inactivos
- Corrección de reaparición de fantasma comido: eliminar `respawnTimer = RESPAWN_DELAY` inmediato en colisión; los ojos usan pathfinding A*/puerta existente hacia la jaula, y `respawnTimer` solo inicia cuando los ojos llegan a `PEN_CENTER`
- Los fantasmas liberados buscan ruta a través de la puerta como fantasmas normales (puerta accesible para 'ghost'), así caminan hacia el mapa — sin teleport

**No incluido:**
- Temporizadores de modo dispersión/persecución
- Animación de rebote de atracción en la jaula (los fantasmas pueden estar inactivos en su lugar)
- Cambios a la puntuación de modo asustado, lógica de pellets de poder, o estilo de renderizado de paredes (`drawWalls` ya conecta celdas de pared adyacentes; solo los datos estaban rotos)

## Modelo de Datos

### `maze.js`
```js
const MAZE_STR = [
  // 31 filas x 28 chars, diseño fiel nivel 1 (leyenda sin cambios:
  // '#'=1, '.'=2, ' '=0, '-'=3, 'o'=4), filas 13-15 cols 11-16 de la casa fantasma como ' '
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

### Constantes de `game.js`
```js
const PINKY_RELEASE = 240;   // frames (~4s @60fps)
const INKY_RELEASE_DOTS = 30;
const CLYDE_RELEASE_DOTS = 60;
```

### Adiciones al estado de ejecución del fantasma
```js
ghosts: GHOST_STARTS.map(g => ({
  // ...existente
  released: g.kind === 'blinky', // blinky activo desde el inicio
})),
```

## Plan de Implementación

1. **Reemplazar `MAZE_STR`** en `maze.js` con el diseño fiel; reemplazar filas con sed y verificar que cada fila tenga 28 chars al parsear (lanzar error en caso contrario).
2. **Actualizar constantes del laberinto**: `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`, `POWER_PELLET_POSITIONS` como se indica arriba.
3. **Actualizar `createGame()`**: agregar bandera `released` (blinky en true, otros en false); contar puntos/pellets desde la nueva grilla.
4. **Agregar verificaciones de liberación en `update()`**: antes de mover fantasmas, liberar a Pinky cuando el contador de frames o el poder terminen; Inky/Clyde cuando `dotsEaten` alcance los umbrales. Rastrear contador `game.frame`.
5. **Actualizar `moveGhost()`**: si `!g.released`, mantener al fantasma dentro de la jaula (inactivo o rebote vertical entre filas 13-15) y omitir decideGhost; una vez liberado, movimiento normal con `g.dir = 'up'` hacia la puerta.
6. **Corregir reaparición comido**: en el manejador de colisión NO establecer `respawnTimer`; en la rama de eaten de `moveGhost`, solo establecer `respawnTimer = RESPAWN_DELAY` (y ajustar a `PEN_CENTER`) cuando los ojos lleguen al centro de la jaula; eliminar `g.respawnTimer = RESPAWN_DELAY` del bloque de colisión.
7. **Sanidad en `decideGhost()`**: cuando `!g.released`, omitir targeting A* (solo movimiento de jaula).
8. **Verificar**: recargar navegador; los 4 contadores de puntos son consistentes; la celda de inicio de Pac-Man está vacía.

## Criterios de Aceptación

- [ ] Cada fila de `MAZE_STR` tiene exactamente 28 caracteres (agregar verificación en tiempo de parseo)
- [ ] El laberinto se renderiza simétrico, paredes continuas, la fila del túnel envuelve ambos bordes
- [ ] Blinky se mueve inmediatamente; Pinky/Inky/Clyde permanecen en la jaula hasta ser liberados, luego caminan por la puerta hacia el mapa (sin teleport)
- [ ] Los ojos del fantasma comido viajan desde el punto de muerte por ruta libre de paredes hasta la jaula, luego el fantasma espera `RESPAWN_DELAY` y vuelve al juego
- [ ] Los pellets de poder aparecen en `(1,3),(26,3),(1,23),(26,23)` y activan el modo asustado
- [ ] Sin errores de consola; 60fps mantenidos

## Decisiones Tomadas y Descartadas

- **Decisión**: Laberinto fiel 28x31 (con conectividad correcta del corredor de la fila 11). *Razón*: El diseño anterior sellaba los alrededores de la jaula; los fantasmas no tenían ruta hacia el mapa.
- **Decisión**: Liberación por tiempo (Pinky) + contadores de puntos (Inky/Clyde). *Razón*: El usuario eligió "tiempo + contador de dots".
- **Decisión**: Blinky fuera de la jaula en la puerta; el resto adentro. *Razón*: El usuario eligió esta distribución de spawn.
- **Decisión**: Puerta solo accesible para fantasmas (sin cambios). *Razón*: Coincide con el original; Pac-Man sigue bloqueado.
- **Descartado**: Animación de rebote lateral en la jaula; los fantasmas están inactivos verticalmente en su lugar. *Razón*: Minimizar cambio visual; la corrección de "paredes" era solo de datos.

## Riesgos Identificados

- **A* a través de la puerta hacia la jaula**: el A* de persecución puede enrutar fantasmas de vuelta al corredor de la jaula; aceptable visualmente pero verificar que los fantasmas no oscilen en la puerta.
- **Wrap del túnel en vecinos A***: la fila del túnel del nuevo diseño aún debe envolver; verificar que `TUNNEL_ROW` no haya cambiado (14).
- **Regresiones de ancho de fila**: agregar la verificación de runtime de 28 chars para que ediciones futuras fallen ruidosamente.
