// Cosmic Merger Web Audio Synthesizer
// Lazy-initialization to avoid browser autoplay restrictions.

class CosmicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Ambient sub-system
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private isMuted: boolean = false;
  private mainVolume: number = 0.4;
  private ambientVolumePercent: number = 30; // 30% of main volume

  private scoreFactor: number = 0;
  private dangerFactor: number = 0;

  constructor() {
    // Left empty for lazy initiation
  }

  // Safe initialize triggered on first click/drag
  public init() {
    if (this.ctx) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn("Web Audio API not supported in this environment.");
        return;
      }

      this.ctx = new AudioCtxClass();
      
      // Setup Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.mainVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Setup Ambient Synth Hum
      this.setupAmbientHum();
    } catch (e) {
      console.error("Failed to initialize Web Audio Engine", e);
    }
  }

  private setupAmbientHum() {
    if (!this.ctx || !this.masterGain) return;

    try {
      // High-quality resonant low hum
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = "lowpass";
      this.ambientFilter.frequency.setValueAtTime(110, this.ctx.currentTime); // 110Hz or 60Hz
      this.ambientFilter.Q.setValueAtTime(4, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      // Set initial volume relative to general volume
      const startVol = (this.ambientVolumePercent / 100) * 0.15; // Soft hum
      this.ambientGain.gain.setValueAtTime(startVol, this.ctx.currentTime);

      // Double detuned oscillators for rich acoustic beating
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc1.type = "sawtooth";
      this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A

      this.ambientOsc2 = this.ctx.createOscillator();
      this.ambientOsc2.type = "triangle";
      this.ambientOsc2.frequency.setValueAtTime(55.6, this.ctx.currentTime); // Detuned

      // Create an LFO to slowly modulate filter frequency (creates space movement)
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = "sine";
      this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // Very slow 12-second wave

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(45, this.ctx.currentTime); // +/- 45Hz

      // Connect LFO
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.ambientFilter.frequency);

      // Connect oscillators -> Filter -> Ambient Gain -> Master
      this.ambientOsc1.connect(this.ambientFilter);
      this.ambientOsc2.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      // Start everything
      this.ambientOsc1.start();
      this.ambientOsc2.start();
      this.lfo.start();

      console.log("Ambient synth hum started successfully.");
    } catch (e) {
      console.error("Error starting ambient hum", e);
    }
  }

  // Update volume settings
  public setVolume(volume: number) {
    this.mainVolume = volume;
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
    // Scale ambient relative to master
    this.updateAmbientGain();
  }

  public setAmbientVolume(percent: number) {
    this.ambientVolumePercent = percent;
    this.updateAmbientGain();
  }

  public updateDynamicHum(score: number, timeRemaining: number) {
    this.dangerFactor = Math.max(0, Math.min(1, 1 - (timeRemaining / 4000)));
    this.scoreFactor = Math.min(1.5, score / 8000);
    this.updateAmbientGain();
  }

  private updateAmbientGain() {
    if (!this.ctx || !this.ambientGain) return;
    
    // Base volume
    const baseTargetVol = this.isMuted ? 0 : (this.ambientVolumePercent / 100) * this.mainVolume * 0.25;
    // Boost volume by up to 2.5x near game over or as score grows
    const targetVol = baseTargetVol * (1.0 + (this.dangerFactor * 1.5) + (this.scoreFactor * 0.5));
    
    this.ambientGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.4);

    // Also modulate filter frequency for increased tension!
    if (this.ambientFilter) {
      const baseFreq = 110;
      // Filter frequency gets brighter (more high frequencies) with danger and score
      const targetFreq = baseFreq + (this.dangerFactor * 140) + (this.scoreFactor * 40);
      this.ambientFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.4);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.mainVolume, this.ctx.currentTime);
    }
    this.updateAmbientGain();
    
    // Resume context if suspended
    this.ensureContextRunning();

    return this.isMuted;
  }

  public getMuted() {
    return this.isMuted;
  }

  public getVolume() {
    return this.mainVolume;
  }

  public getAmbientVolumePercent() {
    return this.ambientVolumePercent;
  }

  private ensureContextRunning() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // SFX: Drop body swoosh
  public playDropSwoosh() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureContextRunning();

    const now = this.ctx.currentTime;
    
    // Soft frequency sweeping pitch down
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // SFX: Merge resonant pop
  public playMergePop(level: number) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureContextRunning();

    const now = this.ctx.currentTime;
    
    // Scale pitch based on level: level 0 = 150Hz, level 10 = 800Hz
    const baseFreq = 160 + level * 45;
    
    // Primary sound (sine wave pop with short delay check/decay)
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.25);

    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);
    subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.25, now + 0.3);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // Apply high pass filtered snap for high levels (twinkle)
    if (level >= 3) {
      const snapOsc = this.ctx.createOscillator();
      const snapFilter = this.ctx.createBiquadFilter();
      const snapGain = this.ctx.createGain();

      snapOsc.type = "triangle";
      snapOsc.frequency.setValueAtTime(baseFreq * 4, now);
      
      snapFilter.type = "highpass";
      snapFilter.frequency.setValueAtTime(1200, now);

      snapGain.gain.setValueAtTime(0.15, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      snapOsc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.masterGain);

      snapOsc.start(now);
      snapOsc.stop(now + 0.1);
    }

    osc.connect(gainNode);
    subOsc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    
    osc.stop(now + 0.4);
    subOsc.stop(now + 0.4);
  }

  // SFX: Massive Supernova Event
  public playSupernova() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureContextRunning();

    const now = this.ctx.currentTime;

    // 1. Deep rumble bass
    const bassOsc = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassGain = this.ctx.createGain();

    bassOsc.type = "sawtooth";
    bassOsc.frequency.setValueAtTime(90, now);
    bassOsc.frequency.linearRampToValueAtTime(30, now + 1.2);

    bassFilter.type = "lowpass";
    bassFilter.frequency.setValueAtTime(120, now);

    bassGain.gain.setValueAtTime(0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.masterGain);

    bassOsc.start(now);
    bassOsc.stop(now + 1.6);

    // 2. Rising harmonic sweep (synth rise)
    const riseOsc = this.ctx.createOscillator();
    const riseGain = this.ctx.createGain();

    riseOsc.type = "triangle";
    riseOsc.frequency.setValueAtTime(120, now);
    riseOsc.frequency.exponentialRampToValueAtTime(1400, now + 1.0);

    riseGain.gain.setValueAtTime(0.05, now);
    riseGain.gain.linearRampToValueAtTime(0.2, now + 0.8);
    riseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    riseOsc.connect(riseGain);
    riseGain.connect(this.masterGain);

    riseOsc.start(now);
    riseOsc.stop(now + 1.3);

    // 3. Shimmer Bells (harmonic space sparkles)
    for (let i = 0; i < 4; i++) {
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      const p = 800 + i * 360;

      bell.type = "sine";
      bell.frequency.setValueAtTime(p, now + i * 0.15);
      
      bellGain.gain.setValueAtTime(0.0, now);
      bellGain.gain.linearRampToValueAtTime(0.12, now + i * 0.15 + 0.05);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.8);

      bell.connect(bellGain);
      bellGain.connect(this.masterGain);

      bell.start(now);
      bell.stop(now + 2.0);
    }
  }

  // SFX: Warning alert (slow gentle pulsing beep)
  public playWarningBeep() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.ensureContextRunning();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now); // Soft retro radar beep

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

// Export single shared instance for full application
export const CosmicAudio = new CosmicAudioEngine();
