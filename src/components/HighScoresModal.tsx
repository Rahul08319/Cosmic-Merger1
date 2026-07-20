import React, { useState, useEffect } from "react";
import { Trophy, Award, Calendar, Trash2, X, Sparkles, Globe, Shield, Zap, Activity } from "lucide-react";

interface HighScoreEntry {
  id: string;
  score: number;
  merges: number;
  date: string;
}

interface HighScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HighScoresModal: React.FC<HighScoresModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"scores" | "milestones">("scores");
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [unlockedMilestoneIds, setUnlockedMilestoneIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    try {
      const scoresStored = localStorage.getItem("cosmic_high_scores_list");
      if (scoresStored) {
        setHighScores(JSON.parse(scoresStored));
      } else {
        // Fallback or back compatibility if they have a legacy top high score
        const legacyHighScoreStored = localStorage.getItem("cosmic_merger_highscore");
        if (legacyHighScoreStored) {
          const scoreVal = parseInt(legacyHighScoreStored, 10);
          if (scoreVal > 0) {
            const legacyEntry: HighScoreEntry = {
              id: "legacy",
              score: scoreVal,
              merges: 0,
              date: new Date().toISOString(),
            };
            setHighScores([legacyEntry]);
            localStorage.setItem("cosmic_high_scores_list", JSON.stringify([legacyEntry]));
          }
        }
      }

      const milestonesStored = localStorage.getItem("cosmic_unlocked_milestones");
      if (milestonesStored) {
        setUnlockedMilestoneIds(JSON.parse(milestonesStored));
      }
    } catch (e) {
      console.warn("Could not load high scores data", e);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your high scores and reset all celestial history?")) {
      try {
        localStorage.removeItem("cosmic_high_scores_list");
        localStorage.removeItem("cosmic_merger_highscore");
        localStorage.removeItem("cosmic_unlocked_milestones");
        setHighScores([]);
        setUnlockedMilestoneIds([]);
        alert("Telemetry logs and high scores cleared successfully.");
      } catch (e) {
        console.warn("Could not clear high scores", e);
      }
    }
  };

  if (!isOpen) return null;

  // List of all system milestones for Tab 2
  const milestones = [
    {
      id: "first_merge",
      title: "Stellar Nucleosynthesis",
      description: "Initiate your very first fusion reaction in the core.",
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    },
    {
      id: "score_500",
      title: "Nebula Navigator",
      description: "Generate 500 Vortex Energy units.",
      icon: <Zap className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: "merges_25",
      title: "Gravity Tamer",
      description: "Successfully complete 25 consolidations.",
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: "merges_100",
      title: "Cosmic Consolidator",
      description: "Reach 100 consolidations across space-time.",
      icon: <Award className="w-5 h-5 text-violet-400" />,
    },
    {
      id: "level_5",
      title: "Gas Giant Synthesizer",
      description: "Sustain a massive level 5 gas giant.",
      icon: <Globe className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: "level_9",
      title: "Event Horizon",
      description: "Accrete a level 9 super-massive Black Hole.",
      icon: <Activity className="w-5 h-5 text-pink-400" />,
    },
    {
      id: "score_10000",
      title: "Vortex Overlord",
      description: "Accumulate a staggering 10,000 Vortex Energy units.",
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
    }
  ];

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown Date";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="high-scores-modal">
      <div className="glass-panel rounded-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-200 shadow-2xl border border-white/10 flex flex-col max-h-[85vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title Header */}
        <h3 className="font-display text-2xl font-black text-white text-center mb-4 flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          SYSTEM TELEMETRY
        </h3>

        {/* Custom Tabs */}
        <div className="flex bg-black/40 rounded-xl p-1 mb-5 border border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab("scores")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "scores"
                ? "bg-purple-600/30 text-white border border-purple-500/30 shadow-md shadow-purple-600/10"
                : "text-purple-300 hover:text-white"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            TOP SCORES
          </button>
          <button
            onClick={() => setActiveTab("milestones")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "milestones"
                ? "bg-purple-600/30 text-white border border-purple-500/30 shadow-md shadow-purple-600/10"
                : "text-purple-300 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            ACHIEVEMENTS ({unlockedMilestoneIds.length}/{milestones.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-[250px]">
          {activeTab === "scores" ? (
            highScores.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="text-sm text-purple-300/60 font-mono">No simulation logs saved yet.</p>
                <p className="text-xs text-purple-300/40 mt-1 font-mono">Consolidate stars to register high scores!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {highScores.map((entry, index) => {
                  const isTopRank = index === 0;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                        isTopRank
                          ? "bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5 text-amber-200"
                          : "bg-white/5 border-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                          isTopRank 
                            ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" 
                            : "bg-white/5 text-purple-300 border border-white/10"
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <div className={`text-sm font-bold font-display ${isTopRank ? "text-amber-200" : "text-white"}`}>
                            {entry.score.toLocaleString()} <span className="text-[10px] font-mono font-normal text-purple-400">PTS</span>
                          </div>
                          <div className="text-[10px] text-purple-300/60 font-mono mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 opacity-70" />
                            {formatDateTime(entry.date)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-purple-200">{entry.merges}</div>
                        <div className="text-[9px] text-purple-300/50 font-mono">FUSIONS</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const isUnlocked = unlockedMilestoneIds.includes(milestone.id);
                return (
                  <div
                    key={milestone.id}
                    className={`flex gap-3.5 items-center p-3.5 rounded-xl border transition-all duration-300 ${
                      isUnlocked
                        ? "bg-purple-950/20 border-purple-500/30 text-purple-100"
                        : "bg-black/30 border-white/5 opacity-50 text-slate-500"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? "bg-purple-600/20 border-purple-500/30 shadow-md shadow-purple-500/10"
                        : "bg-white/5 border-white/5"
                    }`}>
                      {isUnlocked ? milestone.icon : <X className="w-5 h-5 text-slate-600" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm font-bold font-display leading-tight ${isUnlocked ? "text-purple-200" : "text-slate-400"}`}>
                          {milestone.title}
                        </h4>
                        {isUnlocked && (
                          <span className="text-[8px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                            UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-300/70 leading-relaxed mt-1 line-clamp-2">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action controls footer */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3 shrink-0">
          {(activeTab === "scores" && highScores.length > 0) || (activeTab === "milestones" && unlockedMilestoneIds.length > 0) ? (
            <button
              onClick={handleClearHistory}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-950/20 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-900/10 text-rose-300 text-xs font-mono rounded-xl transition-all duration-200 active:scale-95"
              id="clear-logs-btn"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              CLEAR LOGS
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-display font-medium text-xs transition-all duration-200 hover:shadow-lg hover:shadow-purple-600/20 text-center"
            id="close-scores-btn"
          >
            Acknowledge
          </button>
        </div>

      </div>
    </div>
  );
};
