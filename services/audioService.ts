
import { ASSETS } from '../constants';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private fileCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.5;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- File Playback Logic ---
  private playFile(path: string) {
    if (!path) return false; // Fallback to synth if no path provided

    try {
      let audio = this.fileCache.get(path);
      if (!audio) {
        audio = new Audio(path);
        this.fileCache.set(path, audio);
      }
      audio.currentTime = 0;
      audio.play().catch(e => console.error("Audio playback failed", e));
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- Synth Logic ---
  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1, startTime: number = 0) {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const t = this.ctx.currentTime + startTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    // Simple Envelope: Attack -> Decay
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01); // Fast attack to prevent clicking
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // Smooth decay

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  // --- Sound Effects ---

  playPerfect() {
    if (this.playFile(ASSETS.SOUNDS.PERFECT)) return;

    // "Ding!" - Crisp, High-pitched, Metallic
    // High Sine wave for clarity
    this.playTone(1567.98, 'sine', 0.3, 0.4); // G6
    // High Triangle wave for "sparkle"
    this.playTone(2093.00, 'triangle', 0.15, 0.2, 0.05); // C7, slight delay
  }

  playGood() {
    if (this.playFile(ASSETS.SOUNDS.GOOD)) return;

    // "Pop" / "Blip" - Neutral, Soft
    // A single mid-range sine wave, very short
    this.playTone(880, 'sine', 0.1, 0.3); // A5
  }

  playBad() {
    if (this.playFile(ASSETS.SOUNDS.BAD)) return;

    // "Buzzer" / "Glitch" - Harsh, Low
    // Square wave creates that 8-bit "wrong answer" sound
    this.playTone(150, 'square', 0.3, 0.3); // Low frequency
    
    // Optional: Add a slight dissonance
    this.playTone(145, 'square', 0.3, 0.3);
  }

  playFail() {
    // Crash/Fail sound (Game Over)
    this.playTone(100, 'sawtooth', 0.6, 0.6);
    setTimeout(() => this.playTone(60, 'square', 0.6, 0.6), 100);
  }

  playCombo() {
    // Rising energy (Power up)
    this.playTone(440, 'triangle', 0.15, 0.2);
    setTimeout(() => this.playTone(554, 'triangle', 0.15, 0.2), 80);
    setTimeout(() => this.playTone(659, 'triangle', 0.2, 0.2), 160);
  }

  playPop() {
    // Soft click for picking up items
    this.playTone(600, 'sine', 0.05, 0.2);
  }
}

export const audio = new AudioService();
