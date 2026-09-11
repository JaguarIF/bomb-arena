type Bus = { master: GainNode; music: GainNode; sfx: GainNode };

export class GameAudio {
  private ctx: AudioContext | null = null;
  private bus: Bus | null = null;
  private musicTimer = 0;
  private step = 0;
  private voices = 0;
  private unlocked = false;
  musicVol = 0.55;
  sfxVol = 0.8;
  muted = false;

  unlock() {
    if (this.unlocked && this.ctx && this.ctx.state !== "suspended") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      const master = this.ctx.createGain();
      const music = this.ctx.createGain();
      const sfx = this.ctx.createGain();
      music.connect(master);
      sfx.connect(master);
      master.connect(this.ctx.destination);
      this.bus = { master, music, sfx };
      this.applyVolumes();
    }
    void this.ctx.resume();
    this.unlocked = true;
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  setVolumes(music: number, sfx: number) {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVolumes();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.bus || !this.ctx) return;
    const t = this.ctx.currentTime;
    const mute = this.muted ? 0 : 1;
    this.bus.master.gain.setTargetAtTime(mute, t, 0.02);
    this.bus.music.gain.setTargetAtTime(this.musicVol * this.musicVol, t, 0.04);
    this.bus.sfx.gain.setTargetAtTime(this.sfxVol * this.sfxVol, t, 0.02);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: GainNode,
    slide = 0,
  ) {
    if (!this.ctx || this.voices > 18) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), this.ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.02);
    this.voices++;
    osc.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      osc.disconnect();
      g.disconnect();
    };
  }

  private noise(dur: number, gain: number, dest: GainNode) {
    if (!this.ctx || this.voices > 18) return;
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    src.buffer = buf;
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start();
    this.voices++;
    src.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      src.disconnect();
    };
  }

  click() {
    if (!this.bus) return;
    this.tone(880, 0.06, "square", 0.04, this.bus.sfx);
  }

  plant() {
    if (!this.bus) return;
    this.tone(180, 0.1, "triangle", 0.08, this.bus.sfx, -40);
  }

  tick() {
    if (!this.bus) return;
    this.tone(740, 0.04, "square", 0.03, this.bus.sfx);
  }

  explosion() {
    if (!this.bus) return;
    this.noise(0.28, 0.22, this.bus.sfx);
    this.tone(110, 0.32, "sawtooth", 0.1, this.bus.sfx, -80);
  }

  pickup() {
    if (!this.bus) return;
    this.tone(520, 0.08, "sine", 0.07, this.bus.sfx, 180);
    this.tone(780, 0.12, "sine", 0.05, this.bus.sfx, 220);
  }

  death() {
    if (!this.bus) return;
    this.tone(320, 0.35, "sawtooth", 0.08, this.bus.sfx, -240);
  }

  win() {
    if (!this.bus) return;
    this.tone(440, 0.12, "square", 0.06, this.bus.sfx);
    this.tone(554, 0.14, "square", 0.05, this.bus.sfx);
    this.tone(659, 0.22, "square", 0.06, this.bus.sfx);
  }

  lose() {
    if (!this.bus) return;
    this.tone(220, 0.4, "triangle", 0.07, this.bus.sfx, -100);
  }

  update(dt: number, playing: boolean) {
    if (!this.ctx || !this.bus || !playing || this.muted || this.musicVol < 0.02) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.28;
    const scale = [196, 233, 262, 294, 349, 392];
    const bass = [98, 87, 110, 98];
    const i = this.step % 16;
    this.tone(bass[i % 4]!, 0.26, "triangle", 0.035, this.bus.music);
    if (i % 2 === 0) {
      const n = scale[(i * 3 + 1) % scale.length]!;
      this.tone(n, 0.18, "sine", 0.028, this.bus.music);
    }
    this.step++;
  }
}

export const audio = new GameAudio();
