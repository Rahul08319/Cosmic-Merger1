import React from "react";
import { HelpCircle, Star, Move, HeartCrack, Zap } from "lucide-react";

interface HelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlay: React.FC<HelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="how-to-play">
      <div className="glass-panel rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <h3 className="font-display text-2xl font-bold text-white text-center mb-6 flex items-center justify-center gap-2">
          <HelpCircle className="w-6 h-6 text-purple-400" />
          Mission Catalog
        </h3>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Controls */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Move className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h4 className="font-display text-[14px] font-bold text-purple-200">Target & Release</h4>
              <p className="text-xs text-purple-200/80 leading-relaxed mt-1">
                Drag your mouse/finger across the top launcher to slide. Let go or tap to drop the celestial body into gravity's clutches.
              </p>
            </div>
          </div>

          {/* Merge rule */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h4 className="font-display text-[14px] font-bold text-purple-200">Celestial Synthesis</h4>
              <p className="text-xs text-purple-200/80 leading-relaxed mt-1">
                Touch two identical bodies (e.g. two iron Moons) to fuse them into the next bigger, heavier state. Watch them grow!
              </p>
            </div>
          </div>

          {/* Danger rule */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <HeartCrack className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h4 className="font-display text-[14px] font-bold text-rose-300">Gravity Collapse</h4>
              <p className="text-xs text-purple-200/80 leading-relaxed mt-1">
                If the body collection stacks up above the dotted **Danger Line** near the top, the alert activates. Clear them within **4 seconds** or watch gravity implode, ending the match!
              </p>
            </div>
          </div>

          {/* Special action */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="font-display text-[14px] font-bold text-amber-300">Gravity Shaker</h4>
              <p className="text-xs text-purple-200/80 leading-relaxed mt-1">
                Feeling stuck? Tap the **Gravity Shake** button to perturb the gravity vector, helping compact elements settle deeper into the jar! Runs on a rechargeable cosmic cooldown.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          id="close-help-btn"
          className="mt-6 w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-display font-medium text-sm transition-all duration-200 hover:shadow-lg hover:shadow-purple-600/20"
        >
          Systems Engaged
        </button>
      </div>
    </div>
  );
};
