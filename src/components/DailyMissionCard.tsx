import React from "react";
import { Trophy, Calendar, CheckCircle, Clock } from "lucide-react";

interface DailyMission {
  id: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  description: string;
  isCompleted: boolean;
  scoreBonus: number;
  multiplier: number;
}

interface DailyMissionCardProps {
  mission: DailyMission | null;
}

export const DailyMissionCard: React.FC<DailyMissionCardProps> = ({ mission }) => {
  if (!mission) {
    return (
      <div className="glass-panel rounded-2xl p-5 flex flex-col items-center justify-center text-center animate-pulse border border-white/5 bg-white/5">
        <Clock className="w-8 h-8 text-purple-400 mb-2 animate-spin-slow" />
        <span className="text-xs font-mono text-purple-300">Synchronizing solar cycles...</span>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round((mission.currentValue / mission.targetValue) * 100));

  // Determine time remaining before next reset (local midnight)
  const getHoursUntilReset = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // local 12:00 AM tomorrow
    const diffMs = midnight.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m remaining`;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col relative overflow-hidden select-none" id="daily-mission-panel">
      {/* Absolute faint glow inside mission card */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
        mission.isCompleted ? "bg-emerald-500/10" : "bg-purple-500/5"
      }`} />

      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <h3 className="font-display text-sm font-bold text-purple-200 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-purple-400" />
          DAILY QUANTUM MISSION
        </h3>
        
        <span className="text-[9px] font-mono text-purple-300/80 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3 text-purple-400" />
          {getHoursUntilReset()}
        </span>
      </div>

      {/* Description */}
      <div className="p-3 bg-black/30 rounded-xl border border-white/5 flex gap-3 items-start relative z-10">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 ${
          mission.isCompleted 
            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
            : "bg-white/5 border-white/10 text-purple-300"
        }`}>
          {mission.isCompleted ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <Trophy className="w-4 h-4 text-purple-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-xs font-bold text-white leading-tight">
            {mission.description}
          </h4>
          <p className="text-[10px] font-mono text-purple-300 mt-1 flex items-center gap-1">
            <span>Progress:</span>
            <span className={mission.isCompleted ? "text-emerald-400 font-bold" : "text-purple-200"}>
              {mission.currentValue} / {mission.targetValue}
            </span>
            <span>({progressPercent}%)</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 relative z-10">
        <div className="w-full h-2 bg-black/40 rounded-full border border-white/5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              mission.isCompleted 
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-purple-500 to-indigo-400"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Reward HUD Strip */}
      <div className="mt-3.5 flex items-center justify-between text-[10px] font-mono relative z-10 pt-3.5 border-t border-white/5">
        <span className="text-purple-300/70">REWARD MULTIPLIER:</span>
        <span className={`font-bold tracking-wider px-2 py-0.5 rounded ${
          mission.isCompleted 
            ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/20"
            : "bg-purple-950/40 text-purple-300 border border-purple-500/10"
        }`}>
          +{mission.scoreBonus} pts & {mission.multiplier}x Multiplier {mission.isCompleted ? " [ACTIVE]" : ""}
        </span>
      </div>
    </div>
  );
};
