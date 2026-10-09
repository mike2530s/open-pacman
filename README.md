# open-pacman

Clon de Pac-Man en Vanilla JS con laberinto infinito, zombies, proyectiles y combate. Proyecto de aprendizaje con enfoque **Spec Driven Development**.

## Cómo jugar

Abre `src/index.html` en el navegador (sin servidor).

| Tecla | Acción |
|-------|--------|
| Flechas | Mover a Pac-Man |
| `Espacio` | Disparar (requiere arma) |
| `K` | Usar cruz (elimina enemigos en línea recta) |

## Tecnologías

- Vanilla JS · HTML · CSS
- Sin dependencias, sin build step

## Estructura

```
src/
├── index.html
├── css/style.css
└── js/
    ├── main.js    # Bucle, teclado, overlays
    ├── game.js    # Estado, reglas, movimiento, colisiones
    ├── maze.js    # Laberinto infinito por chunks (drunkard walk)
    └── render.js  # Dibujo en canvas
```

## Specs implementadas

| # | Spec |
|---|------|
| 01 | Cuatro fantasmas con personalidades |
| 02 | Power pellets y modo asustado |
| 03 | Salida de fantasmas y corrección de malla |
| 04 | Laberinto infinito por chunks |
| 05 | Proyectiles y munición |
| 06 | Hordas zombie con spawner |
| 07 | Combate: cruz, escudo, evicción de chunks |
