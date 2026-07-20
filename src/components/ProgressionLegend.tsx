import React from "react";
import { CelestialType } from "../types";
import { getCelestialConfig } from "../constants";
import { Sparkles, Info } from "lucide-react";

interface LegendProps {
  highestLevelMerged: number;
  highlightedLevel: number;
  onSelectLevel: (level: number) => void;
}

export const ProgressionLegend: React.FC<LegendProps> = ({
  highestLevelMerged,
  highlightedLevel,
  onSelectLevel,
}) => {
  const selectedPlanet = getCelestialConfig(highlightedLevel);
  const totalDisplayLevels = Math.max(10, highestLevelMerged);
  const displayPlanets = Array.from({ length: totalDisplayLevels + 1 }, (_, i) => getCelestialConfig(i));

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full select-none" id="progression-legend">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-purple-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          Celestial Cycle
        </h3>
        <span className="text-[10px] font-mono text-purple-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          {displayPlanets.length} Orders
        </span>
      </div>

      {/* Cyclic Line */}
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11 sm:gap-1.5 mb-5 p-2 bg-black/40 rounded-xl border border-white/5 max-h-[140px] overflow-y-auto custom-scrollbar">
        {displayPlanets.map((planet) => {
          const isMergedYet = planet.level <= highestLevelMerged;
          const isSelected = planet.level === highlightedLevel;

          return (
            <button
              key={planet.level}
              id={`planet-btn-${planet.level}`}
              onClick={() => onSelectLevel(planet.level)}
              className={`relative flex items-center justify-center aspect-square rounded-full transition-all duration-300 ${
                isSelected
                  ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 scale-110 z-10"
                  : "hover:scale-105"
              } ${isMergedYet ? "opacity-100" : "opacity-40 filter grayscale"}`}
              style={{
                background: `radial-gradient(circle at 35% 35%, ${planet.gradientStart}, ${planet.gradientEnd})`,
                boxShadow: isSelected ? `0 0 16px ${planet.glowColor}` : 'none'
              }}
              title={planet.name}
            >
              <span className="text-[10px] font-mono font-bold text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">
                {planet.level}
              </span>
              
              {/* Active orbit marker for selected */}
              {isSelected && (
                <span className="absolute -inset-1 rounded-full border border-purple-300/40 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Planet Inspect Panel */}
      <div className="flex-1 flex flex-col justify-between bg-white/5 p-4 rounded-xl border border-white/10">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-display text-base font-bold text-white flex items-center gap-1.5">
                {selectedPlanet.name}
                {selectedPlanet.level <= highestLevelMerged ? (
                  <span className="text-[10px] bg-emerald-950/65 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-950/65 text-slate-400 px-2 py-0.5 rounded border border-slate-800/45 font-mono">
                    Undiscovered
                  </span>
                )}
              </h4>
              <p className="text-[11px] font-mono text-purple-300 mt-0.5">
                Mass: {selectedPlanet.mass.toFixed(1)} EM • Radius: {selectedPlanet.radius} km
              </p>
            </div>
            
            {/* Visual Indicator of Size Profile */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center relative shadow-inner overflow-hidden border border-white/10 shrink-0"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${selectedPlanet.gradientStart}, ${selectedPlanet.gradientEnd})`,
                boxShadow: `0 0 20px ${selectedPlanet.glowColor}`
              }}
            >
              {/* Draw rings visual in the inspect element */}
              {selectedPlanet.hasRings && (
                <div 
                  className="absolute w-[180%] h-[30%] border-[2px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none"
                  style={{ borderColor: selectedPlanet.ringColor || "rgba(255,255,255,0.4)" }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-purple-200 mt-3 italic leading-relaxed">
            "{selectedPlanet.description}"
          </p>
        </div>

        {/* Tip section */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2 text-[11px] text-purple-300">
          <Info className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          <p>
            Merge two identical items (level {selectedPlanet.level}) to create a level {selectedPlanet.level + 1} body.
            {selectedPlanet.level >= 10 && " Combining two high-level singulates creates a cataclysmic shockwave clearing the jar!"}
          </p>
        </div>
      </div>
    </div>
  );
};
