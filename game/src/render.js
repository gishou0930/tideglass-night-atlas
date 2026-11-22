export const CANVAS = { width: 1100, height: 610, mapX: 48, mapY: 43, mapW: 1004, mapH: 522, worldW: 1000, worldH: 520 };

const BRASS = '#dfba75';
const PAPER = '#e4dbc2';
const MINT = '#8ad0c0';

export function screenToWorld(point) {
  return {
    x: (point.x - CANVAS.mapX) * CANVAS.worldW / CANVAS.mapW,
    y: (point.y - CANVAS.mapY) * CANVAS.worldH / CANVAS.mapH,
  };
}

export function renderScene(ctx, game, time) {
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
  const backdrop = ctx.createLinearGradient(0, 0, CANVAS.width, CANVAS.height);
  backdrop.addColorStop(0, '#0b181a');
  backdrop.addColorStop(0.56, '#142526');
  backdrop.addColorStop(1, '#091517');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  drawMapFrame(ctx, time);

  ctx.save();
  ctx.translate(CANVAS.mapX, CANVAS.mapY);
  ctx.scale(CANVAS.mapW / CANVAS.worldW, CANVAS.mapH / CANVAS.worldH);
  drawFloor(ctx, game.level, time, game.levelIndex);
  drawPatrolLines(ctx, game.guards);
  drawLanterns(ctx, game.guards);
  drawBeacon(ctx, game, time);
  drawExit(ctx, game.level.exit, time, game.artifactFound);
  drawArtifact(ctx, game.level.artifact, time, game.artifactFound);
  drawEchoes(ctx, game.echoes);
  drawFootprints(ctx, game.player.steps);
  drawPlannedRoute(ctx, game.player);
  drawSaltVeil(ctx, game.player, game.saltVeilTime, time);
  drawFurniture(ctx, game.level.solids);
  drawGuards(ctx, game.guards);
  drawPlayer(ctx, game.player, game.hidden, time);
  drawAim(ctx, game.mouse);
  drawMapVignette(ctx);
  ctx.restore();
  drawFrameLabels(ctx, game);
}

function drawMapFrame(ctx, time) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 23;
  ctx.fillStyle = '#0c191a';
  roundRect(ctx, CANVAS.mapX - 5, CANVAS.mapY - 5, CANVAS.mapW + 10, CANVAS.mapH + 10, 3);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#101c1d';
  ctx.fillRect(CANVAS.mapX - 3, CANVAS.mapY - 3, CANVAS.mapW + 6, CANVAS.mapH + 6);
  ctx.strokeStyle = 'rgba(223,186,117,.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(CANVAS.mapX - 4, CANVAS.mapY - 4, CANVAS.mapW + 8, CANVAS.mapH + 8);
  const pulse = 0.5 + Math.sin(time * 0.75) * 0.12;
  ctx.strokeStyle = 'rgba(138,208,192,' + pulse + ')';
  ctx.lineWidth = 1;
  const corner = 14;
  const x = CANVAS.mapX - 4;
  const y = CANVAS.mapY - 4;
  const w = CANVAS.mapW + 8;
  const h = CANVAS.mapH + 8;
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach((c) => {
    ctx.beginPath();
    ctx.moveTo(c[0], c[1] + corner * c[3]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(c[0] + corner * c[2], c[1]);
    ctx.stroke();
  });
}

