import { useState } from 'react';
import type { Ball, GameState, GameMode, TableStyle } from './types';
import { GameCanvas } from './components/GameCanvas';
import { ScoreBoard } from './components/ScoreBoard';
import { GameSettings } from './components/GameSettings';
import { Trophy, Award, Gamepad2, Volume2, VolumeX } from 'lucide-react';
import './styles/global.css';
import './styles/App.css';

// Constants
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const BALL_RADIUS = 10;

// Color Definitions
const COLORS = {
  cue: '#fdfbf7',
  black: '#111111',
  solids: [
    '#eab308', // 1: Yellow
    '#2563eb', // 2: Blue
    '#dc2626', // 3: Red
    '#7c3aed', // 4: Purple
    '#ea580c', // 5: Orange
    '#16a34a', // 6: Green
    '#881337', // 7: Burgundy
  ],
  stripes: [
    '#eab308', // 9: Yellow
    '#2563eb', // 10: Blue
    '#dc2626', // 11: Red
    '#7c3aed', // 12: Purple
    '#ea580c', // 13: Orange
    '#16a34a', // 14: Green
    '#881337', // 15: Burgundy
  ]
};

// Rack placement configuration
const RACK_NUMBERS = [
  1,        // Row 1 (Apex)
  9, 2,     // Row 2
  3, 8, 10, // Row 3 (8-Ball in center)
  11, 4, 12, 5, // Row 4
  6, 13, 7, 14, 15 // Row 5 (Corner solid, other corner stripe)
];

const initialGameState = (mode: GameMode = 'solo'): GameState => ({
  mode,
  currentPlayer: 1,
  scorePlayer1: 0,
  scorePlayer2: 0,
  shotsTaken: 0,
  fouls: 0,
  winner: null,
  isAiming: false,
  isMoving: false,
  pocketedThisTurn: [],
  firstBallHitThisTurn: null,
  statusMessage: mode === 'solo'
    ? 'Practice mode. Clear all balls.'
    : 'Match started. Open table: hit any ball.'
});

const defaultTableStyle: TableStyle = {
  feltColor: '#0e6f40',
  borderColor: '#7c4818',
  cushionColor: '#0a4f2e',
  pocketColor: '#070a10'
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState('solo'));
  const [tableStyle, setTableStyle] = useState<TableStyle>(defaultTableStyle);
  const [player1Target, setPlayer1Target] = useState<'solid' | 'stripe' | null>(null);
  const [player2Target, setPlayer2Target] = useState<'solid' | 'stripe' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [resetCounter, setResetCounter] = useState(0);

  // Initialize the ball layout (Rack setup)
  const initializeBalls = (): Ball[] => {
    const ballsArray: Ball[] = [];

    // 1. Add Cue Ball
    ballsArray.push({
      id: 0,
      number: 0,
      position: { x: TABLE_WIDTH / 4, y: TABLE_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      radius: BALL_RADIUS,
      color: COLORS.cue,
      type: 'cue',
      isPocketed: false,
      opacity: 1,
      scale: 1
    });

    // Rack geometry calculations
    const apexX = (TABLE_WIDTH * 3) / 4 - 30; // Apex offset
    const apexY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2;
    const dx = spacing * 0.866; // cos(30 deg) horizontal compression

    let numberIdx = 0;

    // Outer rows iteration to construct triangle
    for (let col = 0; col < 5; col++) {
      const colX = apexX + col * dx;
      const startY = apexY - (col * spacing) / 2;

      for (let row = 0; row <= col; row++) {
        const ballY = startY + row * spacing;
        const number = RACK_NUMBERS[numberIdx++];
        
        let color = COLORS.black;
        let type: 'solid' | 'stripe' | 'black' = 'solid';

        if (number === 8) {
          type = 'black';
          color = COLORS.black;
        } else if (number < 8) {
          type = 'solid';
          color = COLORS.solids[number - 1];
        } else {
          type = 'stripe';
          color = COLORS.stripes[number - 9];
        }

        ballsArray.push({
          id: number,
          number,
          position: { x: colX, y: ballY },
          velocity: { x: 0, y: 0 },
          radius: BALL_RADIUS,
          color,
          type,
          isPocketed: false,
          opacity: 1,
          scale: 1
        });
      }
    }

    return ballsArray;
  };

  const [balls, setBalls] = useState<Ball[]>(initializeBalls());

  const handleRestart = (newMode?: GameMode) => {
    const selectedMode = newMode || gameState.mode;
    setGameState(initialGameState(selectedMode));
    setPlayer1Target(null);
    setPlayer2Target(null);
    setBalls(initializeBalls());
     setResetCounter(prev => prev + 1);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    // Silent mode acts as blocker inside AudioContext
    (window as any).soundMuted = soundEnabled;
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4 md:px-8 relative overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      
      {/* Dynamic glow decoration background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-amber-900/10 blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)]">
            <Gamepad2 className="text-slate-950" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
              MICRO <span className="text-cyan-400 font-medium">POOL</span>
            </h1>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              High-Fidelity 2D Simulator
            </span>
          </div>
        </div>

        {/* Audio Mute button */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start z-10">
        
        {/* Playfield Area */}
        <div className="flex flex-col gap-6">
          <ScoreBoard
            gameState={gameState}
            balls={balls}
            player1Target={player1Target}
            player2Target={player2Target}
          />
          <GameCanvas
            key={resetCounter}
            gameState={gameState}
            setGameState={setGameState}
            balls={balls}
            setBalls={setBalls}
            tableStyle={tableStyle}
            player1Target={player1Target}
            setPlayer1Target={setPlayer1Target}
            player2Target={player2Target}
            setPlayer2Target={setPlayer2Target}
          />
        </div>

        {/* Configuration Sidebar */}
        <GameSettings
          mode={gameState.mode}
          setMode={(m) => handleRestart(m)}
          tableStyle={tableStyle}
          setTableStyle={setTableStyle}
          onRestart={() => handleRestart()}
          winner={gameState.winner}
        />
      </main>

      {/* Win Overlays Modal */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass p-8 rounded-3xl border border-cyan-500/30 max-w-sm w-full text-center flex flex-col items-center gap-5 shadow-[0_0_50px_rgba(6,182,212,0.25)]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <Trophy size={36} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Winner Declared!</h2>
              <p className="text-sm text-slate-400 mt-1.5 px-2 leading-relaxed">
                {gameState.winner === 1 ? 'Player 1' : gameState.mode === 'ai' ? 'Opponent (AI)' : 'Player 2'} has cleared the table and claimed victory!
              </p>
            </div>

            {/* Performance Stats */}
            <div className="w-full bg-slate-950/50 border border-slate-900 rounded-xl p-3.5 flex justify-around text-xs font-semibold text-slate-400">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Shots Taken</span>
                <strong className="text-white text-base font-mono">{gameState.shotsTaken}</strong>
              </div>
              <div className="w-px bg-slate-900" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Fouls</span>
                <strong className="text-white text-base font-mono">{gameState.fouls}</strong>
              </div>
            </div>

            <button
              onClick={() => handleRestart()}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <Award size={18} /> Restart Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
