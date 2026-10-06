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

// Power pellets & frightened mode
const FRIGHTENED_DURATION = 480;   // frames @ 60fps = 8s
const ZOMBIE_SPAWN_INTERVAL = 180; // frames entre spawns
const MAX_ZOMBIES = 12;
const SPAWN_MIN_DIST = 8;
const ZOMBIE_SPEED = 1 / 12;

// Crea una partida nueva.
function createGame() {
  // Asegurar que existe el chunk de inicio (genera al empezar).
  getTile( PACMAN_START.x, PACMAN_START.y );
  // Limpiar celdas de spawn: nunca deben ser bloque ni dot
  setTile( PACMAN_START.x, PACMAN_START.y, 0 );

  return {
    state: 'start',
    score: 0,
    lives: 3,
    frightenedTimer: 0,
    ghostsEatenThisPower: 0,
    frame: 0,
    dotsEaten: 0,
    powerPelletsEaten: 0,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
      hasGun: false,
      ammo: 0,
      gunTimer: 0,
      crosses: 0,
    },
    bullets: [],
    zombies: [],
    zombieSpawnTimer: 0,
    ghosts: [],
    crosses: [],
    shieldTimer: 0,
    nextShieldAt: 1000,
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
  if ( v === 5 ) return true; // bloque destructible bloquea paso hasta romperse
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
    if ( v !== 1 && v !== 5 ) { // solo pared/bloque bloquean
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
      game.powerPelletsEaten++;
      startFrightenedMode( game );
      // Arma: recarga munición y reinicia timer
      p.hasGun = true;
      p.ammo += 15;
      p.gunTimer = 8 * 60; // 8s @60fps
    }
    // Recoger cruz (tile 6).
    if ( getTile( p.x, p.y ) === 6 ) {
      setTile( p.x, p.y, 0 );
      p.crosses++;
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
}


function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.frightenedTimer = 0;
  game.ghostsEatenThisPower = 0;
  game.shieldTimer = 0;
  game.zombies = [];
  game.zombieSpawnTimer = 0;
  game.ghosts = [];
  for ( const b of game.bullets ) b.x = -999; // descartar
  game.bullets = [];
}

// Spawn de zombie en tile transitable a distancia >= SPAWN_MIN_DIST del jugador
function spawnZombie( game ) {
  if ( game.zombies.length >= MAX_ZOMBIES ) return;
  const p = game.pacman;
  for ( let tries = 0; tries < 40; tries++ ) {
    const ox = ( ( Math.random() * 41 ) | 0 ) - 20;
    const oy = ( ( Math.random() * 41 ) | 0 ) - 20;
    const x = Math.round( p.x ) + ox;
    const y = Math.round( p.y ) + oy;
    const dist = Math.abs( x - p.x ) + Math.abs( y - p.y );
    if ( dist < SPAWN_MIN_DIST ) continue;
    const v = getTile( x, y );
    if ( v === 1 || v === 5 ) continue;
    game.zombies.push( { x, y, dir: 'up', speed: ZOMBIE_SPEED, kind: 'zombie' } );
    return;
  }
}

function moveZombie( game, z ) {
  const px = Math.round( game.pacman.x );
  const py = Math.round( game.pacman.y );

  if ( aligned( z.x ) && aligned( z.y ) ) {
    z.x = Math.round( z.x );
    z.y = Math.round( z.y );
    // Chase: A* al jugador. Tile 5 bloquea (neighbors ya lo excluye).
    const path = findPath( z.x, z.y, px, py );
    if ( path.length > 0 ) {
      const next = path[ 0 ];
      const dx = next.x - z.x;
      const dy = next.y - z.y;
      for ( const dir of Object.keys( DIRS ) ) {
        if ( DIRS[ dir ].x === dx && DIRS[ dir ].y === dy ) { z.dir = dir; break; }
      }
    } else {
      // Contenido por bloques: deambular
      const options = Object.keys( DIRS ).filter(
        ( dir ) => dir !== OPPOSITE[ z.dir ] && canMove( z.x, z.y, dir, 'ghost' )
      );
      const choices = options.length ? options : [ '' + OPPOSITE[ z.dir ] ];
      z.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    }
    if ( !canMove( z.x, z.y, z.dir, 'ghost' ) ) return;
  }

  if ( z.dir === 'left' || z.dir === 'right' ) z.y = Math.round( z.y );
  else if ( z.dir === 'up' || z.dir === 'down' ) z.x = Math.round( z.x );

  const cx = Math.round( z.x );
  const cy = Math.round( z.y );
  if ( !canMove( cx, cy, z.dir, 'ghost' ) ) {
    z.x = cx;
    z.y = cy;
    return;
  }

  const d = DIRS[ z.dir ];
  z.x += d.x * z.speed;
  z.y += d.y * z.speed;
}

// Dispara una bala desde Pacman en su direccion actual.
function fireBullet( game ) {
  const p = game.pacman;
  if ( !p.hasGun || p.ammo <= 0 ) return;
  const d = DIRS[ p.dir ];
  p.ammo--;
  game.bullets.push( {
    x: p.x + d.x * 0.5,
    y: p.y + d.y * 0.5,
    vx: d.x * PACMAN_SPEED * 2,
    vy: d.y * PACMAN_SPEED * 2,
    radius: 0.2,
  } );
}

