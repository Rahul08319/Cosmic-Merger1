export interface CelestialType {
  level: number;
  name: string;
  radius: number;
  mass: number;
  color: string;           // Core color
  gradientStart: string;   // Shading start
  gradientEnd: string;     // Shading end
  glowColor: string;       // Atmospheric aura color
  description: string;     // Short fun line
  hasRings?: boolean;      // For Saturn style
  ringColor?: string;      // Color of rings
  hasStorms?: boolean;     // For Jupiter-like circular bands
  clouds?: boolean;        // For Earth-like marbled shapes
  starsCount?: number;     // For stellar cores
  sparkle?: boolean;       // Blazing effect
}

export interface PhysicsBody {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  level: number;
  angle: number;
  angularVelocity: number;
  opacity: number;         // For spawning/merging animation
  shakingTime: number;     // Visual bounce animation scale
  isGhost?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  spin: number;
  spinSpeed: number;
  isSpark: boolean;
}

export interface GameStats {
  score: number;
  highScore: number;
  mergesCount: number;
  lastMergedName: string;
  isGameOver: boolean;
  timeRemainingBeforeGameOver: number; // For warning timer when planet is above danger line
}
