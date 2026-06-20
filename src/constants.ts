import { CelestialType } from "./types";

export const CELESTIAL_BODIES: CelestialType[] = [
  {
    level: 0,
    name: "Cosmic Meteorite",
    radius: 16,
    mass: 1.0,
    color: "#8B827D",
    gradientStart: "#B2A49B",
    gradientEnd: "#4E4744",
    glowColor: "rgba(178, 164, 155, 0.2)",
    description: "A small, iron-rich asteroid fragment wandering deep space."
  },
  {
    level: 1,
    name: "Luna (The Moon)",
    radius: 24,
    mass: 2.2,
    color: "#D3D7DE",
    gradientStart: "#FFFFFF",
    gradientEnd: "#828E9E",
    glowColor: "rgba(211, 215, 222, 0.35)",
    description: "Our silver, cratered companion reflecting distant starlight."
  },
  {
    level: 2,
    name: "Pluto (Dwarf Planet)",
    radius: 32,
    mass: 4.2,
    color: "#6BA5D4",
    gradientStart: "#9AD2FF",
    gradientEnd: "#2F517F",
    glowColor: "rgba(107, 165, 212, 0.45)",
    description: "An icy, beloved wanderer at the edge of the system."
  },
  {
    level: 3,
    name: "Mercury",
    radius: 42,
    mass: 7.5,
    color: "#CBA469",
    gradientStart: "#FDE09F",
    gradientEnd: "#7E582E",
    glowColor: "rgba(203, 164, 105, 0.4)",
    description: "A scorching metal sphere hugged tightly by solar rays."
  },
  {
    level: 4,
    name: "Mars",
    radius: 52,
    mass: 12.0,
    color: "#CD5A3E",
    gradientStart: "#FA8867",
    gradientEnd: "#6B1F0E",
    glowColor: "rgba(205, 90, 62, 0.45)",
    description: "The rusted red desert, harboring dreams of ancient water."
  },
  {
    level: 5,
    name: "Earth",
    radius: 64,
    mass: 19.0,
    color: "#2B82C9",
    gradientStart: "#75B4FF",
    gradientEnd: "#0E395C",
    glowColor: "rgba(43, 130, 201, 0.5)",
    clouds: true,
    description: "A precious, marbled sapphire carrying the light of life."
  },
  {
    level: 6,
    name: "Neptune",
    radius: 76,
    mass: 29.0,
    color: "#1B3B9D",
    gradientStart: "#3B7DF5",
    gradientEnd: "#0C134F",
    glowColor: "rgba(59, 125, 245, 0.55)",
    hasStorms: true,
    description: "A howling azure wind giant, sweeping cold methane clouds."
  },
  {
    level: 7,
    name: "Saturn",
    radius: 90,
    mass: 43.0,
    color: "#E2BF7D",
    gradientStart: "#FDE6A4",
    gradientEnd: "#8E6F33",
    glowColor: "rgba(226, 191, 125, 0.5)",
    hasRings: true,
    ringColor: "rgba(247, 225, 172, 0.7)",
    description: "Crowned with breathtaking rings of spinning cosmic ice."
  },
  {
    level: 8,
    name: "Jupiter",
    radius: 106,
    mass: 62.0,
    color: "#D76D36",
    gradientStart: "#F3AC7F",
    gradientEnd: "#7E2A0A",
    glowColor: "rgba(215, 109, 54, 0.5)",
    hasStorms: true,
    description: "The storm king, with active bands and the Great Red Spot."
  },
  {
    level: 9,
    name: "Sol (Yellow Dwarf)",
    radius: 124,
    mass: 88.0,
    color: "#FFBD1B",
    gradientStart: "#FFF9A6",
    gradientEnd: "#B07102",
    glowColor: "rgba(255, 189, 27, 0.7)",
    starsCount: 8,
    sparkle: true,
    description: "An incandescent engine of nuclear fire warming the dark."
  },
  {
    level: 10,
    name: "Neutron Star / Black Hole",
    radius: 144,
    mass: 150.0,
    color: "#6D28D9",
    gradientStart: "#A78BFA",
    gradientEnd: "#2E1065",
    glowColor: "rgba(167, 139, 250, 0.8)",
    starsCount: 16,
    sparkle: true,
    description: "The ultimate cosmic singularity, bending light and time."
  }
];

// Inside a standard Suika game, the user can only spawn lower levels.
// E.g., level 0 to level 4 (Meteorite to Mars) to encourage progressive merging!
export const MAX_DROP_LEVEL = 4;

export const CONTAINER_WIDTH = 460;
export const CONTAINER_HEIGHT = 680;
export const DANGER_ZONE_Y = 120; // settled bodies above this will trigger danger warning
export const GAME_OVER_TIME_LIMIT = 4000; // 4 seconds in danger zone triggers game over
