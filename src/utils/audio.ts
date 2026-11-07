/**
 * Synthesized Web Audio API sound & music generator for Worms AKA Battle.
 * Features full 8-bit chiptune background music loops (lead, bass, drums)
 * inspired by classic Worms military marches and Gamebuino retro soundchips,
 * plus sound effects, explosions, bounces, and UI beeps.
 */

export interface MusicTrack {
  id: string;
  name: string;
  bpm: number;
  description: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'march',
    name: 'Marche Militaire des Vers AKA',
    bpm: 125,
    description: 'Thème héroïque et espiègle façon Worms rétro (ondes carrées & caisse claire)',
  },
  {
    id: 'tactics',
    name: 'Suspense & Stratégie Gamebuino',
    bpm: 110,
    description: 'Ambiance feutrée avec basse ronde et arpèges pour viser avec précision',
  },
  {
    id: 'battle',
    name: 'Adrénaline & Détonation',
    bpm: 140,
    description: 'Rythme d\'action chiptune soutenu quand le chrono tourne',
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private volume: number = 0.7;
  private musicVolume: number = 0.45;

  // Music sequencer state
  private isMusicPlaying: boolean = false;
  private currentTrackIndex: number = 0;
  private musicTimerId: number | null = null;
  private step: number = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMusicMuted(muted: boolean) {
    this.isMusicMuted = muted;
    if (muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
  }

  public getIsMusicPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public getCurrentTrack(): MusicTrack {
    return MUSIC_TRACKS[this.currentTrackIndex] || MUSIC_TRACKS[0];
  }

  public setTrack(index: number) {
    this.currentTrackIndex = (index + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    this.step = 0;
  }

  // --- Chiptune Background Music Sequencer ---

  public startMusic(trackIndex?: number) {
    if (this.isMusicMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (trackIndex !== undefined) {
      this.currentTrackIndex = trackIndex;
      this.step = 0;
    }

    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    this.scheduleNextBar();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimerId) {
      window.clearTimeout(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.isMusicMuted = false;
      this.startMusic();
      return true;
    }
  }

  private scheduleNextBar() {
    if (!this.isMusicPlaying || !this.ctx) return;

    const track = MUSIC_TRACKS[this.currentTrackIndex];
    const stepDuration = 60 / track.bpm / 4; // 16th note

    const now = this.ctx.currentTime;
    // Play 16 steps
    for (let s = 0; s < 16; s++) {
      const stepIdx = (this.step + s) % 64; // 4-bar loop (64 steps)
      const time = now + s * stepDuration;

      this.playSequencerStep(stepIdx, time, stepDuration);
    }

    this.step = (this.step + 16) % 64;

    this.musicTimerId = window.setTimeout(() => {
      this.scheduleNextBar();
    }, 16 * stepDuration * 1000 - 50);
  }

  private playSequencerStep(step: number, time: number, stepDuration: number) {
    if (!this.ctx || this.isMusicMuted) return;

    // Track 0: Marche Militaire des Vers AKA (Key of C / G)
    if (this.currentTrackIndex === 0) {
      // 1. Snare & Kick Drum Rhythm (military march chiptune)
      if (step % 8 === 0) {
        // Kick
        this.play8BitKick(time);
      } else if (step % 8 === 4 || (step % 8 === 6 && step > 32)) {
        // Snare march roll
        this.play8BitSnare(time, step % 8 === 6 ? 0.04 : 0.08);
      } else if (step % 2 === 0 && (step % 16 > 8)) {
        // Subtle hi-hat ticking
        this.play8BitHiHat(time);
      }

      // 2. Bassline (Walking military bass)
      // C2 (65.41), G1 (49.0), E2 (82.4), F2 (87.3)
      const bassNotes = [
        65.41, 0, 65.41, 0, 98.0, 0, 65.41, 0,
        87.31, 0, 87.31, 0, 98.0, 0, 73.42, 0,
        65.41, 0, 65.41, 0, 98.0, 0, 65.41, 0,
        73.42, 0, 82.41, 0, 98.0, 0, 65.41, 0,
      ];
      const bassFreq = bassNotes[step % 32];
      if (bassFreq > 0) {
        this.playTone(bassFreq, time, stepDuration * 1.5, 'triangle', this.musicVolume * 0.45);
      }

      // 3. Lead Melody (Catchy military bugle / whistle melody in 8-bit)
      // C4 (261.6), E4 (329.6), G4 (392.0), A4 (440.0), C5 (523.2)
      const melody: Record<number, number> = {
        0: 261.63, 2: 261.63, 4: 329.63, 6: 392.0,
        8: 523.25, 12: 392.0, 14: 329.63,
        16: 440.0, 18: 440.0, 20: 392.0, 22: 329.63,
        24: 293.66, 28: 392.0,
        32: 261.63, 34: 261.63, 36: 329.63, 38: 392.0,
        40: 523.25, 42: 587.33, 44: 523.25, 46: 392.0,
        48: 440.0, 52: 392.0, 56: 329.63, 60: 261.63,
      };

      if (melody[step]) {
        this.playTone(melody[step], time, stepDuration * 1.8, 'square', this.musicVolume * 0.28);
      }
    }

    // Track 1: Suspense & Stratégie Gamebuino (Arpeggiated mystery)
    else if (this.currentTrackIndex === 1) {
      // Arpeggios: Dm -> Bb -> F -> A
      const chords = [
        [146.83, 220.0, 293.66, 349.23], // Dm
        [116.54, 233.08, 293.66, 349.23], // Bb
        [174.61, 220.0, 261.63, 349.23], // F
        [110.0, 220.0, 277.18, 329.63], // A
      ];
      const chordIdx = Math.floor(step / 16) % 4;
      const noteIdx = step % 4;
      const freq = chords[chordIdx][noteIdx];

      this.playTone(freq, time, stepDuration * 0.8, 'square', this.musicVolume * 0.22);

      // Deep bass pulse
      if (step % 16 === 0) {
        this.playTone(chords[chordIdx][0] / 2, time, stepDuration * 8, 'sine', this.musicVolume * 0.5);
      }
      // Light rim click
      if (step % 8 === 4) {
        this.play8BitHiHat(time);
      }
    }

    // Track 2: Adrénaline & Détonation (Fast techno battle)
    else {
      // Fast bass groove (140 BPM)
      if (step % 4 === 0) {
        this.play8BitKick(time);
        this.playTone(110, time, stepDuration * 1.2, 'sawtooth', this.musicVolume * 0.35);
      } else if (step % 4 === 2) {
        this.play8BitSnare(time, 0.06);
        this.playTone(130.81, time, stepDuration * 1.2, 'sawtooth', this.musicVolume * 0.35);
      } else {
        this.play8BitHiHat(time);
      }

      // Fast lead synths
      if (step % 2 === 0) {
        const battleNotes = [440, 523, 659, 783, 880, 783, 659, 523];
        const n = battleNotes[(step / 2) % 8];
        this.playTone(n, time, stepDuration * 0.9, 'square', this.musicVolume * 0.25);
      }
    }
  }

  private playTone(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    gainLevel: number
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  private play8BitKick(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(this.musicVolume * 0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  private play8BitSnare(time: number, duration: number = 0.08) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.musicVolume * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
    noise.stop(time + duration);
  }

  private play8BitHiHat(time: number) {
    if (!this.ctx) return;
    const duration = 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.musicVolume * 0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(time);
    noise.stop(time + duration);
  }

  // --- Sound Effects ---

  public playShoot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playExplosion(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.45 * intensity;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320 * intensity, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + dur * 0.8);
    subGain.gain.setValueAtTime(0.5 * this.volume, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.8);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    subOsc.start(t);
    noise.stop(t + dur);
    subOsc.stop(t + dur);
  }

  public playBounce() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.06);

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playSplash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.35;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + dur);
  }

  public playWormJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.12);

    gain.gain.setValueAtTime(0.18 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playWormHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(350, t + 0.08);
    osc.frequency.linearRampToValueAtTime(150, t + 0.18);

    gain.gain.setValueAtTime(0.28 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playTimerTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playZoom() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.1);

    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playCharge(progress: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 200 + progress * 400;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playMenuClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, t);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playHallelujah() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.25 * this.volume, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.35);
    });
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { f: 440, d: 0.12 },
      { f: 554.37, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 880, d: 0.35 },
      { f: 783.99, d: 0.15 },
      { f: 880, d: 0.5 },
    ];

    let offset = 0;
    melody.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t + offset);

      gain.gain.setValueAtTime(0.25 * this.volume, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + offset);
      osc.stop(t + offset + note.d);

      offset += note.d + 0.04;
    });
  }
}

export const sounds = new SoundEngine();
