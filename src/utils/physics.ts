import { PhysicsBody, Particle, CelestialType } from "../types";
import { CELESTIAL_BODIES, CONTAINER_WIDTH, CONTAINER_HEIGHT } from "../constants";

// Helper to generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Create a new physics body for a celestial type
export function createPhysicsBody(
  x: number,
  y: number,
  level: number,
  isGhost = false
): PhysicsBody {
  const config = CELESTIAL_BODIES[level];
  return {
    id: generateId(),
    x,
    y,
    vx: 0,
    vy: isGhost ? 0 : 0.5, // gentle initial drop speed
    radius: config.radius,
    mass: config.mass,
    level,
    angle: Math.random() * Math.PI * 2,
    angularVelocity: isGhost ? 0.005 : (Math.random() - 0.5) * 0.05,
    opacity: 1.0,
    shakingTime: 0.0, // starts with no shake, gets set to e.g. 15 for merge zoom
    isGhost
  };
}

// Apply core physical simulation (gravity, movement, friction, wall bounds)
export function updatePhysicsBodies(
  bodies: PhysicsBody[],
  width: number,
  height: number,
  gravity: number,
  friction: number,
  elasticity: number
) {
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (body.isGhost) {
      // Ghost simply updates its slow celestial spin
      body.angle += body.angularVelocity;
      continue;
    }

    // Apply gravity
    body.vy += gravity;

    // Apply velocities
    body.x += body.vx;
    body.y += body.vy;

    // Apply angular drag & rotation
    body.angle += body.angularVelocity;
    body.angularVelocity *= 0.98; // slow down spin

    // Dampen linear velocities (friction/air resistance)
    body.vx *= friction;
    body.vy *= friction;

    // Boundary Collisions (Cosmic Jar walls and bottom)
    // Left Wall
    if (body.x < body.radius) {
      body.x = body.radius;
      body.vx = -body.vx * elasticity;
      body.angularVelocity += body.vy * 0.05 * elasticity; // spin on friction
    }
    // Right Wall
    else if (body.x > width - body.radius) {
      body.x = width - body.radius;
      body.vx = -body.vx * elasticity;
      body.angularVelocity -= body.vy * 0.05 * elasticity;
    }

    // Bottom Wall
    if (body.y > height - body.radius) {
      body.y = height - body.radius;
      body.vy = -body.vy * elasticity;
      // Friction along bottom rolls the ball
      body.vx *= 0.95;
      body.angularVelocity = body.vx * 0.04;
    }

    // Tick shaking time decay (for merge scale animations)
    if (body.shakingTime > 0) {
      body.shakingTime -= 0.5;
    } else {
      body.shakingTime = 0;
    }
  }
}

