// main.js
// Bucle, teclado y pantallas. Usa createGame/update/draw (globals).

const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
const overlay = document.getElementById( 'overlay' );
const actionBtn = document.getElementById( 'action-btn' );

let game = createGame();
let frame = 0;

const KEY_DIR = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

document.addEventListener( 'keydown', ( e ) => {
  const dir = KEY_DIR[ e.key ];
  if ( dir ) {
    e.preventDefault();
    if ( game.state === 'playing' ) game.pacman.nextDir = dir;
    return;
  }
  if ( e.key === ' ' ) {
    e.preventDefault();
    if ( game.state === 'playing' && typeof fireBullet === 'function' ) fireBullet( game );
    return;
  }
  if ( e.key === 'k' || e.key === 'K' ) {
    e.preventDefault();
    if ( game.state === 'playing' && typeof useCross === 'function' ) useCross( game );
  }
} );

function showOverlay( title, cls, btnLabel ) {
  overlay.innerHTML =
    '<h1' + ( cls ? ' class="' + cls + '"' : '' ) + '>' + title + '</h1>' +
    '<button id="action-btn">' + btnLabel + '</button>';
  overlay.classList.add( 'show' );
  document.getElementById( 'action-btn' ).addEventListener( 'click', startGame );
}

function startGame() {
  game = createGame();
  game.state = 'playing';
  overlay.classList.remove( 'show' );
}

if ( actionBtn ) actionBtn.addEventListener( 'click', startGame );

let lastTick = performance.now();
const TICK_MS = 1000 / 60;
let acc = 0;

function loop( now ) {
  frame++;
  acc += now - lastTick;
  lastTick = now;
  // Actualiza a 60Hz fijo aunque la pantalla sea 120/144Hz.
  let steps = 0;
  while ( acc >= TICK_MS && steps < 4 ) {
    acc -= TICK_MS;
    steps++;
    if ( game.state === 'playing' ) {
      update( game );
      if ( game.state === 'won' ) showOverlay( 'GANASTE', 'win', 'Reiniciar' );
      else if ( game.state === 'lost' ) showOverlay( 'PERDISTE', 'lose', 'Reiniciar' );
    }
  }
  draw( ctx, game, frame );
  requestAnimationFrame( loop );
}

requestAnimationFrame( loop );
