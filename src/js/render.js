// render.js
// Dibujo arcade sobre canvas. Camara centrada en Pacman, mundo infinito.

const TILE = 20;
const WALL_COLOR = '#2121ff';
const DOT_COLOR = '#ffb897';
const POWER_PELLET_COLOR = '#ffb897';

function cellCenter( x, y ) {
  return { cx: x * TILE + TILE / 2, cy: y * TILE + TILE / 2 };
}

// Centro de camara en coords de mundo (pixels)
function camera( game, ctx ) {
  const p = game.pacman;
  const cx = p.x * TILE + TILE / 2 - ctx.canvas.width / 2;
  const cy = p.y * TILE + TILE / 2 - ctx.canvas.height / 2;
  return { cx, cy };
}

// Dibuja una celda en pantalla dado su (x,y) de mundo y offset de camara
function drawCell( ctx, x, y, v, frame, ox, oy ) {
  const px = x * TILE - ox;
  const py = y * TILE - oy;
  const cx = px + TILE / 2;
  const cy = py + TILE / 2;
  if ( v === 1 ) {
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect( px, py, TILE, TILE );
  } else if ( v === 5 ) {
    ctx.fillStyle = '#8b5a2b'; // bloque destructible marron
    ctx.fillRect( px + 1, py + 1, TILE - 2, TILE - 2 );
  } else if ( v === 2 ) {
    ctx.fillStyle = DOT_COLOR;
    ctx.beginPath();
    ctx.arc( cx, cy, 2.5, 0, Math.PI * 2 );
    ctx.fill();
  } else if ( v === 4 ) {
    const pulse = Math.sin( frame * 0.15 ) * 0.3 + 0.7;
    ctx.fillStyle = POWER_PELLET_COLOR;
    ctx.beginPath();
    ctx.arc( cx, cy, 5 * pulse, 0, Math.PI * 2 );
    ctx.fill();
  } else if ( v === 6 ) {
    // Cruz: dos rectangulos blancos
    ctx.fillStyle = '#ffffff';
    ctx.fillRect( cx - 1.5, py + 3, 3, TILE - 6 );
    ctx.fillRect( px + 3, cy - 1.5, TILE - 6, 3 );
  }
}

function drawPacman( ctx, p, frame, ox, oy ) {
  const { cx, cy } = cellCenter( p.x, p.y );
  const px = cx - ox;
  const py = cy - oy;
  let rot = 0;
  if ( p.dir === 'right' ) rot = 0;
  else if ( p.dir === 'down' ) rot = Math.PI / 2;
  else if ( p.dir === 'left' ) rot = Math.PI;
  else if ( p.dir === 'up' ) rot = -Math.PI / 2;

  const open = ( Math.sin( frame * 0.3 ) * 0.5 + 0.5 ) * 0.28 + 0.02;

  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.moveTo( px, py );
  ctx.arc( px, py, TILE / 2 - 1, rot + open * Math.PI, rot - open * Math.PI );
  ctx.closePath();
  ctx.fill();
}

function drawGhost( ctx, g, color, frame, frightenedTimer, ox, oy ) {
  const { cx, cy } = cellCenter( g.x, g.y );
  const px = cx - ox;
  const py = cy - oy;
  const r = TILE / 2 - 1;
  const top = py - r;
  const bottom = py + r;
  const left = px - r;
  const right = px + r;

  let bodyColor = color;
  if ( g.eaten ) {
    // Solo ojos, sin cuerpo
  } else if ( g.frightened ) {
    if ( frightenedTimer > 0 && frightenedTimer < 120 && Math.floor( frightenedTimer / 8 ) % 2 === 0 ) {
      bodyColor = '#ffffff';
    } else {
      bodyColor = '#2121ff';
    }
  }

  if ( !g.eaten ) {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc( px, py - 1, r, Math.PI, 0, false );
    ctx.lineTo( right, bottom );
    ctx.lineTo( right - r * 0.66, bottom - 4 );
    ctx.lineTo( px, bottom );
    ctx.lineTo( left + r * 0.66, bottom - 4 );
    ctx.lineTo( left, bottom );
    ctx.closePath();
    ctx.fill();
  }

  const dir = DIRS[ g.dir ] || { x: 0, y: 0 };
  const ex = dir.x * 1.6;
  const ey = dir.y * 1.6;
  for ( const off of [ -3.5, 3.5 ] ) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc( px + off, py - 1, 3, 0, Math.PI * 2 );
    ctx.fill();
    if ( !g.frightened && !g.eaten ) {
      ctx.fillStyle = '#0000bb';
      ctx.beginPath();
      ctx.arc( px + off + ex, py - 1 + ey, 1.5, 0, Math.PI * 2 );
      ctx.fill();
    } else if ( g.frightened ) {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc( px + off, py - 1, 1, 0, Math.PI * 2 );
      ctx.fill();
    } else if ( g.eaten ) {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc( px + off, py - 1, 1, 0, Math.PI * 2 );
      ctx.fill();
    }
  }
}

function drawHUD( ctx, game, W ) {
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText( 'SCORE ' + game.score, 8, 4 );
  ctx.textAlign = 'left';
  if ( game.pacman.hasGun ) ctx.fillText( 'AMMO ' + game.pacman.ammo + ' T ' + Math.ceil( game.pacman.gunTimer / 60 ), 8, 22 );
  ctx.fillText( 'CRUCES ' + game.pacman.crosses, 8, 40 );
  ctx.textAlign = 'right';
  ctx.fillText( 'VIDAS ' + game.lives, W - 8, 4 );
  ctx.fillText( 'ZOMBIES ' + game.zombies.length, W - 8, 22 );
}


function draw( ctx, game, frame ) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const { cx: ox, cy: oy } = camera( game, ctx );

  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, w, h );

  // Rango de tiles visibles
  const x0 = Math.floor( ox / TILE );
  const y0 = Math.floor( oy / TILE );
  const x1 = Math.ceil( ( ox + w ) / TILE );
  const y1 = Math.ceil( ( oy + h ) / TILE );
  for ( let y = y0; y <= y1; y++ ) {
    for ( let x = x0; x <= x1; x++ ) {
      drawCell( ctx, x, y, getTile( x, y ), frame, ox, oy );
    }
  }

  drawPacman( ctx, game.pacman, frame, ox, oy );
  game.zombies.forEach( ( z, i ) => drawGhost( ctx, { ...z, frightened: false, eaten: false }, '#2ecc40', frame, 0, ox, oy ) );
  game.ghosts.forEach( ( gh, i ) => drawGhost( ctx, { ...gh, frightened: false, eaten: false }, '#ff6b6b', frame, 0, ox, oy ) );
  // Balas
  ctx.fillStyle = '#ffff00';
  for ( const b of game.bullets ) {
    ctx.beginPath();
    ctx.arc( b.x * TILE + TILE / 2 - ox, b.y * TILE + TILE / 2 - oy, 3, 0, Math.PI * 2 );
    ctx.fill();
  }
  // Escudo: anillo azul alrededor de Pacman
  if ( game.shieldTimer > 0 ) {
    const { cx, cy } = cellCenter( game.pacman.x, game.pacman.y );
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc( cx - ox, cy - oy, TILE / 2 + 3, 0, Math.PI * 2 );
    ctx.stroke();
  }

  drawHUD( ctx, game, w );
}

window.draw = draw;