function drawFloor(ctx, level, time, levelIndex) {
  const palettes = [
    { floor: ['#263638', '#1d3030', '#172829'], tile: ['#71827b', '#192e2d'], detail: 'rgba(225,211,177,.15)', pools: ['rgba(190,151,93,.12)', 'rgba(71,143,139,.14)', 'rgba(209,151,85,.12)'] },
    { floor: ['#1d3540', '#172a35', '#10232e'], tile: ['#75949a', '#142a36'], detail: 'rgba(168,218,213,.17)', pools: ['rgba(64,144,158,.16)', 'rgba(65,113,135,.14)', 'rgba(181,151,103,.10)'] },
    { floor: ['#27344a', '#1c293c', '#101b2e'], tile: ['#73899b', '#121f32'], detail: 'rgba(177,200,216,.17)', pools: ['rgba(73,129,166,.15)', 'rgba(56,102,155,.14)', 'rgba(145,177,180,.10)'] },
  ];
  const palette = palettes[levelIndex] || palettes[0];
  const base = ctx.createLinearGradient(0, 0, 970, 500);
  base.addColorStop(0, palette.floor[0]);
  base.addColorStop(0.45, palette.floor[1]);
  base.addColorStop(1, palette.floor[2]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1000, 520);

  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let y = 0; y < 520; y += 40) {
    for (let x = 0; x < 1000; x += 40) {
      const shade = ((x / 40 + y / 40) % 2 === 0) ? palette.tile[0] : palette.tile[1];
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, 36, 36);
      ctx.strokeStyle = palette.detail;
      ctx.lineWidth = 0.55;
      ctx.strokeRect(x + 2, y + 2, 36, 36);
      const speck = ((x * 17 + y * 31) % 97) / 97;
      ctx.fillStyle = 'rgba(224,188,127,' + (0.04 + speck * 0.07) + ')';
      ctx.fillRect(x + 6 + speck * 23, y + 9 + speck * 19, 1.2, 1.2);
    }
  }
  ctx.restore();

  const pools = [
    { x: 185, y: 235, r: 185, color: palette.pools[0] },
    { x: 511, y: 263, r: 205, color: palette.pools[1] },
    { x: 859, y: 240, r: 190, color: palette.pools[2] },
  ];
  pools.forEach((pool) => {
    const glow = ctx.createRadialGradient(pool.x, pool.y, 4, pool.x, pool.y, pool.r);
    glow.addColorStop(0, pool.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(pool.x - pool.r, pool.y - pool.r, pool.r * 2, pool.r * 2);
  });
  drawFieldPattern(ctx, levelIndex, time);

  ctx.save();
  ctx.strokeStyle = 'rgba(226,214,178,.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.moveTo(28, 257); ctx.lineTo(300, 257); ctx.lineTo(330, 257);
  ctx.lineTo(650, 257); ctx.lineTo(685, 257); ctx.lineTo(966, 257);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.font = '9px Courier New';
  ctx.fillStyle = 'rgba(226,216,188,.35)';
  ctx.fillText(level.region, 23, 28);
  ctx.fillStyle = 'rgba(152,185,166,.4)';
  ctx.fillText('SALT AIR / GLASS HUM', 788, 28);
  ctx.fillStyle = 'rgba(218,195,151,.2)';
  ctx.font = 'italic 13px Georgia';
  ctx.fillText('the ink remembers the sea', 384, 488);

  ctx.save();
  ctx.translate(932, 485);
  ctx.strokeStyle = 'rgba(223,186,117,.48)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 22); ctx.lineTo(0, -13); ctx.lineTo(-5, -3); ctx.moveTo(0, -13); ctx.lineTo(5, -3);
  ctx.moveTo(-14, 7); ctx.lineTo(14, 7); ctx.moveTo(-9, 17); ctx.lineTo(9, 17);
  ctx.stroke();
  ctx.fillStyle = 'rgba(223,186,117,.75)';
  ctx.font = '9px Courier New';
  ctx.fillText('N', -3, -19);
  ctx.restore();
  drawTideMarks(ctx, time);
}

