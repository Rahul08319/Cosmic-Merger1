import React from "react";
import { Settings, Sparkles, Flame, Snowflake, X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  particleAesthetic: string;
  onParticleAestheticChange: (aesthetic: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  particleAesthetic,
  onParticleAestheticChange,
}) => {
  if (!isOpen) return null;

  const aesthetics = [
    {
      id: "nebula_dust",
      name: "Nebula Dust",
      description: "Soft colorful gas clouds matching the elements' original atmospheric color profiles.",
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      colorClass: "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-400",
      activeClass: "border-purple-500 bg-purple-500/20 text-white shadow-lg shadow-purple-500/10",
      pillBg: "bg-purple-500/20 text-purple-300",
    },
    {
      id: "neon_fire",
      name: "Neon Fire",
      description: "Blazing thermochemical neon streams that erupt with intense orange, magenta and flame embers.",
      icon: <Flame className="w-5 h-5 text-rose-500" />,
      colorClass: "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-400",
      activeClass: "border-rose-500 bg-rose-500/20 text-white shadow-lg shadow-rose-500/10",
      pillBg: "bg-rose-500/20 text-rose-300",
    },
    {
      id: "sparkling_crystals",
      name: "Sparkling Crystals",
      description: "Chilled sub-zero geometric diamond crystals that shimmer and spin in cyan, white and teal.",
      icon: <Snowflake className="w-5 h-5 text-cyan-400" />,
      colorClass: "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400",
      activeClass: "border-cyan-500 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/10",
      pillBg: "bg-cyan-500/20 text-cyan-300",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4" id="cosmic-settings-modal">
      <div className="glass-panel rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200 border border-white/10 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors"
          title="Close Settings"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-2xl font-bold text-white text-center mb-6 flex items-center justify-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
          Quantum Settings
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-mono font-bold tracking-wider text-purple-400 uppercase block mb-3">
              Fusion Particle Trail Aesthetic
            </label>
            
            <div className="flex flex-col gap-3.5">
              {aesthetics.map((aes) => {
                const isActive = particleAesthetic === aes.id;
                return (
                  <button
                    key={aes.id}
                    onClick={() => {
                      onParticleAestheticChange(aes.id);
                    }}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
                      isActive ? aes.activeClass : `text-slate-300 ${aes.colorClass}`
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                      {aes.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-white">{aes.name}</span>
                        {isActive && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${aes.pillBg}`}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-200/70 leading-relaxed mt-1">
                        {aes.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col gap-2 text-[10px] font-mono text-purple-400/60 leading-relaxed text-center">
            <span>COSMIC REVERB SYNTHESIS LEVEL: ACTIVE</span>
            <span>AUTOSAVE PROTOCOL: ENGAGED</span>
          </div>
        </div>

        <button
          onClick={onClose}
          id="close-settings-btn"
          className="mt-6 w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-display font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-purple-600/20"
        >
          Confirm Alignments
        </button>
      </div>
    </div>
  );
};
