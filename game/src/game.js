import { ARCHIVE, LEVELS } from './levels.js';
import { circleHitsRect, distance, edgeDistance, inVisionCone, lineBlocked } from './geometry.js';

const MAX_ECHOES = 3;
const SALT_VEIL_CHARGES = 2;
const SALT_VEIL_DURATION = 5;

export function createGame() {
  const game = {
    mode: 'title',
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    echoes: [],
    elapsed: 0,
    alert: 0,
    pagesFound: 0,
    totalTime: 0,
    echoCount: MAX_ECHOES,
    echoRecharge: 0,
    saltVeilCharges: SALT_VEIL_CHARGES,
    saltVeilTime: 0,
    artifactFound: false,
    hidden: false,
    nearestCover: null,
    nearbyGuard: null,
    toast: 'The keepers walk the old routes.',
    lastSound: 0,
    lastStep: 0,
    lastWarning: 0,
    beaconAngle: Math.PI / 2,
    mouse: { x: 600, y: 250 },
  };
  loadLevel(game, 0);
  return game;
}

function loadLevel(game, index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  game.player = { x: game.level.start.x, y: game.level.start.y, angle: -Math.PI / 2, radius: 12, steps: [], route: [], routeIndex: 0 };
  game.guards = game.level.guards.map((guard) => ({
    ...guard,
    route: guard.route.map((point) => ({ x: point[0], y: point[1] })),
    x: guard.route[0][0],
    y: guard.route[0][1],
    angle: 0,
    waypoint: 1,
    mode: 'patrol',
    target: null,
    pause: 0.4,
    focus: 0,
    nextStep: 0,
    investigateTime: 0,
  }));
  game.echoes = [];
  game.elapsed = 0;
  game.alert = 0;
  game.echoCount = MAX_ECHOES;
  game.echoRecharge = 0;
  game.saltVeilCharges = SALT_VEIL_CHARGES;
  game.saltVeilTime = 0;
  game.artifactFound = false;
  game.hidden = false;
  game.nearestCover = null;
  game.nearbyGuard = null;
  game.beaconAngle = Math.PI / 2;
  game.toast = index === 0 ? 'Find the North Current. Then follow the blue door.' : game.level.subtitle + '.';
}

export function beginGame(game, audio) {
  if (game.mode === 'title') {
    game.mode = 'playing';
    game.toast = 'Watch the lanterns. Their old routes leave a gap.';
    audio.begin();
  }
}

export function restartLevel(game, audio, fromBeginning = false) {
  const index = fromBeginning ? 0 : game.levelIndex;
  game.totalTime = 0;
  game.pagesFound = index;
  loadLevel(game, index);
  game.mode = 'playing';
  audio.begin();
}

export function continueAfterClear(game, audio) {
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.mode = 'complete';
    game.toast = 'The Night Atlas is whole again.';
    audio.clear();
    return;
  }
  loadLevel(game, game.levelIndex + 1);
  game.mode = 'playing';
  game.toast = 'A fresh tide. The wardens have changed their rounds.';
  audio.page();
}

export function togglePause(game) {
  if (game.mode === 'playing') game.mode = 'paused';
  else if (game.mode === 'paused') game.mode = 'playing';
}

export function throwEcho(game, point, audio) {
  if (game.mode !== 'playing' || game.echoCount <= 0) return false;
  const target = {
    x: Math.max(18, Math.min(982, point.x)),
    y: Math.max(18, Math.min(502, point.y)),
  };
  game.echoes.push({ ...target, age: 0, strength: 1 });
  game.echoCount -= 1;
  game.toast = 'A shell sings somewhere in the stacks.';
  game.guards.forEach((guard) => {
    if (distance(guard, target) < 330) {
      guard.mode = 'investigate';
      guard.target = target;
      guard.investigateTime = 3.8;
      guard.focus = Math.max(0, guard.focus - 0.12);
    }
  });
  audio.echo();
  return true;
}

export function useSaltVeil(game) {
  if (game.mode !== 'playing' || game.saltVeilCharges <= 0 || game.saltVeilTime > 0) return false;
  game.saltVeilCharges -= 1;
  game.saltVeilTime = SALT_VEIL_DURATION;
  game.toast = 'Salt veil woven. The lanterns cannot read the brine.';
  return true;
}

