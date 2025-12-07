
import React, { useRef, useEffect, useState } from 'react';
import { audioService } from '../services/audioService';

interface GameRunnerProps {
  onGameOver: (score: number) => void;
  onExit: () => void;
}

export const GameRunner: React.FC<GameRunnerProps> = ({ onGameOver, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentScore, setCurrentScore] = useState(0);

  // Start BGM on Mount
  useEffect(() => {
    audioService.playBGM('RUNNER');
    return () => audioService.stopBGM();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let score = 0;
    let frameCount = 0;
    let isGameOver = false;

    // Difficulty Parameters
    let gameSpeed = 4.0;
    const MAX_SPEED = 9.0;

    // Player dimensions adjusted for Sleigh + Reindeer combo
    // Logic: x, y is the top-left of the HITBOX
    const player = { x: 60, y: canvas.height / 2, width: 80, height: 35, dy: 0, gravity: 0.5, lift: -8, angle: 0 };

    interface Entity { x: number; y: number; width: number; height: number; type: 'coin' | 'obstacle'; markedForDeletion: boolean; oscillationOffset?: number; }
    interface House { x: number; width: number; height: number; windows: {x:number, y:number}[] }
    
    let entities: Entity[] = [];
    let houses: House[] = [];

    // Initialize Houses (Cityscape)
    const initHouses = () => {
        let currentX = 0;
        while (currentX < canvas.width * 1.5) {
            const width = 60 + Math.random() * 80;
            const height = 50 + Math.random() * 100;
            const wCount = Math.floor(Math.random() * 3) + 1;
            const windows = [];
            for(let i=0; i<wCount; i++) {
                windows.push({ x: Math.random() * (width - 15), y: Math.random() * (height - 20) });
            }
            houses.push({ x: currentX, width, height, windows });
            currentX += width + 5; // small gap
        }
    };
    initHouses();

    // Background Stars
    const stars = Array(50).fill(0).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.5
    }));

    const handleInput = (e?: Event) => {
      if (e) e.preventDefault();
      if (isGameOver) return;
      player.dy = player.lift;
      audioService.playSFX('jump');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleInput(e);
      if (e.code === 'Escape') onExit();
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleInput as any);
    canvas.addEventListener('touchstart', handleInput as any);

    const drawSleighTeam = (x: number, y: number, angle: number) => {
      ctx.save();
      // Center rotation slightly back so the reindeer tilts up naturally
      ctx.translate(x + 40, y + 20);
      ctx.rotate(angle);
      ctx.translate(-(x + 40), -(y + 20));

      // --- Sleigh (Back) ---
      const sleighX = x; 
      const sleighY = y + 10;
      
      // Runners
      ctx.strokeStyle = '#C0C0C0'; ctx.lineWidth = 3;
      ctx.beginPath(); 
      ctx.moveTo(sleighX, sleighY + 20); 
      ctx.lineTo(sleighX + 40, sleighY + 20); 
      ctx.bezierCurveTo(sleighX + 50, sleighY + 20, sleighX + 50, sleighY + 10, sleighX + 40, sleighY + 10);
      ctx.stroke();

      // Body
      ctx.fillStyle = '#D60000'; // Rizz Red
      ctx.beginPath();
      ctx.roundRect(sleighX, sleighY, 40, 18, 5);
      ctx.fill();
      // Gold trim
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.stroke();

      // Santa
      ctx.fillStyle = '#FFCCAA'; ctx.fillRect(sleighX + 15, sleighY - 8, 10, 10); // Face
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sleighX + 15, sleighY - 2, 10, 8); // Beard
      ctx.fillStyle = '#D60000'; // Hat
      ctx.beginPath(); ctx.moveTo(sleighX + 10, sleighY - 8); ctx.lineTo(sleighX + 30, sleighY - 8); ctx.lineTo(sleighX + 15, sleighY - 20); ctx.fill();

      // --- Reins ---
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sleighX + 40, sleighY + 5); ctx.lineTo(sleighX + 55, sleighY + 10); ctx.stroke();

      // --- Reindeer (Front) ---
      const deerX = x + 55;
      const deerY = y + 10;
      
      ctx.fillStyle = '#8B4513'; // Brown
      ctx.beginPath();
      ctx.ellipse(deerX + 15, deerY + 8, 15, 8, 0, 0, Math.PI * 2); // Body
      ctx.fill();

      // Legs (Simple animation based on frame)
      const legOffset = Math.sin(frameCount * 0.5) * 5;
      ctx.strokeStyle = '#654321'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(deerX + 10, deerY + 10); ctx.lineTo(deerX + 5 + legOffset, deerY + 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(deerX + 20, deerY + 10); ctx.lineTo(deerX + 25 - legOffset, deerY + 20); ctx.stroke();

      // Head
      ctx.beginPath(); ctx.arc(deerX + 30, deerY - 2, 6, 0, Math.PI * 2); ctx.fill();
      
      // Antlers
      ctx.strokeStyle = '#D2B48C';
      ctx.beginPath(); ctx.moveTo(deerX + 30, deerY - 6); ctx.lineTo(deerX + 35, deerY - 12); ctx.stroke();

      // Nose (Red - Rudolph)
      ctx.fillStyle = frameCount % 20 < 10 ? '#FF0000' : '#880000'; // Blinking
      ctx.beginPath(); ctx.arc(deerX + 34, deerY - 2, 2, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    };

    const drawCloudObstacle = (x: number, y: number, w: number, h: number) => {
      // Reduced size clouds, more dispersed
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      const puffSize = w * 0.4;
      ctx.beginPath(); 
      ctx.arc(x + w*0.2, y + h*0.5, puffSize, 0, Math.PI * 2); 
      ctx.arc(x + w*0.5, y + h*0.4, puffSize * 1.2, 0, Math.PI * 2); 
      ctx.arc(x + w*0.8, y + h*0.5, puffSize, 0, Math.PI * 2); 
      ctx.fill();
    };

    const drawRizzToken = (x: number, y: number, w: number) => {
      // Square Red Token with 'R'
      const size = w;
      const half = size / 2;
      
      ctx.save();
      ctx.translate(x + half, y + half);
      
      // Floating effect
      ctx.translate(0, Math.sin(frameCount * 0.1) * 3);
      
      // Red Square Body
      ctx.fillStyle = '#D60000'; 
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
      ctx.fillRect(-half, -half, size, size);
      
      // Gold Border
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.strokeRect(-half, -half, size, size);

      // 'R' Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px "Press Start 2P", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R', 2, 2); // Slight offset for pixel font
      
      ctx.restore();
    };

    const update = () => {
      if (isGameOver) return;
      frameCount++;

      // Difficulty Curve
      // Speed increases every 500 points, capped at MAX_SPEED
      const speedModifier = Math.min(MAX_SPEED - 4.0, Math.floor(score / 500) * 0.5);
      gameSpeed = 4.0 + speedModifier;

      // Clear Screen
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- Background Layer 1: Stars ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) star.x = canvas.width;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // --- Background Layer 2: Houses (Parallax) ---
      houses.forEach(h => {
        h.x -= gameSpeed * 0.5; // Moves slower than foreground
      });
      // Remove off-screen houses and add new ones
      if (houses.length > 0 && houses[0].x + houses[0].width < 0) {
        houses.shift();
      }
      if (houses.length > 0) {
        const lastHouse = houses[houses.length - 1];
        if (lastHouse.x + lastHouse.width < canvas.width) {
            const width = 60 + Math.random() * 80;
            const height = 60 + Math.random() * 100;
            const wCount = Math.floor(Math.random() * 3) + 1;
            const windows = [];
            for(let i=0; i<wCount; i++) windows.push({ x: Math.random() * (width - 20) + 5, y: Math.random() * (height - 30) + 10 });
            houses.push({ x: lastHouse.x + lastHouse.width + 5, width, height, windows });
        }
      }
      
      // Draw Houses
      houses.forEach(h => {
          // Silhouette
          ctx.fillStyle = '#1E293B'; // Dark Slate
          ctx.fillRect(h.x, canvas.height - h.height, h.width, h.height);
          // Chimney
          ctx.fillRect(h.x + 10, canvas.height - h.height - 15, 15, 15);
          // Windows (Yellow lights)
          ctx.fillStyle = '#FCD34D'; // Yellow
          h.windows.forEach(win => {
              if (Math.random() > 0.01) // Flickering effect check, mostly on
                 ctx.fillRect(h.x + win.x, canvas.height - h.height + win.y, 8, 10);
          });
          // Snow on roof
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(h.x - 2, canvas.height - h.height, h.width + 4, 4);
          ctx.fillRect(h.x + 8, canvas.height - h.height - 15, 19, 4); // Chimney snow
      });


      // --- Player Physics ---
      player.dy += player.gravity;
      player.y += player.dy;
      player.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (player.dy * 0.1)));

      if (player.y + player.height > canvas.height || player.y < -50) {
        isGameOver = true;
        audioService.playSFX('hit');
        onGameOver(score);
      }

      // --- Spawning Obstacles & Tokens ---
      const baseRate = 100;
      const minRate = 50;
      const spawnRate = Math.max(minRate, baseRate - Math.floor(score / 300));
      
      if (frameCount % spawnRate === 0) {
        const gap = Math.max(130, 160 - Math.floor(score / 1000) * 5); // Slightly larger gap than before
        const minHeight = 50;
        const maxHeight = canvas.height - gap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        // Add Clouds
        entities.push({ x: canvas.width, y: topHeight + gap, width: 50, height: 50, type: 'obstacle', markedForDeletion: false });
        entities.push({ x: canvas.width, y: topHeight - 60, width: 50, height: 50, type: 'obstacle', markedForDeletion: false });
      }

      if (frameCount % 45 === 0) {
        entities.push({ x: canvas.width, y: Math.random() * (canvas.height - 60) + 30, width: 30, height: 30, type: 'coin', markedForDeletion: false, oscillationOffset: Math.random() * Math.PI * 2 });
      }

      // --- Update Entities ---
      entities.forEach(entity => {
        entity.x -= gameSpeed;
        if (entity.type === 'coin' && entity.oscillationOffset !== undefined) entity.y += Math.sin(frameCount * 0.1 + entity.oscillationOffset) * 1;

        // Collision Logic
        // Slightly forgiving hitbox for player
        const pMargin = 5;
        const pLeft = player.x + pMargin; const pRight = player.x + player.width - pMargin;
        const pTop = player.y + pMargin; const pBottom = player.y + player.height - pMargin;
        
        // Entity Hitbox
        const eMargin = entity.type === 'obstacle' ? 8 : 0; // Clouds are smaller hitboxes than they look
        const eLeft = entity.x + eMargin; const eRight = entity.x + entity.width - eMargin;
        const eTop = entity.y + eMargin; const eBottom = entity.y + entity.height - eMargin;

        if (pLeft < eRight && pRight > eLeft && pTop < eBottom && pBottom > eTop) {
          if (entity.type === 'coin') {
            score += 100;
            setCurrentScore(score);
            entity.markedForDeletion = true;
            audioService.playSFX('coin');
          } else {
            isGameOver = true;
            audioService.playSFX('hit');
            onGameOver(score);
          }
        }
        if (entity.x + entity.width < 0) entity.markedForDeletion = true;
      });

      entities = entities.filter(e => !e.markedForDeletion);
      
      // Draw Entities
      entities.forEach(e => {
        if(e.type === 'coin') drawRizzToken(e.x, e.y, e.width);
        else drawCloudObstacle(e.x, e.y, e.width, e.height);
      });

      drawSleighTeam(player.x, player.y, player.angle);

      // HUD
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(`${score}`, 20, 40);

      if (!isGameOver) animationFrameId = requestAnimationFrame(update);
    };
    update();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleInput as any);
      canvas.removeEventListener('touchstart', handleInput as any);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameOver, onExit]);

  return (
    <div className="relative w-full max-w-2xl mx-auto border-4 border-rizz-gold rounded-lg shadow-2xl overflow-hidden bg-black">
      <div className="scanline"></div>
      <canvas ref={canvasRef} width={800} height={450} className="w-full h-auto block" />
      <button onClick={onExit} className="absolute top-4 right-4 bg-red-600/50 hover:bg-red-600 text-white font-arcade text-xs px-3 py-2 rounded border border-white/20 z-30">EXIT</button>
      <div className="absolute bottom-4 left-4 text-white/50 text-[10px] font-arcade animate-pulse">TAP OR SPACE TO FLY</div>
    </div>
  );
};
