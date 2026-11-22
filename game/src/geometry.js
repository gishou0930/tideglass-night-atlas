export function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function circleHitsRect(x, y, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function segmentTouchesRect(a, b, rect) {
  let low = 0;
  let high = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges = [
    [-dx, a.x - rect.x],
    [dx, rect.x + rect.w - a.x],
    [-dy, a.y - rect.y],
    [dy, rect.y + rect.h - a.y],
  ];
  for (const edge of edges) {
    const p = edge[0];
    const q = edge[1];
    if (p === 0 && q < 0) return false;
    if (p < 0) low = Math.max(low, q / p);
    if (p > 0) high = Math.min(high, q / p);
    if (low > high) return false;
  }
  return true;
}

export function lineBlocked(a, b, solids) {
  return solids.some((solid) => segmentTouchesRect(a, b, solid));
}

export function edgeDistance(point, rect) {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.w));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

export function angleDifference(a, b) {
  let diff = Math.atan2(Math.sin(a - b), Math.cos(a - b));
  return Math.abs(diff);
}

export function inVisionCone(observer, point, range, halfAngle) {
  const dx = point.x - observer.x;
  const dy = point.y - observer.y;
  if (dx * dx + dy * dy > range * range) return false;
  return angleDifference(Math.atan2(dy, dx), observer.angle) <= halfAngle;
}
