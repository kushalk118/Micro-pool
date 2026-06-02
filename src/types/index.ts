export interface Vector2D {
  x: number;
  y: number;
}

export type BallType = 'cue' | 'solid' | 'stripe' | 'black';

export interface Ball {
  id: number;
  number: number;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  type: BallType;
  isPocketed: boolean;
  opacity: number;
  scale: number;
  spin?: Vector2D; // Future-proofing for spin/english effects
}

export interface Pocket {
  id: number;
  position: Vector2D;
  radius: number;
}

export type GameMode = 'solo' | 'ai' | 'passPlay';

export interface GameState {
  mode: GameMode;
  currentPlayer: 1 | 2;
  scorePlayer1: number;
  scorePlayer2: number;
  shotsTaken: number;
  fouls: number;
  winner: 1 | 2 | null;
  isAiming: boolean;
  isMoving: boolean;
  pocketedThisTurn: number[];
  firstBallHitThisTurn: number | null;
  statusMessage: string;
}

export interface TableStyle {
  feltColor: string;
  borderColor: string;
  cushionColor: string;
  pocketColor: string;
}
