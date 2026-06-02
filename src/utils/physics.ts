import type { Ball, Vector2D, Pocket } from '../types';

// Vector Math Helpers
export const vecDist = (v1: Vector2D, v2: Vector2D): number => {
  return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
};

export const vecSub = (v1: Vector2D, v2: Vector2D): Vector2D => {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
};

export const vecAdd = (v1: Vector2D, v2: Vector2D): Vector2D => {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
};

export const vecMult = (v: Vector2D, s: number): Vector2D => {
  return { x: v.x * s, y: v.y * s };
};

export const vecDot = (v1: Vector2D, v2: Vector2D): number => {
  return v1.x * v2.x + v1.y * v2.y;
};

export const vecNormalize = (v: Vector2D): Vector2D => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const vecLength = (v: Vector2D): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y);
};

// Physics Constants
const FRICTION = 0.985;        // Felt rolling friction deceleration
const VELOCITY_THRESHOLD = 0.08; // Velocity below which a ball halts
const CUSHION_BOUNCE = 0.85;   // Energy retained after cushion bounce

/**
 * Updates positions, applies friction, resolves boundaries, returns whether any ball is still moving.
 */
export function updatePhysics(
  balls: Ball[],
  tableWidth: number,
  tableHeight: number,
  cushionWidth: number,
  pockets: Pocket[],
  onCollision: (vel: number) => void,
  onCushionHit: (vel: number) => void,
  onPocket: (ball: Ball) => void
): boolean {
  let isAnyBallMoving = false;

  // 1. Move balls & Apply Friction & Border Collisions
  for (const ball of balls) {
    if (ball.isPocketed) continue;

    // Apply friction if moving
    const speed = vecLength(ball.velocity);
    if (speed > 0) {
      if (speed < VELOCITY_THRESHOLD) {
        ball.velocity = { x: 0, y: 0 };
      } else {
        ball.velocity = vecMult(ball.velocity, FRICTION);
        isAnyBallMoving = true;
      }
    }

    // Update position
    ball.position = vecAdd(ball.position, ball.velocity);

    // Cushion boundaries (Accounting for rounded pockets at corners)
    const minX = cushionWidth + ball.radius;
    const maxX = tableWidth - cushionWidth - ball.radius;
    const minY = cushionWidth + ball.radius;
    const maxY = tableHeight - cushionWidth - ball.radius;

    // Check if inside pocket zone - if so, skip cushion bounces to allow smooth pocket entry
    let inPocketZone = false;
    for (const pocket of pockets) {
      if (vecDist(ball.position, pocket.position) < pocket.radius * 1.3) {
        inPocketZone = true;
        break;
      }
    }

    if (!inPocketZone) {
      let hitCushion = false;
      let collisionVel = 0;

      if (ball.position.x < minX) {
        collisionVel = Math.abs(ball.velocity.x);
        ball.position.x = minX;
        ball.velocity.x = -ball.velocity.x * CUSHION_BOUNCE;
        hitCushion = true;
      } else if (ball.position.x > maxX) {
        collisionVel = Math.abs(ball.velocity.x);
        ball.position.x = maxX;
        ball.velocity.x = -ball.velocity.x * CUSHION_BOUNCE;
        hitCushion = true;
      }

      if (ball.position.y < minY) {
        collisionVel = Math.abs(ball.velocity.y);
        ball.position.y = minY;
        ball.velocity.y = -ball.velocity.y * CUSHION_BOUNCE;
        hitCushion = true;
      } else if (ball.position.y > maxY) {
        collisionVel = Math.abs(ball.velocity.y);
        ball.position.y = maxY;
        ball.velocity.y = -ball.velocity.y * CUSHION_BOUNCE;
        hitCushion = true;
      }

      if (hitCushion && collisionVel > 0.2) {
        onCushionHit(collisionVel);
      }
    }
  }

  // 2. Resolve Ball-to-Ball Collisions
  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];
    if (b1.isPocketed) continue;

    for (let j = i + 1; j < balls.length; j++) {
      const b2 = balls[j];
      if (b2.isPocketed) continue;

      const dist = vecDist(b1.position, b2.position);
      const minDist = b1.radius + b2.radius;

      if (dist < minDist) {
        // Colliding!
        const overlap = minDist - dist;
        const collisionNormal = vecNormalize(vecSub(b2.position, b1.position));

        // Push away to resolve overlap (static resolution)
        b1.position = vecSub(b1.position, vecMult(collisionNormal, overlap * 0.5));
        b2.position = vecAdd(b2.position, vecMult(collisionNormal, overlap * 0.5));

        // Elastic momentum resolution
        // Tangent vector
        const tangent = { x: -collisionNormal.y, y: collisionNormal.x };

        // Project velocities onto normal and tangent
        const v1n = vecDot(b1.velocity, collisionNormal);
        const v1t = vecDot(b1.velocity, tangent);
        const v2n = vecDot(b2.velocity, collisionNormal);
        const v2t = vecDot(b2.velocity, tangent);

        // Elastic swap of normal velocities (equal masses)
        const new_v1n = v2n;
        const new_v2n = v1n;

        // Convert scalar velocities back to 2D vectors
        b1.velocity = vecAdd(vecMult(collisionNormal, new_v1n), vecMult(tangent, v1t));
        b2.velocity = vecAdd(vecMult(collisionNormal, new_v2n), vecMult(tangent, v2t));

        // Sound trigger based on relative velocity
        const relVel = vecLength(vecSub(b1.velocity, b2.velocity));
        if (relVel > 0.15) {
          onCollision(relVel);
        }
      }
    }
  }

  // 3. Resolve Ball Sinking into Pockets
  for (const ball of balls) {
    if (ball.isPocketed) continue;

    for (const pocket of pockets) {
      const dist = vecDist(ball.position, pocket.position);
      // Sinks if center of ball crosses the outer threshold of the pocket
      if (dist < pocket.radius * 0.95) {
        onPocket(ball);
        break;
      }
    }
  }

  // Determine if active motion exists
  for (const ball of balls) {
    if (!ball.isPocketed && vecLength(ball.velocity) > 0) {
      isAnyBallMoving = true;
      break;
    }
  }

  return isAnyBallMoving;
}
