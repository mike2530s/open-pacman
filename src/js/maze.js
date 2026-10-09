// maze.js
// Mundo infinito: malla generada por chunks con drunkard walk.
// Cada chunk es una matriz 16x16 mutable. Valor de tiles:
//   0 vacio transitable · 1 muro · 2 dot · 4 power pellet
// Generacion determinista por seed = hash(cx, cy, WORLD_SEED).

const CHUNK = 16;
const WORLD_SEED = 1337; // fijo para depurar; aleatorio si se desea

// RNG determinista
function mulberry32( a ) {
  return function () {
    a |= 0; a = ( a + 0x6D2B79F5 ) | 0;
    let t = Math.imul( a ^ ( a >>> 15 ), 1 | a );
    t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t;
    return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
  };
}

function hashSeed( cx, cy, seed ) {
  let h = ( seed ^ Math.imul( cx, 374761393 ) ^ Math.imul( cy, 668265263 ) ) | 0;
  h = Math.imul( h ^ ( h >>> 13 ), 1274126177 );
  return ( h ^ ( h >>> 16 ) ) >>> 0;
}

const chunks = new Map(); // "cx,cy" -> grid

function chunkKey( cx, cy ) {
  return cx + ',' + cy;
}

// Genera un chunk 16x16 con drunkard walk + aperturas en bordes.
function generateChunk( cx, cy ) {
  const grid = [];
  for ( let y = 0; y < CHUNK; y++ ) {
    const row = [];
    for ( let x = 0; x < CHUNK; x++ ) row.push( 1 );
    grid.push( row );
  }

  const rng = mulberry32( hashSeed( cx, cy, WORLD_SEED ) );
  let x = CHUNK >> 1;
  let y = CHUNK >> 1;
  grid[ y ][ x ] = 0;
  const steps = CHUNK * CHUNK * 1.2;
  const dirs = [ { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 } ];
  for ( let i = 0; i < steps; i++ ) {
    const d = dirs[ ( rng() * dirs.length ) | 0 ];
    x += d.dx;
    y += d.dy;
    // Mantener dentro del chunk con margen 1 para no abrir bordes al azar;
    // las aperturas de borde se tallan de forma controlada despues.
    if ( x < 1 ) x = 1;
    if ( x > CHUNK - 2 ) x = CHUNK - 2;
    if ( y < 1 ) y = 1;
    if ( y > CHUNK - 2 ) y = CHUNK - 2;
    grid[ y ][ x ] = 0;
  }

  // Aperturas de borde en puntos fijos (medio de cada lado). El chunk vecino
  // talla el mismo hueco en su lado opuesto, asi se conecta.
  const mid = CHUNK >> 1;
  grid[ 0 ][ mid ] = 0;          // arriba
  grid[ CHUNK - 1 ][ mid ] = 0;  // abajo
  grid[ mid ][ 0 ] = 0;          // izquierda
  grid[ mid ][ CHUNK - 1 ] = 0;  // derecha
  // Pasillos desde cada apertura hacia el centro para garantizar conexion.
  for ( let i = 0; i <= mid; i++ ) {
    grid[ i ][ mid ] = 0;              // arriba -> centro
    grid[ CHUNK - 1 - i ][ mid ] = 0;  // abajo -> centro
    grid[ mid ][ i ] = 0;              // izquierda -> centro
    grid[ mid ][ CHUNK - 1 - i ] = 0;  // derecha -> centro
  }

  // Dots y pellets sobre suelo (valor 0 -> 2 / 4)
  for ( let yy = 0; yy < CHUNK; yy++ ) {
    for ( let xx = 0; xx < CHUNK; xx++ ) {
      if ( grid[ yy ][ xx ] !== 0 ) continue;
      grid[ yy ][ xx ] = rng() < 0.8 ? 2 : 0;
    }
  }
  if ( rng() < 0.5 ) {
    // 1 pellet por chunk en celda de suelo aleatoria
    for ( let tries = 0; tries < 20; tries++ ) {
      const px = 1 + ( ( rng() * ( CHUNK - 2 ) ) | 0 );
      const py = 1 + ( ( rng() * ( CHUNK - 2 ) ) | 0 );
      if ( grid[ py ][ px ] === 2 || grid[ py ][ px ] === 0 ) {
        grid[ py ][ px ] = 4;
        break;
      }
    }
  }
  // Cruz (item, tile 6) con probabilidad 30% por chunk
  if ( rng() < 0.3 ) {
    for ( let tries = 0; tries < 20; tries++ ) {
      const px = 1 + ( ( rng() * ( CHUNK - 2 ) ) | 0 );
      const py = 1 + ( ( rng() * ( CHUNK - 2 ) ) | 0 );
      if ( grid[ py ][ px ] === 2 || grid[ py ][ px ] === 0 ) {
        grid[ py ][ px ] = 6;
        break;
      }
    }
  }

  chunks.set( chunkKey( cx, cy ), grid );
  return grid;
}

function getChunk( cx, cy ) {
  const k = chunkKey( cx, cy );
  return chunks.has( k ) ? chunks.get( k ) : generateChunk( cx, cy );
}

// Tile en coordenada global (puede ser negativa).
function getTile( x, y ) {
  const cx = Math.floor( x / CHUNK );
  const cy = Math.floor( y / CHUNK );
  const grid = getChunk( cx, cy );
  const lx = x - cx * CHUNK;
  const ly = y - cy * CHUNK;
  return grid[ ly ][ lx ];
}

function setTile( x, y, v ) {
  const cx = Math.floor( x / CHUNK );
  const cy = Math.floor( y / CHUNK );
  const grid = getChunk( cx, cy );
  const lx = x - cx * CHUNK;
  const ly = y - cy * CHUNK;
  grid[ ly ][ lx ] = v;
}

// Inicio de Pacman (global, cerca del origen)
const PACMAN_START = { x: 8, y: 8 };

window.CHUNK = CHUNK;
window.WORLD_SEED = WORLD_SEED;
window.chunks = chunks;
window.chunkKey = chunkKey;
window.generateChunk = generateChunk;
window.getTile = getTile;
window.setTile = setTile;
window.PACMAN_START = PACMAN_START;
