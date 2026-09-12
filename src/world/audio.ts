// Tiny synthesized sound effects (Web Audio, no asset files).
// Everything is created lazily on the first user gesture so autoplay rules are respected.

const MUTE_KEY = 'wander.muted';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private engine: { osc: OscillatorNode; osc2: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; whoosh: GainNode } | null = null;
  private pump: { gain: GainNode; src: AudioBufferSourceNode } | null = null;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
  }

  /** Call from a pointer/keyboard handler. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    // 2 s of white noise, reused for whooshes, thuds and the pump
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  private ready() { return !!this.ctx && !this.muted; }

  private noiseSource(loop = false) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise; s.loop = loop;
    return s;
  }

  // ---------- continuous: engine ----------
  /** speed01 = |speed| / maxSpeed; call every frame while driving, and with on=false when you get out. */
  engineState(on: boolean, speed01: number, boosting: boolean, empty: boolean) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (on && !this.engine) {
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      const osc2 = c.createOscillator(); osc2.type = 'square';
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 2;
      const gain = c.createGain(); gain.gain.value = 0;
      const whoosh = c.createGain(); whoosh.gain.value = 0;
      const ws = this.noiseSource(true);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.6;
      ws.connect(bp).connect(whoosh).connect(this.master);
      osc.connect(filter); osc2.connect(filter); filter.connect(gain).connect(this.master);
      osc.start(); osc2.start(); ws.start();
      this.engine = { osc, osc2, filter, gain, whoosh };
    }
    if (!this.engine) return;
    const e = this.engine, t = c.currentTime;
    if (!on) {
      e.gain.gain.setTargetAtTime(0, t, 0.15);
      e.whoosh.gain.setTargetAtTime(0, t, 0.1);
      setTimeout(() => { e.osc.stop(); e.osc2.stop(); }, 600);
      this.engine = null;
      return;
    }
    const rpm = empty ? 0.05 : speed01;
    const base = 45 + rpm * 150 + (boosting ? 60 : 0);
    e.osc.frequency.setTargetAtTime(base, t, 0.08);
    e.osc2.frequency.setTargetAtTime(base * 0.5, t, 0.08);
    e.filter.frequency.setTargetAtTime(300 + rpm * 1800, t, 0.1);
    e.gain.gain.setTargetAtTime(empty ? 0.015 : 0.05 + rpm * 0.08, t, 0.1);
    e.whoosh.gain.setTargetAtTime(boosting ? 0.12 : 0, t, 0.08);
  }

  // ---------- continuous: petrol pump ----------
  pumpState(on: boolean) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (on && !this.pump) {
      const src = this.noiseSource(true);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const gain = c.createGain(); gain.gain.value = 0;
      // gurgle: modulate the gain with a slow LFO
      const lfo = c.createOscillator(); lfo.frequency.value = 7;
      const lfoGain = c.createGain(); lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain).connect(gain.gain);
      src.connect(f).connect(gain).connect(this.master);
      src.start(); lfo.start();
      gain.gain.setTargetAtTime(0.07, t, 0.1);
      this.pump = { gain, src };
    } else if (!on && this.pump) {
      const p = this.pump;
      p.gain.gain.setTargetAtTime(0, t, 0.1);
      setTimeout(() => p.src.stop(), 400);
      this.pump = null;
    }
  }

  // ---------- one-shots ----------
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    if (!this.ready()) return;
    const c = this.ctx!, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  private burst(freq: number, dur: number, vol: number, type: BiquadFilterType = 'lowpass') {
    if (!this.ready()) return;
    const c = this.ctx!, t = c.currentTime;
    const s = this.noiseSource();
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  collect(points: number) { this.tone('sine', 880, 1320, 0.12, 0.25); if (points >= 20) this.tone('sine', 1320, 1760, 0.18, 0.2, 0.1); }
  jump() { this.tone('sine', 300, 620, 0.16, 0.18); }
  land() { this.burst(600, 0.08, 0.12); }
  door() { this.burst(1200, 0.05, 0.2, 'bandpass'); this.tone('square', 220, 160, 0.08, 0.06, 0.05); }
  horn() { this.tone('square', 440, 440, 0.35, 0.12); this.tone('square', 554, 554, 0.35, 0.1); }
  thud() { this.tone('sine', 90, 30, 0.35, 0.6); this.burst(900, 0.18, 0.5); }
  bump() { this.tone('sine', 120, 50, 0.15, 0.3); this.burst(1500, 0.08, 0.2); }
  boost() { this.burst(2500, 0.6, 0.35, 'highpass'); this.tone('sawtooth', 90, 260, 0.5, 0.12); }
  sputter() { for (let i = 0; i < 3; i++) this.tone('sawtooth', 70, 40, 0.09, 0.15, i * 0.14); }
  refuelDone() { this.tone('sine', 660, 660, 0.1, 0.2); this.tone('sine', 990, 990, 0.18, 0.2, 0.12); }
  ouch() { this.tone('triangle', 500, 200, 0.25, 0.15); }
  questStart() { this.tone('sine', 523, 523, 0.12, 0.2); this.tone('sine', 659, 659, 0.12, 0.2, 0.12); this.tone('sine', 784, 784, 0.25, 0.22, 0.24); }
  checkpoint() { this.tone('triangle', 880, 1175, 0.15, 0.22); }
  questDone() { [523, 659, 784, 1047].forEach((f, i) => this.tone('sine', f, f, 0.35, 0.22, i * 0.11)); this.tone('sine', 1047, 1319, 0.5, 0.18, 0.5); }
  questFail() { this.tone('sawtooth', 220, 110, 0.5, 0.15); this.tone('sawtooth', 180, 90, 0.5, 0.12, 0.25); }
  tick() { this.tone('square', 1200, 1200, 0.05, 0.08); }
  bark() { this.tone('sawtooth', 380, 220, 0.09, 0.12); this.tone('sawtooth', 420, 240, 0.09, 0.1, 0.13); }

  dispose() {
    this.engineState(false, 0, false, false);
    this.pumpState(false);
    void this.ctx?.close();
    this.ctx = null;
  }
}
