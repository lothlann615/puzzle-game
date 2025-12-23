
import React, { useRef, useEffect, useCallback } from 'react';
import { GameStatus, type PuzzlePiece, type Silhouette, type Obstacle, type Zone, type Particle, type LevelConfig, Accuracy, SpeedRating, type ShapeType, type Vector2 } from '../types';
import { COLORS, GAME_CONFIG, SHAPES, BACKGROUND_IMAGES } from '../constants';
import { audio } from '../services/audioService';

interface GameCanvasProps {
  status: GameStatus;
  level: number;
  hasShield: boolean;
  comboCount: number;
  isComboMode: boolean;
  onLevelComplete: (stats: { accuracy: Accuracy; speed: SpeedRating; timeRatio: number }) => void;
  onLevelFail: (reason: string) => void;
  onConsumeShield: () => void;
  onUpdateCombo: (count: number, isMode: boolean) => void;
  onTimeUpdate: (progress: number) => void;
  onGameOver?: (reason: string) => void;
}

// --- VISUAL EFFECTS ---
class RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = 120;
    this.life = 25;
    this.maxLife = 25;
    this.color = color;
  }

  update() {
    this.life--;
    // Ease out expand
    const t = 1 - (this.life / this.maxLife);
    const ease = 1 - Math.pow(1 - t, 3);
    this.radius = 10 + (this.maxRadius - 10) * ease;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    // Outer Ring
    ctx.lineWidth = 4 + 4 * alpha;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.stroke();

    // Inner Flash (only at start)
    if (this.life > this.maxLife * 0.8) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
    }

    ctx.restore();
  }
}

