# Spec 02 — Pellets de Poder y Modo Asustado

**Estado:** Implementado
**Fecha:** 2026-10-02
**Objetivo:** Agregar 4 pellets de poder en las esquinas del laberinto; comerlos pone a los fantasmas en modo asustado (azules, más lentos, movimiento aleatorio) durante un temporizador, otorgando puntos escalables (200/400/800/1600) por cada fantasma comido.

## Alcance

**Incluido:**
- 4 pellets de poder en las esquinas del laberinto (posiciones en `maze.js`)
- Nuevo tipo de casilla: pellet de poder (valor 4 en la grilla)
- Estado asustado del fantasma: color azul, velocidad reducida, movimiento aleatorio
- Temporizador de modo asustado (configurable, ej. 7 segundos a 60fps = ~420 frames)
- Puntos escalables: 1er fantasma=200, 2do=400, 3ro=800, 4to=1600 (se reinicia por pellet de poder)
- Fantasmas parpadean en blanco cuando el temporizador < 2s (advertencia)
- Fantasmas comidos regresan a la jaula (solo ojos), reaparecen tras un retraso
- Los pellets de poder persisten en `game.grid` (se mutan al ser comidos)

**No incluido:**
- Escena/intermisión cuando todos los fantasmas son comidos
- Múltiples pellets de poder activos simultáneamente (solo un temporizador)
- Frutas/bonificaciones
- Persistencia de puntaje máximo

## Modelo de Datos

### Adiciones al laberinto (`maze.js`)
```js
// Valores de casilla: 0=vacío, 1=pared, 2=punto, 3=puerta fantasma, 4=pellet de poder
const POWER_PELLET_POSITIONS = [
  { x: 1, y: 1 },      // superior-izquierda
  { x: 26, y: 1 },     // superior-derecha
  { x: 1, y: 29 },     // inferior-izquierda
  { x: 26, y: 29 },    // inferior-derecha
];
```

### Adiciones al estado del juego (`game.js` createGame)
```js
return {
  // ...campos existentes
  powerPelletsRemaining: 4,
  frightenedTimer: 0,
  ghostsEatenThisPower: 0,  // para puntos escalables
};
```

### Adiciones al estado de ejecución del fantasma
```js
ghosts: GHOST_STARTS.map( ( g ) => ( {
  // ...existente
  frightened: false,
  eaten: false,
  respawnTimer: 0,
} ) ),
```

### Constantes (`game.js`)
```js
const FRIGHTENED_DURATION = 420;  // frames @ 60fps = 7s
const FRIGHTENED_SPEED = 0.05;    // mitad de velocidad normal
const FLASH_THRESHOLD = 120;      // frames < 2s = parpadeo
const FRIGHTENED_POINTS = [200, 400, 800, 1600];
const RESPAWN_DELAY = 120;        // frames antes de que el fantasma salga de la jaula
```

## Plan de Implementación

1. **Actualizar `maze.js`**: Agregar valor de casilla para pellet de poder (4), parsear en `MAZE_STR`, agregar constante `POWER_PELLET_POSITIONS`, inicializar en `MAZE`.
2. **Actualizar constantes de `game.js`**: Agregar `FRIGHTENED_DURATION`, `FRIGHTENED_SPEED`, `FLASH_THRESHOLD`, `FRIGHTENED_POINTS`, `RESPAWN_DELAY`.
3. **Actualizar `createGame()`**: Inicializar `powerPelletsRemaining`, `frightenedTimer`, `ghostsEatenThisPower`; agregar `frightened`, `eaten`, `respawnTimer` a cada fantasma.
4. **Actualizar `movePacman()`**: Detectar comida de pellet de poder (valor de grilla 4) → iniciar modo asustado, reiniciar `ghostsEatenThisPower`.
5. **Agregar `startFrightenedMode(game)`**: Establecer `frightenedTimer = FRIGHTENED_DURATION`, poner todos los fantasmas `frightened=true`, `speed=FRIGHTENED_SPEED`.
6. **Actualizar `decideGhost()`**: Si `g.frightened` → dirección válida aleatoria (sin A*); si `g.eaten` → moverse hacia la jaula (A* al centro de la jaula), luego reaparecer.
7. **Actualizar `moveGhost()`**: Manejar cuenta regresiva del temporizador `frightened`; lógica de parpadeo; manejar estado `eaten` (solo ojos, regresar a jaula).
8. **Actualizar colisión en `update()`**: Si `g.frightened` y no `g.eaten` → comer fantasma: score += `FRIGHTENED_POINTS[ghostsEatenThisPower]`, `ghostsEatenThisPower++`, `g.eaten=true`, `g.frightened=false`, `g.speed=GHOST_SPEED`, `g.respawnTimer=RESPAWN_DELAY`.
9. **Actualizar `render.js`**: Dibujar pellets de poder (más grandes, parpadeantes); dibujar fantasmas asustados (cuerpo azul, parpadeo blanco al final); dibujar fantasmas comidos (solo ojos).
10. **Actualizar `resetPositions()`**: Reiniciar `frightened`, `eaten`, `respawnTimer` al perder una vida.

## Criterios de Aceptación

- [ ] 4 pellets de poder visibles en las esquinas del laberinto (más grandes, parpadeantes)
- [ ] Comer pellet de poder activa modo asustado (los 4 fantasmas)
- [ ] Fantasmas asustados: azules, más lentos, movimiento aleatorio
- [ ] Fantasmas parpadean en blanco cuando quedan <2s
- [ ] Comer fantasma asustado: otorga 200→400→800→1600, fantasma queda solo con ojos
- [ ] Fantasma comido regresa a la jaula, reaparece tras el retraso
- [ ] Modo asustado termina al acabar el temporizador → fantasmas retoman comportamiento normal
- [ ] Sin errores de consola; 60fps mantenidos

## Decisiones Tomadas y Descartadas

- **Decisión**: 4 pellets de poder en esquinas fijas. *Razón*: El usuario eligió "esquinas (original)".
- **Decisión**: Comportamiento asustado completo (azul, lento, aleatorio, parpadeo, ojos regresan). *Razón*: El usuario eligió "fantasmas azules, velocidad reducida, movimiento aleatorio".
- **Decisión**: Puntos escalables 200/400/800/1600 por pellet de poder. *Razón*: El usuario eligió "timer configurable + puntos escalonados".
- **Decisión**: Temporizador único de modo asustado (sin acumulación). *Razón*: Más simple, coincide con el comportamiento original.
- **Descartado**: Frutas, puntajes máximos, escenas. *Razón*: Fuera de alcance.

## Riesgos Identificados

- **Lógica de reaparición del fantasma**: Los ojos que regresan a la jaula necesitan pathfinding A* al centro de la jaula; verificar que no haya bucles infinitos.
- **Sincronización del parpadeo**: El temporizador basado en frames debe sincronizarse a 60fps; probar a diferentes velocidades de frame.
- **Renderizado de pellets de poder**: Deben distinguirse visualmente de los puntos (más grandes, pulsantes).
- **Conflictos de estado**: Un fantasma no puede estar asustado y comido al mismo tiempo; asegurar que sean mutuamente excluyentes.
