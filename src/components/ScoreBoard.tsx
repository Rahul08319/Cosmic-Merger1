import React from "react";
import { GameStats, CelestialType } from "../types";
import { Trophy, Flame, ChevronRight, Zap, RefreshCw, Volume2, VolumeX, HelpCircle } from "lucide-react";
import { getCelestialConfig } from "../constants";

interface ScoreBoardProps {
  stats: GameStats;
  nextBodyLevel: number;
  shakeCooldown: number;
  canShake: boolean;
  onShake: () => void;
  onRestart: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onOpenHelp: () => void;
  initialHighScore: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  stats,
  nextBodyLevel,
  shakeCooldown,
  canShake,
  onShake,
  onRestart,
  volume,
  onVolumeChange,
  onOpenHelp,
  initialHighScore,
}) => {
  const nextBody = getCelestialConfig(nextBodyLevel);

  const isNewRecord = stats.score > initialHighScore && stats.score > 0;

  // Local helper to toggle mute via clicking the speaker icon
  const [prevVolume, setPrevVolume] = React.useState(0.4);
  const handleIconClick = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume > 0 ? prevVolume : 0.4);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full select-none" id="scoreboard-hud">
      {/* Top Banner (Score & HighScore) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Score Card */}
        <div className={`glass-panel p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-500 ${
          isNewRecord 
            ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] bg-amber-950/20" 
            : ""
        }`}>
          <div className="text-[10px] font-mono text-purple-300/80 flex items-center justify-between gap-1 w-full">
            <span className="flex items-center gap-1">
              <Flame className={`w-3.5 h-3.5 ${isNewRecord ? "text-amber-500 animate-bounce" : "text-amber-400 animate-pulse"}`} />
              VORTEX ENERGY
            </span>
            {isNewRecord && (
              <span className="text-[9px] font-mono font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded animate-pulse tracking-tighter">
                NEW RECORD!
              </span>
            )}
          </div>
          <div className={`text-3xl font-display font-medium tracking-tight mt-1 truncate transition-all duration-300 ${
            isNewRecord 
              ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse" 
              : "text-white"
          }`}>
            {stats.score.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-200 mt-1 font-mono truncate">
            {stats.mergesCount} consolidations
          </div>
          {/* subtle backing glow */}
          <div className={`absolute -right-6 -bottom-6 w-16 h-16 rounded-full blur-xl pointer-events-none transition-all duration-500 ${
            isNewRecord 
              ? "bg-amber-500/20" 
              : "bg-purple-600/10"
          }`} />
        </div>

        {/* High Score Card */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="text-[10px] font-mono text-purple-300/80 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            MAX RADIATION
          </div>
          <div className="text-3xl font-display font-medium text-yellow-300 tracking-tight mt-1 truncate">
            {stats.highScore.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-200 mt-1 font-mono truncate">
            Record Mass Level
          </div>
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Next Planet Dropper Block */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {/* Ambient grid lines behind preview */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:8px_8px]" />
            
            {/* The planet body sphere */}
            <div
              className="rounded-full shadow-lg relative transition-transform duration-500"
              style={{
                width: `${Math.max(22, Math.min(48, nextBody.radius * 0.9))}px`,
                height: `${Math.max(22, Math.min(48, nextBody.radius * 0.9))}px`,
                background: `radial-gradient(circle at 30% 30%, ${nextBody.gradientStart}, ${nextBody.gradientEnd})`,
                boxShadow: `0 0 15px ${nextBody.glowColor}, inset -2px -2px 6px rgba(0,0,0,0.4)`
              }}
            >
              {/* Draw tiny clouds or sparkle indicators for rich state */}
              {nextBody.clouds && (
                <div className="absolute inset-0 rounded-full opacity-35 bg-[radial-gradient(circle_at_70%_70%,#ffffff_10%,transparent_50%)]" />
              )}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono text-purple-300 tracking-wider block">NEXT SPHERE</span>
            <span className="font-display text-sm font-bold text-white block truncate max-w-[130px]">{nextBody.name}</span>
            <span className="text-[10px] font-mono text-purple-200 block">Level {nextBody.level}</span>
          </div>
        </div>

        <div className="p-1 px-2.5 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1 font-mono text-xs text-purple-200 shrink-0">
          Size
          <ChevronRight className="w-3 h-3 text-purple-400" />
          {nextBody.radius * 2}px
        </div>
      </div>

      {/* Control Actions Panel (Shake, Refresh, Help) */}
      <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-2xl border border-white/5">
        <div className="grid grid-cols-3 gap-2">
          {/* Gravity Shake */}
          <button
            onClick={onShake}
            disabled={!canShake}
            id="gravity-shake-btn"
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 ${
              canShake
                ? "bg-amber-950/20 border-amber-500/40 text-amber-300 hover:bg-amber-900/10 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/5 active:scale-95"
                : "bg-white/5 border-white/10 text-slate-500 cursor-not-allowed"
            }`}
            title="Perturb Gravity layout (Shake!)"
          >
            <Zap className={`w-4 h-4 mb-1 ${canShake ? "animate-pulse" : ""}`} />
            <span className="text-[9px] font-mono leading-none">
              {canShake ? "SHAKE" : `CD (${Math.ceil(shakeCooldown / 60)}s)`}
            </span>
          </button>

          {/* Restart Game */}
          <button
            onClick={onRestart}
            id="restart-game-btn"
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/5 text-purple-200 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 active:scale-95"
            title="Restart System Core"
          >
            <RefreshCw className="w-4 h-4 mb-1" />
            <span className="text-[9px] font-mono leading-none">RESET</span>
          </button>

          {/* How to Play Help */}
          <button
            onClick={onOpenHelp}
            id="open-how-to-play-btn"
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/5 text-purple-200 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 active:scale-95"
            title="Mission Instructions"
          >
            <HelpCircle className="w-4 h-4 mb-1" />
            <span className="text-[9px] font-mono leading-none">HELP</span>
          </button>
        </div>

        {/* Dynamic Volume Range Slider Row */}
        <div className="flex items-center justify-between gap-3 p-2 px-3 bg-white/5 rounded-xl border border-white/5">
          <button
            onClick={handleIconClick}
            className="text-purple-300 hover:text-white transition-colors duration-150 shrink-0 flex items-center justify-center p-1 hover:bg-white/5 rounded-lg"
            title="Click to Mute/Unmute Synthesizer"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-purple-300" />}
          </button>
          
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
              style={{
                background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${volume * 100}%, rgba(255, 255, 255, 0.1) ${volume * 100}%, rgba(255, 255, 255, 0.1) 100%)`
              }}
              title="Drag to Adjust Synthesizer Volume"
            />
          </div>

          <span className="text-[9px] font-mono text-purple-300/80 w-8 text-right shrink-0">
            {volume === 0 ? "MUTED" : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Stats Feedback Bar */}
      {stats.lastMergedName && (
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-2.5 px-3 flex items-center justify-between text-[11px] font-mono text-emerald-300 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            STABLE RE-SYNTHESIS:
          </span>
          <span className="font-bold">{stats.lastMergedName.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};
