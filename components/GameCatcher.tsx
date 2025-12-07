
import React, { useRef, useEffect, useState } from 'react';
import { audioService } from '../services/audioService';

interface GameCatcherProps {
  onGameOver: (score: number) => void;
  onExit: () => void;
}

export const GameCatcher: React.FC<GameCatcherProps> = ({ onGameOver, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start BGM on Mount
  useEffect(() => {
    audioService.playBGM('CATCHER');
    return () => audioService.stopBGM();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    
    // Game States: READY -> DROPPING -> FLYING -> STOPPED
    let gameState: 'READY' | 'DROPPING' | 'SWINGING' | 'FLYING' | 'STOPPED' = 'READY';
    
    // Physics Constants
    const GRAVITY = 0.4;
    const AIR_RESISTANCE = 0.99;
    const BOUNCE_DAMPING = 0.6;
    const GROUND_FRICTION = 0.95;

    // Entities
    const santa = { x: 100, y: 350, width: 60, height: 80, state: 'IDLE' }; // Batter
    const elf = { x: 100, y: 0, radius: 15, vx: 0, vy: 0, rotation: 0 };
    
    // Camera
    let cameraX = 0;

    // Wind (affects flight distance)
    const wind = (Math.random() * 4) - 2; // -2 to +2

    let distance = 0;
    let maxHeight = 0;
    let isFlapping = false; // "Magic" boost in air

    const resetGame = () => {
        gameState = 'READY';
        elf.x = 140; // Drop position in front of Santa
        elf.y = 50;  // Start high
        elf.vx = 0;
        elf.vy = 0;
        cameraX = 0;
        distance = 0;
        santa.state = 'IDLE';
    };
    resetGame();

    const handleInput = (e: Event) => {
        e.preventDefault();
        
        if (gameState === 'READY') {
            gameState = 'DROPPING';
        } else if (gameState === 'DROPPING') {
            // SWING!
            gameState = 'SWINGING';
            audioService.playSFX('swing');
            santa.state = 'SWING';
            
            // Check Hit
            // Sweet spot is around y = 350 (Santa's waist level)
            const sweetSpot = 300;
            const diff = elf.y - sweetSpot;
            
            // Hit Logic
            if (Math.abs(diff) < 60) {
                // Good Hit
                audioService.playSFX('hit');
                const power = 1 - (Math.abs(diff) / 60); // 0 to 1
                const baseSpeed = 15;
                const speed = 10 + (power * 15); // 10 to 25
                
                // Angle: Positive diff (lower) = Higher angle
                // Negative diff (higher) = Lower angle
                let angle = -Math.PI / 4; // Default 45 deg up
                if (diff > 20) angle = -Math.PI / 6; // Hit late (low), shoots up steep
                if (diff < -20) angle = -Math.PI / 8; // Hit early (high), shoots line drive

                elf.vx = Math.cos(angle) * speed + wind;
                elf.vy = Math.sin(angle) * speed;
                gameState = 'FLYING';
            } else {
                // Miss
                // Elf just falls to ground
            }
        } else if (gameState === 'FLYING') {
            isFlapping = true;
        } else if (gameState === 'STOPPED') {
            onGameOver(Math.floor(distance));
        }
    };

    const handleInputEnd = () => {
        isFlapping = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') handleInput(e);
        if (e.code === 'Escape') onExit();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') handleInputEnd();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleInput as any);
    canvas.addEventListener('touchstart', handleInput as any);
    canvas.addEventListener('mouseup', handleInputEnd);
    canvas.addEventListener('touchend', handleInputEnd);

    // --- Drawing Functions ---

    const drawBackground = () => {
        // Sky
        const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grd.addColorStop(0, '#0f172a');
        grd.addColorStop(1, '#1e293b');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars (Static relative to camera for simplicity or parallax)
        ctx.fillStyle = 'white';
        for(let i=0; i<50; i++) {
            const x = (i * 50 - (cameraX * 0.1)) % canvas.width;
            const y = (i * 23) % (canvas.height - 100);
            const actualX = x < 0 ? x + canvas.width : x;
            ctx.fillRect(actualX, y, 2, 2);
        }

        // Mountains (Parallax 0.5)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        for (let i = -1; i < 3; i++) {
            const offset = i * 800 - (cameraX * 0.2);
            ctx.moveTo(offset, canvas.height);
            ctx.lineTo(offset + 200, canvas.height - 150);
            ctx.lineTo(offset + 400, canvas.height - 50);
            ctx.lineTo(offset + 600, canvas.height - 200);
            ctx.lineTo(offset + 800, canvas.height);
        }
        ctx.fill();

        // Ground
        const groundY = canvas.height - 50;
        ctx.fillStyle = '#e2e8f0'; // Snow
        ctx.fillRect(0, groundY, canvas.width, 50);
        
        // Distance markers on ground
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "Press Start 2P"';
        const startMarker = Math.floor(cameraX / 500) * 500;
        for (let m = startMarker; m < startMarker + canvas.width + 500; m += 500) {
            const screenX = m - cameraX;
            if (screenX > -50 && screenX < canvas.width + 50) {
                ctx.fillRect(screenX, groundY, 4, 10);
                ctx.fillText(`${m}m`, screenX - 20, groundY + 25);
            }
        }
    };

    const drawSanta = (x: number, y: number) => {
        const screenX = x - cameraX;
        if (screenX < -100 || screenX > canvas.width) return;

        ctx.save();
        ctx.translate(screenX, y);

        // Body
        ctx.fillStyle = '#D60000';
        ctx.fillRect(0, 0, 40, 60);
        // Belt
        ctx.fillStyle = '#000';
        ctx.fillRect(-5, 35, 50, 10);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(15, 35, 10, 10); // Buckle
        // Head
        ctx.fillStyle = '#ffccaa';
        ctx.fillRect(5, -15, 30, 20);
        // Beard
        ctx.fillStyle = '#fff';
        ctx.fillRect(5, 5, 30, 15);
        // Hat
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(40, -15); ctx.lineTo(20, -35); ctx.fill();

        // Arms / Bat
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        if (santa.state === 'IDLE' || gameState === 'DROPPING') {
            // Holding bat up
            ctx.beginPath(); ctx.moveTo(30, 20); ctx.lineTo(50, 0); ctx.stroke();
            // Bat
            ctx.strokeStyle = '#D60000'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(50, 0); ctx.lineTo(70, -30); ctx.stroke(); // Candy Cane handle could be curved but line is fine
            // Stripes
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(55, -5); ctx.lineTo(60, -10); ctx.stroke();
        } else {
            // Swing finish
            ctx.beginPath(); ctx.moveTo(30, 20); ctx.lineTo(60, 30); ctx.stroke();
            // Bat
            ctx.strokeStyle = '#D60000'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(60, 30); ctx.lineTo(100, 30); ctx.stroke();
        }

        ctx.restore();
    };

    const drawElf = () => {
        const screenX = elf.x - cameraX;
        
        ctx.save();
        ctx.translate(screenX, elf.y);
        ctx.rotate(elf.rotation);

        // Body
        ctx.fillStyle = '#00D632'; // Elf Green
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        
        // Hat
        ctx.fillStyle = '#D60000';
        ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(15, -5); ctx.lineTo(0, -25); ctx.fill();
        
        // Face
        ctx.fillStyle = '#ffccaa';
        ctx.beginPath(); ctx.arc(0, 2, 8, 0, Math.PI*2); ctx.fill();
        
        // Eyes (Spinning effect)
        ctx.fillStyle = '#000';
        ctx.fillRect(-4, 0, 2, 2);
        ctx.fillRect(2, 0, 2, 2);

        // Cape / Flap visual
        if (isFlapping && frameCount % 10 < 5) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-25, 10); ctx.lineTo(-10, 15); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(25, 10); ctx.lineTo(10, 15); ctx.fill();
        }

        ctx.restore();
    };

    // --- Main Loop ---
    const update = () => {
        frameCount++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const groundLevel = canvas.height - 50 - 15; // 15 is elf radius

        // Logic
        if (gameState === 'DROPPING') {
            elf.vy += GRAVITY;
            elf.y += elf.vy;
            if (elf.y > groundLevel) {
                // Missed swing, hits ground
                elf.y = groundLevel;
                elf.vy = -elf.vy * 0.5;
                if(Math.abs(elf.vy) < 1) gameState = 'STOPPED';
            }
        } 
        else if (gameState === 'FLYING') {
            // Flapping mechanics
            if (isFlapping) {
                elf.vy -= 0.15; // Fight gravity
            }

            elf.vy += GRAVITY;
            elf.vx *= AIR_RESISTANCE; // Drag
            
            elf.x += elf.vx;
            elf.y += elf.vy;
            elf.rotation += elf.vx * 0.1;

            // Bounce Ground
            if (elf.y > groundLevel) {
                elf.y = groundLevel;
                // If hitting ground fast, bounce
                if (Math.abs(elf.vy) > 2) {
                    elf.vy = -elf.vy * BOUNCE_DAMPING;
                    elf.vx *= GROUND_FRICTION; // Friction on bounce
                    audioService.playSFX('bounce');
                } else {
                    // Rolling
                    elf.vy = 0;
                    elf.vx *= GROUND_FRICTION; // Rolling friction
                    if (Math.abs(elf.vx) < 0.1) gameState = 'STOPPED';
                }
            }
            
            // Camera follow
            if (elf.x > canvas.width / 3) {
                cameraX = elf.x - canvas.width / 3;
            }
            distance = elf.x - 140; // 140 is start X
        }

        drawBackground();
        drawSanta(santa.x, santa.y);
        
        // Draw Elf if active
        if (gameState !== 'READY') {
             drawElf();
        } else {
            // Elf hovering at top
            ctx.fillStyle = '#00D632';
            ctx.beginPath(); ctx.arc(140 - cameraX, 50, 15, 0, Math.PI*2); ctx.fill();
            // Arrow indicator
            if (frameCount % 40 < 20) {
                ctx.fillStyle = '#FFF';
                ctx.fillText("READY?", 110, 30);
            }
        }

        // HUD
        ctx.fillStyle = '#FFF';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'left';
        
        if (gameState === 'STOPPED') {
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`DISTANCE: ${Math.floor(distance)}m`, 20, 40);
            ctx.fillStyle = '#FFF';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(`CLICK TO FINISH`, 20, 70);
        } else {
            ctx.fillText(`DIST: ${Math.max(0, Math.floor(distance))}m`, 20, 40);
        }

        // Wind Indicator
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`WIND: ${wind.toFixed(1)}`, canvas.width - 120, 30);
        ctx.beginPath(); 
        ctx.moveTo(canvas.width - 60, 25); 
        ctx.lineTo(canvas.width - 60 + (wind * 10), 25); 
        ctx.strokeStyle = wind > 0 ? '#00D632' : '#D60000';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Instructions
        if (gameState === 'READY') {
             ctx.fillStyle = 'rgba(0,0,0,0.5)';
             ctx.fillRect(0, canvas.height/2 - 40, canvas.width, 80);
             ctx.fillStyle = '#FFF';
             ctx.textAlign = 'center';
             ctx.fillText("PRESS SPACE TO DROP", canvas.width/2, canvas.height/2 - 10);
             ctx.fillText("& SPACE AGAIN TO HIT!", canvas.width/2, canvas.height/2 + 20);
        } else if (gameState === 'FLYING') {
             ctx.fillStyle = 'rgba(255,255,255,0.5)';
             ctx.font = '10px "Press Start 2P"';
             ctx.fillText("HOLD SPACE TO GLIDE", canvas.width/2, canvas.height - 20);
        }

        animationFrameId = requestAnimationFrame(update);
    };
    update();

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousedown', handleInput as any);
        canvas.removeEventListener('touchstart', handleInput as any);
        canvas.removeEventListener('mouseup', handleInputEnd);
        canvas.removeEventListener('touchend', handleInputEnd);
        cancelAnimationFrame(animationFrameId);
    };
  }, [onGameOver, onExit]);

  return (
    <div className="relative w-full max-w-2xl mx-auto border-4 border-rizz-red rounded-lg shadow-2xl overflow-hidden bg-black select-none">
      <div className="scanline"></div>
      <canvas ref={canvasRef} width={800} height={450} className="w-full h-auto block" />
      <button onClick={onExit} className="absolute top-4 right-4 bg-red-600/50 hover:bg-red-600 text-white font-arcade text-xs px-3 py-2 rounded border border-white/20 z-30">EXIT</button>
    </div>
  );
};
