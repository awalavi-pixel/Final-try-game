export type AudioCategory = 'sfx' | 'music' | 'ambient' | 'voice';

export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private categoryGains: Map<AudioCategory, GainNode> = new Map();
  private compressor: DynamicsCompressorNode;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode;

  constructor() {
    this.ctx = new AudioContext();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.2;
    this.reverbGain.connect(this.masterGain);

    const cats: AudioCategory[] = ['sfx', 'music', 'ambient', 'voice'];
    for (const cat of cats) {
      const g = this.ctx.createGain();
      g.gain.value = 1.0;
      g.connect(this.masterGain);
      this.categoryGains.set(cat, g);
    }

    this.buildReverb('outdoor');
    this.resume();
  }

  resume(): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {/* ignore */});
    }
  }

  private buildReverb(type: 'outdoor' | 'indoor_small' | 'indoor_large'): void {
    const duration = type === 'outdoor' ? 1.5 : type === 'indoor_small' ? 0.8 : 2.5;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = buffer;
    conv.connect(this.reverbGain);
    this.reverb = conv;
  }

  createPanner(x: number, y: number, z: number): PannerNode {
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 80;
    panner.rolloffFactor = 2.0;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
    panner.connect(this.categoryGains.get('sfx')!);
    return panner;
  }

  updateListener(px: number, py: number, pz: number, fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void {
    const l = this.ctx.listener;
    if (l.positionX) {
      l.positionX.value = px;
      l.positionY.value = py;
      l.positionZ.value = pz;
      l.forwardX.value = fx;
      l.forwardY.value = fy;
      l.forwardZ.value = fz;
      l.upX.value = ux;
      l.upY.value = uy;
      l.upZ.value = uz;
    }
  }

  playGunshot(weaponId: string, suppressed: boolean): void {
    this.resume();
    const now = this.ctx.currentTime;
    const duration = suppressed ? 0.06 : 0.12;

    // Procedural gunshot using oscillators
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    const sampleRate = this.ctx.sampleRate;

    for (let i = 0; i < bufLen; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * (suppressed ? 30 : 20));
      // Gunshot = noise + tone
      const noise = (Math.random() * 2 - 1);
      const tone = Math.sin(2 * Math.PI * (suppressed ? 400 : 150) * t);
      data[i] = (noise * 0.7 + tone * 0.3) * env;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buf;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = suppressed ? 0.4 : 0.9;

    source.connect(gainNode);
    gainNode.connect(this.categoryGains.get('sfx')!);
    source.start(now);

    // Add to reverb if not suppressed
    if (!suppressed && this.reverb) {
      gainNode.connect(this.reverb);
    }

    void weaponId;
  }

  playDryFire(): void {
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = 800;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.categoryGains.get('sfx')!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playReload(weaponId: string): void {
    this.resume();
    const now = this.ctx.currentTime;

    // Metal click sound
    const clickBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
    const d = clickBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.01));
    }

    const src1 = this.ctx.createBufferSource();
    src1.buffer = clickBuf;
    const g1 = this.ctx.createGain();
    g1.gain.value = 0.5;
    src1.connect(g1);
    g1.connect(this.categoryGains.get('sfx')!);
    src1.start(now);

    const src2 = this.ctx.createBufferSource();
    src2.buffer = clickBuf;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.4;
    src2.connect(g2);
    g2.connect(this.categoryGains.get('sfx')!);
    src2.start(now + 0.3);

    void weaponId;
  }

  playFootstep(surface: 'concrete' | 'metal' | 'dirt', volume = 0.3): void {
    this.resume();
    const now = this.ctx.currentTime;
    const dur = 0.08;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    const freq = surface === 'metal' ? 600 : surface === 'concrete' ? 200 : 100;

    for (let i = 0; i < d.length; i++) {
      const t = i / this.ctx.sampleRate;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * freq) * (surface === 'metal' ? 0.8 : 1);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g);
    g.connect(this.categoryGains.get('sfx')!);
    src.start(now);
  }

  playHitMarker(): void {
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = 1200;
    osc.type = 'sine';
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.categoryGains.get('sfx')!);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playExplosion(x: number, y: number, z: number): void {
    this.resume();
    const now = this.ctx.currentTime;
    const dur = 0.5;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / this.ctx.sampleRate;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const panner = this.createPanner(x, y, z);
    const g = this.ctx.createGain();
    g.gain.value = 1.5;
    src.connect(g);
    g.connect(panner);
    src.start(now);
    if (this.reverb) g.connect(this.reverb);
  }

  playUIClick(): void {
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = 600;
    osc.type = 'sine';
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.categoryGains.get('sfx')!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  setMasterVolume(v: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setCategoryVolume(cat: AudioCategory, v: number): void {
    const g = this.categoryGains.get(cat);
    if (g) g.gain.value = Math.max(0, Math.min(1, v));
  }

  playAmbient(): void {
    this.resume();
    // Wind / industrial hum
    const bufferSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < bufferSize; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.05;
      }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const g = this.categoryGains.get('ambient')!;
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.15;

    src.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(g);
    src.start();
  }
}
