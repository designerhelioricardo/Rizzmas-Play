
import React, { useRef, useEffect, useState } from 'react';

interface GameBounceProps {
  onGameOver: (score: number) => void;
  onExit: () => void;
}

const playSound = (type: 'jump' | 'collect' | 'stun' | 'powerup' | 'bonus') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === 'jump') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(500, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(); osc.stop(now + 0.1);
  } else if (type === 'collect') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(); osc.stop(now + 0.1);
  } else if (type === 'stun') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(); osc.stop(now + 0.5);
  } else if (type === 'powerup') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(); osc.stop(now + 0.3);
  } else if (type === 'bonus') {
    // NATAL complete melody
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now); // C
    osc.frequency.setValueAtTime(659, now + 0.1); // E
    osc.frequency.setValueAtTime(783, now + 0.2); // G
    osc.frequency.setValueAtTime(1046, now + 0.3); // C
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(); osc.stop(now + 0.5);
  }
};

export const GameBounce: React.FC<GameBounceProps> = ({ onGameOver, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cheatCodeBuffer, setCheatCodeBuffer] = useState('');
  const [debugMsg, setDebugMsg] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    let score = 0;
    let timeLeft = 60 * 2; // Starts with ~60s (assuming 60fps logic, adjusted in loop)
    let isGameOver = false;
    let cheatUsed = false;

    // Game Constants
    const GRAVITY = 0.5;
    const JUMP_FORCE = -12;
    const SUPER_JUMP_FORCE = -18;
    const GROUND_Y = canvas.height - 80;

    // NATAL Letters
    const WORD = ['N', 'A', 'T', 'A', 'L'];
    let collectedLetters = [false, false, false, false, false]; // Indices 0-4

    // Entities
    interface Elf {
      x: number;
      y: number;
      vy: number;
      color: string;
      isJumping: boolean;
      stunTimer: number; // Frames stunned
      combo: number; // Items collected in current jump
      side: 'left' | 'right';
      hasSuperJump: boolean;
      width: number;
      height: number;
    }

    const elves: Elf[] = [
      { x: canvas.width * 0.25, y: GROUND_Y, vy: 0, color: '#00D632', isJumping: false, stunTimer: 0, combo: 0, side: 'left', hasSuperJump: false, width: 40, height: 40 },
      { x: canvas.width * 0.75, y: GROUND_Y, vy: 0, color: '#D60000', isJumping: false, stunTimer: 0, combo: 0, side: 'right', hasSuperJump: false, width: 40, height: 40 }
    ];

    type ItemType = 'COOKIE' | 'CANDY' | 'CHOCO' | 'GIFT' | 'STAR' | 'SNOWBALL' | 'ORNAMENT_BAD' | 'LETTER' | 'POWER_STAR' | 'POWER_SNOWMAN' | 'POWER_BAG';

    interface Item {
      x: number;
      y: number;
      vx: number;
      type: ItemType;
      value: number;
      letterChar?: string; // If type is LETTER
      markedForDeletion: boolean;
      width: number;
      height: number;
    }

    let items: Item[] = [];

    // --- Cheat Code Listener ---
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Escape') onExit();

        const newBuffer = (cheatCodeBuffer + e.key).slice(-20).toLowerCase();
        // Since state updates inside event listener are tricky with closures in useEffect loop,
        // we'll just check a global-ish variable or use the updated ref logic, 
        // but for simplicity, we will assume the key presses are handled by a mutable string in the scope.
    };
    
    // We need a mutable reference for the cheat buffer to work inside the loop/event listener properly
    let keyBuffer = "";
    const keyListener = (e: KeyboardEvent) => {
        if (e.code === 'Escape') onExit();
        keyBuffer += e.key.toLowerCase();
        if (keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20);
        
        if (keyBuffer.endsWith('docenatal') && !cheatUsed) {
            timeLeft = 60 * 60; // Reset to 60s
            cheatUsed = true;
            playSound('bonus');
            setDebugMsg("CHEAT ACTIVATED: TIME RESET");
            setTimeout(() => setDebugMsg(""), 3000);
        }
    };
    window.addEventListener('keydown', keyListener);

    // --- Inputs ---
    const handleInput = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        if (window.TouchEvent && e instanceof TouchEvent) {
             clientX = e.touches[0].clientX;
        } else if (e instanceof MouseEvent) {
             clientX = e.clientX;
        }

        const x = clientX - rect.left;
        
        // Determine side
        const sideIndex = x < rect.width / 2 ? 0 : 1;
        const elf = elves[sideIndex];

        if (!elf.isJumping && elf.stunTimer <= 0) {
            elf.isJumping = true;
            elf.vy = elf.hasSuperJump ? SUPER_JUMP_FORCE : JUMP_FORCE;
            elf.hasSuperJump = false; // Consume powerup
            elf.combo = 0;
            playSound('jump');
        }
    };

    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', handleInput, {passive: false});

    // --- Spawn Logic ---
    const spawnItem = () => {
        const rowHeight = [150, 220, 290, 360];
        const y = rowHeight[Math.floor(Math.random() * rowHeight.length)];
        const direction = Math.random() > 0.5 ? 1 : -1;
        const x = direction === 1 ? -50 : canvas.width + 50;
        
        // Speed increases with score
        const baseSpeed = 2 + (score / 2000);
        const vx = baseSpeed * direction;

        let type: ItemType = 'COOKIE';
        let value = 10;
        let w = 30, h = 30;
        let char = undefined;

        const rand = Math.random();

        // 10% Chance for Bad Item
        if (rand < 0.1) {
            type = Math.random() > 0.5 ? 'SNOWBALL' : 'ORNAMENT_BAD';
            value = 0;
        } 
        // 5% Chance for Letter (if not full)
        else if (rand < 0.15 && collectedLetters.includes(false)) {
            type = 'LETTER';
            value = 0;
            // Find a missing letter
            const missingIndices = collectedLetters.map((c, i) => c ? -1 : i).filter(i => i !== -1);
            if (missingIndices.length > 0) {
                const idx = missingIndices[Math.floor(Math.random() * missingIndices.length)];
                char = WORD[idx];
            } else {
                type = 'COOKIE'; // Fallback
            }
        }
        // 5% Powerup
        else if (rand < 0.20) {
            const pRand = Math.random();
            if (pRand < 0.33) { type = 'POWER_STAR'; value = 0; }
            else if (pRand < 0.66) { type = 'POWER_SNOWMAN'; value = 0; }
            else { type = 'POWER_BAG'; value = 0; }
        }
        // Regular Items
        else if (rand < 0.5) { type = 'COOKIE'; value = 10; }
        else if (rand < 0.7) { type = 'CANDY'; value = 20; }
        else if (rand < 0.85) { type = 'CHOCO'; value = 30; }
        else if (rand < 0.95) { type = 'GIFT'; value = 50; }
        else { type = 'STAR'; value = 100; }

        items.push({ x, y, vx, type, value, letterChar: char, markedForDeletion: false, width: w, height: h });
    };

    // --- Helpers ---
    const drawSleigh = () => {
        ctx.fillStyle = '#8B4513';
        // Base Sleigh
        const pad = 20;
        ctx.fillRect(pad, GROUND_Y + 40, canvas.width - (pad*2), 20);
        // Runners
        ctx.strokeStyle = '#C0C0C0'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(pad, GROUND_Y + 60); ctx.lineTo(canvas.width - pad, GROUND_Y + 60); ctx.stroke();
        // Bouncy Pad (Trampoline surface)
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(pad + 40, GROUND_Y + 40, canvas.width - (pad*2) - 80, 5);
        ctx.fillStyle = '#FFD700'; // Springs visuals
        for(let i=0; i<10; i++) ctx.fillRect(pad + 40 + (i * 60), GROUND_Y + 45, 5, 10);
    };

    const drawElf = (elf: Elf) => {
        ctx.save();
        ctx.translate(elf.x, elf.y);
        
        // Stun effect
        if (elf.stunTimer > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.5) * 0.2;
            ctx.rotate(Math.sin(frameCount * 0.2) * 0.2);
        }

        const facingRight = elf.side === 'left';
        if (!facingRight) ctx.scale(-1, 1);

        // -- LEGS / BOOTS --
        ctx.fillStyle = '#111';
        // Left Leg
        ctx.fillRect(-8, 25, 6, 10);
        ctx.fillRect(-10, 32, 8, 4); // Boot tip
        // Right Leg
        ctx.fillRect(2, 25, 6, 10);
        ctx.fillRect(0, 32, 8, 4); // Boot tip

        // -- ARMS (Behind body if jumping?) --
        // Arms animation: Up if jumping, Down if idle
        const armY = elf.isJumping ? -15 : 5;
        
        // Back Arm
        ctx.fillStyle = elf.color; 
        ctx.beginPath(); ctx.arc(14, 10 + armY, 5, 0, Math.PI*2); ctx.fill(); // Hand
        ctx.strokeStyle = elf.color; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(8, 5); ctx.lineTo(14, 10 + armY); ctx.stroke(); // Arm limb

        // -- BODY (Tunic) --
        ctx.fillStyle = elf.color;
        ctx.beginPath();
        ctx.moveTo(-15, 25); // Bottom Left
        ctx.lineTo(15, 25);  // Bottom Right
        ctx.lineTo(10, 0);   // Top Right (shoulder)
        ctx.lineTo(-10, 0);  // Top Left (shoulder)
        ctx.fill();

        // Belt
        ctx.fillStyle = '#111';
        ctx.fillRect(-13, 15, 26, 5);
        ctx.fillStyle = '#FFD700'; // Buckle
        ctx.fillRect(-4, 14, 8, 7);
        ctx.fillStyle = '#000'; // Inner Buckle
        ctx.fillRect(-2, 16, 4, 3);

        // Collar (Fur)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2);
        ctx.fill();

        // -- HEAD --
        // Ears (Behind head)
        ctx.fillStyle = '#ffccaa';
        ctx.beginPath();
        ctx.moveTo(-14, -10); ctx.lineTo(-22, -15); ctx.lineTo(-14, -5); ctx.fill(); // Left Ear
        ctx.moveTo(14, -10); ctx.lineTo(22, -15); ctx.lineTo(14, -5); ctx.fill();   // Right Ear

        // Face Shape
        ctx.beginPath(); ctx.arc(0, -10, 14, 0, Math.PI*2); ctx.fill();

        // Facial Features
        if (elf.stunTimer > 0) {
             ctx.fillStyle = '#111';
             ctx.font = 'bold 12px sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText('X X', 0, -8);
        } else {
             // Eyes
             ctx.fillStyle = '#111';
             ctx.beginPath(); ctx.arc(-5, -12, 2.5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(5, -12, 2.5, 0, Math.PI*2); ctx.fill();
             // Shine
             ctx.fillStyle = '#FFF';
             ctx.beginPath(); ctx.arc(-6, -13, 1, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(4, -13, 1, 0, Math.PI*2); ctx.fill();

             // Cheeks
             ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
             ctx.beginPath(); ctx.arc(-8, -7, 3, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(8, -7, 3, 0, Math.PI*2); ctx.fill();
             
             // Smile
             ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1;
             ctx.beginPath(); ctx.arc(0, -8, 6, 0.3, Math.PI - 0.3); ctx.stroke();
        }

        // -- HAT --
        ctx.fillStyle = elf.color;
        ctx.beginPath();
        ctx.moveTo(-14, -18);
        ctx.quadraticCurveTo(0, -50, 25, -20); // Floppy tip to right
        ctx.lineTo(14, -18);
        ctx.closePath();
        ctx.fill();

        // Hat Trim (Fur)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.roundRect(-16, -22, 32, 8, 4);
        ctx.fill();

        // Pompom
        ctx.beginPath(); ctx.arc(25, -20, 5, 0, Math.PI*2); ctx.fill();

        // -- FRONT ARM --
        ctx.fillStyle = elf.color; 
        ctx.beginPath(); ctx.arc(-14, 10 + armY, 5, 0, Math.PI*2); ctx.fill(); // Hand
        ctx.strokeStyle = elf.color; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(-14, 10 + armY); ctx.stroke(); // Arm limb

        // Super Jump Aura
        if (elf.hasSuperJump) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 10, 45 + Math.sin(frameCount * 0.2)*5, 0, Math.PI*2); ctx.stroke();
        }

        ctx.restore();
    };

    const drawItem = (item: Item) => {
        ctx.save();
        ctx.translate(item.x, item.y);
        
        if (item.type === 'COOKIE') {
            ctx.fillStyle = '#D2691E';
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFF'; // Frosting dots
            ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(4, 2, 2, 2);
        } else if (item.type === 'CANDY') {
            ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, -5, 8, Math.PI, 0); ctx.lineTo(8, 10); ctx.stroke();
        } else if (item.type === 'GIFT') {
            ctx.fillStyle = '#4169E1'; ctx.fillRect(-12, -12, 24, 24);
            ctx.fillStyle = '#FFD700'; ctx.fillRect(-12, -4, 24, 8); ctx.fillRect(-4, -12, 8, 24);
        } else if (item.type === 'SNOWBALL') {
            ctx.fillStyle = '#E0F7FA'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
        } else if (item.type === 'LETTER') {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 24px "Press Start 2P"';
            ctx.fillText(item.letterChar || '?', -10, 8);
        } else if (item.type === 'POWER_STAR') {
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -4); ctx.lineTo(15, -4); ctx.lineTo(6, 4); ctx.lineTo(10, 15); ctx.lineTo(0, 8); ctx.lineTo(-10, 15); ctx.lineTo(-6, 4); ctx.lineTo(-15, -4); ctx.lineTo(-4, -4); ctx.fill();
        }
        else if (item.type === 'ORNAMENT_BAD') {
            ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.stroke();
        }
        else {
            // Default circle
            ctx.fillStyle = '#FF00FF'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    };

    // --- Main Loop ---
    const update = () => {
        if (isGameOver) return;
        frameCount++;

        // Time Management (Assume 60FPS)
        if (frameCount % 60 === 0) {
            timeLeft--;
            if (timeLeft <= 0) {
                isGameOver = true;
                onGameOver(score);
            }
        }

        // Spawn Items
        if (frameCount % 40 === 0) {
            spawnItem();
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grd.addColorStop(0, '#020617');
        grd.addColorStop(1, '#1e293b');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Snow
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for(let i=0; i<30; i++) {
            const sx = (frameCount * 2 + i * 50) % canvas.width;
            const sy = (frameCount * 3 + i * 43) % canvas.height;
            ctx.fillRect(sx, sy, 2, 2);
        }

        drawSleigh();

        // Update & Draw Elves
        elves.forEach(elf => {
            // Physics
            if (elf.isJumping) {
                elf.vy += GRAVITY;
                elf.y += elf.vy;
                
                // Ground hit
                if (elf.y >= GROUND_Y) {
                    elf.y = GROUND_Y;
                    elf.isJumping = false;
                    elf.vy = 0;
                    elf.combo = 0; // Reset combo on ground
                }
            } else if (elf.stunTimer > 0) {
                elf.stunTimer--;
            }

            drawElf(elf);
        });

        // Update & Draw Items
        items.forEach(item => {
            item.x += item.vx;
            
            if (item.x < -100 || item.x > canvas.width + 100) {
                item.markedForDeletion = true;
            }

            // Collision
            elves.forEach(elf => {
                // AABB simplified
                const dx = Math.abs(elf.x - item.x);
                const dy = Math.abs((elf.y - 10) - item.y); // Elf center offset
                
                if (dx < 30 && dy < 30 && !item.markedForDeletion) {
                    if (item.type === 'SNOWBALL' || item.type === 'ORNAMENT_BAD') {
                        // HIT BAD
                        elf.stunTimer = 240; // 4 seconds
                        elf.isJumping = false; // Fall down
                        elf.y = GROUND_Y;
                        playSound('stun');
                    } else {
                        // HIT GOOD
                        item.markedForDeletion = true;
                        
                        // Handle Types
                        if (item.type === 'LETTER') {
                            if (item.letterChar) {
                                let found = false;
                                // Find first uncollected index of this char
                                for(let i=0; i<WORD.length; i++) {
                                    if(WORD[i] === item.letterChar && !collectedLetters[i]) {
                                        collectedLetters[i] = true;
                                        timeLeft += 2;
                                        found = true;
                                        break;
                                    }
                                }
                                if(!found) score += 10; // Already have letter, just points

                                // Check Full Word
                                if(collectedLetters.every(c => c)) {
                                    timeLeft += 20;
                                    collectedLetters = [false, false, false, false, false];
                                    playSound('bonus');
                                    setDebugMsg("NATAL BONUS! +20s");
                                    setTimeout(() => setDebugMsg(""), 2000);
                                } else {
                                    playSound('collect');
                                }
                            }
                        }
                        else if (item.type === 'POWER_STAR') {
                            elf.hasSuperJump = true;
                            playSound('powerup');
                            setDebugMsg("SUPER JUMP READY!");
                            setTimeout(() => setDebugMsg(""), 1500);
                        }
                        else if (item.type === 'POWER_SNOWMAN') {
                            // Freeze Time logic handled by just adding time effectively or pausing decrement
                            // Let's add time for simplicity
                            timeLeft += 5;
                            playSound('powerup');
                            setDebugMsg("TIME EXTENDED!");
                            setTimeout(() => setDebugMsg(""), 1500);
                        }
                        else if (item.type === 'POWER_BAG') {
                            elf.combo += 5; // Instant multiplier boost
                            playSound('powerup');
                        }
                        else {
                            // Score with Combo
                            elf.combo++;
                            const points = item.value * elf.combo;
                            score += points;
                            playSound('collect');
                        }
                    }
                }
            });

            drawItem(item);
        });

        items = items.filter(i => !i.markedForDeletion);

        // UI HUD
        // Time
        ctx.fillStyle = timeLeft < 10 ? '#FF0000' : '#FFF';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText(`TIME: ${timeLeft}`, canvas.width - 160, 40);

        // Score
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`SCORE: ${score}`, 20, 40);

        // Letters
        const letterX = canvas.width / 2 - 80;
        WORD.forEach((char, i) => {
             ctx.fillStyle = collectedLetters[i] ? '#00D632' : '#333';
             ctx.fillText(char, letterX + (i * 40), 50);
             if (!collectedLetters[i]) {
                 ctx.strokeStyle = '#555';
                 ctx.strokeText(char, letterX + (i * 40), 50);
             }
        });

        // Debug/Message Overlay
        if (debugMsg) {
            ctx.fillStyle = '#FFF';
            ctx.font = '12px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(debugMsg, canvas.width/2, 100);
            ctx.textAlign = 'left'; // reset
        }
        
        // Tap Zones
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(0, 0, canvas.width/2, canvas.height); // Left zone visual hint
        ctx.fillRect(canvas.width/2, 0, canvas.width/2, canvas.height); // Right zone visual hint
        
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText("TAP LEFT", 40, canvas.height - 20);
        ctx.fillText("TAP RIGHT", canvas.width - 120, canvas.height - 20);

        if (!isGameOver) animationFrameId = requestAnimationFrame(update);
    };
    update();

    return () => {
        window.removeEventListener('keydown', keyListener);
        canvas.removeEventListener('mousedown', handleInput);
        canvas.removeEventListener('touchstart', handleInput);
        cancelAnimationFrame(animationFrameId);
    };

  }, [onGameOver, onExit]);

  return (
    <div className="relative w-full max-w-2xl mx-auto border-4 border-rizz-green rounded-lg shadow-2xl overflow-hidden bg-black select-none">
      <div className="scanline"></div>
      {/* Decorative Lights Frame */}
      <div className="absolute inset-0 border-[8px] border-dashed border-white/20 pointer-events-none z-10 animate-pulse"></div>
      
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-auto block" />
      <button onClick={onExit} className="absolute top-4 right-4 bg-red-600/50 hover:bg-red-600 text-white font-arcade text-xs px-3 py-2 rounded border border-white/20 z-30">EXIT</button>
    </div>
  );
};