export function setRoute(game, point) {
  if (game.mode !== 'playing') return;
  const route = findRoute(game.player, point, game.level.solids);
  game.player.route = route;
  game.player.routeIndex = 0;
  if (route.length) game.toast = 'A quiet path is marked through the stacks.';
}

export function updateGame(game, dt, keys, audio) {
  if (game.mode !== 'playing') return;
  game.elapsed += dt;
  game.totalTime += dt;
  game.saltVeilTime = Math.max(0, game.saltVeilTime - dt);
  game.echoRecharge += dt;
  if (game.echoCount < MAX_ECHOES && game.echoRecharge >= 7) {
    game.echoCount += 1;
    game.echoRecharge = 0;
    game.toast = 'An echo shell has formed in your pocket.';
  }
  game.echoes = game.echoes.filter((echo) => {
    echo.age += dt;
    echo.strength = Math.max(0, 1 - echo.age / 4.4);
    return echo.age < 4.4;
  });

  movePlayer(game, dt, keys, audio);
  moveGuards(game, dt);
  readTheLanterns(game, dt, keys, audio);
  checkObjectives(game, audio);
  updateFootsteps(game, audio);
}

function movePlayer(game, dt, keys, audio) {
  const player = game.player;
  let dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  let dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  let moving = dx !== 0 || dy !== 0;
  let routeTarget = null;
  let routeDistance = 0;
  if (moving) {
    player.route = [];
    player.routeIndex = 0;
  } else if (player.routeIndex < player.route.length) {
    routeTarget = player.route[player.routeIndex];
    dx = routeTarget.x - player.x;
    dy = routeTarget.y - player.y;
    routeDistance = Math.hypot(dx, dy);
    if (routeDistance < 8) {
      player.x = routeTarget.x;
      player.y = routeTarget.y;
      player.routeIndex += 1;
      routeTarget = player.route[player.routeIndex] || null;
      dx = routeTarget ? routeTarget.x - player.x : 0;
      dy = routeTarget ? routeTarget.y - player.y : 0;
      routeDistance = Math.hypot(dx, dy);
    }
    moving = !!routeTarget;
  }
  const quiet = keys.has('shift') || keys.has(' ');
  player.sneaking = quiet;
  const speed = keys.has(' ') ? 70 : keys.has('shift') ? 104 : 168;
  if (moving) {
    const magnitude = Math.hypot(dx, dy);
    dx /= magnitude;
    dy /= magnitude;
    player.angle = Math.atan2(dy, dx);
    const step = routeTarget ? Math.min(speed * dt, routeDistance) : speed * dt;
    const nextX = player.x + dx * step;
    const nextY = player.y + dy * step;
    moveOnAxis(player, nextX, player.y, game.level.solids);
    moveOnAxis(player, player.x, nextY, game.level.solids);
    player.x = Math.max(14, Math.min(986, player.x));
    player.y = Math.max(14, Math.min(506, player.y));
    if (!quiet && game.elapsed - game.lastStep > 0.48) {
      game.lastStep = game.elapsed;
      player.steps.push({ x: player.x, y: player.y, age: 0 });
      audio.playerStep();
    }
  }
  const cover = game.level.solids
    .map((solid) => ({ solid, distance: edgeDistance(player, solid) }))
    .filter((entry) => entry.solid.kind !== 'wall')
    .sort((a, b) => a.distance - b.distance)[0];
  game.nearestCover = cover && cover.distance < 60 ? cover : null;
  game.hidden = keys.has(' ') && !!game.nearestCover;
  player.steps = player.steps.filter((step) => {
    step.age += dt;
    return step.age < 1.3;
  });
}

