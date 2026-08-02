/**
 * Simple iterative point-dodging (pairwise repulsion relaxation): nudges
 * points that are closer than `minDistance` apart until none overlap, or
 * `iterations` runs out. Standard cartographic technique for decluttering
 * markers in dense clusters (e.g. Phoenix/Mesa/Tempe/Scottsdale/Chandler/
 * Glendale/Peoria, AZ, which sit 1.3-7 viewBox units apart -- well inside a
 * marker's own radius, real ground-truth measured in tests/geo-dodge.test.ts).
 *
 * Deliberately generic and data-driven (works on whatever points it's given,
 * no hardcoded city list) rather than a special-cased fix for one metro area.
 */
export interface Dodgeable {
  x: number;
  y: number;
}

export function dodgePoints<T extends Dodgeable>(points: T[], minDistance: number, iterations = 60): T[] {
  const dodged = points.map((p) => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (let i = 0; i < dodged.length; i++) {
      for (let j = i + 1; j < dodged.length; j++) {
        const dx = dodged[j].x - dodged[i].x;
        const dy = dodged[j].y - dodged[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          moved = true;
          // Points sharing the exact same coordinates have no direction to
          // push apart -- pick a fixed direction rather than dividing by zero.
          const [ux, uy] = distance < 1e-6 ? [1, 0] : [dx / distance, dy / distance];
          const push = (minDistance - distance) / 2;
          dodged[i].x -= ux * push;
          dodged[i].y -= uy * push;
          dodged[j].x += ux * push;
          dodged[j].y += uy * push;
        }
      }
    }

    if (!moved) break;
  }

  return dodged;
}
