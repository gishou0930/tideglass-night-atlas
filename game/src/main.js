import { createAudio } from './audio.js';
import { beginGame, continueAfterClear, createGame, hudState, restartLevel, setRoute, throwEcho, togglePause, updateGame } from './game.js';
import { renderScene, screenToWorld } from './render.js';
import { CANVAS } from './render.js';

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const audio = createAudio();
const game = createGame();
const keys = new Set();
const pointer = { x: 650, y: 310 };
const nodes = {
  chapter: document.getElementById('chapterTag'),
  roomName: document.getElementById('roomName'),
  roomCaption: document.getElementById('roomCaption'),
  objectiveName: document.getElementById('objectiveName'),
  objectiveCheck: document.getElementById('objectiveCheck'),
  alertFill: document.getElementById('alertFill'),
  alertWord: document.getElementById('alertWord'),
  stealthStatus: document.getElementById('stealthStatus'),
  timer: document.getElementById('timer'),
  echoCount: document.getElementById('echoCount'),
  footstep: document.getElementById('footstep'),
  stageSubtitle: document.getElementById('stageSubtitle'),
  toast: document.getElementById('toast'),
  footerCount: document.querySelector('.card-footer span:first-child'),
  screenShade: document.getElementById('screenShade'),
  screenCard: document.getElementById('screenCard'),
  screenKicker: document.getElementById('screenKicker'),
  screenTitle: document.getElementById('screenTitle'),
  screenCopy: document.getElementById('screenCopy'),
  screenHint: document.getElementById('screenHint'),
  screenAction: document.getElementById('screenAction'),
};

let previousFrame = 0;
let lastHud = 0;

function drawScreen(mode) {
  const screens = {
    title: ['FIELD GUIDE / THE NIGHT ATLAS', 'THE TIDE IS OUT.', 'Three charts are missing. Move softly, read the lanterns, and leave by the tide door.', 'SLIP INSIDE', 'W A S D to move · hold SPACE beside cover'],
    paused: ['FIELD NOTES / PAUSED', 'LISTEN TO THE WATER.', 'The keepers keep walking while the room waits for you.', 'RETURN TO THE STACKS', 'Press ESC to return to the archive'],
    cleared: ['PAGE RECOVERED / FIELD ' + String(game.levelIndex + 1).padStart(2, '0'), 'THE INK REMEMBERS.', 'You crossed the room with ' + Math.round(game.alert * 100) + '% attention. The tide has one more page for you.', game.levelIndex === 2 ? 'FINISH THE ATLAS' : 'OPEN THE NEXT CHART', 'Press ENTER to continue · R to try this room again'],
    caught: ['FIELD LOST / THE WARDEN TURNED', 'THE DOOR IS SHUT.', 'A long look became a search. Hide before the lantern settles, or take the room again.', 'TRY THE ROOM AGAIN', 'The patrols always return to their old route'],
    complete: ['ARCHIVE RESTORED / THREE PAGES', 'THE NIGHT ATLAS IS WHOLE.', 'Three charts returned to the sea. The keepers have only the quiet left to remember.', 'WALK THE ARCHIVE AGAIN', 'Your cleanest route is the one you make your own'],
  };
  const isVisible = Object.prototype.hasOwnProperty.call(screens, mode);
  nodes.screenCard.hidden = !isVisible;
  nodes.screenShade.hidden = !isVisible;
  if (!isVisible) return;
  const copy = screens[mode];
  nodes.screenKicker.textContent = copy[0];
  nodes.screenTitle.textContent = copy[1];
  nodes.screenCopy.textContent = copy[2];
  nodes.screenAction.textContent = copy[3];
  nodes.screenHint.textContent = copy[4];
}

function refreshHud() {
  const data = hudState(game);
  nodes.chapter.textContent = data.chapter;
  nodes.roomName.textContent = data.roomName;
  nodes.roomCaption.textContent = data.roomCaption;
  nodes.objectiveName.textContent = data.objectiveName;
  nodes.objectiveCheck.textContent = data.objectiveFound ? '✓' : '○';
  nodes.objectiveCheck.style.color = data.objectiveFound ? '#9ed7c1' : '#ddc184';
  nodes.alertFill.style.width = data.alertPercent + '%';
  nodes.alertWord.textContent = data.alertLabel;
  nodes.alertWord.style.color = data.alertPercent > 72 ? '#ed8b76' : data.alertPercent > 32 ? '#e5c077' : '#a7d3bd';
  nodes.stealthStatus.textContent = data.stealth;
  nodes.timer.textContent = data.timer;
  nodes.echoCount.textContent = data.echoes;
  nodes.footstep.textContent = data.footstep;
  nodes.stageSubtitle.textContent = data.stageSubtitle;
  nodes.toast.textContent = data.toast;
  nodes.footerCount.textContent = data.pageCount;
  drawScreen(game.mode);
}

function localPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * CANVAS.width / rect.width,
    y: (event.clientY - rect.top) * CANVAS.height / rect.height,
  };
}

function onFrame(timestamp) {
  const dt = previousFrame ? Math.min(0.045, (timestamp - previousFrame) / 1000) : 0;
  previousFrame = timestamp;
  game.mouse = screenToWorld(pointer);
  updateGame(game, dt, keys, audio);
  renderScene(context, game, timestamp / 1000);
  if (timestamp - lastHud > 90) {
    refreshHud();
    lastHud = timestamp;
  }
  requestAnimationFrame(onFrame);
}

nodes.screenAction.addEventListener('click', () => {
  if (game.mode === 'title') beginGame(game, audio);
  else if (game.mode === 'paused') togglePause(game);
  else if (game.mode === 'cleared') continueAfterClear(game, audio);
  else if (game.mode === 'caught') restartLevel(game, audio);
  else if (game.mode === 'complete') restartLevel(game, audio, true);
  refreshHud();
});

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (event.repeat && ['e', 'enter', 'r', 'escape', 'p'].includes(key)) return;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === 'enter') {
    if (game.mode === 'title') beginGame(game, audio);
    else if (game.mode === 'cleared') continueAfterClear(game, audio);
    else if (game.mode === 'complete') restartLevel(game, audio, true);
    else if (game.mode === 'caught') restartLevel(game, audio);
    refreshHud();
  }
  if (key === 'escape' || key === 'p') {
    togglePause(game);
    refreshHud();
  }
  if (key === 'r') {
    restartLevel(game, audio);
    refreshHud();
  }
  if (key === 'e') {
    throwEcho(game, game.mouse, audio);
  }
});

window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('pointermove', (event) => {
  const point = localPointer(event);
  pointer.x = point.x;
  pointer.y = point.y;
});

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  const point = localPointer(event);
  pointer.x = point.x;
  pointer.y = point.y;
  if (game.mode === 'title') beginGame(game, audio);
  else if (game.mode === 'playing' && event.button === 2) throwEcho(game, screenToWorld(pointer), audio);
  else if (game.mode === 'playing') setRoute(game, screenToWorld(pointer));
  refreshHud();
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

refreshHud();
requestAnimationFrame(onFrame);
