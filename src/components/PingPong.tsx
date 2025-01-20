import React, { useEffect, useRef, useState } from 'react';

interface GameState {
  ballX: number;
  ballY: number;
  ballSpeedX: number;
  ballSpeedY: number;
  paddle1Y: number;
  paddle2Y: number;
  score1: number;
  score2: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 12;
const INITIAL_BALL_SPEED = 8;
const AI_REACTION_SPEED = 0.8; // AI movement speed multiplier (1.0 would be perfect)

export default function PingPong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>({
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballSpeedX: INITIAL_BALL_SPEED,
    ballSpeedY: INITIAL_BALL_SPEED,
    paddle1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    paddle2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    score1: 0,
    score2: 0
  });

  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setKeysPressed(prev => new Set(prev).add(e.key.toLowerCase()));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      setKeysPressed(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // AI prediction function
  const predictBallY = (state: GameState): number => {
    if (state.ballSpeedX <= 0) {
      return state.ballY; // Ball moving away, stay in current position
    }

    let predictedX = state.ballX;
    let predictedY = state.ballY;
    let predictedSpeedY = state.ballSpeedY;

    // Simulate ball movement until it reaches the AI paddle
    while (predictedX < CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE) {
      predictedX += state.ballSpeedX;
      predictedY += predictedSpeedY;

      // Simulate bounces off top and bottom
      if (predictedY <= 0 || predictedY >= CANVAS_HEIGHT - BALL_SIZE) {
        predictedSpeedY = -predictedSpeedY;
      }
    }

    // Return predicted Y position, accounting for paddle height
    return Math.min(
      Math.max(
        predictedY - PADDLE_HEIGHT / 2,
        0
      ),
      CANVAS_HEIGHT - PADDLE_HEIGHT
    );
  };

  const updateGame = () => {
    setGameState(prevState => {
      let newState = { ...prevState };

      // Move player 1 paddle
      if (keysPressed.has('w') && newState.paddle1Y > 0) {
        newState.paddle1Y = Math.max(0, newState.paddle1Y - PADDLE_SPEED);
      }
      if (keysPressed.has('s') && newState.paddle1Y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
        newState.paddle1Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newState.paddle1Y + PADDLE_SPEED);
      }

      // AI movement for paddle 2
      const targetY = predictBallY(newState);
      const paddleCenterY = newState.paddle2Y + PADDLE_HEIGHT / 2;
      const moveDistance = (targetY - newState.paddle2Y) * AI_REACTION_SPEED;

      newState.paddle2Y = Math.min(
        Math.max(
          newState.paddle2Y + moveDistance,
          0
        ),
        CANVAS_HEIGHT - PADDLE_HEIGHT
      );

      // Move ball
      newState.ballX += newState.ballSpeedX;
      newState.ballY += newState.ballSpeedY;

      // Ball collision with top and bottom
      if (newState.ballY <= 0 || newState.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
        newState.ballSpeedY = -newState.ballSpeedY;
      }

      // Ball collision with paddles
      if (
        (newState.ballX <= PADDLE_WIDTH && 
         newState.ballY >= newState.paddle1Y && 
         newState.ballY <= newState.paddle1Y + PADDLE_HEIGHT) ||
        (newState.ballX >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE && 
         newState.ballY >= newState.paddle2Y && 
         newState.ballY <= newState.paddle2Y + PADDLE_HEIGHT)
      ) {
        newState.ballSpeedX = -newState.ballSpeedX * 1.1;
        newState.ballSpeedY *= 1.1;

        // Add slight randomization to ball direction after paddle hits
        newState.ballSpeedY += (Math.random() - 0.5) * 2;
      }

      // Score points and reset ball
      if (newState.ballX <= 0) {
        newState.score2++;
        newState = resetBall(newState);
      } else if (newState.ballX >= CANVAS_WIDTH - BALL_SIZE) {
        newState.score1++;
        newState = resetBall(newState);
      }

      return newState;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw center line
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.strokeStyle = '#333';
      ctx.stroke();

      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, gameState.paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw ball
      ctx.fillRect(gameState.ballX, gameState.ballY, BALL_SIZE, BALL_SIZE);

      // Draw scores
      ctx.font = '48px Arial';
      ctx.fillText(gameState.score1.toString(), CANVAS_WIDTH / 4, 60);
      ctx.fillText(gameState.score2.toString(), (CANVAS_WIDTH * 3) / 4, 60);

      updateGame();
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameState, keysPressed]);

  const resetBall = (state: GameState): GameState => ({
    ...state,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballSpeedX: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    ballSpeedY: INITIAL_BALL_SPEED * (Math.random() * 2 - 1)
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 text-white text-center">
        <h1 className="text-3xl font-bold mb-4">Ping Pong</h1>
        <p className="mb-2">Player 1: W/S keys | Player 2: AI</p>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-700 rounded-lg shadow-lg"
      />
    </div>
  );
}