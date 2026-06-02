import React, { useRef, useEffect, useState } from 'react';
import type { Ball, Pocket, GameState, Vector2D, TableStyle } from '../types';
import { updatePhysics, vecDist, vecSub, vecNormalize, vecLength, vecAdd, vecMult, vecDot } from '../utils/physics';
import { playHitSound, playCushionSound, playPocketSound, playScratchSound } from '../utils/audio';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  balls: Ball[];
  setBalls: React.Dispatch<React.SetStateAction<Ball[]>>;
  tableStyle: TableStyle;
  player1Target: 'solid' | 'stripe' | null;
  setPlayer1Target: (target: 'solid' | 'stripe' | null) => void;
  player2Target: 'solid' | 'stripe' | null;
  setPlayer2Target: (target: 'solid' | 'stripe' | null) => void;
}

// Dimensions
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const CUSHION_WIDTH = 24;
const BALL_RADIUS = 10;
const POCKET_RADIUS = 16;

const INITIAL_POCKETS: Pocket[] = [
  { id: 1, position: { x: CUSHION_WIDTH, y: CUSHION_WIDTH }, radius: POCKET_RADIUS },
  { id: 2, position: { x: TABLE_WIDTH / 2, y: CUSHION_WIDTH - 4 }, radius: POCKET_RADIUS - 1 },
  { id: 3, position: { x: TABLE_WIDTH - CUSHION_WIDTH, y: CUSHION_WIDTH }, radius: POCKET_RADIUS },
  { id: 4, position: { x: CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH }, radius: POCKET_RADIUS },
  { id: 5, position: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - CUSHION_WIDTH + 4 }, radius: POCKET_RADIUS - 1 },
  { id: 6, position: { x: TABLE_WIDTH - CUSHION_WIDTH, y: TABLE_HEIGHT - CUSHION_WIDTH }, radius: POCKET_RADIUS },
];

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  balls,
  setBalls,
  tableStyle,
  player1Target,
  setPlayer1Target,
  player2Target,
  setPlayer2Target
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interaction local state
  const [dragStart, setDragStart] = useState<Vector2D | null>(null);
  const [currentMouse, setCurrentMouse] = useState<Vector2D | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ballInHand, setBallInHand] = useState(true); // Start with cue ball in hand on first shot
  const [bihOverlap, setBihOverlap] = useState(false);
  
  // AI execution flags
  const [aiThinking, setAiThinking] = useState(false);
  const [aiCueAnim, setAiCueAnim] = useState<{ angle: number; power: number; currentPower: number } | null>(null);

  // References for game loop triggers
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const ballsRef = useRef(balls);
  ballsRef.current = balls;

  // Active target group for current player
  const getActiveTargetGroup = (): 'solid' | 'stripe' | 'all' | 'eight' => {
    if (stateRef.current.mode === 'solo') return 'all';
    
    const target = stateRef.current.currentPlayer === 1 ? player1Target : player2Target;
    if (!target) return 'all'; // table is open
    
    // Check if player has cleared their group
    const remainingCount = ballsRef.current.filter(
      b => !b.isPocketed && b.type === target
    ).length;

    if (remainingCount === 0) return 'eight';
    return target;
  };

  // 1. Initial Render & Animation Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Run Physics Update
      const prevMoving = stateRef.current.isMoving;
      
      // Update sinking/pocket animations locally
      let ballsUpdated = false;
      const nextBalls = ballsRef.current.map(ball => {
        if (ball.isPocketed && ball.opacity > 0) {
          ballsUpdated = true;
          return {
            ...ball,
            scale: Math.max(0, ball.scale - 0.08),
            opacity: Math.max(0, ball.opacity - 0.08)
          };
        }
        return ball;
      });

      if (ballsUpdated) {
        setBalls(nextBalls);
      }

      // Physics logic
      const isMoving = updatePhysics(
        ballsRef.current,
        TABLE_WIDTH,
        TABLE_HEIGHT,
        CUSHION_WIDTH,
        INITIAL_POCKETS,
        (vel) => playHitSound(vel),
        (vel) => playCushionSound(vel),
        (sunkBall) => handleBallPocketed(sunkBall)
      );

      // Handle transition from moving to stopped (End of Turn evaluation)
      if (prevMoving && !isMoving) {
        evaluateTurnEnd();
      }

      if (isMoving !== prevMoving) {
        setGameState(prev => ({ ...prev, isMoving }));
      }

      // DRAW TABLE
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      drawTable(ctx);
      drawPockets(ctx);
      drawLinesAndDecals(ctx);
      drawBalls(ctx);
      
      // Draw Aiming Guide Line & Cue Stick
      if (!isMoving && !ballInHand && !stateRef.current.winner) {
        if (stateRef.current.mode === 'ai' && stateRef.current.currentPlayer === 2) {
          // Draw AI Aiming if active
          if (aiCueAnim) {
            drawAimGuideAndCue(ctx, aiCueAnim.angle, aiCueAnim.currentPower);
          }
        } else if (isDragging && dragStart && currentMouse) {
          // Draw Player Aiming
          const cueBall = ballsRef.current.find(b => b.id === 0);
          if (cueBall && !cueBall.isPocketed) {
            const dragVec = vecSub(currentMouse, dragStart);
            const dist = vecLength(dragVec);
            const angle = Math.atan2(dragVec.y, dragVec.x);
            // Cap visual power representation
            const power = Math.min(dist / 1.5, 100);
            drawAimGuideAndCue(ctx, angle, power);
          }
        }
      }

      // Draw Ball in Hand Overlay
      if (ballInHand && !isMoving && !stateRef.current.winner) {
        const cueBall = ballsRef.current.find(b => b.id === 0);
        if (cueBall) {
          ctx.beginPath();
          ctx.arc(cueBall.position.x, cueBall.position.y, cueBall.radius * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = bihOverlap ? 'rgba(239, 68, 68, 0.25)' : 'rgba(6, 182, 212, 0.25)';
          ctx.strokeStyle = bihOverlap ? '#ef4444' : '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();

          // Text overlay
          ctx.fillStyle = bihOverlap ? '#ef4444' : '#94a3b8';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            bihOverlap ? 'CANNOT PLACE HERE' : 'DRAG TO PLACE CUE BALL',
            cueBall.position.x,
            cueBall.position.y - cueBall.radius - 8
          );
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dragStart, currentMouse, isDragging, ballInHand, bihOverlap, tableStyle, aiCueAnim]);

  // 2. Trigger AI Shot when it is AI's turn
  useEffect(() => {
    if (gameState.mode === 'ai' && gameState.currentPlayer === 2 && !gameState.isMoving && !gameState.winner && !aiThinking) {
      triggerAIShot();
    }
  }, [gameState.currentPlayer, gameState.isMoving, gameState.mode, gameState.winner]);

  // Handle pocketing a ball during physics loop
  const handleBallPocketed = (ball: Ball) => {
    playPocketSound();

    // Cue ball scratch
    if (ball.id === 0) {
      setBalls(prev => prev.map(b => b.id === 0 ? { ...b, isPocketed: true, velocity: { x: 0, y: 0 } } : b));
      setGameState(prev => ({
        ...prev,
        pocketedThisTurn: [...prev.pocketedThisTurn, 0],
        statusMessage: 'Scratch! Cue ball pocketed!'
      }));
      return;
    }

    // Object ball pocketed
    setBalls(prev => prev.map(b => b.id === ball.id ? { ...b, isPocketed: true, velocity: { x: 0, y: 0 } } : b));
    setGameState(prev => ({
      ...prev,
      pocketedThisTurn: [...prev.pocketedThisTurn, ball.number]
    }));
  };

  // Evaluate Turn outcomes when movement settles
  const evaluateTurnEnd = () => {
    const s = stateRef.current;
    const currentPocketed = s.pocketedThisTurn;
    const activePlayer = s.currentPlayer;

    const scratch = currentPocketed.includes(0);
    const opponentPlayer: 1 | 2 = activePlayer === 1 ? 2 : 1;
    let nextPlayer: 1 | 2 = activePlayer;
    let nextStatus = '';
    let nextWinner: 1 | 2 | null = null;

    // --- SOLO MODE EVALUATION ---
    if (s.mode === 'solo') {
      if (scratch) {
        setBallInHand(true);
        playScratchSound();
        setBalls(prev => prev.map(b => b.id === 0 ? {
          ...b,
          isPocketed: false,
          position: { x: TABLE_WIDTH / 4, y: TABLE_HEIGHT / 2 },
          velocity: { x: 0, y: 0 },
          scale: 1,
          opacity: 1
        } : b));
        setGameState(prev => ({
          ...prev,
          fouls: prev.fouls + 1,
          pocketedThisTurn: [],
          statusMessage: 'Scratch! Penalty: +1 Foul'
        }));
      } else {
        // Did we clear all object balls?
        const remainingCount = ballsRef.current.filter(b => b.id !== 0 && !b.isPocketed).length;
        if (remainingCount === 0) {
          nextWinner = 1;
          nextStatus = `Congratulations! Cleared in ${s.shotsTaken} shots and ${s.fouls} fouls!`;
        } else {
          nextStatus = `Shots: ${s.shotsTaken} | Pocketed ${currentPocketed.length} balls.`;
        }
        setGameState(prev => ({
          ...prev,
          pocketedThisTurn: [],
          winner: nextWinner,
          statusMessage: nextStatus
        }));
      }
      return;
    }

    // --- PVP / PVAI MODE EVALUATION ---
    // Rule 1: Scratch
    if (scratch) {
      playScratchSound();
      nextPlayer = opponentPlayer;
      nextStatus = `${activePlayer === 1 ? 'Player 1' : 'Player 2'} scratched! Opponent has ball-in-hand.`;
      
      // Reset Cue Ball status
      setBalls(prev => prev.map(b => b.id === 0 ? {
        ...b,
        isPocketed: false,
        position: { x: TABLE_WIDTH / 4, y: TABLE_HEIGHT / 2 },
        velocity: { x: 0, y: 0 },
        scale: 1,
        opacity: 1
      } : b));

      setGameState(prev => ({
        ...prev,
        fouls: prev.fouls + 1,
        currentPlayer: nextPlayer,
        pocketedThisTurn: [],
        statusMessage: nextStatus
      }));
      setBallInHand(true);
      return;
    }

    // Rule 2: 8-Ball Pocketed
    if (currentPocketed.includes(8)) {
      const activeTarget = activePlayer === 1 ? player1Target : player2Target;
      const remainingCount = activeTarget 
        ? ballsRef.current.filter(b => !b.isPocketed && b.type === activeTarget && b.id !== 8).length
        : 1; // if open table, early 8-ball is auto-loss

      if (remainingCount === 0) {
        // Legal win!
        nextWinner = activePlayer;
        nextStatus = `${activePlayer === 1 ? 'Player 1' : 'Player 2'} potted the 8-ball legally! Match Won!`;
      } else {
        // Foul loss!
        nextWinner = opponentPlayer;
        nextStatus = `Foul! Early 8-ball potted by ${activePlayer === 1 ? 'Player 1' : 'Player 2'}. Opponent Wins!`;
      }

      setGameState(prev => ({
        ...prev,
        winner: nextWinner,
        statusMessage: nextStatus,
        pocketedThisTurn: []
      }));
      return;
    }

    // Rule 3: Open Table Group Assignment
    if (!player1Target && currentPocketed.length > 0) {
      // Find the first pocketed object ball type
      const pottedObjId = currentPocketed.find(n => n !== 0 && n !== 8);
      if (pottedObjId !== undefined) {
        const pottedBall = ballsRef.current.find(b => b.number === pottedObjId);
        if (pottedBall) {
          const type = pottedBall.type as 'solid' | 'stripe';
          const otherType: 'solid' | 'stripe' = type === 'solid' ? 'stripe' : 'solid';
          
          if (activePlayer === 1) {
            setPlayer1Target(type);
            setPlayer2Target(otherType);
            nextStatus = `Player 1 assigned ${type.toUpperCase()}S, Player 2 is ${otherType.toUpperCase()}S!`;
          } else {
            setPlayer2Target(type);
            setPlayer1Target(otherType);
            nextStatus = `Player 2 assigned ${type.toUpperCase()}S, Player 1 is ${otherType.toUpperCase()}S!`;
          }
          // Active player gets another turn since they potted a ball
          nextPlayer = activePlayer;
        }
      }
    } else {
      // Check if player potted their own group balls
      const activeTarget = activePlayer === 1 ? player1Target : player2Target;
      if (activeTarget) {
        const pocketedOwnGroup = currentPocketed.some(num => {
          const b = ballsRef.current.find(ball => ball.number === num);
          return b && b.type === activeTarget;
        });

        if (pocketedOwnGroup) {
          // Keep turn
          nextPlayer = activePlayer;
          nextStatus = `${activePlayer === 1 ? 'Player 1' : 'Player 2'} pocketed a target ball. Shoot again.`;
        } else {
          // Switch turn
          nextPlayer = opponentPlayer;
          nextStatus = `${opponentPlayer === 1 ? 'Player 1' : 'Player 2'}'s turn.`;
        }
      } else {
        // Table still open, but no balls pocketed
        nextPlayer = opponentPlayer;
        nextStatus = `${opponentPlayer === 1 ? 'Player 1' : 'Player 2'}'s turn.`;
      }
    }

    // Update Scores
    const score1 = 7 - ballsRef.current.filter(b => !b.isPocketed && b.type === 'solid').length;
    const score2 = 7 - ballsRef.current.filter(b => !b.isPocketed && b.type === 'stripe').length;

    setGameState(prev => ({
      ...prev,
      currentPlayer: nextPlayer,
      scorePlayer1: player1Target === 'solid' ? score1 : player1Target === 'stripe' ? score2 : 0,
      scorePlayer2: player2Target === 'solid' ? score1 : player2Target === 'stripe' ? score2 : 0,
      pocketedThisTurn: [],
      statusMessage: nextStatus
    }));
  };

  // AI Vector Shot Finder Logic
  const triggerAIShot = () => {
    setAiThinking(true);
    setGameState(prev => ({ ...prev, statusMessage: 'AI is thinking...' }));

    setTimeout(() => {
      const cueBall = ballsRef.current.find(b => b.id === 0);
      if (!cueBall || cueBall.isPocketed) return;

      const targetGroup = getActiveTargetGroup();
      
      // 1. Gather all potential target balls
      let targetBalls = ballsRef.current.filter(b => {
        if (b.isPocketed || b.id === 0) return false;
        if (targetGroup === 'all') return b.id !== 8; // table is open, avoid 8-ball
        if (targetGroup === 'eight') return b.id === 8;
        return b.type === targetGroup;
      });

      // Fallback in case targets are empty or bugged
      if (targetBalls.length === 0) {
        targetBalls = ballsRef.current.filter(b => !b.isPocketed && b.id !== 0);
      }

      let bestShot: { angle: number; power: number; score: number } | null = null;

      // 2. Iterate and evaluate shot combinations (simple AI path solver)
      for (const target of targetBalls) {
        for (const pocket of INITIAL_POCKETS) {
          // Vector from target center to pocket center
          const targetToPocket = vecSub(pocket.position, target.position);
          const distToPocket = vecLength(targetToPocket);
          
          // Normalized direction target -> pocket
          const dirToPocket = vecNormalize(targetToPocket);

          // Position of cue ball contact spot on target (opposite side of the pocket vector)
          const contactOffset = vecMult(dirToPocket, -(BALL_RADIUS * 2));
          const targetContactPoint = vecAdd(target.position, contactOffset);

          // Vector from cue ball to contact point
          const cueToContact = vecSub(targetContactPoint, cueBall.position);
          const distToContact = vecLength(cueToContact);
          const dirCueToContact = vecNormalize(cueToContact);

          // Check if there is an obstacle between cue ball and contact point
          let isObstructed = false;
          for (const obstacle of ballsRef.current) {
            if (obstacle.isPocketed || obstacle.id === 0 || obstacle.id === target.id) continue;
            
            // Check projection of obstacle center onto cueToContact segment
            const obstacleVec = vecSub(obstacle.position, cueBall.position);
            const projection = vecDot(obstacleVec, dirCueToContact);
            
            if (projection > 0 && projection < distToContact) {
              const projPoint = vecAdd(cueBall.position, vecMult(dirCueToContact, projection));
              const crossDist = vecDist(obstacle.position, projPoint);
              if (crossDist < BALL_RADIUS * 2) {
                isObstructed = true;
                break;
              }
            }
          }

          // Evaluate the shot angle feasibility (thin cuts are harder)
          const cutAngleDot = vecDot(dirCueToContact, dirToPocket); // closer to 1.0 means straight shot

          if (cutAngleDot > 0.3) { // Cap at reasonable cuts
            // Calculate a score: straight shots, shorter distance to pocket, and unobstructed paths are better!
            let score = (cutAngleDot * 100) - (distToPocket * 0.15) - (distToContact * 0.05);
            if (isObstructed) score -= 80;

            const angle = Math.atan2(cueToContact.y, cueToContact.x);
            const power = Math.min(25 + distToContact * 0.08 + distToPocket * 0.05, 75);

            if (!bestShot || score > bestShot.score) {
              bestShot = { angle, power, score };
            }
          }
        }
      }

      // If no reasonable shots found, aim at any random ball with medium power
      if (!bestShot && targetBalls.length > 0) {
        const randomTarget = targetBalls[Math.floor(Math.random() * targetBalls.length)];
        const dir = vecNormalize(vecSub(randomTarget.position, cueBall.position));
        bestShot = {
          angle: Math.atan2(dir.y, dir.x),
          power: 45,
          score: -100
        };
      }

      if (bestShot) {
        // Run aim transition visualization
        const shotAngle = bestShot.angle;
        const shotPower = bestShot.power;
        
        let visualPower = 0;
        setAiCueAnim({ angle: shotAngle, power: shotPower, currentPower: 0 });

        // Animate pull-back cue stick
        const animInterval = setInterval(() => {
          visualPower += 4;
          if (visualPower >= shotPower) {
            clearInterval(animInterval);
            // Fire!
            setTimeout(() => {
              fireCueBall(shotAngle, shotPower);
              setAiCueAnim(null);
              setAiThinking(false);
            }, 300);
          } else {
            setAiCueAnim(prev => prev ? { ...prev, currentPower: visualPower } : null);
          }
        }, 30);
      } else {
        setAiThinking(false);
        // Switch turn if completely stuck
        setGameState(prev => ({ ...prev, currentPlayer: 1, statusMessage: "AI couldn't find a shot. Turn skipped." }));
      }
    }, 1200);
  };

  // Launch the Cue Ball
  const fireCueBall = (angle: number, power: number) => {
    const cueBall = ballsRef.current.find(b => b.id === 0);
    if (!cueBall || cueBall.isPocketed) return;

    // Convert angle/power to velocity vector
    const speed = Math.max(0.2, power * 0.16); // speed multiplier
    const velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };

    setBalls(prev => prev.map(b => b.id === 0 ? { ...b, velocity } : b));
    setGameState(prev => ({
      ...prev,
      shotsTaken: prev.shotsTaken + 1,
      isMoving: true,
      statusMessage: `${prev.currentPlayer === 1 ? 'Player 1' : 'Player 2'} took a shot.`
    }));
  };

  // 3. User Mouse Event Listeners for Aiming & Ball-in-Hand placing
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Vector2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale client coordinates back to virtual internal canvas coordinates
    return {
      x: ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.isMoving || gameState.winner) return;
    if (gameState.mode === 'ai' && gameState.currentPlayer === 2) return;

    const mousePos = getCanvasMousePos(e);
    const cueBall = ballsRef.current.find(b => b.id === 0);

    if (!cueBall || cueBall.isPocketed) return;

    if (ballInHand) {
      // Place cue ball logic: check if clicked on/near cue ball to start placement dragging
      const dist = vecDist(mousePos, cueBall.position);
      if (dist < cueBall.radius * 2) {
        setIsDragging(true);
      }
    } else {
      // Normal shoot aim drag starts on/near the cue ball
      const dist = vecDist(mousePos, cueBall.position);
      if (dist < cueBall.radius * 4) {
        setDragStart(cueBall.position);
        setCurrentMouse(mousePos);
        setIsDragging(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const mousePos = getCanvasMousePos(e);
    const cueBall = ballsRef.current.find(b => b.id === 0);
    if (!cueBall) return;

    if (ballInHand) {
      // Drag cue ball around within legal bounds (left of head string for break, or anywhere if general BIH)
      // Let's allow full table placement but cap inside cushions to be simple and accommodating.
      const minX = CUSHION_WIDTH + cueBall.radius;
      const maxX = TABLE_WIDTH - CUSHION_WIDTH - cueBall.radius;
      const minY = CUSHION_WIDTH + cueBall.radius;
      const maxY = TABLE_HEIGHT - CUSHION_WIDTH - cueBall.radius;

      const posX = Math.min(Math.max(mousePos.x, minX), maxX);
      const posY = Math.min(Math.max(mousePos.y, minY), maxY);

      // Check overlaps with other object balls
      let overlaps = false;
      for (const b of ballsRef.current) {
        if (b.id !== 0 && !b.isPocketed) {
          if (vecDist({ x: posX, y: posY }, b.position) < cueBall.radius + b.radius + 2) {
            overlaps = true;
            break;
          }
        }
      }

      setBihOverlap(overlaps);
      setBalls(prev => prev.map(b => b.id === 0 ? { ...b, position: { x: posX, y: posY } } : b));
    } else {
      setCurrentMouse(mousePos);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (ballInHand) {
      if (!bihOverlap) {
        setBallInHand(false);
        setGameState(prev => ({ ...prev, statusMessage: 'Ball placed. Aim and shoot.' }));
      }
    } else if (dragStart && currentMouse) {
      const dragVec = vecSub(currentMouse, dragStart);
      const dist = vecLength(dragVec);
      
      // Fire if dragged far enough (deadzone filter)
      if (dist > 15) {
        const angle = Math.atan2(dragVec.y, dragVec.x);
        const power = Math.min(dist / 1.5, 100);
        fireCueBall(angle, power);
      }
      setDragStart(null);
      setCurrentMouse(null);
    }
  };

  // 4. Drawing Subroutines
  const drawTable = (ctx: CanvasRenderingContext2D) => {
    // Outer wooden border
    ctx.fillStyle = tableStyle.borderColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT, 24);
    ctx.fill();

    // Table Felt Area
    ctx.fillStyle = tableStyle.feltColor;
    ctx.beginPath();
    ctx.roundRect(
      CUSHION_WIDTH,
      CUSHION_WIDTH,
      TABLE_WIDTH - CUSHION_WIDTH * 2,
      TABLE_HEIGHT - CUSHION_WIDTH * 2,
      8
    );
    ctx.fill();

    // Draw Cushions (Inner cushion borders for depth visual)
    ctx.fillStyle = tableStyle.cushionColor;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    
    // Top Cushion
    ctx.beginPath();
    ctx.moveTo(CUSHION_WIDTH, CUSHION_WIDTH);
    ctx.lineTo(TABLE_WIDTH - CUSHION_WIDTH, CUSHION_WIDTH);
    ctx.lineTo(TABLE_WIDTH - CUSHION_WIDTH - 6, CUSHION_WIDTH + 8);
    ctx.lineTo(CUSHION_WIDTH + 6, CUSHION_WIDTH + 8);
    ctx.fill();

    // Bottom Cushion
    ctx.beginPath();
    ctx.moveTo(CUSHION_WIDTH, TABLE_HEIGHT - CUSHION_WIDTH);
    ctx.lineTo(TABLE_WIDTH - CUSHION_WIDTH, TABLE_HEIGHT - CUSHION_WIDTH);
    ctx.lineTo(TABLE_WIDTH - CUSHION_WIDTH - 6, TABLE_HEIGHT - CUSHION_WIDTH - 8);
    ctx.lineTo(CUSHION_WIDTH + 6, TABLE_HEIGHT - CUSHION_WIDTH - 8);
    ctx.fill();

    ctx.shadowBlur = 0; // reset shadow
  };

  const drawPockets = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = tableStyle.pocketColor;
    ctx.strokeStyle = '#475569'; // light metallic outline
    ctx.lineWidth = 2.5;

    for (const pocket of INITIAL_POCKETS) {
      ctx.beginPath();
      ctx.arc(pocket.position.x, pocket.position.y, pocket.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawLinesAndDecals = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1.5;

    // Head String (1/4 vertical line)
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH / 4, CUSHION_WIDTH + 8);
    ctx.lineTo(TABLE_WIDTH / 4, TABLE_HEIGHT - CUSHION_WIDTH - 8);
    ctx.stroke();

    // Head Spot (Dot at intersection of head string)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(TABLE_WIDTH / 4, TABLE_HEIGHT / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Foot Spot (Dot at intersection where rack centers)
    ctx.beginPath();
    ctx.arc((TABLE_WIDTH * 3) / 4, TABLE_HEIGHT / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBalls = (ctx: CanvasRenderingContext2D) => {
    for (const ball of balls) {
      if (ball.isPocketed && ball.opacity === 0) continue;

      const x = ball.position.x;
      const y = ball.position.y;
      const r = ball.radius * ball.scale;

      ctx.save();
      ctx.globalAlpha = ball.opacity;

      // Drop shadow for 3D depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.shadowOffsetX = 1;

      // Draw primary ball sphere color
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadows for details
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowOffsetX = 0;

      // Draw Stripes
      if (ball.type === 'stripe') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Drawing a horizontal white stripe on ball
        ctx.arc(x, y, r, -Math.PI / 4, Math.PI / 4);
        ctx.arc(x, y, r, (3 * Math.PI) / 4, (5 * Math.PI) / 4);
        ctx.closePath();
        ctx.fill();
        
        // Re-draw outer edges to preserve spherical glow
        ctx.strokeStyle = ball.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw central number circles (excluding cue ball)
      if (ball.id !== 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Draw Number digit
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${r * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.number.toString(), x, y + 0.5);
      } else {
        // Cue ball: draw small red spot to help visual spins
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw 3D Radial Specular Highlight Glow overlay
      const grad = ctx.createRadialGradient(
        x - r * 0.35,
        y - r * 0.35,
        r * 0.05,
        x,
        y,
        r
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  };

  const drawAimGuideAndCue = (ctx: CanvasRenderingContext2D, angle: number, power: number) => {
    const cueBall = balls.find(b => b.id === 0);
    if (!cueBall || cueBall.isPocketed) return;

    const cbX = cueBall.position.x;
    const cbY = cueBall.position.y;

    // Normal projection vector opposite of aim direction
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // 1. Draw dashed line forward to show path
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(cbX, cbY);
    // Draw guide line forward up to 350px
    ctx.lineTo(cbX + dx * 350, cbY + dy * 350);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 2. Draw Cue Stick representing power pull-back
    // Visual cue offsets based on drag power
    const pullBack = power * 0.5; // shift stick back
    const cueLength = 220;
    const cueOffset = cueBall.radius + 5 + pullBack;

    const startX = cbX - dx * cueOffset;
    const startY = cbY - dy * cueOffset;
    const endX = cbX - dx * (cueOffset + cueLength);
    const endY = cbY - dy * (cueOffset + cueLength);

    // Cue stick lines (tapered draw)
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 5;

    // Draw main wood cue stick body
    ctx.strokeStyle = '#d97706'; // wood amber
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw custom white tip
    ctx.strokeStyle = '#e2e8f0'; // white cream tip
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(cbX - dx * (cueOffset + 8), cbY - dy * (cueOffset + 8));
    ctx.stroke();

    // Draw dark rubber bumper at bottom of cue
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cbX - dx * (cueOffset + cueLength - 10), cbY - dy * (cueOffset + cueLength - 10));
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.shadowBlur = 0; // reset shadow
  };

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full max-w-[840px] aspect-[2/1] relative p-4 bg-slate-950/70 border border-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full rounded-xl cursor-crosshair select-none"
        />
      </div>
    </div>
  );
};