// Deep elastic circle-circle collisions and overlap resolutions.
// Detects when identical elements overlap, invoking onMerge(midpointX, midpointY, level, body1, body2).
export function resolveCircleCollisions(
  bodies: PhysicsBody[],
  onMerge: (x: number, y: number, level: number, b1: PhysicsBody, b2: PhysicsBody) => void
) {
  const mergedIds = new Set<string>();

  // Run a couple of sub-steps (e.g., 2 passes) to stabilize multiple kissing planets
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      const b1 = bodies[i];
      if (b1.isGhost || mergedIds.has(b1.id)) continue;

      for (let j = i + 1; j < bodies.length; j++) {
        const b2 = bodies[j];
        if (b2.isGhost || mergedIds.has(b2.id)) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const minDistance = b1.radius + b2.radius;

        if (distSq < minDistance * minDistance) {
          const dist = Math.sqrt(distSq);
          
          // Guard division-by-zero
          const overlap = minDistance - (dist === 0 ? minDistance - 0.1 : dist);
          const nx = dist === 0 ? 1 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;

          // Merge Condition! Same level and we haven't maxed out levels
          if (b1.level === b2.level && b1.level < CELESTIAL_BODIES.length - 1) {
            mergedIds.add(b1.id);
            mergedIds.add(b2.id);

            // Compute midpoint of collision for merge animation & sound
            const midX = b1.x + nx * b1.radius;
            const midY = b1.y + ny * b1.radius;
            
            onMerge(midX, midY, b1.level, b1, b2);
            continue;
          }

          // Positional correction (resolving overlap) according to masses
          const totalMass = b1.mass + b2.mass;
          const correctionScale = 0.85; // slightly soft resolving to prevent jitter

          // Relative push based on mass ratios
          const ratio1 = b2.mass / totalMass;
          const ratio2 = b1.mass / totalMass;

          b1.x -= nx * overlap * ratio1 * correctionScale;
          b1.y -= ny * overlap * ratio1 * correctionScale;

          b2.x += nx * overlap * ratio2 * correctionScale;
          b2.y += ny * overlap * ratio2 * correctionScale;

          // Physics Collision Response (Velocities)
          const rvx = b2.vx - b1.vx;
          const rvy = b2.vy - b1.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          // Only resolve if they are moving towards each other
          if (velAlongNormal < 0) {
            const restitution = 0.25; // bounce feel
            const impulseScalar = -(1 + restitution) * velAlongNormal / (1 / b1.mass + 1 / b2.mass);

            // Apply impulse along normal
            b1.vx -= (impulseScalar / b1.mass) * nx;
            b1.vy -= (impulseScalar / b1.mass) * ny;

            b2.vx += (impulseScalar / b2.mass) * nx;
            b2.vy += (impulseScalar / b2.mass) * ny;

            // Apply friction tangent component to spin spheres when they grind together
            const tx = -ny;
            const ty = nx;
            const tangentVel = rvx * tx + rvy * ty;
            const frictionCoefficient = 0.15;
            const tangentImpulse = -tangentVel / (1 / b1.mass + 1 / b2.mass) * frictionCoefficient;

            b1.vx -= (tangentImpulse / b1.mass) * tx;
            b1.vy -= (tangentImpulse / b1.mass) * ty;

            b2.vx += (tangentImpulse / b2.mass) * tx;
            b2.vy += (tangentImpulse / b2.mass) * ty;

            // Spin on friction
            b1.angularVelocity += tangentImpulse * 0.05 / b1.mass;
            b2.angularVelocity -= tangentImpulse * 0.05 / b2.mass;
          }
        }
      }
    }
  }

  // Filter out merged bodies
  return bodies.filter(b => !mergedIds.has(b.id));
}

// Particle system helpers
export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
  radius: number,
  maxLife = 40,
  isSpark = false
): Particle {
  return {
    x,
    y,
    vx,
    vy,
    color,
    radius,
    alpha: 1.0,
    life: maxLife,
    maxLife,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() - 0.5) * 0.2,
    isSpark
  };
}

// Spawn burst stardust particles on merge
export function spawnMergeParticles(
  x: number,
  y: number,
  color: string,
  particles: Particle[],
  count = 24,
  isSupernova = false
) {
  const pCount = isSupernova ? count * 3 : count;
  for (let i = 0; i < pCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (isSupernova ? 4.5 : 2.0) + Math.random() * (isSupernova ? 6.0 : 3.5);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const radius = isSupernova 
      ? 2 + Math.random() * 5 
      : 1.5 + Math.random() * 3.5;
    const life = isSupernova 
      ? 50 + Math.random() * 50 
      : 25 + Math.random() * 25;
    
    // Some are sparkling stars
    const isSpark = Math.random() < 0.4;
    particles.push(createParticle(x, y, vx, vy, color, radius, life, isSpark));
  }
}

// Add trail particles to moving bodies
export function updateTrailAndMoveParticles(
  particles: Particle[],
  width: number,
  height: number
): Particle[] {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    
    // Slow drift deceleration of dust
    p.vx *= 0.97;
    p.vy *= 0.97;

    p.life--;
    const ratio = Math.max(0, p.life / p.maxLife);
    p.alpha = Math.pow(ratio, 1.5);
    p.spin += p.spinSpeed;
  }
  
  // Clean up dead particles
  return particles.filter(p => p.life > 0 && p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
}
