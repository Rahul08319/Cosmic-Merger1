import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  Play, 
  RefreshCw, 
  Trophy, 
  Volume2, 
  VolumeX,
  Award,
  Globe,
  Shield,
  Zap,
  Activity,
  X,
  Pause,
  Settings as SettingsIcon
} from "lucide-react";

import { PhysicsBody, Particle, GameStats } from "./types";
import { 
  CELESTIAL_BODIES, 
  getCelestialConfig,
  CONTAINER_WIDTH, 
  CONTAINER_HEIGHT, 
  DANGER_ZONE_Y, 
  GAME_OVER_TIME_LIMIT, 
  MAX_DROP_LEVEL 
} from "./constants";
import { 
  createPhysicsBody, 
  updatePhysicsBodies, 
  resolveCircleCollisions, 
  spawnMergeParticles, 
  updateTrailAndMoveParticles 
} from "./utils/physics";
import { CosmicAudio } from "./utils/audio";
import { ScoreBoard } from "./components/ScoreBoard";
import { ProgressionLegend } from "./components/ProgressionLegend";
import { HowToPlay } from "./components/HowToPlay";
import { HighScoresModal } from "./components/HighScoresModal";
import { SettingsModal } from "./components/SettingsModal";
import { DailyMissionCard } from "./components/DailyMissionCard";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game flow states
  const [hasStarted, setHasStarted] = useState(false);
  const [noPossibleMoves, setNoPossibleMoves] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    mergesCount: 0,
    lastMergedName: "",
    isGameOver: false,
    timeRemainingBeforeGameOver: GAME_OVER_TIME_LIMIT,
  });

  // Core collections in Ref to avoid React state lag in physics loop
  const bodiesRef = useRef<PhysicsBody[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Highscore, combo, and floating text tracking refs
  const initialHighScoreRef = useRef(0);
  const comboRef = useRef({ count: 0, lastTime: 0 });
  const floatingTextsRef = useRef<{
    x: number;
    y: number;
    text: string;
    color: string;
    alpha: number;
    life: number;
    fontSize: number;
    multiplier?: number;
  }[]>([]);
  const statsRef = useRef(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  
  // Game control variables
  const [currentHeldLevel, setCurrentHeldLevel] = useState(0);
  const [nextHeldLevel, setNextHeldLevel] = useState(1);
  const [previewX, setPreviewX] = useState(CONTAINER_WIDTH / 2);
  const [isHolding, setIsHolding] = useState(true);
  const [dropCooldown, setDropCooldown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sidebar interactive legend states
  const [highestLevelMerged, setHighestLevelMerged] = useState(0);
  const [highlightedInspectLevel, setHighlightedInspectLevel] = useState(0);

  // Cooldowns and shake triggers
  const [shakeCooldown, setShakeCooldown] = useState(0); // in frames
  const [canvasShakeAmt, setCanvasShakeAmt] = useState(0);

  // Modals / Overlays
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHighScoresOpen, setIsHighScoresOpen] = useState(false);
  const [volume, setVolume] = useState(() => CosmicAudio.getVolume());
  const [toasts, setToasts] = useState<{ id: string; title: string; description: string; icon: string }[]>([]);

  // Pause state and Ref to sync with high-frequency game loop
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const togglePause = () => {
    if (stats.isGameOver || !hasStarted) return;
    setIsPaused(p => !p);
  };

  // Particle Trail Settings
  const [particleAesthetic, setParticleAesthetic] = useState(() => {
    try {
      const stored = localStorage.getItem("cosmic_particle_aesthetic");
      return stored || "nebula_dust";
    } catch (e) {
      return "nebula_dust";
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleParticleAestheticChange = (aesthetic: string) => {
    setParticleAesthetic(aesthetic);
    try {
      localStorage.setItem("cosmic_particle_aesthetic", aesthetic);
    } catch (e) {}
  };

  // Keyboard shortcut for pausing (Escape or 'P')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing inputs (if any)
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasStarted, stats.isGameOver, isPaused]);

  // Daily Mission Systems
  const [dailyMission, setDailyMission] = useState<any>(null);

  const getDailyMissionForToday = () => {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const DAILY_MISSIONS = [
      {
        id: "merge_luna",
        goalType: "specific_level_merge",
        targetValue: 5,
        level: 1, // Luna is level 1
        description: "Luna Eclipse: Merge 5 Luna bodies",
        multiplier: 1.5,
        scoreBonus: 500,
      },
      {
        id: "merge_pluto",
        goalType: "specific_level_merge",
        targetValue: 4,
        level: 2, // Pluto is level 2
        description: "Pluto Pioneers: Merge 4 Pluto bodies",
        multiplier: 1.5,
        scoreBonus: 600,
      },
      {
        id: "merge_mercury",
        goalType: "specific_level_merge",
        targetValue: 3,
        level: 3, // Mercury is level 3
        description: "Mercury Messenger: Merge 3 Mercury bodies",
        multiplier: 1.6,
        scoreBonus: 800,
      },
      {
        id: "score_target",
        goalType: "score_target",
        targetValue: 1200,
        description: "Cosmic Harvest: Accumulate 1,200 total score points",
        multiplier: 1.5,
        scoreBonus: 700,
      },
      {
        id: "shake_usage",
        goalType: "shake_usage",
        targetValue: 3,
        description: "Instability Purge: Activate 'Gravity Shake' 3 times",
        multiplier: 1.5,
        scoreBonus: 500,
      }
    ];
    
    const hash = todayStr.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % DAILY_MISSIONS.length;
    const baseMission = DAILY_MISSIONS[index];
    
    return {
      ...baseMission,
      currentValue: 0,
      isCompleted: false,
      date: todayStr,
    };
  };

  const updateDailyMissionProgress = (type: string, value: number, details?: { level?: number }) => {
    setDailyMission((prev: any) => {
      if (!prev || prev.isCompleted) return prev;
      
      let matched = false;
      if (prev.goalType === type) {
        if (type === 'specific_level_merge') {
          if (details?.level === prev.level) {
            matched = true;
          }
        } else {
          matched = true;
        }
      }

      if (!matched) return prev;

      const nextVal = Math.min(prev.targetValue, prev.currentValue + value);
      const completed = nextVal >= prev.targetValue;
      
      const updated = {
        ...prev,
        currentValue: nextVal,
        isCompleted: completed
      };

      try {
        localStorage.setItem("cosmic_daily_mission", JSON.stringify(updated));
      } catch (e) {}

      if (completed && !prev.isCompleted) {
        // Trigger a gorgeous toast to celebrate the completion!
        const toastId = Math.random().toString();
        setToasts(prevToasts => [...prevToasts, {
          id: toastId,
          title: "DAILY MISSION COMPLETE! 🎉",
          description: `Completed "${prev.description}". Active score multiplier ${prev.multiplier}x is now unlocked!`,
          icon: "Trophy"
        }]);

        // Award bonus score!
        setStats(p => {
          const nextScore = p.score + prev.scoreBonus;
          const nextHighScore = Math.max(p.highScore, nextScore);
          return {
            ...p,
            score: nextScore,
            highScore: nextHighScore
          };
        });

        // Play positive chime!
        CosmicAudio.playMergePop(9);

        setTimeout(() => {
          setToasts(prevToasts => prevToasts.filter(t => t.id !== toastId));
        }, 6000);
      }

      return updated;
    });
  };

  // Autosave and Session Recovery states
  const [hasAutosave, setHasAutosave] = useState(false);
  const [autosaveInfo, setAutosaveInfo] = useState<{ score: number; timestamp: number } | null>(null);

  const clearAutosave = () => {
    try {
      localStorage.removeItem("cosmic_merger_autosave_state");
      setHasAutosave(false);
      setAutosaveInfo(null);
    } catch (e) {}
  };

  const handleRestoreAutosave = () => {
    const savedGame = localStorage.getItem("cosmic_merger_autosave_state");
    if (!savedGame) return;
    try {
      const parsed = JSON.parse(savedGame);
      if (parsed && parsed.bodies) {
        // Initialize sound context on user interaction click
        CosmicAudio.init();
        setVolume(CosmicAudio.getVolume());

        // Map and parse deep physical coordinates safely
        bodiesRef.current = parsed.bodies.map((b: any) => ({
          id: b.id,
          x: b.x,
          y: b.y,
          vx: b.vx,
          vy: b.vy,
          radius: b.radius,
          mass: b.mass,
          level: b.level,
          angle: b.angle ?? 0,
          angularVelocity: b.angularVelocity ?? 0,
          opacity: b.opacity ?? 1.0,
          shakingTime: b.shakingTime ?? 0,
          isGhost: false,
        }));

        // Recover stats counters
        setStats({
          score: parsed.score ?? 0,
          highScore: Math.max(stats.highScore, parsed.score ?? 0),
          mergesCount: parsed.mergesCount ?? 0,
          lastMergedName: parsed.lastMergedName ?? "",
          isGameOver: false,
          timeRemainingBeforeGameOver: parsed.timeRemainingBeforeGameOver ?? GAME_OVER_TIME_LIMIT,
        });

        if (parsed.highestLevelMerged !== undefined) {
          setHighestLevelMerged(parsed.highestLevelMerged);
          setHighlightedInspectLevel(parsed.highestLevelMerged);
        }
        if (parsed.currentHeldLevel !== undefined) {
          setCurrentHeldLevel(parsed.currentHeldLevel);
        }
        if (parsed.nextHeldLevel !== undefined) {
          setNextHeldLevel(parsed.nextHeldLevel);
        }

        // Set game state active
        setHasStarted(true);

        // Spawn visual confirmation toast
        const toastId = Math.random().toString();
        setToasts(t => [...t, {
          id: toastId,
          title: "NEBULA STATE RESTORED 💫",
          description: `Successfully synchronized and restored celestial coordinates with mass score of ${parsed.score.toLocaleString()}!`,
          icon: "Shield"
        }]);
        setTimeout(() => {
          setToasts(t => t.filter(x => x.id !== toastId));
        }, 5000);
      }
    } catch (e) {
      console.error("Autosave state restore failed", e);
    }
  };

  // Check for autosave and load daily mission on mount
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem("cosmic_daily_mission");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayStr) {
          setDailyMission(parsed);
        } else {
          const newMission = getDailyMissionForToday();
          setDailyMission(newMission);
          localStorage.setItem("cosmic_daily_mission", JSON.stringify(newMission));
        }
      } catch (e) {
        const newMission = getDailyMissionForToday();
        setDailyMission(newMission);
        localStorage.setItem("cosmic_daily_mission", JSON.stringify(newMission));
      }
    } else {
      const newMission = getDailyMissionForToday();
      setDailyMission(newMission);
      localStorage.setItem("cosmic_daily_mission", JSON.stringify(newMission));
    }

    // Check for game autosave state
    const savedGame = localStorage.getItem("cosmic_merger_autosave_state");
    if (savedGame) {
      try {
        const parsed = JSON.parse(savedGame);
        if (parsed && parsed.bodies && parsed.bodies.length > 0) {
          setHasAutosave(true);
          setAutosaveInfo({ score: parsed.score, timestamp: parsed.timestamp });
        }
      } catch (e) {}
    }
  }, []);

  // Save game state periodically to survive accidental reloads
  useEffect(() => {
    if (!hasStarted || stats.isGameOver) return;

    const interval = setInterval(() => {
      const serializableBodies = bodiesRef.current.map(b => ({
        id: b.id,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        radius: b.radius,
        mass: b.mass,
        level: b.level,
        angle: b.angle,
        angularVelocity: b.angularVelocity,
        opacity: b.opacity,
        shakingTime: b.shakingTime,
      }));

      const stateToSave = {
        bodies: serializableBodies,
        score: stats.score,
        mergesCount: stats.mergesCount,
        lastMergedName: stats.lastMergedName,
        highestLevelMerged,
        currentHeldLevel,
        nextHeldLevel,
        timeRemainingBeforeGameOver: stats.timeRemainingBeforeGameOver,
        timestamp: Date.now()
      };

      try {
        localStorage.setItem("cosmic_merger_autosave_state", JSON.stringify(stateToSave));
      } catch (e) {
        console.warn("Autosave state failed to serialize", e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [hasStarted, stats.score, stats.mergesCount, stats.lastMergedName, stats.isGameOver, highestLevelMerged, currentHeldLevel, nextHeldLevel, stats.timeRemainingBeforeGameOver]);

  // Load High Score from localStorage on Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cosmic_merger_highscore");
      if (stored) {
        const val = parseInt(stored, 10);
        setStats(prev => ({ ...prev, highScore: val }));
        initialHighScoreRef.current = val;
      }
    } catch (e) {
      console.warn("Could not read highscore", e);
    }
  }, []);

  // Initialize and run game loop
  useEffect(() => {
    if (!hasStarted) return;

    let animFrame: number;
    let warningPulseTime = 0;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrame = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animFrame = requestAnimationFrame(gameLoop);
        return;
      }

      // ----------------------------------------------------
      // 1. UPDATE STATES & PHYSICS
      // ----------------------------------------------------
      if (!isPausedRef.current) {
        // Tick Cooldowns
        if (shakeCooldown > 0) {
          setShakeCooldown(prev => prev - 1);
        }
        if (canvasShakeAmt > 0) {
          setCanvasShakeAmt(prev => Math.max(0, prev - 0.5));
        }

        // Physics integration step
        updatePhysicsBodies(
          bodiesRef.current,
          CONTAINER_WIDTH,
          CONTAINER_HEIGHT,
          0.28,             // Gravity
          0.988,            // Friction/Drag
          0.32              // Restitution (elastic bounce)
        );

        // Handle Merges inside Collision Resolution
        const onBodiesMerge = (midX: number, midY: number, level: number, b1: PhysicsBody, b2: PhysicsBody) => {
          const nextLevel = level + 1;
          const config = getCelestialConfig(nextLevel);
          const isSupernova = nextLevel === 10 && level === 9; // Black hole merger!

          // Create the newly fused larger body
          const mergedBody = createPhysicsBody(midX, midY, nextLevel);
          
          // Retain aggregate kinetic momentum with a soft upward propulsion bounce
          mergedBody.vx = (b1.vx + b2.vx) * 0.45;
          mergedBody.vy = Math.min(-2, (b1.vy + b2.vy) * 0.4) - 1.5; // launch thrust upward
          mergedBody.shakingTime = 16.0; // trigger birth spring animation

          bodiesRef.current.push(mergedBody);

          // Combo calculations
          const nowMs = Date.now();
          let currentCombo = 1;
          if (nowMs - comboRef.current.lastTime < 2000) {
            comboRef.current.count += 1;
            currentCombo = comboRef.current.count;
          } else {
            comboRef.current.count = 1;
            currentCombo = 1;
          }
          comboRef.current.lastTime = nowMs;

          // Score formulation with exponential multiplier
          const baseScoreGain = (level + 1) * 15;
          const multiplier = parseFloat(Math.pow(1.5, currentCombo - 1).toFixed(1));
          let finalScoreGain = Math.round(baseScoreGain * multiplier);

          // Check if a completed daily mission is active to award score bonus multiplier
          let hasMissionBonus = false;
          let missionMultiplier = 1.0;
          setDailyMission((prev: any) => {
            if (prev && prev.isCompleted) {
              hasMissionBonus = true;
              missionMultiplier = prev.multiplier;
            }
            return prev;
          });

          if (hasMissionBonus) {
            finalScoreGain = Math.round(finalScoreGain * missionMultiplier);
          }

          // Custom visual theme color overrides
          let mergeColor = config.color;
          const aes = particleAestheticRef.current;
          if (aes === "neon_fire") {
            const fireColors = ["#ff3a00", "#ff6600", "#ff0077", "#ffaa00", "#ff2200"];
            mergeColor = fireColors[Math.floor(Math.random() * fireColors.length)];
          } else if (aes === "sparkling_crystals") {
            const crystalColors = ["#00f3ff", "#00ffd5", "#ffffff", "#c077ff", "#77e8ff"];
            mergeColor = crystalColors[Math.floor(Math.random() * crystalColors.length)];
          }

          // Spawn floating text with full details
          let floatingText = `+${finalScoreGain}`;
          if (currentCombo > 1 && hasMissionBonus) {
            floatingText = `+${finalScoreGain} (${multiplier}x Combo • ${missionMultiplier}x Mission!)`;
          } else if (currentCombo > 1) {
            floatingText = `+${finalScoreGain} (${multiplier}x Combo!)`;
          } else if (hasMissionBonus) {
            floatingText = `+${finalScoreGain} (${missionMultiplier}x Mission!)`;
          }

          floatingTextsRef.current.push({
            x: midX,
            y: midY - 15,
            text: floatingText,
            color: mergeColor,
            alpha: 1.0,
            life: 45,
            fontSize: currentCombo > 1 || hasMissionBonus ? 13 : 11,
            multiplier: currentCombo,
          });
          
          // Spawn glowing stardust explosions
          spawnMergeParticles(midX, midY, mergeColor, particlesRef.current, 24, isSupernova);

          // Trigger dynamic synthesized sound effects
          if (isSupernova) {
            CosmicAudio.playSupernova();
            setCanvasShakeAmt(18.0); // massive screen shake
            
            // Cosmic cleanse: Eliminate all low level bodies (level <= 4)
            bodiesRef.current = bodiesRef.current.filter(b => {
              if (b.id === mergedBody.id) return true;
              if (b.level <= 4) {
                spawnMergeParticles(b.x, b.y, getCelestialConfig(b.level).color, particlesRef.current, 6, false);
                return false; // delete
              }
              return true;
            });
          } else {
            CosmicAudio.playMergePop(nextLevel);
            setCanvasShakeAmt(4.5); // modest shockwave
          }

          // Update levels merged stats
          setHighestLevelMerged(currentMax => {
            const m = Math.max(currentMax, nextLevel);
            setHighlightedInspectLevel(m);
            return m;
          });

          setStats(prev => {
            const nextScore = prev.score + finalScoreGain;
            const nextHighScore = Math.max(prev.highScore, nextScore);
            
            if (nextHighScore > prev.highScore) {
              try {
                localStorage.setItem("cosmic_merger_highscore", nextHighScore.toString());
              } catch (e) {
                // ignore storage errors
              }
            }

            return {
              ...prev,
              score: nextScore,
              highScore: nextHighScore,
              mergesCount: prev.mergesCount + 1,
              lastMergedName: config.name,
            };
          });

          // Update daily mission progress inside merge using functional state (independent of external React states)
          setDailyMission((prev: any) => {
            if (!prev || prev.isCompleted) return prev;
            let matched = false;
            if (prev.goalType === 'specific_level_merge' && prev.level === level) {
              matched = true;
            } else if (prev.goalType === 'score_target') {
              matched = true;
            }

            if (!matched) return prev;

            const nextVal = Math.min(prev.targetValue, prev.currentValue + (prev.goalType === 'score_target' ? finalScoreGain : 1));
            const completed = nextVal >= prev.targetValue;
            const updated = { ...prev, currentValue: nextVal, isCompleted: completed };
            try {
              localStorage.setItem("cosmic_daily_mission", JSON.stringify(updated));
            } catch (e) {}

            if (completed && !prev.isCompleted) {
              const toastId = Math.random().toString();
              setToasts(t => [...t, {
                id: toastId,
                title: "DAILY MISSION COMPLETE! 🎉",
                description: `Completed "${prev.description}". Active score multiplier ${prev.multiplier}x is now unlocked!`,
                icon: "Trophy"
              }]);
              setStats(p => {
                const nextScore = p.score + prev.scoreBonus;
                const nextHighScore = Math.max(p.highScore, nextScore);
                return { ...p, score: nextScore, highScore: nextHighScore };
              });
              CosmicAudio.playMergePop(9);
              setTimeout(() => {
                setToasts(t => t.filter(x => x.id !== toastId));
              }, 6000);
            }
            return updated;
          });
        };

        // Resolve colliders and keep active ones
        bodiesRef.current = resolveCircleCollisions(bodiesRef.current, onBodiesMerge);

        // Update and filter particles
        particlesRef.current = updateTrailAndMoveParticles(
          particlesRef.current,
          CONTAINER_WIDTH,
          CONTAINER_HEIGHT
        );

        // If neon fire, apply extra warmth upward float to active particles
        if (particleAestheticRef.current === "neon_fire") {
          for (const p of particlesRef.current) {
            p.vy -= 0.05; // soft warmth upward drift
          }
        }

        // Check if there are no immediate merges possible in the jar
        const nonGhostBodies = bodiesRef.current.filter(b => !b.isGhost);
        const levels = nonGhostBodies.map(b => b.level);
        const hasIdentical = levels.length !== new Set(levels).size;
        const noMoves = nonGhostBodies.length >= 3 && !hasIdentical;
        
        setNoPossibleMoves(prev => {
          if (prev !== noMoves) {
            return noMoves;
          }
          return prev;
        });

        // Check Danger zone violation
        let violatesDanger = false;
        for (const b of bodiesRef.current) {
          if (!b.isGhost && (b.y - b.radius) < DANGER_ZONE_Y) {
            if (Math.abs(b.vy) < 0.4 && Math.abs(b.vx) < 0.4) {
              violatesDanger = true;
              break;
            }
          }
        }

        if (violatesDanger) {
          warningPulseTime += 16.67;
          if (Math.floor(warningPulseTime / 16.67) % 70 === 0) {
            CosmicAudio.playWarningBeep();
          }

          setStats(prev => {
            const remaining = Math.max(0, prev.timeRemainingBeforeGameOver - 16.67);
            if (remaining === 0 && !prev.isGameOver) {
              CosmicAudio.playSupernova();
              return {
                ...prev,
                isGameOver: true,
                timeRemainingBeforeGameOver: 0,
              };
            }
            return {
              ...prev,
              timeRemainingBeforeGameOver: remaining,
            };
          });
        } else {
          warningPulseTime = 0;
          setStats(prev => {
            if (prev.isGameOver) return prev;
            return {
              ...prev,
              timeRemainingBeforeGameOver: Math.min(
                GAME_OVER_TIME_LIMIT,
                prev.timeRemainingBeforeGameOver + 25
              ),
            };
          });
        }

        // Add soft cosmic background wind trail for highly dynamic objects
        for (const b of bodiesRef.current) {
          const velSq = b.vx * b.vx + b.vy * b.vy;
          if (velSq > 1.8 && Math.random() < 0.35) {
            const config = getCelestialConfig(b.level);
            const trailAngle = Math.atan2(b.vy, b.vx) + Math.PI;
            const px = b.x + Math.cos(trailAngle) * b.radius;
            const py = b.y + Math.sin(trailAngle) * b.radius;
            
            let pColor = config.color;
            let pVx = (Math.random() - 0.5) * 0.4 - b.vx * 0.25;
            let pVy = (Math.random() - 0.5) * 0.4 - b.vy * 0.25;
            let pRadius = 1.0 + Math.random() * 2.0;
            let pMaxLife = 25;
            let pLife = 15 + Math.random() * 10;
            let pIsSpark = false;

            const aesthetic = particleAestheticRef.current;
            if (aesthetic === "neon_fire") {
              const fireColors = ["#ff3a00", "#ff6600", "#ff0077", "#ffaa00", "#ff2200"];
              pColor = fireColors[Math.floor(Math.random() * fireColors.length)];
              pVy -= 0.6; // rise upwards like fire embers
              pRadius = 1.5 + Math.random() * 2.5;
              pMaxLife = 18;
              pLife = 10 + Math.random() * 8;
              pIsSpark = Math.random() < 0.3; // some sparks!
            } else if (aesthetic === "sparkling_crystals") {
              const crystalColors = ["#00f3ff", "#00ffd5", "#ffffff", "#c077ff", "#77e8ff"];
              pColor = crystalColors[Math.floor(Math.random() * crystalColors.length)];
              pRadius = 1.2 + Math.random() * 1.8;
              pMaxLife = 30;
              pLife = 20 + Math.random() * 10;
              pIsSpark = true; // crystal diamonds!
            }

            particlesRef.current.push({
              x: px,
              y: py,
              vx: pVx,
              vy: pVy,
              color: pColor,
              radius: pRadius,
              alpha: 0.8,
              life: pLife,
              maxLife: pMaxLife,
              spin: Math.random() * Math.PI * 2,
              spinSpeed: 0.1,
              isSpark: pIsSpark
            });
          }
        }
      }

      // ----------------------------------------------------
      // 2. RENDERING CANVAS SCENE
      // ----------------------------------------------------
      ctx.save();
      
      // Implement intense camera shockwaves
      if (canvasShakeAmt > 0) {
        const shakeX = (Math.random() - 0.5) * canvasShakeAmt;
        const shakeY = (Math.random() - 0.5) * canvasShakeAmt;
        ctx.translate(shakeX, shakeY);
      }

      // Clear Frame and paint background deep space nebula
      const radialBg = ctx.createRadialGradient(
        CONTAINER_WIDTH / 2,
        CONTAINER_HEIGHT / 2,
        50,
        CONTAINER_WIDTH / 2,
        CONTAINER_HEIGHT / 2,
        CONTAINER_HEIGHT * 0.8
      );
      radialBg.addColorStop(0, "#1A0B2E"); // Warm deep purple core
      radialBg.addColorStop(0.5, "#0F071D"); // Velvet violet mid
      radialBg.addColorStop(1, "#06030A"); // Abyssal black fringe
      ctx.fillStyle = radialBg;
      ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

      // Update synth voice dynamic dynamic hum relative to score and danger status ratio
      CosmicAudio.updateDynamicHum(statsRef.current.score, statsRef.current.timeRemainingBeforeGameOver);

      // Draw subtle grid or wave effect on physical background of jar during active Gravity Instability
      if (statsRef.current.timeRemainingBeforeGameOver < GAME_OVER_TIME_LIMIT) {
        const dangerTimerRatio = 1 - (statsRef.current.timeRemainingBeforeGameOver / GAME_OVER_TIME_LIMIT);
        const waveFrequency = 0.045;
        const speed = Date.now() * 0.004;
        
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.03 + dangerTimerRatio * 0.12})`;
        ctx.lineWidth = 1.0;
        
        // Horizontal wavy mesh lines
        for (let gy = DANGER_ZONE_Y; gy < CONTAINER_HEIGHT; gy += 32) {
          ctx.beginPath();
          for (let gx = 0; gx <= CONTAINER_WIDTH; gx += 12) {
            const waveOffset = Math.sin(gx * waveFrequency + speed + gy * 0.015) * (dangerTimerRatio * 15);
            if (gx === 0) {
              ctx.moveTo(gx, gy + waveOffset);
            } else {
              ctx.lineTo(gx, gy + waveOffset);
            }
          }
          ctx.stroke();
        }

        // Vertical wavy mesh lines
        for (let gx = 16; gx < CONTAINER_WIDTH; gx += 32) {
          ctx.beginPath();
          for (let gy = DANGER_ZONE_Y; gy <= CONTAINER_HEIGHT; gy += 12) {
            const waveOffset = Math.cos(gy * waveFrequency + speed + gx * 0.015) * (dangerTimerRatio * 15);
            if (gy === DANGER_ZONE_Y) {
              ctx.moveTo(gx + waveOffset, gy);
            } else {
              ctx.lineTo(gx + waveOffset, gy);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw faint twinkling stardust constellation stars in back
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let s = 0; s < 40; s++) {
        const sx = (Math.sin(s * 87.2) * 0.5 + 0.5) * CONTAINER_WIDTH;
        const sy = (Math.cos(s * 33.4) * 0.5 + 0.5) * CONTAINER_HEIGHT;
        const sSize = (Math.sin(Date.now() * 0.002 + s * 4) * 0.5 + 0.5) * 1.5 + 0.5;
        ctx.fillRect(sx, sy, sSize, sSize);
      }

      // Render the Guide Projection dotted vertical drop line (if isHolding and not dragging way out)
      if (isHolding && !dropCooldown && !statsRef.current.isGameOver) {
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(previewX, 60);
        
        // Find nearest obstacle underneath preview to drop guide line cleanly
        let targetDropY = CONTAINER_HEIGHT;
        for (const b of bodiesRef.current) {
          if (b.isGhost) continue;
          const xDist = Math.abs(b.x - previewX);
          if (xDist < b.radius + getCelestialConfig(currentHeldLevel).radius) {
            // Circle block intercept calculation
            const radialSpan = b.radius + getCelestialConfig(currentHeldLevel).radius;
            const diffSq = radialSpan * radialSpan - xDist * xDist;
            const potentialY = b.y - Math.sqrt(Math.max(0, diffSq));
            if (potentialY < targetDropY && potentialY > 60) {
              targetDropY = potentialY;
            }
          }
        }

        ctx.lineTo(previewX, targetDropY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }

      // Draw the static "Danger Line"
      ctx.strokeStyle = statsRef.current.timeRemainingBeforeGameOver < GAME_OVER_TIME_LIMIT 
        ? `rgba(244, 63, 94, ${0.45 + Math.sin(Date.now() * 0.01) * 0.25})` // Pulse red when alert active
        : "rgba(167, 139, 250, 0.18)";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(10, DANGER_ZONE_Y);
      ctx.lineTo(CONTAINER_WIDTH - 10, DANGER_ZONE_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw warning indicator label if above line
      if (statsRef.current.timeRemainingBeforeGameOver < GAME_OVER_TIME_LIMIT) {
        ctx.font = "italic bold 10px 'JetBrains Mono', sans-serif";
        ctx.fillStyle = "rgba(244,63,94,0.8)";
        ctx.fillText("GRAVITY INSTABILITY DEPTH LIMIT", 20, DANGER_ZONE_Y - 8);
      }

      // Draw particles (glow trail & splash stars)
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        // Calculate particle shrinking contraction as it ages
        const ratio = Math.max(0, p.life / p.maxLife);
        const currentRadius = p.radius * (0.35 + 0.65 * ratio);
        
        const aesthetic = particleAestheticRef.current;
        if (aesthetic === "sparkling_crystals") {
          // Draw as a beautiful diamond/crystal
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -currentRadius * 2.2);
          ctx.lineTo(currentRadius * 1.3, 0);
          ctx.lineTo(0, currentRadius * 2.2);
          ctx.lineTo(-currentRadius * 1.3, 0);
          ctx.closePath();
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
        } else if (p.isSpark) {
          // Draw a tiny rotating 4-pointed sparkle
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let sp = 0; sp < 4; sp++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(0, currentRadius * 3.5);
            ctx.lineTo(currentRadius * 0.7, 0);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Standard glowing round dust
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          // Add a subtle particle shadow glow
          ctx.shadowBlur = aesthetic === "neon_fire" ? 10 : 6;
          ctx.shadowColor = p.color;
          ctx.fill();
        }
        ctx.restore();
      }

      // Paint active physics bodies
      for (const b of bodiesRef.current) {
        const config = getCelestialConfig(b.level);
        ctx.save();
        
        // Move drawing coordinate center to body space
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        // Apply shake & landing compress scaling elastic bounce
        let scaleX = 1.0;
        let scaleY = 1.0;
        if (b.shakingTime > 0) {
          const cycle = Math.sin(b.shakingTime * 0.45);
          const mult = b.shakingTime / 16.0;
          scaleX = 1.0 + cycle * 0.14 * mult;
          scaleY = 1.0 - cycle * 0.14 * mult;
        }
        ctx.scale(scaleX, scaleY);

        // Ambient planet atmosphere outer soft ring aura glow
        const glowRadius = b.radius * 1.25;
        const atmosphereGrad = ctx.createRadialGradient(0, 0, b.radius * 0.8, 0, 0, glowRadius);
        atmosphereGrad.addColorStop(0, "transparent");
        atmosphereGrad.addColorStop(0.35, config.glowColor);
        atmosphereGrad.addColorStop(1, "transparent");
        ctx.fillStyle = atmosphereGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core Sphere Shading (Radial spherical layout light source from top-left)
        const lightSourceX = -b.radius * 0.28;
        const lightSourceY = -b.radius * 0.28;
        const sphereGrad = ctx.createRadialGradient(
          lightSourceX,
          lightSourceY,
          b.radius * 0.08,
          0,
          0,
          b.radius
        );
        sphereGrad.addColorStop(0, config.gradientStart);
        sphereGrad.addColorStop(0.7, config.color);
        sphereGrad.addColorStop(1, config.gradientEnd);

        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // ----------------------------------------------------
        // PLANET SPECIFIC GRAPHICS OVERLAYS
        // ----------------------------------------------------
        // Luna Craters (Level 1)
        if (b.level === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          const craterCoords = [
            { x: -b.radius * 0.4, y: -b.radius * 0.3, r: b.radius * 0.15 },
            { x: b.radius * 0.3, y: -b.radius * 0.4, r: b.radius * 0.1 },
            { x: -b.radius * 0.2, y: b.radius * 0.5, r: b.radius * 0.18 },
            { x: b.radius * 0.4, y: b.radius * 0.2, r: b.radius * 0.13 },
            { x: b.radius * 0.0, y: b.radius * 0.0, r: b.radius * 0.2 },
          ];
          for (const c of craterCoords) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
            // Highlight crescent rim in white for 3D look
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(c.x + 1, c.y + 1, c.r, Math.PI * 0.25, Math.PI * 1.25);
            ctx.stroke();
          }
        }

        // Earth Continents (Level 5)
        if (b.level === 5) {
          // Greenish geographic-blob blobs rotating on planet surface
          ctx.fillStyle = "#469E43";
          ctx.beginPath();
          // Render a couple of landmass blobs
          ctx.arc(-b.radius * 0.3, -b.radius * 0.2, b.radius * 0.35, 0, Math.PI * 2);
          ctx.arc(b.radius * 0.2, b.radius * 0.3, b.radius * 0.42, 0, Math.PI * 2);
          ctx.arc(b.radius * 0.4, -b.radius * 0.3, b.radius * 0.24, 0, Math.PI * 2);
          ctx.fill();

          // Marble ocean/land shading overlay
          const overlayGrad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, b.radius * 0.1, 0, 0, b.radius);
          overlayGrad.addColorStop(0, "rgba(255,255,255,0.45)"); // shiny reflection
          overlayGrad.addColorStop(0.7, "rgba(0,0,0,0.0)");
          overlayGrad.addColorStop(1, "rgba(0,0,0,0.55)"); // dark edge shading
          ctx.fillStyle = overlayGrad;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();

          // Swirling white clouds
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = b.radius * 0.12;
          ctx.beginPath();
          ctx.arc(-b.radius * 0.2, b.radius * 0.1, b.radius * 0.65, Math.PI * 0.8, Math.PI * 1.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(b.radius * 0.1, -b.radius * 0.1, b.radius * 0.7, Math.PI * 1.8, Math.PI * 2.4);
          ctx.stroke();
        }

        // Gas Giant Ring (Saturn - Level 7)
        // Draw bottom-half of Saturn's ring BEFORE drawing top half of planet to mask nicely
        if (b.level === 7) {
          ctx.save();
          ctx.rotate(-0.2); // ring tilt
          ctx.strokeStyle = "rgba(254, 230, 164, 0.45)";
          ctx.lineWidth = b.radius * 0.15;
          ctx.beginPath();
          ctx.ellipse(0, 0, b.radius * 1.7, b.radius * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Storm / Band Stripes (Neptune - Level 6 / Jupiter - Level 8)
        if (config.hasStorms) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
          ctx.fillRect(-b.radius, -b.radius * 0.35, b.radius * 2, b.radius * 0.12);
          ctx.fillRect(-b.radius, b.radius * 0.1, b.radius * 2, b.radius * 0.15);
          ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
          ctx.fillRect(-b.radius, -b.radius * 0.12, b.radius * 2, b.radius * 0.15);
          ctx.fillRect(-b.radius, b.radius * 0.45, b.radius * 2, b.radius * 0.1);

          // Great Red Storm Dot for Jupiter
          if (b.level === 8) {
            ctx.fillStyle = "#A72A0A";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "#FF5A2E";
            ctx.beginPath();
            ctx.ellipse(b.radius * 0.35, b.radius * 0.2, b.radius * 0.22, b.radius * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          }
        }

        // Sol / Neutron Stars Sparks radiating lines (Level 9 / 10)
        if (config.starsCount) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          for (let sc = 0; sc < config.starsCount; sc++) {
             const angle = (sc / config.starsCount) * Math.PI * 2 + (Date.now() * 0.001);
             const sSize = b.radius * (1.1 + Math.sin(Date.now() * 0.005 + sc) * 0.08);
             ctx.beginPath();
             ctx.arc(Math.cos(angle) * sSize, Math.sin(angle) * sSize, 2, 0, Math.PI * 2);
             ctx.fill();
          }
        }

        // Orbiting tiny moons! ( Earth (1), Saturn (2), Jupiter (3) )
        const moonOrbitCount = b.level === 5 ? 1 : b.level === 7 ? 2 : b.level === 8 ? 3 : 0;
        if (moonOrbitCount > 0) {
          ctx.restore(); // momentarily exit rotation/scale context to draw moons in world coordinates
          ctx.save();
          ctx.translate(b.x, b.y); // center to planet
          
          for (let mIdx = 0; mIdx < moonOrbitCount; mIdx++) {
            const orbitRad = b.radius * (1.4 + mIdx * 0.22);
            const orbitSpeed = 0.0015 / (mIdx + 1);
            const orbitAngle = Date.now() * orbitSpeed + mIdx * (Math.PI * 0.65);
            const mx = Math.cos(orbitAngle) * orbitRad;
            const my = Math.sin(orbitAngle) * orbitRad;

            // Draw moon orbit line path faintly
            ctx.strokeStyle = "rgba(167, 139, 250, 0.04)";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(0, 0, orbitRad, 0, Math.PI * 2);
            ctx.stroke();

            // Draw floating glowing tiny moon circle
            const moonGrad = ctx.createRadialGradient(mx, my, 1, mx, my, 5);
            moonGrad.addColorStop(0, "#FFFFFF");
            moonGrad.addColorStop(1, config.color);
            ctx.fillStyle = moonGrad;
            
            ctx.beginPath();
            ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
            ctx.shadowBlur = 6;
            ctx.shadowColor = config.color;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        ctx.restore(); // Restore world transform matrix mapping
      }

      // Draw active currently held dropping preview element
      if (isHolding && !dropCooldown && !statsRef.current.isGameOver) {
        const heldConfig = getCelestialConfig(currentHeldLevel);
        ctx.save();
        ctx.translate(previewX, 60);
        ctx.globalAlpha = 0.85;

        // Draw Atmosphere aura
        const glowRad = heldConfig.radius * 1.25;
        const atmGrad = ctx.createRadialGradient(0, 0, heldConfig.radius * 0.8, 0, 0, glowRad);
        atmGrad.addColorStop(0, "transparent");
        atmGrad.addColorStop(0.4, heldConfig.glowColor);
        atmGrad.addColorStop(1, "transparent");
        ctx.fillStyle = atmGrad;
        ctx.beginPath();
        ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
        ctx.fill();

        // Spherical core mapping
        const ballGrad = ctx.createRadialGradient(-heldConfig.radius * 0.3, -heldConfig.radius * 0.3, heldConfig.radius * 0.05, 0, 0, heldConfig.radius);
        ballGrad.addColorStop(0, heldConfig.gradientStart);
        ballGrad.addColorStop(0.7, heldConfig.color);
        ballGrad.addColorStop(1, heldConfig.gradientEnd);
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(0, 0, heldConfig.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw & update floating score & combo texts at merge events
      for (const ft of floatingTextsRef.current) {
        ctx.save();
        ctx.globalAlpha = ft.alpha;

        // Calculate dynamic pop scale
        const age = 45 - ft.life;
        const mult = ft.multiplier || 1;
        // High multipliers pop even more dramatically!
        const maxPop = mult > 1 ? 1.65 + (mult * 0.12) : 1.35;
        
        let scale = 1.0;
        if (age < 12) {
          const t = age / 12;
          // Smooth sinus pop-up and settle animation
          scale = maxPop * Math.sin(t * Math.PI * 0.85);
        } else {
          // Settle down and shrink slightly towards the end
          const decayRatio = ft.life / 33;
          scale = 1.0 * Math.min(1.0, decayRatio);
        }

        // Apply transformations relative to the text coordinate
        ctx.translate(ft.x, ft.y);
        ctx.scale(scale, scale);

        ctx.font = `bold ${ft.fontSize}px 'Space Grotesk', system-ui, sans-serif`;
        ctx.fillStyle = ft.color;

        // Add visual intensity glow for high multipliers
        if (mult > 1) {
          ctx.shadowBlur = 12 + mult * 2.5;
          ctx.shadowColor = ft.color;
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = ft.color;
        }

        ctx.textAlign = "center";
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();

        // Float up and decay alpha
        ft.y -= 0.65;
        ft.life--;
        ft.alpha = Math.max(0, ft.life / 45);
      }
      // Cleanup expired texts
      floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);

      ctx.restore(); // restore final screen shakes translate map

      // If paused, apply premium semi-transparent dim overlay to canvas
      if (isPausedRef.current) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);
      }

      animFrame = requestAnimationFrame(gameLoop);
    };

    animFrame = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [hasStarted, currentHeldLevel, previewX, isHolding, dropCooldown, stats.isGameOver, canvasShakeAmt]);

  // Handle Drop launch release
  const handleDropRelease = () => {
    if (!hasStarted || stats.isGameOver || dropCooldown || !isHolding || isPaused) return;

    // Spawn new physical body in simulation reference list
    const newBody = createPhysicsBody(previewX, 70, currentHeldLevel);
    bodiesRef.current.push(newBody);

    // Audio Swoosh drop Synthesiser play
    CosmicAudio.playDropSwoosh();

    // Trigger cool local bounce on drop launcher
    setIsHolding(false);
    setDropCooldown(true);

    // Briefly delay holding load to let newly dropped planet get clear of ceiling line
    setTimeout(() => {
      if (stats.isGameOver) return;
      setCurrentHeldLevel(nextHeldLevel);
      setNextHeldLevel(Math.floor(Math.random() * (MAX_DROP_LEVEL + 1)));
      setIsHolding(true);
      setDropCooldown(false);
    }, 450);
  };

  // Coordinated mouse/finger trace mappings
  const handleMoveAction = (clientX: number) => {
    if (isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touchXOnCanvas = clientX - rect.left;
    const bodyRad = getCelestialConfig(currentHeldLevel).radius;

    // Boundary cap preview element with absolute container limits
    const cappedX = Math.max(bodyRad + 12, Math.min(CONTAINER_WIDTH - bodyRad - 12, touchXOnCanvas));
    setPreviewX(cappedX);
  };

  const handleStartGame = () => {
    CosmicAudio.init(); // safely trigger Audio context on user action click
    setVolume(CosmicAudio.getVolume());
    setHasStarted(true);
  };

  const restartGame = () => {
    bodiesRef.current = [];
    particlesRef.current = [];
    clearAutosave();
    setIsPaused(false);
    setStats({
      score: 0,
      highScore: stats.highScore,
      mergesCount: 0,
      lastMergedName: "",
      isGameOver: false,
      timeRemainingBeforeGameOver: GAME_OVER_TIME_LIMIT,
    });
    setHighestLevelMerged(0);
    setHighlightedInspectLevel(0);
    setShakeCooldown(0);
    setCurrentHeldLevel(Math.floor(Math.random() * (MAX_DROP_LEVEL + 1)));
    setNextHeldLevel(Math.floor(Math.random() * (MAX_DROP_LEVEL + 1)));
    setIsHolding(true);
    setDropCooldown(false);
    
    // Play warm sound
    CosmicAudio.playMergePop(4);
  };

  const triggerGravityShake = () => {
    if (shakeCooldown > 0 || stats.isGameOver || isPaused) return;

    // Launch gravity disturbance impulse to all objects
    for (const b of bodiesRef.current) {
      b.vx += (Math.random() - 0.5) * 6.5;
      b.vy -= (2.0 + Math.random() * 4.5);
      b.angularVelocity += (Math.random() - 0.5) * 0.4;
      b.shakingTime = 12; // squeeze spring visual pop active
    }

    setCanvasShakeAmt(9.0);
    CosmicAudio.playSupernova(); // plays massive deep rumbling sound
    setShakeCooldown(650); // reset frame cooldown (approx 10-11 seconds)

    // Track gravity shake usage for daily missions
    updateDailyMissionProgress('shake_usage', 1);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    CosmicAudio.setVolume(newVol);
  };

  // Save highscore entry on Game Over
  useEffect(() => {
    if (stats.isGameOver && stats.score > 0) {
      const stored = localStorage.getItem("cosmic_high_scores_list");
      let list = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch (e) {}
      }
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        score: stats.score,
        merges: stats.mergesCount,
        date: new Date().toISOString()
      };
      list.push(newEntry);
      list.sort((a: any, b: any) => b.score - a.score);
      list = list.slice(0, 10);
      localStorage.setItem("cosmic_high_scores_list", JSON.stringify(list));
    }
  }, [stats.isGameOver]);

  // Monitor milestone thresholds
  const checkMilestones = (currentScore: number, mergesCount: number, maxLevel: number) => {
    let unlocked: string[] = [];
    try {
      const stored = localStorage.getItem("cosmic_unlocked_milestones");
      if (stored) {
        unlocked = JSON.parse(stored);
      }
    } catch (e) {}

    const milestonesToCheck = [
      {
        id: "first_merge",
        title: "Stellar Nucleosynthesis",
        description: "Initiate your very first fusion reaction in the core.",
        condition: mergesCount >= 1,
        icon: "Sparkles"
      },
      {
        id: "score_500",
        title: "Nebula Navigator",
        description: "Generate 500 Vortex Energy units.",
        condition: currentScore >= 500,
        icon: "Zap"
      },
      {
        id: "merges_25",
        title: "Gravity Tamer",
        description: "Successfully complete 25 consolidations.",
        condition: mergesCount >= 25,
        icon: "Shield"
      },
      {
        id: "merges_100",
        title: "Cosmic Consolidator",
        description: "Reach 100 consolidations across space-time.",
        condition: mergesCount >= 100,
        icon: "Award"
      },
      {
        id: "level_5",
        title: "Gas Giant Synthesizer",
        description: "Sustain a massive level 5 gas giant.",
        condition: maxLevel >= 5,
        icon: "Globe"
      },
      {
        id: "level_9",
        title: "Event Horizon",
        description: "Accrete a level 9 super-massive Black Hole.",
        condition: maxLevel >= 9,
        icon: "Activity"
      },
      {
        id: "score_10000",
        title: "Vortex Overlord",
        description: "Accumulate a staggering 10,000 Vortex Energy units.",
        condition: currentScore >= 10000,
        icon: "Trophy"
      }
    ];

    let newlyUnlocked = false;
    const nextUnlocked = [...unlocked];

    for (const m of milestonesToCheck) {
      if (m.condition && !unlocked.includes(m.id)) {
        nextUnlocked.push(m.id);
        newlyUnlocked = true;

        // Trigger toast
        const toastId = Math.random().toString();
        setToasts(prev => [...prev, { id: toastId, title: m.title, description: m.description, icon: m.icon }]);
        
        // Play warm, nice unlock chime pop!
        CosmicAudio.playMergePop(8);

        // Auto remove after 4.5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 4500);
      }
    }

    if (newlyUnlocked) {
      try {
        localStorage.setItem("cosmic_unlocked_milestones", JSON.stringify(nextUnlocked));
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (hasStarted) {
      checkMilestones(stats.score, stats.mergesCount, highestLevelMerged);
    }
  }, [stats.score, stats.mergesCount, highestLevelMerged, hasStarted]);

  return (
    <div className="min-h-screen bg-[#0d0221] text-slate-100 flex flex-col font-sans relative overflow-x-hidden" id="cosmic-root">
      
      {/* Mesh Background for Frosted Glass theme */}
      <div className="mesh-bg pointer-events-none" />
      
      {/* Global Star Ambient Twinkle overlay */}
      <div className="absolute inset-0 animate-nebula bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.06)_1%,transparent_100%)] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8 flex-1 flex flex-col relative z-10 justify-center">
        
        {/* Header HUD Row */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10" id="cosmic-header-row">
          <div className="text-center sm:text-left">
            <h1 className="font-display text-4xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-300 flex items-center justify-center sm:justify-start gap-2">
              COSMIC MERGER
            </h1>
            <p className="text-purple-400 text-xs font-bold tracking-[0.3em] uppercase mt-1">
              Singularity Protocol Active
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsHighScoresOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-mono rounded-xl border border-amber-500/30 transition-all duration-200 active:scale-95"
              id="header-high-scores-btn"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              HIGH SCORES
            </button>

            <div className="flex items-center gap-2 bg-white/5 p-1.5 px-3 rounded-full border border-white/10 shrink-0">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping shrink-0" />
              <span className="text-[11px] font-mono text-purple-300">TELEMETRY: NOMINAL</span>
            </div>
          </div>
        </header>

        {/* Content Board layout */}
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            /* Intro Launcher Screen */
            <motion.div
              key="intro-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="glass-panel text-center max-w-lg w-full mx-auto p-8 md:p-10 rounded-3xl border-white/10 select-none shadow-2xl relative overflow-hidden"
              id="intro-card"
            >
              {/* Back ambient globe ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

              <span className="inline-block p-4 rounded-full bg-white/5 border border-white/10 text-purple-300 mb-6">
                <Rocket className="w-8 h-8 animate-bounce" />
              </span>

              <h2 className="font-display text-4xl font-extrabold text-white tracking-tight mb-3">
                Accretion Engine
              </h2>
              
              <p className="text-sm text-purple-200/80 leading-relaxed mb-8 max-w-sm mx-auto">
                Synthesize massive gas giants and stars in the deep space gravity well. Combine identical elements to trigger glorious stellar supernovas.
              </p>

              <button
                onClick={handleStartGame}
                id="btn-mission-start"
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-display font-medium rounded-2xl text-base shadow-xl shadow-purple-600/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5 fill-current" />
                Initialize Mission
              </button>

              <div className="mt-8 flex flex-col items-center justify-center gap-3.5 text-xs text-white/55 font-mono">
                <button
                  onClick={() => setIsHighScoresOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs rounded-xl border border-amber-500/20 transition-all duration-200 active:scale-95"
                  id="intro-high-scores-btn"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  VIEW TELEMETRY & HIGH SCORES
                </button>
                <div className="flex items-center gap-3 text-[10px] opacity-75">
                  <span>SOUND: DYNAMIC SYNTH</span>
                  <span>•</span>
                  <span>COOLDOWN SHAKES: READY</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Active Game Field */
            <motion.div
              key="active-game-board"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              id="active-board"
            >
              
              {/* LEFT/CENTER COLUMN: THE COSMIC JAR (GAME CANVAS) */}
              <div className="col-span-1 lg:col-span-7 flex flex-col items-center">
                
                {noPossibleMoves && !stats.isGameOver && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full mb-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-amber-200 font-mono shadow-lg shadow-amber-500/5 relative overflow-hidden"
                    style={{ maxWidth: `${CONTAINER_WIDTH}px` }}
                    id="no-moves-warning"
                  >
                    <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />
                    <span className="flex items-center gap-2 relative z-10">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                      <span>NO IMMEDIATE MERGES POSSIBLE</span>
                    </span>
                    <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold tracking-tight animate-pulse relative z-10">
                      TRY 'SHAKE' / 'CLEAR'
                    </span>
                  </motion.div>
                )}

                {/* Physical Jar Frame */}
                <div 
                  className="w-full relative jar-container overflow-hidden select-none flex flex-col"
                  style={{ maxWidth: `${CONTAINER_WIDTH}px` }}
                  id="cosmic-jar-wrapper"
                >
                  
                  {/* Warning Danger Zone pulse backdrop indicator */}
                  {stats.timeRemainingBeforeGameOver < GAME_OVER_TIME_LIMIT && (
                    <div 
                      className="absolute inset-0 bg-rose-950/20 pointer-events-none transition-opacity duration-300"
                      style={{
                        opacity: 0.2 + (Math.sin(Date.now() * 0.015) * 0.15),
                        boxShadow: "inset 0 0 100px rgba(244, 63, 94, 0.35)"
                      }}
                    />
                  )}

                  {/* Top Launch Guide Bar */}
                  <div className="absolute top-0 inset-x-0 h-[60px] bg-gradient-to-b from-black/40 to-transparent flex items-center justify-center text-[10px] letter font-mono text-violet-500 tracking-wider pointer-events-none uppercase">
                    Launch Corridor limit 70km
                  </div>

                  {/* Main Interaction Canvas */}
                  <canvas
                    ref={canvasRef}
                    id="cosmic-canvas"
                    width={CONTAINER_WIDTH}
                    height={CONTAINER_HEIGHT}
                    className="w-full bg-transparent block cursor-crosshair shrink-0 relative z-10"
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      handleMoveAction(e.clientX);
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) handleMoveAction(e.clientX);
                    }}
                    onMouseUp={() => {
                      if (isDragging) {
                        setIsDragging(false);
                        handleDropRelease();
                      }
                    }}
                    onTouchStart={(e) => {
                      setIsDragging(true);
                      if (e.touches && e.touches[0]) {
                        handleMoveAction(e.touches[0].clientX);
                      }
                    }}
                    onTouchMove={(e) => {
                      if (isDragging && e.touches && e.touches[0]) {
                        handleMoveAction(e.touches[0].clientX);
                      }
                    }}
                    onTouchEnd={() => {
                      if (isDragging) {
                        setIsDragging(false);
                        handleDropRelease();
                      }
                    }}
                  />

                  {/* Warning pulse bar at absolute base of jar */}
                  {stats.timeRemainingBeforeGameOver < GAME_OVER_TIME_LIMIT && (
                    <div className="bg-rose-950 border-t border-rose-800 p-2.5 px-4 text-center flex items-center justify-center gap-2 text-rose-300 font-mono text-xs relative z-20 animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      GRAVITY ANOMALY: {Math.ceil(stats.timeRemainingBeforeGameOver / 1000)}s BEFORE IMPLOSION!
                    </div>
                  )}

                  {/* High-fidelity Pause Overlay Panel */}
                  <AnimatePresence>
                    {isPaused && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[6px] z-30 flex flex-col items-center justify-center p-6 text-center"
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 15 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 15 }}
                          transition={{ type: "spring", damping: 25, stiffness: 350 }}
                          className="glass-panel p-6 rounded-2xl max-w-sm w-full flex flex-col items-center justify-center border border-violet-500/30 bg-slate-950/80 shadow-2xl shadow-violet-500/10"
                        >
                          <div className="w-14 h-14 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-4 text-violet-400 animate-pulse">
                            <Pause className="w-6 h-6" />
                          </div>
                          
                          <h3 className="text-lg font-display font-bold text-white tracking-tight">NEBULA SIMULATION SUSPENDED</h3>
                          <p className="text-xs text-purple-200 mt-2 font-mono leading-relaxed">
                            Physical state coordinates have been securely frozen in local spacetime.
                          </p>

                          <div className="mt-5 w-full flex flex-col gap-2">
                            <button
                              onClick={() => setIsPaused(false)}
                              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-mono py-3 rounded-xl border border-violet-400/20 flex items-center justify-center gap-2 font-bold tracking-wider transition-all duration-200 shadow-lg shadow-violet-500/20 active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                              RESUME SIMULATION
                            </button>
                            
                            <button
                              onClick={restartGame}
                              className="w-full bg-white/5 hover:bg-white/10 text-purple-200 hover:text-white text-xs font-mono py-2.5 rounded-xl border border-white/5 transition-all duration-150 active:scale-95"
                            >
                              ABANDON & RESTART
                            </button>
                          </div>

                          <div className="mt-4 text-[9px] font-mono text-purple-400/60 uppercase tracking-widest">
                            Press ESC or P to Resume
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sub-label coordinates info */}
                <p className="text-[10px] font-mono text-violet-500/80 mt-3 text-center tracking-wide">
                  TOUCH / CLICK CORRIDOR HEIGHT TO ACCRETE THERMAL SPHERES
                </p>
              </div>

              {/* RIGHT COLUMN: CORE DASHBOARD & PROGRESSION LEGEND */}
              <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
                
                {/* HUD Panels containing stats, next drop, volume (Animated sliding entrance) */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                >
                  <ScoreBoard
                    stats={stats}
                    nextBodyLevel={nextHeldLevel}
                    shakeCooldown={shakeCooldown}
                    canShake={shakeCooldown === 0}
                    onShake={triggerGravityShake}
                    onRestart={restartGame}
                    volume={volume}
                    onVolumeChange={handleVolumeChange}
                    onOpenHelp={() => setIsHelpOpen(true)}
                    initialHighScore={initialHighScoreRef.current}
                    isPaused={isPaused}
                    onTogglePause={togglePause}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                  />
                </motion.div>

                {/* Legend inspect flow card (Animated staggered sliding entrance) */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                >
                  <ProgressionLegend
                    highestLevelMerged={highestLevelMerged}
                    highlightedLevel={highlightedInspectLevel}
                    onSelectLevel={(level) => setHighlightedInspectLevel(level)}
                  />
                </motion.div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal How to Play Info Rules */}
        <HowToPlay
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />

        {/* Modal High Scores and Achievements History */}
        <HighScoresModal
          isOpen={isHighScoresOpen}
          onClose={() => setIsHighScoresOpen(false)}
        />

        {/* Toast Notification Layer (Milestones) */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full p-4 md:p-0" id="cosmic-toasts-container">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, y: -10, scale: 0.95 }}
                transition={{ type: "spring", damping: 18, stiffness: 220 }}
                className="pointer-events-auto bg-black/90 border border-purple-500/40 p-4 rounded-xl shadow-2xl flex items-start gap-3.5 backdrop-blur-md relative overflow-hidden"
              >
                {/* Background ambient glow inside toast */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  {toast.icon === "Sparkles" && <Sparkles className="w-5 h-5 text-amber-400" />}
                  {toast.icon === "Zap" && <Zap className="w-5 h-5 text-indigo-400" />}
                  {toast.icon === "Shield" && <Shield className="w-5 h-5 text-emerald-400" />}
                  {toast.icon === "Award" && <Award className="w-5 h-5 text-violet-400" />}
                  {toast.icon === "Globe" && <Globe className="w-5 h-5 text-cyan-400" />}
                  {toast.icon === "Activity" && <Activity className="w-5 h-5 text-pink-400" />}
                  {toast.icon === "Trophy" && <Trophy className="w-5 h-5 text-amber-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-purple-400">MILESTONE ACHIEVED</span>
                    <button
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="text-purple-300 hover:text-white p-0.5 rounded-full hover:bg-white/5 transition-colors"
                      title="Dismiss Toast"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-[13px] font-bold font-display text-white mt-1 leading-tight">{toast.title}</h4>
                  <p className="text-xs text-purple-200/80 leading-normal mt-1">{toast.description}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Game Over Shockwave Backdrop Dialog Overlay */}
        <AnimatePresence>
          {stats.isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id="gameover-overlay"
              className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center z-50 p-4 overflow-hidden"
            >
              {/* Subtle animated expanding/collapsing radial gradient simulating final implosion */}
              <motion.div
                initial={{ scale: 3.0, opacity: 0.15 }}
                animate={{ 
                  scale: [3.0, 0.1, 3.5, 2.0], 
                  opacity: [0.15, 0.9, 0.0, 0.15] 
                }}
                transition={{ 
                  duration: 5.0, 
                  repeat: Infinity, 
                  ease: "easeOut",
                  times: [0, 0.4, 0.65, 1.0]
                }}
                className="absolute inset-0 pointer-events-none mix-blend-screen flex items-center justify-center"
              >
                <div 
                  className="w-[100vw] h-[100vw] max-w-[1200px] max-h-[1200px] rounded-full blur-3xl"
                  style={{
                    background: "radial-gradient(circle, rgba(244, 63, 94, 0.45) 0%, rgba(139, 92, 246, 0.2) 45%, transparent 70%)"
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="glass-panel max-w-md w-full p-8 rounded-3xl border-rose-500/40 text-center select-none relative overflow-hidden"
              >
                {/* Red radial flash behind */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

                <span className="inline-block p-4 rounded-full bg-rose-950/50 border border-rose-900/50 text-rose-400 mb-5">
                  <AlertTriangle className="w-8 h-8 animate-bounce" />
                </span>

                <h3 className="font-display text-3xl font-extrabold text-white tracking-tight mb-2">
                  Gravity Collapse
                </h3>
                <p className="text-xs font-mono text-rose-400 tracking-wider uppercase mb-6">
                  Event horizon reached
                </p>

                <div className="bg-black/40 border border-violet-950 rounded-2xl p-5 mb-8 space-y-3">
                  <div className="flex justify-between items-center text-xs text-violet-400 font-mono">
                    <span>VORTEX ENERGY STACK</span>
                    <span className="font-bold text-white text-sm">{stats.score.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-violet-950/60 pt-2.5 flex justify-between items-center text-xs text-violet-400 font-mono">
                    <span>MAX RADIATION RECORD</span>
                    <span className="font-bold text-yellow-300 text-sm">{stats.highScore.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-violet-950/60 pt-2.5 flex justify-between items-center text-xs text-violet-400 font-mono">
                    <span>TOTAL ACCRETIONS</span>
                    <span className="font-bold text-indigo-300 text-sm">{stats.mergesCount}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={restartGame}
                    id="restart-from-gameover-btn"
                    className="flex-1 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:bg-violet-700 text-white rounded-xl font-display font-medium text-sm transition-all duration-200 shadow-lg shadow-violet-600/10 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Ignite Vacuum Chamber
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
