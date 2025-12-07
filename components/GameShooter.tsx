
import React, { useRef, useEffect, useState } from 'react';
import { audioService } from '../services/audioService';

interface GameShooterProps {
  onGameOver: (score: number) => void;
  onExit: () => void;
}

export const GameShooter: React.FC<GameShooterProps> = ({ onGameOver, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentScore, setCurrentScore] = useState(0);

  // Start BGM on Mount
  useEffect(() => {
    audioService.playBGM('SHOOTER');
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

    // Game Center
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Player State
    const player = { 
      x: cx, 
      y: cy, 
      angle: 0, 
      size: 20 
    };

    // Mouse Tracking
    const mouse = { x: cx, y: cy };

    interface Projectile { x: number; y: number; vx: number; vy: number; life: number }
    interface Enemy { x: number; y: number; speed: number; size: number; color: string; rotation: number; rotationSpeed: number }
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

    let projectiles: Projectile[] = [];
    let enemies: Enemy[] = [];
    let particles: Particle[] = [];

    // --- Inputs ---
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouse.x = (e.clientX - rect.left) * scaleX;
      mouse.y = (e.clientY - rect.top) * scaleY;
    };

    const shoot = () => {
      if (isGameOver) return;
      audioService.playSFX('shoot');
      
      const speed = 10;
      // Spawn bullet at the tip of the tree (Star location)
      // The tree is about 40px long from center
      const tipX = player.x + Math.cos(player.angle) * 40;
      const tipY = player.y + Math.sin(player.angle) * 40;

      projectiles.push({
        x: tipX,
        y: tipY,
        vx: Math.cos(player.angle) * speed,
        vy: Math.sin(player.angle) * speed,
        life: 100
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') shoot();
      if (e.code === 'Escape') onExit();
    };

    const handleMouseDown = () => shoot();

    // Mobile/Touch Support
    const handleTouch = (e: TouchEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const tx = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const ty = (touch.clientY - rect.top) * (canvas.height / rect.height);
        
        const dx = tx - player.x;
        const dy = ty - player.y;
        player.angle = Math.atan2(dy, dx);
        
        shoot();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    // --- Helpers ---
    const createExplosion = (x: number, y: number, color: string) => {
      for(let i=0; i<12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 20 + Math.random() * 10,
          color: Math.random() > 0.5 ? color : '#FFD700' // Mix with confetti gold
        });
      }
    };

    // --- Game Loop ---
    const update = () => {
      if (isGameOver) return;
      frameCount++;

      // 1. Calculate Player Rotation
      const dx = mouse.x - player.x;
      const dy = mouse.y - player.y;
      player.angle = Math.atan2(dy, dx);

      // 2. Clear Screen
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Grid Background
      ctx.strokeStyle = '#1a2e35';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const offset = (frameCount * 0.5) % gridSize;
      ctx.beginPath();
      for (let x = offset; x < canvas.width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
      for (let y = offset; y < canvas.height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
      ctx.stroke();

      // 4. Update & Draw Projectiles
      ctx.fillStyle = '#FFF';
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.fillStyle = '#FFFF00'; // Yellow lasers
        ctx.shadowBlur = 5; ctx.shadowColor = '#FFFF00';
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.shadowBlur = 0;

        if (p.life <= 0 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          projectiles.splice(i, 1);
        }
      }

      // 5. Spawn Enemies
      const spawnRate = Math.max(20, 90 - Math.floor(score / 50));
      
      if (frameCount % spawnRate === 0) {
        const side = Math.floor(Math.random() * 4);
        const size = 30;
        let ex = 0, ey = 0;

        switch(side) {
          case 0: ex = Math.random() * canvas.width; ey = -size; break;
          case 1: ex = canvas.width + size; ey = Math.random() * canvas.height; break;
          case 2: ex = Math.random() * canvas.width; ey = canvas.height + size; break;
          case 3: ex = -size; ey = Math.random() * canvas.height; break;
        }

        const speed = 1.0 + (score / 1500); 

        enemies.push({
          x: ex, y: ey,
          speed: speed,
          size: size,
          color: Math.random() > 0.5 ? '#8B0000' : '#104910', // Dark Red or Dark Green
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.05
        });
      }

      // 6. Update & Draw Enemies (Evil Gifts)
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        
        const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angleToPlayer) * e.speed;
        e.y += Math.sin(angleToPlayer) * e.speed;
        e.rotation += e.rotationSpeed;

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);

        // -- Draw Evil Gift --
        // Box Base
        ctx.fillStyle = e.color; 
        ctx.fillRect(-e.size/2, -e.size/2, e.size, e.size);
        
        // Ribbons (Gold)
        ctx.fillStyle = '#DAA520'; 
        ctx.fillRect(-e.size/2, -4, e.size, 8); // Horizontal
        ctx.fillRect(-4, -e.size/2, 8, e.size); // Vertical
        
        // Evil Face
        // Angry Eyes
        ctx.fillStyle = '#000';
        // Left Eye
        ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-4, -4); ctx.lineTo(-10, -2); ctx.fill();
        // Right Eye
        ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(4, -4); ctx.lineTo(10, -2); ctx.fill();
        // Angry Eyebrows
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-2, -6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(12, -10); ctx.lineTo(2, -6); ctx.stroke();

        ctx.restore();

        // Collision Check (Player vs Enemy)
        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (distToPlayer < player.size + e.size/2) {
          isGameOver = true;
          audioService.playSFX('explosion');
          onGameOver(score);
        }

        // Collision Check (Projectile vs Enemy)
        for (let j = projectiles.length - 1; j >= 0; j--) {
          const p = projectiles[j];
          const dist = Math.hypot(p.x - e.x, p.y - e.y);
          if (dist < e.size / 2 + 5) {
            createExplosion(e.x, e.y, e.color);
            audioService.playSFX('explosion');
            score += 10;
            setCurrentScore(score);
            projectiles.splice(j, 1);
            enemies.splice(i, 1);
            break;
          }
        }
      }

      // 7. Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // 8. Draw Player (Enhanced Christmas Tree Ship)
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      
      // Rotate 90deg because standard tree draws upwards but angle 0 is right
      ctx.rotate(Math.PI / 2); 

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;

      // Trunk
      ctx.fillStyle = '#4A3728'; // Dark wood
      ctx.fillRect(-6, 25, 12, 12);

      // --- Helper to draw tiered layers ---
      const drawTier = (yOffset: number, width: number, height: number, colorStart: string, colorEnd: string) => {
          // Gradient Fill
          const grd = ctx.createLinearGradient(-width/2, yOffset, width/2, yOffset + height);
          grd.addColorStop(0, colorStart);
          grd.addColorStop(0.5, colorEnd); // Highlight in middle
          grd.addColorStop(1, colorStart);
          ctx.fillStyle = grd;
          
          ctx.beginPath();
          ctx.moveTo(0, yOffset - height); // Apex
          // Right side
          ctx.lineTo(width/2, yOffset);
          // Jagged Bottom (Branches)
          ctx.lineTo(width/4, yOffset - 5);
          ctx.lineTo(0, yOffset + 5);
          ctx.lineTo(-width/4, yOffset - 5);
          // Left side
          ctx.lineTo(-width/2, yOffset);
          ctx.closePath();
          ctx.fill();
      };

      // Draw Tiers (Bottom to Top)
      drawTier(20, 50, 30, '#103910', '#1a5c1a'); // Base - Darkest
      drawTier(5, 42, 28, '#1a5c1a', '#228B22');  // Mid
      drawTier(-10, 32, 25, '#228B22', '#32CD32'); // Top - Brightest

      // Ornaments
      const ornaments = [
          {x: -15, y: 15, c: '#FF0000'}, {x: 12, y: 18, c: '#FFD700'}, 
          {x: -8, y: 0, c: '#0000FF'}, {x: 10, y: -5, c: '#FF00FF'},
          {x: 0, y: 8, c: '#FFFFFF'}, {x: -6, y: -15, c: '#FFA500'}
      ];
      
      ornaments.forEach((o, i) => {
          // Blink logic
          const isBlinking = (frameCount + i * 10) % 40 < 20;
          ctx.fillStyle = isBlinking ? '#FFF' : o.c;
          
          ctx.beginPath();
          ctx.arc(o.x, o.y, 3.5, 0, Math.PI*2);
          ctx.fill();
          
          // Shine spot on ornament
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.arc(o.x-1, o.y-1, 1, 0, Math.PI*2); ctx.fill();
      });

      // Star (The Gun Tip)
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFD700';
      ctx.translate(0, -35); // Position at top
      
      // Star shape
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      const spikes = 5;
      const outerRadius = 10;
      const innerRadius = 4;
      for (let i = 0; i < spikes * 2; i++) {
          const r = (i % 2 === 0) ? outerRadius : innerRadius;
          const a = (Math.PI * i) / spikes - Math.PI/2; // Align top point
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();

      // Reset Context
      ctx.shadowBlur = 0;
      ctx.restore();

      // 9. Crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI*2);
      ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y + 15);
      ctx.stroke();

      // HUD
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${score}`, 20, 40);

      if (!isGameOver) animationFrameId = requestAnimationFrame(update);
    };
    update();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouch);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onGameOver, onExit]);

  return (
    <div className="relative w-full max-w-2xl mx-auto border-4 border-rizz-green rounded-lg shadow-2xl overflow-hidden bg-black cursor-none">
      <div className="scanline"></div>
      <canvas ref={canvasRef} width={600} height={600} className="w-full h-auto block" />
      <button onClick={onExit} className="absolute top-4 right-4 bg-red-600/50 hover:bg-red-600 text-white font-arcade text-xs px-3 py-2 rounded border border-white/20 z-30 cursor-pointer">EXIT</button>
      <div className="absolute bottom-4 left-4 text-white/50 text-[10px] font-arcade animate-pulse">MOUSE TO AIM • SPACE TO SHOOT</div>
    </div>
  );
};