function drawFieldPattern(ctx, levelIndex, time) {
  ctx.save();
  ctx.lineWidth = 1;
  if (levelIndex === 0) {
    ctx.strokeStyle = 'rgba(224,189,127,.13)';
    ctx.setLineDash([2, 8]);
    [84, 146, 206].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(500, 260, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(500 + Math.cos(angle) * 34, 260 + Math.sin(angle) * 34);
      ctx.lineTo(500 + Math.cos(angle) * 214, 260 + Math.sin(angle) * 214);
      ctx.stroke();
    }
  } else if (levelIndex === 1) {
    ctx.strokeStyle = 'rgba(135,210,213,.11)';
    for (let row = 0; row < 7; row += 1) {
      const baseY = 48 + row * 73;
      ctx.beginPath();
      for (let x = 0; x <= 1000; x += 20) {
        const y = baseY + Math.sin(x * .018 + time * .35 + row) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = 'rgba(154,206,225,.12)';
    ctx.setLineDash([3, 8]);
    [88, 158, 236, 320, 420].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(500, 28, radius, .28, Math.PI - .28);
      ctx.stroke();
    });
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawTideMarks(ctx, time) {
  for (let index = 0; index < 8; index += 1) {
    const y = 58 + index * 55;
    ctx.strokeStyle = 'rgba(138,208,192,' + (0.08 + (index % 3) * 0.025) + ')';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(index % 2 ? 9 : 5, y);
    ctx.stroke();
  }
  const tick = Math.floor(time * 4) % 18;
  ctx.fillStyle = 'rgba(224,187,118,.55)';
  ctx.fillRect(986, 473 + tick * 1.4, 5, 1);
}

function drawPatrolLines(ctx, guards) {
  ctx.save();
  ctx.setLineDash([3, 8]);
  ctx.lineWidth = 1;
  guards.forEach((guard) => {
    ctx.strokeStyle = 'rgba(223,186,117,.18)';
    ctx.beginPath();
    guard.route.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

function drawLanterns(ctx, guards) {
  guards.forEach((guard) => {
    const opacity = guard.mode === 'alert' ? 0.48 : guard.mode === 'investigate' ? 0.34 : 0.3;
    drawCone(ctx, guard, guard.range, guard.fov / 2, guard.tint, opacity);
  });
}

function drawCone(ctx, observer, range, halfAngle, color, opacity) {
  ctx.save();
  const grad = ctx.createRadialGradient(observer.x, observer.y, 5, observer.x, observer.y, range);
  grad.addColorStop(0, colorWithAlpha(color, opacity * 0.86));
  grad.addColorStop(0.58, colorWithAlpha(color, opacity * 0.52));
  grad.addColorStop(1, colorWithAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(observer.x, observer.y);
  ctx.arc(observer.x, observer.y, range, observer.angle - halfAngle, observer.angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colorWithAlpha(color, opacity * 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(observer.x, observer.y);
  ctx.lineTo(observer.x + Math.cos(observer.angle - halfAngle) * range, observer.y + Math.sin(observer.angle - halfAngle) * range);
  ctx.moveTo(observer.x, observer.y);
  ctx.lineTo(observer.x + Math.cos(observer.angle + halfAngle) * range, observer.y + Math.sin(observer.angle + halfAngle) * range);
  ctx.stroke();
  ctx.restore();
}

function drawBeacon(ctx, game, time) {
  const beacon = game.level.beacon;
  if (!beacon) return;
  const observer = { x: beacon.x, y: beacon.y, angle: game.beaconAngle };
  drawCone(ctx, observer, beacon.range, beacon.width / 2, '#89d7d1', 0.16);
  const pulse = 0.6 + Math.sin(time * 2.2) * 0.2;
  ctx.save();
  ctx.shadowColor = '#92dfd4';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(153,228,213,' + pulse + ')';
  ctx.beginPath();
  ctx.arc(beacon.x, beacon.y + 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExit(ctx, exit, time, artifactFound) {
  const pulse = 0.6 + Math.sin(time * 2.4) * 0.22;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  ctx.shadowColor = artifactFound ? '#92e5ca' : '#dfba75';
  ctx.shadowBlur = artifactFound ? 24 : 12;
  ctx.fillStyle = artifactFound ? 'rgba(89,205,163,.18)' : 'rgba(226,182,109,.13)';
  ctx.beginPath();
  ctx.arc(0, 0, 33 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = artifactFound ? 'rgba(139,225,190,.95)' : 'rgba(223,186,117,.68)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#152729';
  roundRect(ctx, -13, -20, 26, 40, 9);
  ctx.fill();
  ctx.strokeStyle = artifactFound ? '#9be0bb' : '#d1a75e';
  ctx.stroke();
  ctx.fillStyle = artifactFound ? '#9be0bb' : '#d1a75e';
  ctx.beginPath();
  ctx.arc(5, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(228,219,194,.8)';
  ctx.textAlign = 'center';
  ctx.fillText(artifactFound ? 'TIDE DOOR / OPEN' : 'TIDE DOOR', 0, 43);
  ctx.restore();
}

function drawArtifact(ctx, artifact, time, found) {
  if (found) return;
  ctx.save();
  ctx.translate(artifact.x, artifact.y);
  const turn = time * 0.23;
  ctx.rotate(turn);
  ctx.shadowColor = '#79ddd4';
  ctx.shadowBlur = 20 + Math.sin(time * 3) * 5;
  ctx.fillStyle = 'rgba(114,204,196,.18)';
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(145,224,208,.76)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -19); ctx.lineTo(13, 0); ctx.lineTo(0, 19); ctx.lineTo(-13, 0); ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#b9ead2';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(185,234,210,.82)';
  ctx.fillText('NIGHT ATLAS', artifact.x, artifact.y + 38);
  ctx.restore();
}

function drawEchoes(ctx, echoes) {
  echoes.forEach((echo) => {
    const radius = 24 + echo.age * 55;
    ctx.save();
    ctx.globalAlpha = echo.strength;
    ctx.strokeStyle = 'rgba(138,211,199,.8)';
    ctx.lineWidth = 1.3;
    [0, 0.24, 0.5].forEach((delay) => {
      const wave = Math.max(8, radius - delay * 66);
      ctx.globalAlpha = echo.strength * (1 - delay * 0.55);
      ctx.beginPath();
      ctx.arc(echo.x, echo.y, wave, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = '#b4e5d3';
    ctx.beginPath();
    ctx.arc(echo.x, echo.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawFootprints(ctx, steps) {
  steps.forEach((step) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.3 * (1 - step.age / 1.3));
    ctx.fillStyle = '#d8c8a1';
    ctx.beginPath();
    ctx.ellipse(step.x - 3, step.y, 2, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(step.x + 4, step.y - 6, 2, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawPlannedRoute(ctx, player) {
  if (player.routeIndex >= player.route.length) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(145,221,199,.46)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  for (let index = player.routeIndex; index < player.route.length; index += 1) {
    ctx.lineTo(player.route[index].x, player.route[index].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSaltVeil(ctx, player, remaining, time) {
  if (remaining <= 0) return;
  const pulse = Math.sin(time * 4.5);
  const radius = 68 + pulse * 5;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const mist = ctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, radius);
  mist.addColorStop(0, 'rgba(130,220,200,.2)');
  mist.addColorStop(.62, 'rgba(108,202,189,.12)');
  mist.addColorStop(1, 'rgba(108,202,189,0)');
  ctx.fillStyle = mist;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(163,232,212,.62)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.arc(player.x, player.y, 48 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let index = 0; index < 7; index += 1) {
    const angle = index * Math.PI * 2 / 7 + time * .35;
    const drift = Math.sin(time * 2 + index * 1.7) * 4;
    ctx.fillStyle = 'rgba(190,242,220,.72)';
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(angle) * (34 + drift), player.y + Math.sin(angle) * (34 + drift), 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFurniture(ctx, solids) {
  solids.forEach((solid) => {
    if (solid.kind === 'pillar') drawPillar(ctx, solid);
    else if (solid.kind === 'books') drawBookStack(ctx, solid);
    else if (solid.kind === 'cabinet') drawCabinet(ctx, solid);
    else if (solid.kind === 'display') drawDisplay(ctx, solid);
    else drawWall(ctx, solid);
  });
}

function drawWall(ctx, rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 9;
  ctx.fillStyle = '#314447';
  roundRect(ctx, rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(220,205,163,.27)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(9,22,24,.65)';
  for (let y = rect.y + 12; y < rect.y + rect.h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(rect.x + 3, y);
    ctx.lineTo(rect.x + rect.w - 3, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBookStack(ctx, rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#493e31';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#c4a36a';
  ctx.lineWidth = 1;
  ctx.stroke();
  const count = Math.max(3, Math.floor(rect.w / 18));
  for (let index = 0; index < count; index += 1) {
    const bookX = rect.x + 6 + index * (rect.w - 12) / count;
    const bookW = Math.max(4, (rect.w - 18) / count);
    const top = rect.y + 4 + (index % 3) * 2;
    ctx.fillStyle = ['#a77e52','#516f69','#b4a174','#786250'][index % 4];
    roundRect(ctx, bookX, top, bookW, rect.h - 8 - (index % 3) * 2, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(237,215,166,.32)';
    ctx.beginPath();
    ctx.moveTo(bookX + bookW * .25, top + 4);
    ctx.lineTo(bookX + bookW * .25, rect.y + rect.h - 6);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(243,216,162,.65)';
  ctx.fillRect(rect.x + 5, rect.y + 2, rect.w - 10, 1);
  ctx.restore();
}

function drawCabinet(ctx, rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#34423d';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#c6a96d';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(210,190,147,.42)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);
  ctx.beginPath();
  ctx.moveTo(rect.x + 12, rect.y + rect.h - 12);
  ctx.quadraticCurveTo(rect.x + rect.w / 2, rect.y + 5, rect.x + rect.w - 12, rect.y + rect.h - 12);
  ctx.stroke();
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.arc(rect.x + rect.w - 10, rect.y + rect.h / 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDisplay(ctx, rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(100,160,148,.23)';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(176,221,196,.65)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(218,193,142,.55)';
  ctx.beginPath();
  ctx.ellipse(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * .26, rect.h * .28, 0, 0, Math.PI * 2);
  ctx.moveTo(rect.x + rect.w * .24, rect.y + rect.h * .5);
  ctx.lineTo(rect.x + rect.w * .76, rect.y + rect.h * .5);
  ctx.moveTo(rect.x + rect.w * .5, rect.y + rect.h * .2);
  ctx.lineTo(rect.x + rect.w * .5, rect.y + rect.h * .8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(246,225,168,.8)';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPillar(ctx, rect) {
  const x = rect.x + rect.w / 2;
  const y = rect.y + rect.h / 2;
  const radius = Math.min(rect.w, rect.h) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.62)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  const stone = ctx.createRadialGradient(x - radius * .3, y - radius * .35, 2, x, y, radius);
  stone.addColorStop(0, '#b5a683');
  stone.addColorStop(.5, '#756e59');
  stone.addColorStop(1, '#384344');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * .77, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(236,219,171,.58)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, y, radius - 2, radius * .77 - 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29,44,43,.68)';
  ctx.beginPath();
  ctx.ellipse(x, y, radius * .58, radius * .42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGuards(ctx, guards) {
  guards.forEach((guard) => drawGuard(ctx, guard));
}

function drawGuard(ctx, guard) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.angle);
  const alert = guard.mode === 'alert';
  ctx.shadowColor = alert ? '#f27965' : 'rgba(0,0,0,.6)';
  ctx.shadowBlur = alert ? 13 : 5;
  ctx.fillStyle = alert ? '#7e4438' : '#3f504d';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = alert ? '#e78a6d' : '#9f9b7d';
  ctx.beginPath();
  ctx.arc(2, -7, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#242d2c';
  ctx.beginPath();
  ctx.ellipse(4, -9, 6.8, 3.7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(225,212,175,.72)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-4, 7); ctx.lineTo(-11, 12); ctx.moveTo(3, 8); ctx.lineTo(10, 12);
  ctx.stroke();
  ctx.fillStyle = guard.tint;
  ctx.shadowColor = guard.tint;
  ctx.shadowBlur = 11;
  ctx.beginPath();
  ctx.arc(12, -1, 3.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = '7px Courier New';
  ctx.textAlign = 'center';
  ctx.fillStyle = alert ? '#f0a58b' : 'rgba(223,221,194,.7)';
  ctx.fillText(guard.name, guard.x, guard.y + 23);
  ctx.restore();
}

function drawPlayer(ctx, player, hidden, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.globalAlpha = hidden ? 0.76 : 1;
  ctx.shadowColor = '#8ae3d0';
  ctx.shadowBlur = hidden ? 10 : 20;
  ctx.fillStyle = hidden ? '#438f81' : '#62c5ae';
  ctx.beginPath();
  ctx.moveTo(-12, 9);
  ctx.quadraticCurveTo(-15, -2, -8, -11);
  ctx.quadraticCurveTo(0, -19 - Math.sin(time * 8) * 1.2, 8, -11);
  ctx.quadraticCurveTo(15, -2, 12, 9);
  ctx.lineTo(7, 15);
  ctx.lineTo(-7, 15);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(213,241,218,.9)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.fillStyle = '#e3d4a2';
  ctx.shadowColor = '#f2d18a';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, -7, 4.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(10,39,40,.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, 6); ctx.lineTo(0, 12); ctx.lineTo(8, 6);
  ctx.stroke();
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(2.2, 17 + Math.sin(time * 7) * 2);
  ctx.lineTo(-1.5, 12);
  ctx.fill();
  ctx.restore();
}

function drawAim(ctx, aim) {
  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = '#a6d9c7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 5, 0, Math.PI * 2);
  ctx.moveTo(aim.x - 9, aim.y); ctx.lineTo(aim.x - 4, aim.y);
  ctx.moveTo(aim.x + 4, aim.y); ctx.lineTo(aim.x + 9, aim.y);
  ctx.moveTo(aim.x, aim.y - 9); ctx.lineTo(aim.x, aim.y - 4);
  ctx.moveTo(aim.x, aim.y + 4); ctx.lineTo(aim.x, aim.y + 9);
  ctx.stroke();
  ctx.restore();
}

function drawMapVignette(ctx) {
  const edge = ctx.createRadialGradient(500, 260, 245, 500, 260, 675);
  edge.addColorStop(0, 'rgba(2,9,11,0)');
  edge.addColorStop(1, 'rgba(2,9,11,.58)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 1000, 520);
  ctx.strokeStyle = 'rgba(215,201,161,.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, 998, 518);
}

function drawFrameLabels(ctx, game) {
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(218,207,177,.7)';
  ctx.fillText('0' + (game.levelIndex + 1) + ' — ' + game.level.name.toUpperCase(), 50, 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(139,204,188,.72)';
  ctx.fillText(game.artifactFound ? 'ATLAS PAGE SECURED' : 'WARDEN ROUTES / LIVE', 1050, 24);
  ctx.restore();
}

function colorWithAlpha(hex, alpha) {
  const clean = hex.replace('#', '');
  const number = parseInt(clean, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