function findRoute(start, destination, solids) {
  const cellSize = 25;
  const columns = 40;
  const rows = 21;
  const keyOf = (cell) => cell.x + ':' + cell.y;
  const pointOf = (cell) => ({ x: cell.x * cellSize + cellSize / 2, y: cell.y * cellSize + cellSize / 2 });
  const walkable = (cell) => {
    if (cell.x < 0 || cell.y < 0 || cell.x >= columns || cell.y >= rows) return false;
    const point = pointOf(cell);
    return !solids.some((solid) => circleHitsRect(point.x, point.y, 12, solid));
  };
  const nearestWalkable = (point) => {
    const base = { x: Math.round(point.x / cellSize), y: Math.round(point.y / cellSize) };
    for (let radius = 0; radius < 8; radius += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          if (radius > 0 && Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
          const candidate = { x: base.x + x, y: base.y + y };
          if (walkable(candidate)) return candidate;
        }
      }
    }
    return null;
  };

  const first = nearestWalkable(start);
  const last = nearestWalkable(destination);
  if (!first || !last) return [];
  const open = [{ ...first, cost: 0, estimate: Math.abs(last.x - first.x) + Math.abs(last.y - first.y) }];
  const cameFrom = new Map();
  const scores = new Map([[keyOf(first), 0]]);
  const closed = new Set();
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let visits = 0;

  while (open.length && visits < 1000) {
    open.sort((a, b) => a.estimate - b.estimate || a.cost - b.cost);
    const current = open.shift();
    const currentKey = keyOf(current);
    if (closed.has(currentKey)) continue;
    if (current.x === last.x && current.y === last.y) {
      const result = [];
      let cursor = currentKey;
      while (cursor !== keyOf(first)) {
        const cell = cursor.split(':').map(Number);
        result.push(pointOf({ x: cell[0], y: cell[1] }));
        cursor = cameFrom.get(cursor);
        if (!cursor) return [];
      }
      result.reverse();
      return [pointOf(first), ...result];
    }
    closed.add(currentKey);
    visits += 1;
    neighbors.forEach((offset) => {
      const next = { x: current.x + offset[0], y: current.y + offset[1] };
      const nextKey = keyOf(next);
      if (!walkable(next) || closed.has(nextKey)) return;
      const cost = current.cost + 1;
      if (cost >= (scores.get(nextKey) ?? Infinity)) return;
      scores.set(nextKey, cost);
      cameFrom.set(nextKey, currentKey);
      const heuristic = Math.abs(last.x - next.x) + Math.abs(last.y - next.y);
      open.push({ ...next, cost, estimate: cost + heuristic });
    });
  }
  return [];
}

function moveOnAxis(player, x, y, solids) {
  const radius = player.radius;
  if (!solids.some((solid) => circleHitsRect(x, y, radius, solid))) {
    player.x = x;
    player.y = y;
  }
}

function moveGuards(game, dt) {
  game.guards.forEach((guard) => {
    if (guard.pause > 0) {
      guard.pause = Math.max(0, guard.pause - dt);
      return;
    }
    if (guard.mode === 'alert') {
      const reachedLastKnown = walkToward(guard, guard.target, guard.speed * 1.12, dt);
      if (reachedLastKnown && guard.focus < 0.25) {
        guard.mode = 'investigate';
        guard.investigateTime = 1.8;
      }
      return;
    }
    if (guard.mode === 'investigate') {
      guard.investigateTime -= dt;
      const reached = walkToward(guard, guard.target, guard.speed * 1.18, dt);
      if (reached || guard.investigateTime <= 0) {
        guard.mode = 'patrol';
        guard.target = null;
        guard.pause = 0.75;
        game.toast = 'The keeper turns back to the old route.';
      }
      return;
    }
    const target = guard.route[guard.waypoint];
    const reached = walkToward(guard, target, guard.speed, dt);
    if (reached) {
      guard.waypoint = (guard.waypoint + 1) % guard.route.length;
      guard.pause = 0.46;
    }
  });
}

function walkToward(actor, target, speed, dt) {
  const dx = target.x - actor.x;
  const dy = target.y - actor.y;
  const length = Math.hypot(dx, dy);
  if (length < 4) return true;
  actor.angle = Math.atan2(dy, dx);
  const step = Math.min(length, speed * dt);
  actor.x += Math.cos(actor.angle) * step;
  actor.y += Math.sin(actor.angle) * step;
  return length <= step + 1;
}

