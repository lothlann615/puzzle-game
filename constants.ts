
import type { ShapeType } from "./types";

export const COLORS = {
  background: '#f0f4f8', // Light gray/blue
  primary: '#3b82f6', // Blue
  accent: '#fbbf24', // Warm Yellow
  success: '#10b981', // Green
  danger: '#ef4444', // Red
  text: '#374151', // Dark Gray
  pieceShadow: '#2563eb',
  silhouette: 'rgba(0, 0, 0, 0.4)', // Darker for hole effect
  silhouetteBorder: 'rgba(255, 255, 255, 0.3)',
  wind: 'rgba(167, 243, 208, 0.3)',
  blackHoleInner: '#1f2937',
  blackHoleOuter: 'rgba(31, 41, 55, 0.2)',
};

export const GAME_CONFIG = {
  pieceSize: 60,
  spikeSize: { w: 20, h: 40 },
  snapDistance: 10,
  perfectDistance: 5,
  goodDistance: 12,
  baseScore: 100,
  maxCombo: 3, // Threshold for Protection Mode
  highEnergyThreshold: 6, // Threshold for High Energy Mode
};

export const SHAPES: ShapeType[] = ['square', 'circle', 'triangle', 'hexagon', 'puzzle_classic'];

export const STORAGE_KEYS = {
  HIGH_SCORE: 'puzzle_verify_highscore_v1',
};

// --- CUSTOM ASSETS CONFIG ---
// PREVIEW SETTINGS: Currently using Emojis as placeholders.
// To use images: Replace the emoji string with a path like '/assets/smile.png'
export const ASSETS = {
  IMAGES: {
    PERFECT: 'https://lothlann615.github.io/image-host/party.png', // Celebration / Party Face
    GOOD: 'https://lothlann615.github.io/image-host/smile.png',    // Smiling Face
    BAD: 'https://lothlann615.github.io/image-host/cry.png'      // Loudly Crying Face
  },
  SOUNDS: {
    PERFECT: '',   // Leave empty to use default synth sound
    GOOD: '',      // Leave empty to use default synth sound
    BAD: ''        // Leave empty to use default synth sound
  }
};

// USER CONFIG: Add your image URLs here. 
// If empty, the game uses the generated cartoon style.
// 您可以在这里添加网络图片链接，例如：
// 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1080',
export const BACKGROUND_IMAGES: string[] = [
    'https://images.unsplash.com/photo-1626265774643-f1943311a86b?q=80&w=1080&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1080&auto=format&fit=crop',
    'https://lothlann615.github.io/image-host/mouse.png',
    'https://lothlann615.github.io/image-host/cat.png',
    'https://lothlann615.github.io/image-host/dog.png',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1080&auto=format&fit=crop'
];