// Avanza balas, colision tiles y enemigos.
function updateBullets( game ) {
  const p = game.pacman;
  if ( p.gunTimer > 0 ) {
    p.gunTimer--;
    if ( p.gunTimer === 0 ) p.ammo = 0;
  }
  for ( let i = game.bullets.length - 1; i >= 0; i-- ) {
    const b = game.bullets[ i ];
    b.x += b.vx;
    b.y += b.vy;
    const tx = Math.round( b.x );
    const ty = Math.round( b.y );
    const v = getTile( tx, ty );
    if ( v === 1 ) {
      game.bullets.splice( i, 1 );
      continue;
    }
    // Colisión con zombies
    let hit = false;
    for ( let zi = game.zombies.length - 1; zi >= 0; zi-- ) {
      const z = game.zombies[ zi ];
      if ( Math.abs( z.x - b.x ) < 0.5 && Math.abs( z.y - b.y ) < 0.5 ) {
        game.score += 200;
        // Zombie muerto → ghost aliado en la misma celda
        game.ghosts.push( { x: z.x, y: z.y, dir: 'up', speed: ZOMBIE_SPEED, kind: 'ghost' } );
        game.zombies.splice( zi, 1 );
        hit = true;
        break;
      }
    }
    if ( hit ) {
      game.bullets.splice( i, 1 );
      continue;
    }
    // Fuera de rango razonable: descartar si se aleja mucho del jugador
    if ( Math.abs( b.x - p.x ) > 40 || Math.abs( b.y - p.y ) > 40 ) {
      game.bullets.splice( i, 1 );
    }
  }
}

// Ghost enemigo: persigue a Pacman con A*; contacto le quita vida.
function moveGhost( game, gh ) {
  const px = Math.round( game.pacman.x );
  const py = Math.round( game.pacman.y );
  const gx = Math.round( gh.x );
  const gy = Math.round( gh.y );

  if ( aligned( gh.x ) && aligned( gh.y ) ) {
    gh.x = Math.round( gh.x );
    gh.y = Math.round( gh.y );
    const path = findPath( gx, gy, px, py );
    if ( path.length > 0 ) {
      const next = path[ 0 ];
      const dx = next.x - gx;
      const dy = next.y - gy;
      for ( const dir of Object.keys( DIRS ) ) {
        if ( DIRS[ dir ].x === dx && DIRS[ dir ].y === dy ) { gh.dir = dir; break; }
      }
    } else {
      gh.dir = wanderDir( gx, gy, gh.dir );
    }
    if ( !canMove( gh.x, gh.y, gh.dir, 'ghost' ) ) return;
  }

  if ( gh.dir === 'left' || gh.dir === 'right' ) gh.y = Math.round( gh.y );
  else if ( gh.dir === 'up' || gh.dir === 'down' ) gh.x = Math.round( gh.x );

  const cx = Math.round( gh.x );
  const cy = Math.round( gh.y );
  if ( !canMove( cx, cy, gh.dir, 'ghost' ) ) {
    gh.x = cx;
    gh.y = cy;
    return;
  }

  const d = DIRS[ gh.dir ];
  gh.x += d.x * gh.speed;
  gh.y += d.y * gh.speed;

  // Contacto con Pacman: pierde vida (o escudo destruye al ghost)
  if ( Math.abs( game.pacman.x - gh.x ) < 0.5 && Math.abs( game.pacman.y - gh.y ) < 0.5 ) {
    if ( game.shieldTimer > 0 ) {
      game.ghosts.splice( game.ghosts.indexOf( gh ), 1 );
      return;
    }
    game.lives--;
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
  }
}

function wanderDir( x, y, currentDir ) {
  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ currentDir ] && canMove( x, y, dir, 'ghost' )
  );
  const choices = options.length ? options : [ '' + OPPOSITE[ currentDir ] ];
  return choices[ Math.floor( Math.random() * choices.length ) ];
}

// Tecla K: consume 1 cruz y mata ghosts en linea recta hasta un muro.
function useCross( game ) {
  const p = game.pacman;
  if ( p.crosses <= 0 ) return;
  p.crosses--;
  const d = DIRS[ p.dir ];
  let x = Math.round( p.x ) + d.x;
  let y = Math.round( p.y ) + d.y;
  while ( !isWall( x, y, 'ghost' ) ) {
    for ( let i = game.ghosts.length - 1; i >= 0; i-- ) {
      const gh = game.ghosts[ i ];
      if ( Math.abs( gh.x - x ) < 0.5 && Math.abs( gh.y - y ) < 0.5 ) {
        game.score += 50;
        game.ghosts.splice( i, 1 );
      }
    }
    x += d.x;
    y += d.y;
  }
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  game.frame++;
  if ( game.frightenedTimer > 0 ) game.frightenedTimer--;
  movePacman( game );
  // Evicción de chunks lejanos cada 60 frames
  if ( game.frame % 60 === 0 ) {
    evictFarChunks( Math.round( game.pacman.x ), Math.round( game.pacman.y ), 3 );
  }
  game.zombieSpawnTimer++;
  if ( game.zombieSpawnTimer >= ZOMBIE_SPAWN_INTERVAL ) {
    game.zombieSpawnTimer = 0;
    spawnZombie( game );
  }
  game.zombies.forEach( ( z ) => moveZombie( game, z ) );
  game.ghosts.forEach( ( gh ) => moveGhost( game, gh ) );
  updateBullets( game );

  // Escudo: cada 1000 pts otorga 15s de proteccion
  if ( game.score >= game.nextShieldAt ) {
    game.shieldTimer = 15 * 60;
    game.nextShieldAt += 1000;
  }
  if ( game.shieldTimer > 0 ) game.shieldTimer--;

  for ( const z of game.zombies ) {
    if ( collides( game.pacman, z ) ) {
      if ( game.shieldTimer > 0 ) {
        // Escudo activo: destruye al zombie sin daño
        game.zombies.splice( game.zombies.indexOf( z ), 1 );
        break;
      }
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

window.createGame = createGame;
window.update = update;
window.fireBullet = fireBullet;
window.updateBullets = updateBullets;
window.useCross = useCross;
window.DIRS = DIRS;
