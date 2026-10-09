// Ambient sound for the story (client only, created on the first opt-in gesture).
// Two seamless loops (roaster hum, café murmur) on their own gain nodes, crossfaded
// with WebAudio ramps, plus a procedural first-crack crackle: short noise bursts
// through a bandpass. Nothing is fetched until the visitor turns sound on.

export type Bed = "roaster" | "cafe";

const SOURCES: Record<Bed, string> = {
  roaster: "/assets/audio/roaster.mp3",
  cafe: "/assets/audio/cafe.mp3",
};
const LEVEL: Record<Bed, number> = { roaster: 0.5, cafe: 0.42 };

interface Channel {
  gain: GainNode;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  loading: Promise<void> | null;
}

type AudioCtor = typeof AudioContext;

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels = new Map<Bed, Channel>();
  private noise: AudioBuffer | null = null;
  private enabled = false;
  private hidden = false;
  private bed: Bed = "roaster";
  private suspendTimer = 0;

  /** Create (or wake) the context. Call from inside a user gesture when possible. */
  unlock() {
    if (!this.ensure()) return;
    if (this.ctx && this.ctx.state === "suspended" && this.enabled && !this.hidden) {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensure();
    this.apply();
  }

  setBed(bed: Bed) {
    this.bed = bed;
    this.apply();
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.apply();
  }

  /** One soft crackle: the beans' first crack. */
  crackle() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.enabled || this.hidden || ctx.state !== "running") return;
    const noise = this.noiseBuffer(ctx);
    const t0 = ctx.currentTime + 0.03;
    const pops = 16 + Math.floor(Math.random() * 10);
    for (let i = 0; i < pops; i += 1) {
      // Clustered toward the start, thinning out, like the real thing.
      const t = t0 + Math.pow(Math.random(), 1.6) * 1.9;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1400 + Math.random() * 3600;
      band.Q.value = 0.8 + Math.random() * 2.6;
      const env = ctx.createGain();
      const peak = 0.05 + Math.random() * 0.16;
      const decay = 0.012 + Math.random() * 0.05;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(peak, t + 0.0025);
      env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(band);
      band.connect(env);
      env.connect(master);
      src.start(t, Math.random() * 0.2, decay + 0.02);
      src.onended = () => {
        src.disconnect();
        band.disconnect();
        env.disconnect();
      };
    }
  }

  private ensure() {
    if (this.ctx) return true;
    if (typeof window === "undefined") return false;
    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return false;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      for (const bed of Object.keys(SOURCES) as Bed[]) {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(master);
        this.channels.set(bed, { gain, buffer: null, source: null, loading: null });
      }
      this.ctx = ctx;
      this.master = master;
      return true;
    } catch {
      return false;
    }
  }

  private load(bed: Bed) {
    const ctx = this.ctx;
    const channel = this.channels.get(bed);
    if (!ctx || !channel) return Promise.resolve();
    if (channel.loading) return channel.loading;
    channel.loading = fetch(SOURCES[bed])
      .then((res) => {
        if (!res.ok) throw new Error(`Audio ${res.status}`);
        return res.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        channel.buffer = buffer;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        // Trim the codec padding at both ends so the loop point is seamless.
        source.loopStart = Math.min(0.05, buffer.duration / 4);
        source.loopEnd = Math.max(source.loopStart + 0.1, buffer.duration - 0.05);
        source.connect(channel.gain);
        source.start(0, source.loopStart);
        channel.source = source;
      })
      .catch(() => {
        // A missing or undecodable loop simply stays silent; allow a retry later.
        channel.loading = null;
      });
    return channel.loading;
  }

  private apply() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const audible = this.enabled && !this.hidden;
    const now = ctx.currentTime;
    window.clearTimeout(this.suspendTimer);

    if (audible) {
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      void this.load(this.bed).then(() => this.load(this.bed === "roaster" ? "cafe" : "roaster"));
    }

    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.setTargetAtTime(audible ? 1 : 0, now, audible ? 0.45 : 0.22);

    for (const [bed, channel] of this.channels) {
      const g = channel.gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      // Slow, overlapping crossfade between the roastery and the café.
      g.setTargetAtTime(bed === this.bed ? LEVEL[bed] : 0, now, 0.9);
    }

    if (!audible) {
      // Let the fade finish, then sleep the context to save battery.
      this.suspendTimer = window.setTimeout(() => {
        if (!(this.enabled && !this.hidden) && this.ctx?.state === "running")
          void this.ctx.suspend().catch(() => undefined);
      }, 1400);
    }
  }

  private noiseBuffer(ctx: AudioContext) {
    if (this.noise) return this.noise;
    const length = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }
}

let engine: AmbientEngine | null = null;

/** The shared engine (lazy; safe to call during SSR, does nothing until used in the browser). */
export function ambient() {
  if (!engine) engine = new AmbientEngine();
  return engine;
}
