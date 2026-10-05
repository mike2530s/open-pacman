// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Power pellets & frightened mode
const FRIGHTENED_DURATION = 420;   // frames @ 60fps = 7s
const FRIGHTENED_SPEED = 0.05;     // half normal speed
const FLASH_THRESHOLD = 120;       // frames < 2s = flash white
const FRIGHTENED_POINTS = [200, 400, 800, 1600];
const RESPAWN_DELAY = 120;         // frames before ghost leaves pen
const PEN_CENTER = { x: 13, y: 14 }; // centro de la pen para respawn (entero para A*)
const PINKY_RELEASE = 240;         // frames @ 60fps = 4s
const INKY_RELEASE_DOTS = 30;
const CLYDE_RELEASE_DOTS = 60;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  let powerPellets = 0;
  for ( const row of grid ) {
    for ( const v of row ) {
      if ( v === 2 ) dots++;
      else if ( v === 4 ) powerPellets++;
    }
  }

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    powerPelletsRemaining: powerPellets,
    frightenedTimer: 0,
    ghostsEatenThisPower: 0,
    frame: 0,
    dotsEaten: 0,
    grid,
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
      released: g.kind === 'blinky',
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

// Elige un dir valido para un fantasma en su celda actual. Preferir preferido.
function chooseGhostDir( grid, x, y, currentDir, preferido ) {
  const candidatos = [];
  if ( preferido && canMove( grid, x, y, preferido, 'ghost' ) ) candidatos.push( preferido );
  for ( const dir of Object.keys( DIRS ) ) {
    if ( dir === preferido ) continue;
    if ( dir === OPPOSITE[ currentDir ] ) continue;
    if ( canMove( grid, x, y, dir, 'ghost' ) ) candidatos.push( dir );
  }
  if ( candidatos.length ) return candidatos[ 0 ];
  // Si no hay alternativa que no sea opuesto, permitir opuesto para no atascar.
  for ( const dir of Object.keys( DIRS ) ) {
    if ( dir === preferido ) continue;
    if ( canMove( grid, x, y, dir, 'ghost' ) ) candidatos.push( dir );
  }
  return candidatos.length ? candidatos[ 0 ] : currentDir;
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

// A* pathfinding para fantasmas
// Devuelve array de pasos {x,y} desde (sx,sy) hasta (tx,ty) o [] si no hay ruta
function findPath( grid, sx, sy, tx, ty ) {
  const W = grid[ 0 ].length;
  const H = grid.length;
  const start = sx + ',' + sy;
  const goal = tx + ',' + ty;
  if ( start === goal ) return [];

  const open = [ { x: sx, y: sy, g: 0, f: heuristic( sx, sy, tx, ty ), parent: null } ];
  const closed = new Set();
  const cameFrom = new Map();

  while ( open.length ) {
    // Pop nodo con menor f
    open.sort( ( a, b ) => a.f - b.f );
    const current = open.shift();
    const key = current.x + ',' + current.y;
    if ( closed.has( key ) ) continue;
    closed.add( key );

    if ( current.x === tx && current.y === ty ) {
      // Reconstruir camino
      const path = [];
      let node = current;
      while ( node.parent ) {
        path.unshift( { x: node.x, y: node.y } );
        node = node.parent;
      }
      return path;
    }

    for ( const n of neighbors( current.x, current.y, grid ) ) {
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

// Vecinas válidas para A* (maneja túnel)
function neighbors( x, y, grid ) {
  const W = grid[ 0 ].length;
  const H = grid.length;
  const result = [];
  for ( const dir of Object.keys( DIRS ) ) {
    const d = DIRS[ dir ];
    let nx = x + d.x;
    let ny = y + d.y;
    // Túnel: fila TUNNEL_ROW conecta bordes
    if ( ny === TUNNEL_ROW && ( nx < 0 || nx >= W ) ) {
      nx = ( nx + W ) % W;
    }
    if ( nx >= 0 && nx < W && ny >= 0 && ny < H ) {
      const v = grid[ ny ][ nx ];
      if ( v !== 1 ) { // solo pared bloquea (puerta fantasma permitida para fantasmas)
        result.push( { x: nx, y: ny } );
      }
    }
  }
  return result;
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
      game.dotsEaten++;
    }
    // Comer power pellet.
    if ( grid[ p.y ][ p.x ] === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 50;
      game.powerPelletsRemaining--;
      startFrightenedMode( game );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
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
  const grid = game.grid;
  const p = game.pacman;
  const gx = Math.round( g.x );
  const gy = Math.round( g.y );
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  // Modo frightened: movimiento aleatorio, no persigue
  if ( g.frightened ) {
    const options = Object.keys( DIRS ).filter(
      ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, gx, gy, dir, 'ghost' )
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
    if ( tx < 0 ) tx = 0;
    if ( tx >= grid[ 0 ].length ) tx = grid[ 0 ].length - 1;
    if ( ty < 0 ) ty = 0;
    if ( ty >= grid.length ) ty = grid.length - 1;
    if ( grid[ ty ][ tx ] === 1 || grid[ ty ][ tx ] === 3 ) {
      tx = px;
      ty = py;
    }
  } else if ( g.kind === 'inky' ) {
    const blinky = game.ghosts.find( ( gg ) => gg.kind === 'blinky' );
    if ( blinky ) {
      const bx = Math.round( blinky.x );
      const by = Math.round( blinky.y );
      const vx = px - bx;
      const vy = py - by;
      tx = px + vx;
      ty = py + vy;
      if ( tx < 0 ) tx = 0;
      if ( tx >= grid[ 0 ].length ) tx = grid[ 0 ].length - 1;
      if ( ty < 0 ) ty = 0;
      if ( ty >= grid.length ) ty = grid.length - 1;
      if ( grid[ ty ][ tx ] === 1 || grid[ ty ][ tx ] === 3 ) {
        tx = px;
        ty = py;
      }
    }
  } else if ( g.kind === 'clyde' ) {
    const dist = Math.abs( gx - px ) + Math.abs( gy - py );
    if ( dist > 8 ) {
      tx = px;
      ty = py;
    } else {
      const options = Object.keys( DIRS ).filter(
        ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, gx, gy, dir, 'ghost' )
      );
      const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
      g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
      return;
    }
  }

  // Usar A* para elegir dirección (chase normal)
  const path = findPath( grid, gx, gy, tx, ty );
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
      ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, gx, gy, dir, 'ghost' )
    );
    const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // Decrementar timer de frightened mode
  if ( game.frightenedTimer > 0 ) {
    game.frightenedTimer--;
    if ( game.frightenedTimer === 0 ) {
      // Termina modo frightened: restaurar fantasmas
      for ( const gg of game.ghosts ) {
        if ( gg.frightened && !gg.eaten ) {
          gg.frightened = false;
          gg.speed = GHOST_SPEED;
        }
      }
    }
  }

  // Fantasma comido: siempre pathfind a pen (incluso si no alineado)
  if ( g.eaten ) {
    const gx = Math.round( g.x );
    const gy = Math.round( g.y );
    const path = findPath( grid, gx, gy, PEN_CENTER.x, PEN_CENTER.y );
    if ( path.length > 0 ) {
      const next = path[ 0 ];
      for ( const dir of Object.keys( DIRS ) ) {
        if ( DIRS[ dir ].x === next.x - gx && DIRS[ dir ].y === next.y - gy ) {
          g.dir = dir;
          break;
        }
      }
    } else {
      g.dir = chooseGhostDir( grid, gx, gy, g.dir, g.dir );
    }
    // Si llegó al centro de la pen, iniciar respawn
    if ( gx === Math.round( PEN_CENTER.x ) && gy === Math.round( PEN_CENTER.y ) ) {
      g.eaten = false;
      g.respawnTimer = RESPAWN_DELAY;
      g.x = PEN_CENTER.x;
      g.y = PEN_CENTER.y;
      g.speed = 0;
      g.dir = 'up';
    }
  }

  // Respawn: esperar quieto en el centro de la pen
  if ( g.respawnTimer > 0 ) {
    g.respawnTimer--;
    g.x = PEN_CENTER.x;
    g.y = PEN_CENTER.y;
    g.speed = 0;
    if ( g.respawnTimer === 0 ) {
      g.frightened = false;
      g.speed = GHOST_SPEED;
      g.x = PEN_CENTER.x;
      g.y = PEN_CENTER.y;
      g.dir = chooseGhostDir( grid, g.x, g.y, g.dir, 'up' );
    }
  } else if ( !g.eaten && aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( !g.released ) {
      // Bounce vertical dentro de la pen hasta ser liberado.
      // La puerta (3) se trata como pared mientras no este liberado.
      if ( g.dir !== 'up' && g.dir !== 'down' ) g.dir = 'up';
      const d = DIRS[ g.dir ];
      const ny = Math.round( g.y ) + d.y;
      const nx = Math.round( g.x ) + d.x;
      const blocked =
        !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ||
        ( nx >= 0 && nx < grid[ 0 ].length && ny >= 0 && ny < grid.length && grid[ ny ][ nx ] === 3 );
      if ( blocked ) {
        g.dir = g.dir === 'up' ? 'down' : 'up';
        const d2 = DIRS[ g.dir ];
        const ny2 = Math.round( g.y ) + d2.y;
        const nx2 = Math.round( g.x ) + d2.x;
        const blocked2 =
          !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ||
          ( nx2 >= 0 && nx2 < grid[ 0 ].length && ny2 >= 0 && ny2 < grid.length && grid[ ny2 ][ nx2 ] === 3 );
        if ( blocked2 ) return;
      }
    } else {
      decideGhost( game, g );
      if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
    }
  }

  // Mantiene al fantasma sobre el centro de la celda en el eje perpendicular.
  if ( g.dir === 'left' || g.dir === 'right' ) g.y = Math.round( g.y );
  else if ( g.dir === 'up' || g.dir === 'down' ) g.x = Math.round( g.x );

  // No permitir que el siguiente paso cruce una pared, aunque venga desalineado.
  const cx = Math.round( g.x );
  const cy = Math.round( g.y );
  if ( !canMove( grid, cx, cy, g.dir, 'ghost' ) ) {
    g.x = cx;
    g.y = cy;
    return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  // Terminar modo frightened al perder vida
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
  // Liberacion de fantasmas segun tiempo / dots comidos.
  for ( const g of game.ghosts ) {
    if ( g.released ) continue;
    if ( g.kind === 'pinky' && game.frame >= PINKY_RELEASE ) g.released = true;
    else if ( g.kind === 'inky' && game.dotsEaten >= INKY_RELEASE_DOTS ) g.released = true;
    else if ( g.kind === 'clyde' && game.dotsEaten >= CLYDE_RELEASE_DOTS ) g.released = true;
    if ( g.released ) {
      g.x = Math.round( g.x );
      g.y = Math.round( g.y );
      g.dir = chooseGhostDir( game.grid, g.x, g.y, g.dir, 'up' );
    }
  }
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      if ( g.frightened && !g.eaten ) {
        // Comer fantasma frightened
        const idx = game.ghostsEatenThisPower;
        const points = FRIGHTENED_POINTS[ Math.min( idx, FRIGHTENED_POINTS.length - 1 ) ];
        game.score += points;
        game.ghostsEatenThisPower++;
        g.eaten = true;
        g.frightened = false;
        g.speed = GHOST_SPEED;
        g.x = Math.round( g.x );
        g.y = Math.round( g.y );
      } else if ( !g.frightened && !g.eaten ) {
        // Colisión normal: pierde vida
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

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