// --- ENHANCED: Wind Particle System ---
class WindParticle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  speed: number;
  amplitude: number;
  frequency: number;
  phase: number;
  color: string;
  size: number;

  constructor(z: Zone) {
    this.reset(z);
    const progress = Math.random();
    this.x += this.vx * progress * this.maxLife;
    this.y += this.vy * progress * this.maxLife;
    this.life = this.maxLife * (1 - progress);
  }

  reset(z: Zone) {
    if (!z.lineStart || !z.lineEnd || !z.windVector) return;
    const t = Math.random();
    this.startX = z.lineStart.x + (z.lineEnd.x - z.lineStart.x) * t;
    this.startY = z.lineStart.y + (z.lineEnd.y - z.lineStart.y) * t;
    this.x = this.startX;
    this.y = this.startY;

    // Increased speed for stronger visual effect
    this.speed = 4.0 + Math.random() * 8.0;
    this.vx = z.windVector.x * this.speed;
    this.vy = z.windVector.y * this.speed;

    this.maxLife = (z.maxDist || 300) / this.speed;
    this.life = this.maxLife;

    const normalizedSpeed = (this.speed - 4.0) / 8.0;
    this.amplitude = (1 - normalizedSpeed) * 25 + 5;
    this.frequency = (1 - normalizedSpeed) * 0.15 + 0.05;
    this.phase = Math.random() * Math.PI * 2;
    
    const h = 170 + Math.random() * 50;
    const s = 70 + Math.random() * 30;
    const l = 50 + normalizedSpeed * 40;
    this.color = `hsla(${h}, ${s}%, ${l}%, 0.8)`;
    this.size = 0.5 + normalizedSpeed * 2.5;
  }

  update(z: Zone, time: number) {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.reset(z);
  }

  draw(ctx: CanvasRenderingContext2D, z: Zone, time: number) {
    if (!z.windVector) return;
    const nx = -z.windVector.y;
    const ny = z.windVector.x;
    ctx.beginPath();
    const wispSegments = 6;
    const wispStep = 4;
    for (let i = 0; i < wispSegments; i++) {
      const ageBack = i * wispStep;
      const tx = this.x - z.windVector.x * ageBack;
      const ty = this.y - z.windVector.y * ageBack;
      const spatialOffset = (this.maxLife - this.life - i) * 0.2;
      const waveParam = (time + spatialOffset) * this.frequency + this.phase;
      const turbulence = Math.sin(waveParam) * this.amplitude;
      const px = tx + nx * turbulence;
      const py = ty + ny * turbulence;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineWidth = this.size;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

class WindSystem {
  particles: WindParticle[] = [];
  zone: Zone;
  constructor(zone: Zone) {
    this.zone = zone;
    const particleCount = 45; 
    for (let i = 0; i < particleCount; i++) this.particles.push(new WindParticle(zone));
  }
  update(time: number) { this.particles.forEach(p => p.update(this.zone, time)); }
  draw(ctx: CanvasRenderingContext2D, time: number) { this.particles.forEach(p => p.draw(ctx, this.zone, time)); }
}

class HoleParticle {
  x: number; y: number; angle: number; radius: number; speed: number; color: string; maxRadius: number;
  constructor(maxRadius: number) {
    this.maxRadius = maxRadius;
    this.reset();
    this.radius = Math.random() * maxRadius; 
  }
  reset() {
    this.angle = Math.random() * Math.PI * 2;
    this.radius = this.maxRadius;
    this.speed = 0.02 + Math.random() * 0.03;
    this.updateColor();
  }
  updateColor() {
    const ratio = this.radius / this.maxRadius;
    const r = Math.floor(50 * ratio); const g = Math.floor(20 * ratio); const b = Math.floor(100 + 155 * ratio);
    const a = 0.5 + 0.5 * ratio; this.color = `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  update() {
    this.radius -= 0.5; 
    const speedMultiplier = 1 + (1 - (this.radius / this.maxRadius)) * 2;
    this.angle += this.speed * speedMultiplier;
    this.updateColor();
    if (this.radius < 5) this.reset();
    this.x = Math.cos(this.angle) * this.radius;
    this.y = Math.sin(this.angle) * this.radius;
  }
}

class BlackHoleSystem {
  particles: HoleParticle[] = []; x: number; y: number; radius: number;
  constructor(x: number, y: number, radius: number) {
    this.x = x; this.y = y; this.radius = radius;
    for (let i = 0; i < 60; i++) this.particles.push(new HoleParticle(radius));
  }
  update() { this.particles.forEach(p => p.update()); }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter';
    this.particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2 + (p.radius/this.radius)*2, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); });
    ctx.restore();
  }
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  status, level, hasShield, comboCount, isComboMode,
  onLevelComplete, onLevelFail, onConsumeShield, onUpdateCombo, onTimeUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const gameState = useRef({
    pieces: [] as PuzzlePiece[], silhouettes: [] as Silhouette[], obstacles: [] as Obstacle[], zones: [] as Zone[],
    particles: [] as Particle[], sparks: [] as Particle[], ripples: [] as RippleEffect[],
    bgCanvas: null as HTMLCanvasElement | null,
    bhCanvas: null as HTMLCanvasElement | null, windCanvas: null as HTMLCanvasElement | null, 
    bhSystems: [] as BlackHoleSystem[], windSystems: [] as WindSystem[],
    startTime: 0, timeLimit: 0, levelStartTime: 0, lastFrameTime: 0, isDragging: false,
    dragOffset: { x: 0, y: 0 }, 
    pointerPos: { x: 0, y: 0 },
    drift: { x: 0, y: 0 },
    activePieceId: null as string | null,
    screenShake: 0, levelCompleteProcessed: false, windAnimationOffset: 0, globalTime: 0,
  });

  const requestRef = useRef<number>(0);

  const drawShapePath = (ctx: CanvasRenderingContext2D, type: ShapeType, x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    const cx = x + w / 2; const cy = y + h / 2; const r = w / 2;
    switch (type) {
      case 'circle': ctx.arc(cx, cy, r, 0, Math.PI * 2); break;
      case 'triangle': ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i; const px = cx + r * Math.cos(angle); const py = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); break;
      case 'puzzle_classic':
        const tabSize = w * 0.25; ctx.moveTo(x, y); ctx.lineTo(x + w * 0.35, y);
        ctx.bezierCurveTo(x + w * 0.35, y - tabSize, x + w * 0.65, y - tabSize, x + w * 0.65, y);
        ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.35);
        ctx.bezierCurveTo(x + w + tabSize, y + h * 0.35, x + w + tabSize, y + h * 0.65, x + w, y + h * 0.65);
        ctx.lineTo(x + w, y + h); ctx.lineTo(x + w * 0.65, y + h);
        ctx.bezierCurveTo(x + w * 0.65, y + h - tabSize, x + w * 0.35, y + h - tabSize, x + w * 0.35, y + h);
        ctx.lineTo(x, y + h); ctx.lineTo(x, y + h * 0.65);
        ctx.bezierCurveTo(x + tabSize, y + h * 0.65, x + tabSize, y + h * 0.35, x, y + h * 0.35);
        ctx.closePath(); break;
      case 'square': default: ctx.roundRect(x, y, w, h, 12); break;
    }
  };

  // Helper: Distance from a point to a line segment
  const getDistPointToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateWindForce = (z: Zone, px: number, py: number): { x: number, y: number } | null => {
      if (z.type !== 'wind' || !z.lineStart || !z.lineEnd || !z.windVector || !z.maxDist) return null;
      const vLine = { x: z.lineEnd.x - z.lineStart.x, y: z.lineEnd.y - z.lineStart.y };
      const vPoint = { x: px - z.lineStart.x, y: py - z.lineStart.y };
      const lineLenSq = vLine.x * vLine.x + vLine.y * vLine.y;
      const t = (vPoint.x * vLine.x + vPoint.y * vLine.y) / lineLenSq;
      
      if (t >= 0 && t <= 1) {
          const dist = vPoint.x * z.windVector.x + vPoint.y * z.windVector.y;
          if (dist > 0 && dist < z.maxDist) {
              const ratio = dist / z.maxDist;
              const smoothFactor = 0.3 + 0.7 * (1 - ratio);
              const strength = smoothFactor * z.strength;
              return { x: z.windVector.x * strength, y: z.windVector.y * strength };
          }
      }
      return null;
  };

  const initLevel = useCallback(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    const margin = 80;
    const pieceMargin = 120;
    const size = GAME_CONFIG.pieceSize;

    const config: LevelConfig = getLevelConfig(level);
    const state = gameState.current;

    state.pieces = []; state.silhouettes = []; state.obstacles = []; state.zones = [];
    state.particles = []; state.sparks = []; state.ripples = []; state.bhSystems = []; state.windSystems = [];
    state.startTime = Date.now(); state.timeLimit = config.timeLimit * 1000;
    state.levelStartTime = Date.now(); state.levelCompleteProcessed = false; state.globalTime = 0;
    state.isDragging = false; state.activePieceId = null; state.drift = {x: 0, y: 0};
    
    state.bgCanvas = document.createElement('canvas'); state.bgCanvas.width = width; state.bgCanvas.height = height;
    state.bhCanvas = document.createElement('canvas'); state.bhCanvas.width = width; state.bhCanvas.height = height;
    state.windCanvas = document.createElement('canvas'); state.windCanvas.width = width; state.windCanvas.height = height;

    const bgCtx = state.bgCanvas.getContext('2d');
    if (bgCtx) {
        // Default Fill
        bgCtx.fillStyle = '#60a5fa'; bgCtx.fillRect(0,0,width,height);
        
        // CUSTOM BACKGROUND IMAGE LOGIC
        if (BACKGROUND_IMAGES && BACKGROUND_IMAGES.length > 0) {
            const randomImgUrl = BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Support external images
            img.src = randomImgUrl;
            img.onload = () => {
                // Draw Image with "Cover" fit
                const imgRatio = img.width / img.height;
                const canvasRatio = width / height;
                let renderW, renderH, offsetX, offsetY;

                if (canvasRatio > imgRatio) {
                    renderW = width;
                    renderH = width / imgRatio;
                    offsetX = 0;
                    offsetY = (height - renderH) / 2;
                } else {
                    renderH = height;
                    renderW = height * imgRatio;
                    offsetX = (width - renderW) / 2;
                    offsetY = 0;
                }
                
                // Clear and Draw
                bgCtx.clearRect(0, 0, width, height);
                bgCtx.drawImage(img, offsetX, offsetY, renderW, renderH);
                
                // Optional: Add a subtle overlay so pieces are visible
                bgCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                bgCtx.fillRect(0, 0, width, height);
            };
            img.onerror = () => {
                // Fallback if image fails
                generateCartoonBackground(bgCtx, width, height);
            };
        } else {
            // No custom images, use procedural
            generateCartoonBackground(bgCtx, width, height);
        }
    }

    const generatedIndices = new Set<number>();
    
    // ----------------------------------------------------------------
    // 1. Generate Pieces & Silhouettes (First priority, sets the stage)
    // ----------------------------------------------------------------
    for (let i = 0; i < config.pieces; i++) {
      if (generatedIndices.has(i)) continue;
      const id = `p_${i}`; 
      const isLinked = config.linkedPieces && i % 2 === 0 && i + 1 < config.pieces;
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      
      let offsetX = 0, offsetY = 0;
      let groupW = size, groupH = size;
      
      if (isLinked) {
          const minGap = size + 80, maxGap = Math.min(width * 0.4, 250);
          const gap = minGap + Math.random() * (maxGap - minGap);
          const angle = Math.random() * Math.PI * 2;
          offsetX = Math.cos(angle) * gap; offsetY = Math.sin(angle) * gap;
          groupW = size + Math.abs(offsetX); groupH = size + Math.abs(offsetY);
      }

      let gpx, gpy;
      gpx = pieceMargin + Math.random() * (width - pieceMargin * 2 - groupW);
      gpy = pieceMargin + Math.random() * (height - pieceMargin * 2 - groupH);

      const pieceA: PuzzlePiece = { id, x: gpx + (offsetX < 0 ? -offsetX : 0), y: gpy + (offsetY < 0 ? -offsetY : 0), width: size, height: size, color: COLORS.primary, isDragging: false, hasBeenTouched: false, rotation: 0, linkedId: isLinked ? `p_${i+1}` : undefined, shape };
      state.pieces.push(pieceA);
      
      if (isLinked) {
          const pieceB: PuzzlePiece = { id: `p_${i+1}`, x: pieceA.x + offsetX, y: pieceA.y + offsetY, width: size, height: size, color: COLORS.primary, isDragging: false, hasBeenTouched: false, rotation: 0, linkedId: id, shape: SHAPES[Math.floor(Math.random() * SHAPES.length)] };
          state.pieces.push(pieceB);
          generatedIndices.add(i + 1);
      }
      generatedIndices.add(i);

      let gtx, gty, sAttempts = 0;
      do {
          gtx = pieceMargin + Math.random() * (width - pieceMargin * 2 - groupW);
          gty = pieceMargin + Math.random() * (height - pieceMargin * 2 - groupH);
          if (Math.hypot(gtx - gpx, gty - gpy) > 150) break;
          sAttempts++;
      } while (sAttempts < 50);

      const sAX = gtx + (offsetX < 0 ? -offsetX : 0);
      const sAY = gty + (offsetY < 0 ? -offsetY : 0);
      state.silhouettes.push({ id: `s_${i}`, targetId: id, x: sAX, y: sAY, width: size, height: size, isFake: false, shape: pieceA.shape });
      if (isLinked) {
          state.silhouettes.push({ id: `s_${i+1}`, targetId: `p_${i+1}`, x: sAX + offsetX, y: sAY + offsetY, width: size, height: size, isFake: false, shape: state.pieces[state.pieces.length-1].shape });
      }
    }

    // Add Fake Silhouettes
    for (let i = 0; i < config.fakeSilhouettes; i++) {
        let fx, fy, fAtt = 0;
        do {
            fx = pieceMargin + Math.random() * (width - pieceMargin * 2 - size);
            fy = pieceMargin + Math.random() * (height - pieceMargin * 2 - size);
            fAtt++;
        } while (fAtt < 20);
        state.silhouettes.push({ id: `fs_${i}`, targetId: 'fake', x: fx, y: fy, width: size, height: size, isFake: true, shape: SHAPES[Math.floor(Math.random() * SHAPES.length)] });
    }

    // ----------------------------------------------------------------
    // 2. Generate Wind & Blackholes (Moved UP for priority)
    // ----------------------------------------------------------------
    // Rule: Source (Line/Center) must NOT overlap Pieces/Silhouettes. 
    // Effect area CAN overlap.
    for (let i = 0; i < config.windZones; i++) {
        let x1, y1, x2, y2, cx, cy;
        let valid = false;
        let attempts = 0;
        let zone: Zone | null = null;
        let sys: WindSystem | null = null;
        
        while (!valid && attempts < 100) {
            attempts++;
            let vx, vy, length = 150 + Math.random() * 100, maxDist = width * 0.6;
            const isHorizontal = Math.random() > 0.5;
            if (isHorizontal) { x1 = margin + Math.random() * (width - margin*2 - length); y1 = margin + Math.random() * (height - margin*2); x2 = x1 + length; y2 = y1; vy = y1 < height/2 ? 1 : -1; vx = 0; }
            else { x1 = margin + Math.random() * (width - margin*2); y1 = margin + Math.random() * (height - margin*2 - length); x2 = x1; y2 = y1 + length; vx = x1 < width/2 ? 1 : -1; vy = 0; }
            cx = (x1+x2)/2; cy = (y1+y2)/2; const angle = (Math.random()-0.5)*0.2;
            const rotate = (px:number, py:number) => ({ x: cx + (px-cx)*Math.cos(angle) - (py-cy)*Math.sin(angle), y: cy + (px-cx)*Math.sin(angle) + (py-cy)*Math.cos(angle) });
            const p1 = rotate(x1, y1), p2 = rotate(x2, y2);
            
            // Safety Check: Line segment vs Pieces/Silhouettes
            let safe = true;
            const safeDist = 60; // Margin around pieces
            
            for(const p of state.pieces) {
                if (getDistPointToSegment(p.x + p.width/2, p.y + p.height/2, p1.x, p1.y, p2.x, p2.y) < safeDist) { safe = false; break; }
            }
            if(safe) {
                for(const s of state.silhouettes) {
                   if (getDistPointToSegment(s.x + s.width/2, s.y + s.height/2, p1.x, p1.y, p2.x, p2.y) < safeDist) { safe = false; break; }
                }
            }

            if (!safe) continue;

            const dx = p2.x-p1.x, dy = p2.y-p1.y; let nx = -dy, ny = dx; const len = Math.hypot(nx, ny); nx/=len; ny/=len;
            if (nx*vx + ny*vy < 0) { nx = -nx; ny = -ny; }
            // Increased strength to 4.0 for stronger wind effect
            zone = { id: `z_w_${i}`, type: 'wind', x: cx, y: cy, lineStart: p1, lineEnd: p2, windVector: { x: nx, y: ny }, strength: 4.0, maxDist: maxDist };
            sys = new WindSystem(zone);
            valid = true;
        }
        if (zone && sys) { state.zones.push(zone); state.windSystems.push(sys); }
    }

    for (let i = 0; i < config.blackHoles; i++) {
      let bx, by;
      let valid = false;
      let att = 0;
      
      while(!valid && att < 100) {
          att++;
          bx = margin + Math.random() * (width - margin*2); 
          by = margin + Math.random() * (height - margin*2); 
          
          // Safety Check: Center vs Pieces/Silhouettes
          let safe = true;
          const safeDist = 70;
          for(const p of state.pieces) {
              if (Math.hypot(p.x + p.width/2 - bx, p.y + p.height/2 - by) < safeDist) { safe = false; break; }
          }
          if (safe) {
              for(const s of state.silhouettes) {
                  if (Math.hypot(s.x + s.width/2 - bx, s.y + s.height/2 - by) < safeDist) { safe = false; break; }
              }
          }

          if(safe) valid = true;
      }
      
      if (valid) {
          const zone = { id: `z_b_${i}`, type: 'blackhole' as const, x: bx!, y: by!, radius: 250, strength: 1.8 };
          state.zones.push(zone); state.bhSystems.push(new BlackHoleSystem(bx!, by!, 250));
      }
    }

    // ----------------------------------------------------------------
    // 3. Generate Static Spikes
    // ----------------------------------------------------------------
    // Rule: Cannot overlap Pieces/Silhouettes. Can overlap Zones.
    for (let i = 0; i < config.staticSpikes; i++) {
        let sx, sy;
        let valid = false;
        let attempts = 0;
        
        while (!valid && attempts < 100) {
            attempts++;
            sx = margin + Math.random() * (width - margin * 2);
            sy = margin + Math.random() * (height - margin * 2);
            
            let safe = true;
            const safeDist = 50; 
            // Check Pieces
            for(const p of state.pieces) {
                if(Math.hypot(p.x + p.width/2 - sx, p.y + p.height/2 - sy) < safeDist + p.width/2) { safe = false; break; }
            }
            // Check Silhouettes
            if(safe) {
                for(const s of state.silhouettes) {
                    if(Math.hypot(s.x + s.width/2 - sx, s.y + s.height/2 - sy) < safeDist + s.width/2) { safe = false; break; }
                }
            }
            // Check existing obstacles
            if(safe) {
                for(const o of state.obstacles) {
                    if(Math.hypot(o.x - sx, o.y - sy) < 40) { safe = false; break; }
                }
            }

            if (safe) valid = true;
        }
        
        if (valid) {
             state.obstacles.push({
                id: `obs_s_${i}`, type: 'spike_static', x: sx!, y: sy!, width: 50, height: 50, vx: 0, vy: 0
            });
        }
    }

    // ----------------------------------------------------------------
    // 4. Generate Dynamic Balls
    // ----------------------------------------------------------------
    // Rule: Initial position safe from Piece + 2s Trajectory safe from Piece.
    for (let i = 0; i < config.dynamicSpikes; i++) {
        let bAtt = 0;
        let validBall = false;
        
        while (!validBall && bAtt < 100) {
            bAtt++;
            const spawnMargin = 60;
            const bx = spawnMargin + Math.random() * (width - spawnMargin*2);
            const by = spawnMargin + Math.random() * (height - spawnMargin*2);

            // 1. Initial Position Safety Check (Strict against Pieces)
            let safe = true;
            for(const p of state.pieces) {
                 if (Math.hypot(p.x + p.width/2 - bx, p.y + p.height/2 - by) < 80) { safe = false; break; }
            }
            if(!safe) continue;

            // 2. Trajectory Safety Check (Simulate first 2 seconds ~ 120 frames)
            const randNormal = (Math.random() + Math.random() + Math.random()) / 3;
            
            // ADJUSTED SPEED DIFFICULTY
            let minSpeed = 1.5;
            let speedRange = 9.0;
            
            // Levels 1-15: Slower speed (3-6)
            if (level <= 15) {
                minSpeed = 3.0;
                speedRange = 3.0; 
            }
            
            const speed = minSpeed + randNormal * speedRange;

            const angle = Math.random() * Math.PI * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            let simX = bx;
            let simY = by;
            let simVx = vx;
            let simVy = vy;
            let trajectorySafe = true;
            const ballR = 9; // Reduzed size (18 / 2) from original 14

            for (let f = 0; f < 120; f++) {
                simX += simVx;
                simY += simVy;
                // Bounce
                if (simX < ballR || simX > width - ballR) simVx *= -1;
                if (simY < ballR || simY > height - ballR) simVy *= -1;
                
                // Check against pieces (Critical Safety)
                for (const p of state.pieces) {
                     const pCx = p.x + p.width/2;
                     const pCy = p.y + p.height/2;
                     const pR = p.width/2;
                     // Require distance > ballR + pR + SafetyBuffer
                     if (Math.hypot(simX - pCx, simY - pCy) < ballR + pR + 40) {
                         trajectorySafe = false;
                         break;
                     }
                }
                if (!trajectorySafe) break;
            }

            if (trajectorySafe) {
                state.obstacles.push({
                    id: `obs_d_${i}`, type: 'ball_dynamic', x: bx, y: by, width: 18, height: 18, // Smaller size (Radius 9)
                    vx: vx, vy: vy
                });
                validBall = true;
            }
        }
    }
  }, [level]);

  const generateCartoonBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#60a5fa'); skyGrad.addColorStop(0.6, '#bfdbfe'); skyGrad.addColorStop(1, '#e0f2fe'); 
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for(let i=0; i<8; i++) {
        const cx = Math.random() * w, cy = Math.random() * (h * 0.4), r = 30 + Math.random() * 40;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.arc(cx + r*0.6, cy - r*0.3, r*0.8, 0, Math.PI*2); ctx.arc(cx + r*1.2, cy, r*0.7, 0, Math.PI*2); ctx.fill();
    }
    const drawHill = (yOffset: number, color: string, amp: number, freq: number) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, yOffset);
        for(let x=0; x<=w; x+=10) ctx.lineTo(x, yOffset + Math.sin(x * freq) * amp);
        ctx.lineTo(w, h); ctx.fill();
    };
    drawHill(h * 0.5, '#4ade80', 40, 0.005); drawHill(h * 0.65, '#22c55e', 30, 0.008); drawHill(h * 0.8, '#16a34a', 20, 0.012);
  };

  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
      canvasRef.current.width = containerRef.current.clientWidth; canvasRef.current.height = containerRef.current.clientHeight;
      if (status === GameStatus.PLAYING) initLevel();
    }
  }, [status, initLevel]);

  // --- PHYSICS & RENDERING LOOP ---
  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;
    const state = gameState.current; const ctx = canvasRef.current?.getContext('2d'); if (!ctx || !canvasRef.current) return;
    const { width, height } = canvasRef.current;
    
    // Time & Particles
    state.globalTime += 0.05;
    const elapsed = Date.now() - state.startTime;
    onTimeUpdate(Math.max(0, 1 - (elapsed / state.timeLimit)));
    if (elapsed > state.timeLimit && !state.levelCompleteProcessed && !state.isDragging) { handleCollisionFailure(state, "Time Out"); return; }
    if (state.screenShake > 0) state.screenShake *= 0.9;
    
    // Update Systems
    state.bhSystems.forEach(sys => sys.update());
    state.windSystems.forEach(sys => sys.update(state.globalTime));
    
    // Update Ripples
    state.ripples = state.ripples.filter(r => r.life > 0);
    state.ripples.forEach(r => r.update());

    // Update Dynamic Obstacles
    state.obstacles.forEach(o => {
        if (o.type === 'ball_dynamic') {
            o.x += o.vx;
            o.y += o.vy;
            const r = o.width / 2;
            if (o.x < r || o.x > width - r) o.vx *= -1;
            if (o.y < r || o.y > height - r) o.vy *= -1;
            // Clamp to screen
            o.x = Math.max(r, Math.min(width - r, o.x));
            o.y = Math.max(r, Math.min(height - r, o.y));
        }
    });

    // --- CONTINUOUS FORCE APPLICATION ---
    // Rule: Pieces only move by external forces (Wind/BH) if they are currently being dragged.
    if (state.isDragging && state.activePieceId) {
        const piece = state.pieces.find(p => p.id === state.activePieceId);
        if (piece) {
            let fx = 0, fy = 0;
            state.zones.forEach(z => {
                const centerX = piece.x + piece.width / 2;
                const centerY = piece.y + piece.height / 2;
                if (z.type === 'wind') {
                    const force = calculateWindForce(z, centerX, centerY);
                    if (force) { fx += force.x * 0.5; fy += force.y * 0.5; }
                } else if (z.type === 'blackhole') {
                    const dx = centerX - z.x; const dy = centerY - z.y; const dist = Math.hypot(dx, dy); const radius = z.radius || 250;
                    if (dist < radius) {
                        const strengthRatio = 1 - (dist / radius);
                        const pullFactor = (0.2 + 0.8 * (strengthRatio * strengthRatio)); 
                        const pull = pullFactor * z.strength * 1.5; 
                        const angle = Math.atan2(dy, dx);
                        fx -= Math.cos(angle) * pull; fy -= Math.sin(angle) * pull;
                    }
                }
            });
            state.drift.x += fx; state.drift.y += fy;
            state.drift.x *= 0.98; state.drift.y *= 0.98;
            const prevX = piece.x; const prevY = piece.y;
            piece.x = state.pointerPos.x - state.dragOffset.x + state.drift.x;
            piece.y = state.pointerPos.y - state.dragOffset.y + state.drift.y;
            if (piece.linkedId) { const l = state.pieces.find(p => p.id === piece.linkedId); if (l) { l.x += (piece.x - prevX); l.y += (piece.y - prevY); } }
        }
    }

    // Collision Check
    state.pieces.forEach(p => {
       if (!p.hasBeenTouched) return;
       const cx = p.x + p.width/2; const cy = p.y + p.height/2; const r = p.width/2;
       
       // Zone Collision (Blackhole Center - Death)
       state.zones.forEach(z => {
         if (z.type === 'blackhole') {
           const dist = Math.hypot(cx - z.x, cy - z.y);
           // Death radius is small (Center of blackhole)
           if (dist < 30) handleCollisionFailure(state, "Sucked into Void");
         }
       });

       // Obstacle Collision
       state.obstacles.forEach(o => {
           // Simple circle collision for all types for better feel
           const obsR = o.width / 2;
           const dist = Math.hypot(cx - o.x, cy - o.y);
           // Allow a little grace (0.8 factor)
           if (dist < (r + obsR) * 0.8) handleCollisionFailure(state, o.type === 'spike_static' ? "Spiked!" : "Hit by Ball");
       });

       if (p.x < -10 || p.x + p.width > width + 10 || p.y < -10 || p.y + p.height > height + 10) handleCollisionFailure(state, "Hit Wall");
    });

    // Rendering
    state.particles = state.particles.filter(p => p.life > 0); state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.vy += 0.2; });
    ctx.clearRect(0, 0, width, height);
    if (state.bhCanvas) { const bhCtx = state.bhCanvas.getContext('2d'); if (bhCtx) { bhCtx.fillStyle = 'rgba(0,0,0,0.05)'; bhCtx.fillRect(0,0,width,height); state.bhSystems.forEach(s=>s.draw(bhCtx)); }}
    if (state.windCanvas) { const wCtx = state.windCanvas.getContext('2d'); if (wCtx) { wCtx.fillStyle = 'rgba(0,0,0,0.05)'; wCtx.fillRect(0,0,width,height); state.windSystems.forEach(s=>s.draw(wCtx, state.globalTime)); }}

    ctx.save();
    if (state.screenShake > 0) ctx.translate((Math.random()-0.5)*state.screenShake, (Math.random()-0.5)*state.screenShake);
    if (state.bgCanvas) ctx.drawImage(state.bgCanvas, 0, 0);
    
    // Wall Spikes Visualization
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red warning
    ctx.setLineDash([20, 20]);
    ctx.strokeRect(0, 0, width, height);
    ctx.setLineDash([]);
    
    if (state.bhCanvas) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(state.bhCanvas, 0, 0); ctx.restore(); }
    if (state.windCanvas) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(state.windCanvas, 0, 0); ctx.restore(); }

    state.zones.forEach(z => {
      if (z.type === 'wind' && z.lineStart && z.lineEnd) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(z.lineStart.x, z.lineStart.y); ctx.lineTo(z.lineEnd.x, z.lineEnd.y);
        ctx.lineWidth = 14; ctx.strokeStyle = '#475569'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(z.lineStart.x, z.lineStart.y); ctx.lineTo(z.lineEnd.x, z.lineEnd.y);
        ctx.lineWidth = 8; const g = ctx.createLinearGradient(z.lineStart.x, z.lineStart.y, z.lineEnd.x, z.lineEnd.y);
        g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.5, '#f1f5f9'); g.addColorStop(1, '#cbd5e1');
        ctx.strokeStyle = g; ctx.stroke(); ctx.restore();
      } else if (z.type === 'blackhole') { ctx.save(); ctx.translate(z.x, z.y); ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill(); ctx.restore(); }
    });

    // Draw Static Spikes (Breathing)
    state.obstacles.forEach(o => {
        if (o.type === 'spike_static') {
            ctx.save();
            ctx.translate(o.x, o.y);
            const breathe = 1 + Math.sin(Date.now() * 0.005) * 0.15;
            ctx.scale(breathe, breathe);
            
            // Glow
            ctx.shadowBlur = 20 * breathe;
            ctx.shadowColor = '#FF3333';
            
            // Spike Body
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#FF3333';
            ctx.fill();
            
            // Spikes
            for(let i=0; i<8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(25, 0);
                ctx.lineTo(10, 6);
                ctx.fill();
            }
            ctx.restore();
        }
    });

    state.silhouettes.forEach(s => { ctx.save(); drawShapePath(ctx, s.shape, s.x, s.y, s.width, s.height); ctx.fillStyle = COLORS.silhouette; ctx.fill(); ctx.restore(); });
    
    state.pieces.forEach(p => {
       if (p.linkedId) { 
           const partner = state.pieces.find(pp => pp.id === p.linkedId); 
           if (partner) { ctx.beginPath(); ctx.moveTo(p.x+p.width/2, p.y+p.height/2); ctx.lineTo(partner.x+partner.width/2, partner.y+partner.height/2); ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); }
       }
       const s = state.silhouettes.find(sil => sil.targetId === p.id);
       if (s && state.bgCanvas) {
           ctx.save();
           ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
           drawShapePath(ctx, p.shape, p.x, p.y, p.width, p.height);
           ctx.clip();
           ctx.drawImage(state.bgCanvas, s.x, s.y, s.width, s.height, p.x, p.y, p.width, p.height);
           const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y + p.height);
           grad.addColorStop(0, 'rgba(255,255,255,0.25)'); grad.addColorStop(0.5, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.15)');
           ctx.fillStyle = grad; ctx.fill();
           ctx.restore();
           ctx.save();
           drawShapePath(ctx, p.shape, p.x, p.y, p.width, p.height);
           ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
           ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 3; ctx.stroke();
           ctx.restore();
       }
    });

    // Draw Dynamic Balls
    state.obstacles.forEach(o => {
        if (o.type === 'ball_dynamic') {
             ctx.save();
             ctx.translate(o.x, o.y);
             ctx.beginPath();
             ctx.arc(0, 0, o.width/2, 0, Math.PI * 2);
             ctx.fillStyle = '#DC2626'; // Solid Red
             ctx.shadowBlur = 5;
             ctx.shadowColor = 'rgba(0,0,0,0.5)';
             ctx.fill();
             
             // Shine
             ctx.beginPath();
             ctx.arc(-o.width/6, -o.width/6, o.width/8, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(255,255,255,0.6)';
             ctx.fill();
             ctx.restore();
        }
    });

    // Draw Ripples
    state.ripples.forEach(r => r.draw(ctx));

    state.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.maxLife; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
    requestRef.current = requestAnimationFrame(() => update(performance.now()));
  }, [status, isComboMode, hasShield, onLevelFail, onConsumeShield, onTimeUpdate]);

  const handleCollisionFailure = (state: any, reason: string) => {
    if (state.levelCompleteProcessed) return;
    if (isComboMode) { state.levelCompleteProcessed = true; audio.playFail(); onLevelFail(reason); return; }
    if (hasShield) { onConsumeShield(); audio.playPop(); } else { state.levelCompleteProcessed = true; audio.playFail(); onLevelFail(reason); }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(() => update(performance.now()));
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  const handleStart = (clientX: number, clientY: number) => {
    if (status !== GameStatus.PLAYING) return;
    const state = gameState.current; if (Date.now() - state.levelStartTime < 100) return;
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    
    // Scale Correction for layout shifts
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    for (let i = state.pieces.length - 1; i >= 0; i--) {
      const p = state.pieces[i];
      if (x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
        state.isDragging = true; 
        state.activePieceId = p.id; 
        state.dragOffset = { x: x - p.x, y: y - p.y };
        state.pointerPos = { x, y }; 
        state.drift = { x: 0, y: 0 }; 
        
        p.hasBeenTouched = true; 
        if (p.linkedId) { 
            const partner = state.pieces.find(pp => pp.id === p.linkedId); 
            if (partner) partner.hasBeenTouched = true; 
        }
        audio.playPop(); break;
      }
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (status !== GameStatus.PLAYING) return;
    const state = gameState.current; 
    if (!state.isDragging || !state.activePieceId || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect(); 
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    state.pointerPos = { 
        x: (clientX - rect.left) * scaleX, 
        y: (clientY - rect.top) * scaleY 
    };
  };

  const handleEnd = () => {
    const state = gameState.current; if (!state.isDragging || !state.activePieceId) return;
    state.isDragging = false;
    const piece = state.pieces.find(p => p.id === state.activePieceId); if (!piece) return;
    const silhouette = state.silhouettes.find(s => s.targetId === piece.id);
    if (silhouette) {
      const dist = Math.hypot(piece.x + piece.width/2 - (silhouette.x + silhouette.width/2), piece.y + piece.height/2 - (silhouette.y + silhouette.height/2));
      let res: Accuracy = Accuracy.BAD; if (dist <= 8) res = Accuracy.PERFECT; else if (dist <= 18) res = Accuracy.GOOD;
      if (res === Accuracy.BAD) { audio.playBad(); handleCollisionFailure(state, "Bad Placement"); }
      else {
        piece.x = silhouette.x; piece.y = silhouette.y;
        if (piece.linkedId) { const lp = state.pieces.find(p => p.id === piece.linkedId), ls = state.silhouettes.find(s => s.targetId === piece.linkedId); if (lp && ls) { lp.x = ls.x; lp.y = ls.y; } }
        
        if (res === Accuracy.PERFECT) {
            audio.playPerfect();
            const centerX = silhouette.x + silhouette.width/2;
            const centerY = silhouette.y + silhouette.height/2;
            
            // Add Ripple
            state.ripples.push(new RippleEffect(centerX, centerY, '#fde047')); // Yellow-300
            
            // Add Particle Burst (Fireworks)
            for(let i=0; i<12; i++) {
                 const angle = (Math.PI * 2 / 12) * i;
                 const speed = 4 + Math.random() * 4;
                 state.particles.push({
                     id: `burst_${Date.now()}_${i}`,
                     x: centerX,
                     y: centerY,
                     vx: Math.cos(angle) * speed,
                     vy: Math.sin(angle) * speed,
                     life: 30,
                     maxLife: 30,
                     color: i % 2 === 0 ? '#fbbf24' : '#ffffff',
                     size: 3 + Math.random() * 3
                 });
            }
        } else {
            audio.playGood();
        }
        
        const elapsed = Date.now() - state.startTime, ratio = elapsed / state.timeLimit;
        let sR = SpeedRating.NORMAL; if (ratio <= 0.3) sR = SpeedRating.GODLIKE; else if (ratio >= 0.7) sR = SpeedRating.SLOW;
        if (!state.levelCompleteProcessed) { state.levelCompleteProcessed = true; onLevelComplete({ accuracy: res, speed: sR, timeRatio: ratio }) }
      }
    } else { audio.playBad(); handleCollisionFailure(state, "Bad Placement"); }
    state.activePieceId = null;
  };

  const getLevelConfig = (lvl: number): LevelConfig => {
    let tL = Math.max(3.0, lvl <= 10 ? 5.0 : 6.0 - Math.floor(lvl / 5) * 0.5);
    const base = { level: lvl, timeLimit: tL, pieces: 1, silhouettes: 1, fakeSilhouettes: 0, staticSpikes: 0, dynamicSpikes: 0, windZones: 0, blackHoles: 0, linkedPieces: false };
    
    // ADJUSTED SPIKE DIFFICULTY
    if (lvl <= 5) {
        base.staticSpikes = 1;
    } else if (lvl <= 10) {
        base.staticSpikes = 2;
    } else if (lvl <= 20) {
        base.staticSpikes = 3;
    } else {
        base.staticSpikes = 4;
    }

    // Level 6-10: 1 Puzzle, 2 Silhouettes (1 Real + 1 Fake)
    if (lvl >= 6) {
        base.fakeSilhouettes = 1;
    }
    
    // Level 10-15: Dynamic obstacles start appearing
    if (lvl >= 10) {
        base.dynamicSpikes = 1 + Math.floor((lvl - 10) / 3);
        // Cap dynamic spikes
        if (base.dynamicSpikes > 3) base.dynamicSpikes = 3;
    }

    // Level 16-20: Wind Zones (100% chance)
    if (lvl >= 16 && lvl <= 20) {
        base.windZones = 1;
    }

    // Level 21-25: Black Holes (100% chance)
    if (lvl >= 21 && lvl <= 25) {
        base.blackHoles = 1;
    }

    // Level 26-30: Linked Pieces + Mixed Hazards (1-2)
    if (lvl >= 26 && lvl <= 30) {
        if (Math.random() < 0.5) {
             base.linkedPieces = true;
             base.pieces = 2;
             base.silhouettes = 2;
             base.fakeSilhouettes = 0; // Disable fakes to avoid overcrowding
        }
        
        const count = 1 + Math.floor(Math.random() * 2); // 1 or 2
        for(let i=0; i<count; i++) {
             if (Math.random() < 0.5) base.windZones++; else base.blackHoles++;
        }
        
        base.dynamicSpikes = 2; // Ensure some difficulty
    }

    // Level 31+: Harder Mix (2-3 Hazards)
    if (lvl >= 31) {
        if (Math.random() < 0.5) {
             base.linkedPieces = true;
             base.pieces = 2;
             base.silhouettes = 2;
             base.fakeSilhouettes = 0;
        }

        const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
        for(let i=0; i<count; i++) {
             if (Math.random() < 0.5) base.windZones++; else base.blackHoles++;
        }
        
        base.dynamicSpikes = 3;
    }
    
    return base;
  };

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none select-none overflow-hidden"
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)} onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)} onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)} onMouseMove={(e) => handleMove(e.clientX, e.clientY)} onMouseUp={handleEnd} onMouseLeave={handleEnd}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
