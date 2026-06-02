import React from 'react';
import type { GameMode, TableStyle } from '../types';
import { Play, RotateCcw, Palette, HelpCircle } from 'lucide-react';

interface GameSettingsProps {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  tableStyle: TableStyle;
  setTableStyle: (style: TableStyle) => void;
  onRestart: () => void;
  winner: number | null;
}

const FELT_OPTIONS = [
  { name: 'Emerald', felt: '#0e6f40', border: '#7c4818', cushion: '#0a4f2e', text: 'Classic Green' },
  { name: 'Sapphire', felt: '#1b3d6c', border: '#12253f', cushion: '#143056', text: 'Championship Blue' },
  { name: 'Obsidian', felt: '#1e1e24', border: '#33333b', cushion: '#17171c', text: 'Midnight Slate' },
  { name: 'Ruby', felt: '#8c1c24', border: '#4a0b0f', cushion: '#6a141a', text: 'Royal Burgundy' }
];

export const GameSettings: React.FC<GameSettingsProps> = ({
  mode,
  setMode,
  tableStyle,
  setTableStyle,
  onRestart,
  winner
}) => {
  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-6 w-full max-w-sm">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 text-glow-teal text-white">
          <Play size={20} className="text-cyan-400" /> Game Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">Configure your game mode and table style.</p>
      </div>

      {/* Game Mode Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-300">Choose Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {(['solo', 'ai', 'passPlay'] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                mode === m
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {m === 'passPlay' ? '2 Player' : m === 'ai' ? 'VS AI' : 'Practice'}
            </button>
          ))}
        </div>
      </div>

      {/* Felt Customization */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-300 flex items-center gap-1">
          <Palette size={16} className="text-amber-500" /> Custom Felt
        </label>
        <div className="grid grid-cols-4 gap-2">
          {FELT_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              onClick={() =>
                setTableStyle({
                  feltColor: opt.felt,
                  borderColor: opt.border,
                  cushionColor: opt.cushion,
                  pocketColor: '#070a10'
                })
              }
              title={opt.text}
              className={`w-full aspect-square rounded-lg border-2 transition-all relative ${
                tableStyle.feltColor === opt.felt
                  ? 'border-amber-400 scale-105 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'border-transparent hover:scale-102'
              }`}
              style={{ backgroundColor: opt.felt }}
            >
              <span className="sr-only">{opt.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Control Actions */}
      <button
        onClick={onRestart}
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-98"
      >
        <RotateCcw size={18} /> {winner ? 'Play Again' : 'Restart Match'}
      </button>

      {/* Instructions */}
      <div className="border-t border-slate-800 pt-4 mt-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
          <HelpCircle size={14} /> Quick Guide
        </h3>
        <ul className="text-[11px] text-slate-400 flex flex-col gap-1.5 list-disc pl-4">
          <li><strong>Aim & Shoot:</strong> Drag mouse back from the <span className="text-white font-medium">White Cue Ball</span> to aim, release to shoot.</li>
          <li><strong>Solo Mode:</strong> Pot all balls in as few shots as possible.</li>
          <li><strong>VS AI / 2 Player:</strong> Pot your assigned group (Solids vs. Stripes) first, then legally pocket the <span className="text-amber-500 font-medium">8-Ball</span> to win.</li>
          <li><strong>Foul (Scratch):</strong> Scratching the Cue ball or hitting the wrong group first gives your opponent a ball-in-hand placement!</li>
        </ul>
      </div>
    </div>
  );
};
