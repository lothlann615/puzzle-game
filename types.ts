
export type Vector2 = { x: number; y: number };

export enum GameStatus {
  MODE_SELECT = 'MODE_SELECT',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
}

export enum GameMode {
  REGULAR = 'REGULAR',
  CRAZY = 'CRAZY',
}

export enum Accuracy {
  PERFECT = 'PERFECT',
  GOOD = 'GOOD',
  BAD = 'BAD',
}

export enum SpeedRating {
  GODLIKE = 'GODLIKE',
  NORMAL = 'NORMAL',
  SLOW = 'SLOW',
}

export type ShapeType = 'square' | 'circle' | 'triangle' | 'hexagon' | 'puzzle_classic';

export interface PuzzlePiece {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isDragging: boolean;
  hasBeenTouched: boolean;
  linkedId?: string;
  rotation: number; 
  shape: ShapeType;
}

export interface Silhouette {
  id: string;
  targetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isFake: boolean;
  shape: ShapeType;
}

export interface Obstacle {
  id: string;
  type: 'spike_static' | 'ball_dynamic';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

export interface Zone {
  id: string;
  type: 'wind' | 'blackhole';
  x: number;
  y: number;
  radius?: number;
  lineStart?: Vector2;
  lineEnd?: Vector2;
  windVector?: Vector2;
  maxDist?: number;
  strength: number; 
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LevelConfig {
  level: number;
  timeLimit: number;
  pieces: number;
  silhouettes: number;
  fakeSilhouettes: number;
  staticSpikes: number;
  dynamicSpikes: number;
  windZones: number;
  blackHoles: number;
  linkedPieces: boolean;
}

export interface ScoreFeedback {
  id: number;
  text: string;
  subText: string;
  score: number;
  type: 'success' | 'fail';
  emoji?: string;
}