function readTheLanterns(game, dt, keys, audio) {
  let seen = false;
  const quiet = keys.has('shift') || keys.has(' ');
  let nearest = null;
  let nearestDistance = Infinity;
  for (const guard of game.guards) {
    const playerDistance = distance(guard, game.player);
    if (playerDistance < nearestDistance) {
      nearestDistance = playerDistance;
      nearest = guard;
    }
    const canSee = !game.hidden && game.saltVeilTime <= 0
      && inVisionCone(guard, game.player, guard.range, guard.fov / 2)
      && !lineBlocked(guard, game.player, game.level.solids);
    if (canSee) {
      seen = true;
      guard.mode = 'alert';
      guard.target = { x: game.player.x, y: game.player.y };
      guard.focus = Math.min(1, guard.focus + dt * (quiet ? 0.15 : 0.3));
    } else {
      guard.focus = Math.max(0, guard.focus - dt * (game.hidden ? 0.34 : 0.12));
      if (guard.mode === 'alert' && guard.focus < 0.2) {
        guard.mode = 'investigate';
        guard.target = { x: game.player.x, y: game.player.y };
        guard.investigateTime = 1.8;
      }
    }
  }
  game.nearbyGuard = nearestDistance < 330 ? nearest : null;

  let beaconSees = false;
  if (game.level.beacon) {
    const beacon = game.level.beacon;
    game.beaconAngle = Math.PI / 2 + Math.sin(game.elapsed * beacon.speed) * beacon.sweep;
    const observer = { x: beacon.x, y: beacon.y, angle: game.beaconAngle };
    beaconSees = !game.hidden && game.saltVeilTime <= 0
      && inVisionCone(observer, game.player, beacon.range, beacon.width / 2)
      && !lineBlocked(observer, game.player, game.level.solids);
  }

  const attentionRises = seen || beaconSees;
  const wasAlert = game.alert;
  game.alert = Math.max(0, Math.min(1, game.alert + dt * (attentionRises ? (game.hidden || quiet ? 0.07 : 0.225) : (game.hidden || quiet ? -0.28 : -0.13))));
  if (game.alert > 0.2 && wasAlert <= 0.2) {
    game.toast = beaconSees ? 'The beacon has found your wake.' : 'A lantern catches the edge of your shadow.';
    audio.warning();
  }
  if (wasAlert > 0.2 && game.alert <= 0.2) game.toast = 'You lost the light. Keep moving.';
  if (game.alert >= 0.98) {
    game.mode = 'caught';
    game.toast = 'A keeper has closed the tide door.';
    audio.warning();
  }
}

function checkObjectives(game, audio) {
  if (!game.artifactFound && distance(game.player, game.level.artifact) < 31) {
    game.artifactFound = true;
    game.pagesFound += 1;
    game.toast = 'The chart settles into the Night Atlas.';
    audio.page();
  }
  if (distance(game.player, game.level.exit) < 34) {
    if (game.artifactFound) {
      game.mode = 'cleared';
      game.toast = 'The tide door opens without a sound.';
      audio.clear();
    } else if (game.elapsed - game.lastWarning > 1.8) {
      game.lastWarning = game.elapsed;
      game.toast = 'The page is still inside. The atlas is not whole.';
    }
  }
}

function updateFootsteps(game, audio) {
  for (const guard of game.guards) {
    if (distance(guard, game.player) < 295 && game.elapsed - guard.nextStep > 0.78) {
      guard.nextStep = game.elapsed;
      const direction = (guard.x - game.player.x) / 420;
      audio.guardStep(direction);
    }
  }
}

export function hudState(game) {
  const level = game.level;
  const alertLabel = game.alert > 0.72 ? 'SEARCHING' : game.alert > 0.32 ? 'WATCHED' : 'UNSEEN';
  const nearest = game.nearbyGuard;
  let direction = '—';
  if (nearest) {
    const dx = nearest.x - game.player.x;
    const dy = nearest.y - game.player.y;
    if (Math.abs(dx) > Math.abs(dy)) direction = dx > 0 ? 'EAST' : 'WEST';
    else direction = dy > 0 ? 'SOUTH' : 'NORTH';
  }
  return {
    chapter: 'FIELD 0' + (game.levelIndex + 1),
    roomName: level.name,
    roomCaption: level.subtitle,
    objectiveName: level.objective,
    objectiveFound: game.artifactFound,
    alertPercent: Math.round(game.alert * 100),
    alertLabel,
    stealth: game.saltVeilTime > 0 ? 'Inside the salt veil' : game.hidden ? 'Under the chart-stack' : game.nearbyGuard ? 'Footsteps in the ' + direction.toLowerCase() : 'In the blue hour',
    timer: formatTime(game.totalTime),
    echoes: String(game.echoCount).padStart(2, '0'),
    saltVeilCharges: String(game.saltVeilCharges).padStart(2, '0'),
    veilActive: game.saltVeilTime > 0,
    stageSubtitle: level.region,
    toast: game.toast,
    pageCount: String(game.pagesFound).padStart(2, '0') + ' / 03 CHARTS',
  };
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
}

export { ARCHIVE };
