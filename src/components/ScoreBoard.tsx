import React from 'react';
import type { GameState, Ball } from '../types';
import { Award, Target } from 'lucide-react';

interface ScoreBoardProps {
  gameState: GameState;
  balls: Ball[];
  player1Target: 'solid' | 'stripe' | null;
  player2Target: 'solid' | 'stripe' | null;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  gameState,
  balls,
  player1Target,
  player2Target
}) => {
  const { mode, currentPlayer, scorePlayer1, scorePlayer2, shotsTaken, fouls, statusMessage, winner } = gameState;

  // Filter pocketed and active object balls (excluding cue ball id = 0)
  const pocketedBalls = balls.filter(b => b.isPocketed && b.id !== 0).sort((a, b) => a.number - b.number);
  const remainingSolids = balls.filter(b => !b.isPocketed && b.type === 'solid').length;
  const remainingStripes = balls.filter(b => !b.isPocketed && b.type === 'stripe').length;
  const isEightBallActive = balls.some(b => b.id === 8 && !b.isPocketed);

  const getTargetBadge = (target: 'solid' | 'stripe' | null, remaining: number) => {
    if (target === 'solid') {
      return (
        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
          SOLIDS ({remaining} left)
        </span>
      );
    }
    if (target === 'stripe') {
      return (
        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
          STRIPES ({remaining} left)
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-slate-700/40 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full font-bold">
        OPEN TABLE
      </span>
    );
  };

  const getTargetLabel = (player: 1 | 2) => {
    const target = player === 1 ? player1Target : player2Target;
    const remaining = target === 'solid' ? remainingSolids : remainingStripes;
    if (target && remaining === 0 && isEightBallActive) {
      return (
        <span className="text-[10px] bg-purple-500/25 text-purple-300 border border-purple-500/45 px-2 py-0.5 rounded-full font-bold animate-pulse">
          🎯 TARGET: 8-BALL
        </span>
      );
    }
    return getTargetBadge(target, remaining);
  };

  return (
    <div className="glass p-5 rounded-2xl flex flex-col gap-4 w-full">
      {/* Player Header Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 Card */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-300 ${
            currentPlayer === 1 && !winner && mode !== 'solo'
              ? 'bg-slate-800/80 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-slate-900/45 border-transparent'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold text-white">Player 1</span>
            {currentPlayer === 1 && !winner && mode !== 'solo' && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400">
            {mode === 'solo' ? shotsTaken : scorePlayer1}
            <span className="text-[10px] text-slate-500 font-normal ml-1">
              {mode === 'solo' ? 'shots' : 'pts'}
            </span>
          </div>
          {mode !== 'solo' && <div className="mt-1">{getTargetLabel(1)}</div>}
          {mode === 'solo' && (
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              TARGET: Clear all {balls.filter(b => b.id !== 0).length} balls
            </div>
          )}
        </div>

        {/* Player 2 Card */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-300 ${
            mode === 'solo' ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            currentPlayer === 2 && !winner
              ? 'bg-slate-800/80 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-slate-900/45 border-transparent'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold text-white">
              {mode === 'ai' ? 'Opponent (AI)' : 'Player 2'}
            </span>
            {currentPlayer === 2 && !winner && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400">
            {mode === 'solo' ? fouls : scorePlayer2}
            <span className="text-[10px] text-slate-500 font-normal ml-1">
              {mode === 'solo' ? 'fouls' : 'pts'}
            </span>
          </div>
          {mode !== 'solo' && <div className="mt-1">{getTargetLabel(2)}</div>}
          {mode === 'solo' && (
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              Practice Board
            </div>
          )}
        </div>
      </div>

      {/* Ticker Status Alerts */}
      <div className="bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center min-h-[42px] relative overflow-hidden">
        <div className={`w-1.5 h-full absolute left-0 top-0 ${
          statusMessage.toLowerCase().includes('foul') || statusMessage.toLowerCase().includes('scratch')
            ? 'bg-red-500'
            : statusMessage.toLowerCase().includes('win')
            ? 'bg-purple-500'
            : 'bg-cyan-500'
        }`} />
        <p className="text-xs font-semibold text-slate-200 tracking-wide pl-1">
          {statusMessage || 'Shoot when ready.'}
        </p>
      </div>

      {/* Global Metadata */}
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-400 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-slate-500" />
          <span>Fouls Committed: <strong className="text-slate-200">{fouls}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <Award size={14} className="text-slate-500" />
          <span>Total Shots: <strong className="text-slate-200">{shotsTaken}</strong></span>
        </div>
      </div>

      {/* Pocketed Balls Tray */}
      {pocketedBalls.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Pocketed Ball Tray
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 min-h-[26px]">
            {pocketedBalls.map((ball) => (
              <div
                key={ball.id}
                title={`Ball ${ball.number}`}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-slate-950 border border-black/40 shadow-inner flex-shrink-0 cursor-default"
                style={{
                  backgroundColor: ball.color,
                  color: ball.id === 8 ? '#ffffff' : '#0f172a'
                }}
              >
                {ball.number}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
