// game.js
// Estado y reglas. Depende de globals de maze.js: getTile, setTile, PACMAN_START.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.1;    // 1/10 celda/frame
const GHOST_SPEED = 1 / 12;  // ~0.0833, 12 frames/celda (un poco mas lento)

// Power pellets & frightened mode
const FRIGHTENED_DURATION = 480;   // frames @ 60fps = 8s
const FRIGHTENED_SPEED = 0.04;     // un poco mas lento
const FRIGHTENED_POINTS = [200, 400, 800, 1600];
const RESPAWN_DELAY = 120;         // frames antes de revivir fantasma comido

// Posiciones iniciales de fantasmas (alrededor del inicio de Pacman)
const GHOST_STARTS = [
  { x: 8, y: 4, kind: 'blinky' },
  { x: 4, y: 8, kind: 'pinky' },
  { x: 12, y: 8, kind: 'inky' },
  { x: 8, y: 12, kind: 'clyde' },
];

// Crea una partida nueva.
function createGame() {
  // Asegurar que existe el chunk de inicio (genera al empezar).
  getTile( PACMAN_START.x, PACMAN_START.y );

  return {
    state: 'start',
    score: 0,
    lives: 3,
    frightenedTimer: 0,
    ghostsEatenThisPower: 0,
    frame: 0,
    dotsEaten: 0,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      frightened: false,
      eaten: false,
      respawnTimer: 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( x, y, actor ) {
  const v = getTile( x, y );
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  return !isWall( x + d.x, y + d.y, actor );
}

// Elige un dir valido para un fantasma en su celda actual. Preferir preferido.
function chooseGhostDir( x, y, currentDir, preferido ) {
  const candidatos = [];
  if ( preferido && canMove( x, y, preferido, 'ghost' ) ) candidatos.push( preferido );
  for ( const dir of Object.keys( DIRS ) ) {
    if ( dir === preferido ) continue;
    if ( dir === OPPOSITE[ currentDir ] ) continue;
    if ( canMove( x, y, dir, 'ghost' ) ) candidatos.push( dir );
  }
  if ( candidatos.length ) return candidatos[ 0 ];
  // Si no hay alternativa que no sea opuesto, permitir opuesto para no atascar.
  for ( const dir of Object.keys( DIRS ) ) {
    if ( dir === preferido ) continue;
    if ( canMove( x, y, dir, 'ghost' ) ) candidatos.push( dir );
  }
  return candidatos.length ? candidatos[ 0 ] : currentDir;
}

// A* pathfinding para fantasmas
// Devuelve array de pasos {x,y} desde (sx,sy) hasta (tx,ty) o [] si no hay ruta
function findPath( sx, sy, tx, ty ) {
  const start = sx + ',' + sy;
  const goal = tx + ',' + ty;
  if ( start === goal ) return [];

  const open = [ { x: sx, y: sy, g: 0, f: heuristic( sx, sy, tx, ty ), parent: null } ];
  const closed = new Set();

  while ( open.length ) {
    open.sort( ( a, b ) => a.f - b.f );
    const current = open.shift();
    const key = current.x + ',' + current.y;
    if ( closed.has( key ) ) continue;
    closed.add( key );

    if ( current.x === tx && current.y === ty ) {
      const path = [];
      let node = current;
      while ( node.parent ) {
        path.unshift( { x: node.x, y: node.y } );
        node = node.parent;
      }
      return path;
    }

    for ( const n of neighbors( current.x, current.y ) ) {
      const nkey = n.x + ',' + n.y;
      if ( closed.has( nkey ) ) continue;
      const g = current.g + 1;
      const existing = open.find( ( o ) => o.x === n.x && o.y === n.y );
      if ( !existing || g < existing.g ) {
        const f = g + heuristic( n.x, n.y, tx, ty );
        const newNode = { x: n.x, y: n.y, g, f, parent: current };
        if ( existing ) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        } else {
          open.push( newNode );
        }
      }
    }
  }
  return []; // sin ruta
}

function heuristic( ax, ay, bx, by ) {
  return Math.abs( ax - bx ) + Math.abs( ay - by );
}

// Vecinas validas para A*. Solo se consideran tiles ya generados o
// generables por el jugador; no expandir a lo desconocido lejano.
function neighbors( x, y ) {
  const result = [];
  for ( const dir of Object.keys( DIRS ) ) {
    const d = DIRS[ dir ];
    const nx = x + d.x;
    const ny = y + d.y;
    const v = getTile( nx, ny );
    if ( v !== 1 ) { // solo pared bloquea (puerta fantasma permitida para fantasmas)
      result.push( { x: nx, y: ny } );
    }
  }
  return result;
}

function movePacman( game ) {
  const p = game.pacman;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( getTile( p.x, p.y ) === 2 ) {
      setTile( p.x, p.y, 0 );
      game.score += 10;
      game.dotsEaten++;
    }
    // Comer power pellet.
    if ( getTile( p.x, p.y ) === 4 ) {
      setTile( p.x, p.y, 0 );
      game.score += 50;
      startFrightenedMode( game );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
}

// Inicia modo frightened: todos los fantasmas se vuelven vulnerables
function startFrightenedMode( game ) {
  game.frightenedTimer = FRIGHTENED_DURATION;
  game.ghostsEatenThisPower = 0;
  for ( const g of game.ghosts ) {
    if ( !g.eaten ) {
      g.frightened = true;
      g.speed = FRIGHTENED_SPEED;
    }
  }
}

function decideGhost( game, g ) {
  const p = game.pacman;
  const gx = Math.round( g.x );
  const gy = Math.round( g.y );
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  // Modo frightened: movimiento aleatorio, no persigue
  if ( g.frightened ) {
    const options = Object.keys( DIRS ).filter(
      ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( gx, gy, dir, 'ghost' )
    );
    const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  // Comportamiento normal (chase)
  let tx = px;
  let ty = py;

  if ( g.kind === 'blinky' ) {
    tx = px;
    ty = py;
  } else if ( g.kind === 'pinky' ) {
    const pd = DIRS[ p.dir ] || { x: 0, y: 0 };
    tx = px + pd.x * 4;
    ty = py + pd.y * 4;
    if ( isWall( tx, ty, 'ghost' ) ) {
      tx = px;
      ty = py;
    }
  } else if ( g.kind === 'inky' ) {
    const blinky = game.ghosts.find( ( gg ) => gg.kind === 'blinky' );
    if ( blinky ) {
      const bx = Math.round( blinky.x );
      const by = Math.round( blinky.y );
      tx = px + ( px - bx );
      ty = py + ( py - by );
      if ( isWall( tx, ty, 'ghost' ) ) {
        tx = px;
        ty = py;
      }
    }
  } else if ( g.kind === 'clyde' ) {
    const dist = Math.abs( gx - px ) + Math.abs( gy - py );
    if ( dist <= 8 ) {
      const options = Object.keys( DIRS ).filter(
        ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( gx, gy, dir, 'ghost' )
      );
      const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
      g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
      return;
    }
  }

  // Usar A* para elegir dirección (chase normal)
  const path = findPath( gx, gy, tx, ty );
  if ( path.length > 0 ) {
    const next = path[ 0 ];
    const dx = next.x - gx;
    const dy = next.y - gy;
    for ( const dir of Object.keys( DIRS ) ) {
      if ( DIRS[ dir ].x === dx && DIRS[ dir ].y === dy ) {
        g.dir = dir;
        break;
      }
    }
  } else {
    const options = Object.keys( DIRS ).filter(
      ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( gx, gy, dir, 'ghost' )
    );
    const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

function moveGhost( game, g ) {
  // Decrementar timer de frightened mode
  if ( game.frightenedTimer > 0 ) {
    game.frightenedTimer--;
    if ( game.frightenedTimer === 0 ) {
      for ( const gg of game.ghosts ) {
        if ( gg.frightened && !gg.eaten ) {
          gg.frightened = false;
          gg.speed = GHOST_SPEED;
        }
      }
    }
  }

  // Fantasma comido: esperar delay y revivir en su inicio
  if ( g.eaten ) {
    g.respawnTimer--;
    if ( g.respawnTimer <= 0 ) {
      const i = GHOST_STARTS.findIndex( ( s ) => s.kind === g.kind );
      const start = GHOST_STARTS[ i ] || GHOST_STARTS[ 0 ];
      g.eaten = false;
      g.frightened = false;
      g.speed = GHOST_SPEED;
      g.x = start.x;
      g.y = start.y;
      g.dir = chooseGhostDir( g.x, g.y, 'up', 'up' );
    }
    return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  // Mantiene al fantasma sobre el centro de la celda en el eje perpendicular.
  if ( g.dir === 'left' || g.dir === 'right' ) g.y = Math.round( g.y );
  else if ( g.dir === 'up' || g.dir === 'down' ) g.x = Math.round( g.x );

  // No permitir que el siguiente paso cruce una pared, aunque venga desalineado.
  const cx = Math.round( g.x );
  const cy = Math.round( g.y );
  if ( !canMove( cx, cy, g.dir, 'ghost' ) ) {
    g.x = cx;
    g.y = cy;
    return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.frightenedTimer = 0;
  game.ghostsEatenThisPower = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.frightened = false;
    g.eaten = false;
    g.respawnTimer = 0;
    g.speed = GHOST_SPEED;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  game.frame++;
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      if ( g.frightened && !g.eaten ) {
        const idx = game.ghostsEatenThisPower;
        const points = FRIGHTENED_POINTS[ Math.min( idx, FRIGHTENED_POINTS.length - 1 ) ];
        game.score += points;
        game.ghostsEatenThisPower++;
        g.eaten = true;
        g.frightened = false;
        g.speed = GHOST_SPEED;
        g.respawnTimer = RESPAWN_DELAY;
      } else if ( !g.frightened && !g.eaten ) {
        game.lives--;
        if ( game.lives <= 0 ) {
          game.state = 'lost';
          return;
        }
        resetPositions( game );
        break;
      }
    }
  }
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
